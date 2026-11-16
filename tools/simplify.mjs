// Mesh simplification helpers built on meshoptimizer.
// Handles skinned meshes, per-material groups, and compacts the vertex buffer
// so unused vertices actually leave the file.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

export async function initSimplifier() {
  await MeshoptSimplifier.ready;
  return MeshoptSimplifier.supported;
}

function weld(geometry) {
  if (geometry.index) return geometry;
  const welded = BufferGeometryUtils.mergeVertices(geometry, 1e-4);
  if (welded && welded.index) return welded;
  return geometry;
}

function simplifyRange(srcIndex, srcPos, ratio, minTris) {
  const triCount = srcIndex.length / 3;
  if (triCount < minTris) return null;
  const target = Math.max(3, Math.floor((srcIndex.length * ratio) / 3) * 3);

  let simplified = null;
  try {
    [simplified] = MeshoptSimplifier.simplify(srcIndex, srcPos, 3, target, 1.0, ['LockBorder']);
  } catch {
    simplified = null;
  }

  // Meshes of many disconnected closed shells (a roller chain, a spoke set)
  // give the topological simplifier nothing to collapse; fall back to sloppy.
  const reducedEnough = simplified && simplified.length <= srcIndex.length * 0.7;
  if (!reducedEnough) {
    try {
      const [sloppy] = MeshoptSimplifier.simplifySloppy(srcIndex, srcPos, 3, null, target, 1.0);
      if (sloppy && sloppy.length >= 3 && (!simplified || sloppy.length < simplified.length)) {
        simplified = sloppy;
      }
    } catch {
      // keep whatever the topological pass produced
    }
  }
  if (!simplified || simplified.length < 3 || simplified.length >= srcIndex.length) return null;
  return simplified;
}

/**
 * Simplify a geometry in place, preserving per-material groups, then compact
 * the vertex buffer.
 */
export function simplifyGeometry(geometry, ratio, minTris = 200) {
  if (!geometry.getAttribute('position')) return null;

  const working = weld(geometry);
  const positionAttr = working.getAttribute('position');
  const indexAttr = working.index;
  if (!indexAttr) return null;

  const srcIndex = new Uint32Array(indexAttr.array);
  const srcPos = new Float32Array(positionAttr.array);
  const totalTris = srcIndex.length / 3;

  const ranges = [];
  if (working.groups.length > 0) {
    for (const g of working.groups) {
      ranges.push({ start: g.start, count: g.count, materialIndex: g.materialIndex });
    }
  } else {
    ranges.push({ start: 0, count: srcIndex.length, materialIndex: 0 });
  }

  const newIndices = [];
  const newGroups = [];
  let anySimplified = false;

  for (const range of ranges) {
    const slice = srcIndex.subarray(range.start, range.start + range.count);
    const simplified = simplifyRange(slice, srcPos, ratio, minTris);
    const out = simplified ?? slice;
    if (simplified) anySimplified = true;
    newGroups.push({ start: newIndices.length, count: out.length, materialIndex: range.materialIndex });
    for (let i = 0; i < out.length; i++) newIndices.push(out[i]);
  }

  const finalIndices = new Uint32Array(newIndices);

  const remap = new Uint32Array(positionAttr.count).fill(0xffffffff);
  const compacted = new Uint32Array(finalIndices.length);
  let nextVertex = 0;
  for (let i = 0; i < finalIndices.length; i++) {
    const old = finalIndices[i];
    if (remap[old] === 0xffffffff) remap[old] = nextVertex++;
    compacted[i] = remap[old];
  }

  const newGeometry = new THREE.BufferGeometry();
  for (const name of Object.keys(working.attributes)) {
    const attr = working.attributes[name];
    const itemSize = attr.itemSize;
    const src = attr.array;
    const Ctor = src.constructor;
    const dst = new Ctor(nextVertex * itemSize);
    for (let v = 0; v < positionAttr.count; v++) {
      const nv = remap[v];
      if (nv === 0xffffffff) continue;
      for (let c = 0; c < itemSize; c++) dst[nv * itemSize + c] = src[v * itemSize + c];
    }
    newGeometry.setAttribute(name, new THREE.BufferAttribute(dst, itemSize, attr.normalized));
  }

  const use32 = nextVertex > 65535;
  newGeometry.setIndex(new THREE.BufferAttribute(use32 ? compacted : new Uint16Array(compacted), 1));
  if (working.groups.length > 0) {
    for (const g of newGroups) newGeometry.addGroup(g.start, g.count, g.materialIndex);
  }
  newGeometry.computeBoundingBox();
  newGeometry.computeBoundingSphere();

  const afterTris = compacted.length / 3;
  geometry.copy(newGeometry);
  newGeometry.dispose();
  if (working !== geometry) working.dispose();

  return {
    before: Math.round(totalTris),
    after: Math.round(afterTris),
    changed: anySimplified,
  };
}

/** Drop attributes nothing consumes. */
export function dropUnusedAttributes(root, { keepUv = false } = {}) {
  let dropped = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    for (const name of ['uv1', 'uv2', 'uv3', 'color', 'tangent']) {
      if (g.getAttribute(name)) {
        g.deleteAttribute(name);
        dropped++;
      }
    }
    if (!keepUv && g.getAttribute('uv')) {
      g.deleteAttribute('uv');
      dropped++;
    }
  });
  return dropped;
}

/** True when any material in the tree references a texture. */
export function usesTextures(root) {
  let found = false;
  root.traverse((o) => {
    if (found || !o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m) continue;
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
        if (m[key]) found = true;
      }
    }
  });
  return found;
}
