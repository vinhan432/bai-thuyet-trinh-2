// Packs a glTF package (gltf + .bin + loose textures) into a single .glb
// with every resource embedded, and optionally decimates it first.
// No dependencies beyond Node's fs.

import fs from 'node:fs';
import path from 'node:path';

const pad4 = (n) => (4 - (n % 4)) % 4;

const COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.ktx2') return 'image/ktx2';
  return 'image/jpeg';
}

function countTriangles(json) {
  let tris = 0;
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const acc = json.accessors?.[prim.indices];
      if (acc) tris += acc.count / 3;
      else if (prim.attributes?.POSITION !== undefined) {
        tris += (json.accessors[prim.attributes.POSITION]?.count || 0) / 3;
      }
    }
  }
  return Math.round(tris);
}

/**
 * Decimate a glTF's primitives in place, working straight on JSON + BIN.
 * Compacts vertices and shrinks bufferViews so the triangle cut shows up in
 * the file size, not just the index count.
 */
export async function decimateGltf(json, bin, ratio, minTris = 400) {
  const { MeshoptSimplifier } = await import('meshoptimizer/simplifier');
  await MeshoptSimplifier.ready;

  const COMPONENT_CTOR = {
    5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
    5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array,
  };

  const readComponent = (buf, off, type) => {
    switch (type) {
      case 5120: return buf.readInt8(off);
      case 5121: return buf.readUInt8(off);
      case 5122: return buf.readInt16LE(off);
      case 5123: return buf.readUInt16LE(off);
      case 5125: return buf.readUInt32LE(off);
      default: return buf.readFloatLE(off);
    }
  };

  const writeComponent = (buf, off, type, v) => {
    switch (type) {
      case 5120: buf.writeInt8(v, off); break;
      case 5121: buf.writeUInt8(v, off); break;
      case 5122: buf.writeInt16LE(v, off); break;
      case 5123: buf.writeUInt16LE(v, off); break;
      case 5125: buf.writeUInt32LE(v, off); break;
      default: buf.writeFloatLE(v, off);
    }
  };

  const readAccessor = (index) => {
    const acc = json.accessors[index];
    const view = json.bufferViews[acc.bufferView];
    const comps = TYPE_COMPS[acc.type] || 1;
    const compBytes = COMPONENT_BYTES[acc.componentType];
    const stride = view.byteStride || comps * compBytes;
    const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
    const Ctor = COMPONENT_CTOR[acc.componentType];
    const out = new Ctor(acc.count * comps);
    for (let i = 0; i < acc.count; i++) {
      const src = base + i * stride;
      for (let c = 0; c < comps; c++) {
        out[i * comps + c] = readComponent(bin, src + c * compBytes, acc.componentType);
      }
    }
    return out;
  };

  let before = 0;
  let after = 0;

  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const idxRef = prim.indices;
      if (idxRef === undefined) continue;
      const idxAcc = json.accessors[idxRef];
      const triCount = idxAcc.count / 3;
      if (triCount < minTris) continue;

      const positions = readAccessor(prim.attributes.POSITION);
      const indices = readAccessor(idxRef);
      const target = Math.max(3, Math.floor((indices.length * ratio) / 3) * 3);

      let simplified = null;
      try {
        [simplified] = MeshoptSimplifier.simplify(
          new Uint32Array(indices), new Float32Array(positions), 3, target, 1.0, ['LockBorder'],
        );
      } catch {
        simplified = null;
      }
      if (!simplified || simplified.length >= indices.length) continue;

      // Compact vertices so dropped ones leave the buffer.
      const remap = new Uint32Array(positions.length / 3).fill(0xffffffff);
      const compacted = new Uint32Array(simplified.length);
      let nextVertex = 0;
      for (let i = 0; i < simplified.length; i++) {
        const old = simplified[i];
        if (remap[old] === 0xffffffff) remap[old] = nextVertex++;
        compacted[i] = remap[old];
      }

      for (const accIndex of Object.values(prim.attributes)) {
        const acc = json.accessors[accIndex];
        const view = json.bufferViews[acc.bufferView];
        const comps = TYPE_COMPS[acc.type] || 1;
        const compBytes = COMPONENT_BYTES[acc.componentType];
        const stride = view.byteStride || comps * compBytes;
        const base = (view.byteOffset || 0) + (acc.byteOffset || 0);
        const values = readAccessor(accIndex);
        for (let v = 0; v < acc.count; v++) {
          const nv = remap[v];
          if (nv === 0xffffffff) continue;
          for (let c = 0; c < comps; c++) {
            writeComponent(bin, base + nv * stride + c * compBytes, acc.componentType, values[v * comps + c]);
          }
        }
        acc.count = nextVertex;
      }

      const idxView = json.bufferViews[idxAcc.bufferView];
      const idxBase = (idxView.byteOffset || 0) + (idxAcc.byteOffset || 0);
      for (let i = 0; i < compacted.length; i++) {
        writeComponent(bin, idxBase + i * COMPONENT_BYTES[idxAcc.componentType], idxAcc.componentType, compacted[i]);
      }
      idxAcc.count = compacted.length;

      // Shrink the bufferViews so the repack can drop the freed bytes.
      const shrinkView = (acc) => {
        if (acc.bufferView === undefined) return;
        const view = json.bufferViews[acc.bufferView];
        const comps = TYPE_COMPS[acc.type] || 1;
        const needed = acc.count * comps * COMPONENT_BYTES[acc.componentType];
        view.byteLength = view.byteStride ? Math.max(view.byteLength, needed) : needed;
      };
      for (const accIndex of Object.values(prim.attributes)) shrinkView(json.accessors[accIndex]);
      shrinkView(idxAcc);

      before += triCount;
      after += compacted.length / 3;
    }
  }

  return { before: Math.round(before), after: Math.round(after) };
}

/**
 * @param {string} gltfPath  path to the .gltf
 * @param {string} outPath   path to write the .glb
 */
export function packGlb(gltfPath, outPath) {
  const dir = path.dirname(gltfPath);
  const json = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));

  let bin = Buffer.alloc(0);
  const bufferUri = json.buffers?.[0]?.uri;
  if (bufferUri) {
    bin = fs.readFileSync(path.join(dir, decodeURIComponent(bufferUri)));
  }

  const imageData = (json.images || []).map((img) => {
    if (!img.uri) return null;
    const file = path.join(dir, decodeURIComponent(img.uri));
    return { data: fs.readFileSync(file), mime: mimeFor(img.uri) };
  });

  // Repack the binary: write only the live bytes of each bufferView.
  const repacked = [];
  let cursor = 0;
  for (const view of json.bufferViews || []) {
    const start = view.byteOffset || 0;
    const data = bin.subarray(start, start + view.byteLength);
    const padding = pad4(cursor);
    if (padding) {
      repacked.push(Buffer.alloc(padding));
      cursor += padding;
    }
    view.byteOffset = cursor;
    repacked.push(data);
    cursor += data.length;
  }
  const compactBin = Buffer.concat(repacked);

  const chunks = [compactBin];
  let offset = compactBin.length;
  const imageViews = [];

  for (const img of imageData) {
    if (!img) {
      imageViews.push(null);
      continue;
    }
    const padding = pad4(offset);
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      offset += padding;
    }
    const start = offset;
    chunks.push(img.data);
    offset += img.data.length;
    imageViews.push({ byteOffset: start, byteLength: img.data.length, mime: img.mime });
  }

  const combined = Buffer.concat(chunks);

  json.buffers = [{ byteLength: combined.length }];
  json.bufferViews = json.bufferViews || [];
  json.images = (json.images || []).map((img, i) => {
    const view = imageViews[i];
    if (!view) return img;
    const viewIndex = json.bufferViews.length;
    json.bufferViews.push({ buffer: 0, byteOffset: view.byteOffset, byteLength: view.byteLength });
    return { bufferView: viewIndex, mimeType: view.mime };
  });

  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.length), 0x20)]);
  const binChunk = Buffer.concat([combined, Buffer.alloc(pad4(combined.length))]);

  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]));

  return { bytes: total, triangles: countTriangles(json), images: imageData.filter(Boolean).length };
}
