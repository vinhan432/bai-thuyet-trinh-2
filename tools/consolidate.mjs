// Consolidates a processed model into a handful of meshes, one per palette
// slot. Source FBX scenes fragment a single mesh into hundreds of material
// groups; merging them by palette slot turns ~500 draw calls into ~6.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/** Pull one index range out as a standalone indexed geometry. */
export function extractRange(geometry, start, count) {
  const pos = geometry.getAttribute('position');
  const nrm = geometry.getAttribute('normal');
  const idx = geometry.index;

  const ids = [];
  if (idx) {
    for (let i = start; i < start + count; i++) ids.push(idx.getX(i));
  } else {
    for (let i = start; i < start + count; i++) ids.push(i);
  }

  const remap = new Map();
  const newPos = [];
  const newNrm = [];
  const newIdx = [];

  for (const id of ids) {
    let n = remap.get(id);
    if (n === undefined) {
      n = remap.size;
      remap.set(id, n);
      newPos.push(pos.getX(id), pos.getY(id), pos.getZ(id));
      if (nrm) newNrm.push(nrm.getX(id), nrm.getY(id), nrm.getZ(id));
    }
    newIdx.push(n);
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
  if (nrm) out.setAttribute('normal', new THREE.Float32BufferAttribute(newNrm, 3));
  out.setIndex(newIdx);
  return out;
}

/** Merge every mesh under `root` into one mesh per palette slot. */
export function consolidateByPalette(root, classify, paletteDefs) {
  root.updateMatrixWorld(true);

  const buckets = new Map();
  let sourceGroups = 0;

  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry;
    if (!g.getAttribute('position')) return;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const vertexCount = g.index ? g.index.count : g.getAttribute('position').count;
    const groups = g.groups.length > 0 ? g.groups : [{ start: 0, count: vertexCount, materialIndex: 0 }];

    for (const grp of groups) {
      if (!grp.count) continue;
      const matName = mats[grp.materialIndex]?.name || '';
      const key = classify(matName, mesh.name);
      const sub = extractRange(g, grp.start, grp.count);
      if (!sub.getAttribute('position')?.count) {
        sub.dispose();
        continue;
      }
      sub.applyMatrix4(mesh.matrixWorld);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(sub);
      sourceGroups++;
    }
  });

  const out = new THREE.Group();
  for (const [key, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : BufferGeometryUtils.mergeGeometries(geos, false);
    if (!merged) {
      geos.forEach((geo) => out.add(new THREE.Mesh(geo, makeMaterial(key, paletteDefs))));
      continue;
    }
    if (geos.length > 1) geos.forEach((geo) => geo.dispose());
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, makeMaterial(key, paletteDefs));
    mesh.name = key;
    out.add(mesh);
  }

  return { group: out, sourceGroups, paletteSlots: buckets.size };
}

function makeMaterial(key, paletteDefs) {
  const def = paletteDefs[key] || paletteDefs.metal || {};
  return new THREE.MeshStandardMaterial({
    name: key,
    color: def.color ?? 0xb9b2a8,
    metalness: def.metalness ?? 0.5,
    roughness: def.roughness ?? 0.5,
  });
}
