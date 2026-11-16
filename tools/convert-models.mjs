// Converts the project's own 3D sources in `3D models/` into compact,
// web-ready GLB files under `public/models/`.
//
//   node tools/convert-models.mjs
//
import { installShims } from './shims.mjs';
installShims();

import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { simplifyGeometry, initSimplifier, dropUnusedAttributes, usesTextures } from './simplify.mjs';
import { consolidateByPalette } from './consolidate.mjs';

const OUT_DIR = 'public/models';
const SRC = '3D models';

fs.mkdirSync(OUT_DIR, { recursive: true });

function loadFbx(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new FBXLoader().parse(ab, '');
}

/** Drop background/floor/light planes that ship with the source scenes. */
function stripSceneHelpers(root) {
  const doomed = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = (o.name || '').toLowerCase();
    const isPlane = /^(plane|lantai|lamp|floor|ground|background)/i.test(name);
    const g = o.geometry;
    const tris = (g.index ? g.index.count : g.getAttribute('position')?.count || 0) / 3;
    if (isPlane && tris <= 4) doomed.push(o);
  });
  doomed.forEach((o) => o.parent?.remove(o));
  return doomed.length;
}

/**
 * Bake each mesh's world transform into its vertices and reparent to one flat
 * group. Source rigs parent meshes to bones; the glTF exporter drops geometry
 * parented that way, so flattening is what keeps every part.
 */
function flattenToStatic(root) {
  root.updateMatrixWorld(true);
  const flat = new THREE.Group();
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh) meshes.push(o);
  });
  for (const m of meshes) {
    const world = m.matrixWorld.clone();
    m.parent?.remove(m);
    m.matrixAutoUpdate = true;
    world.decompose(m.position, m.quaternion, m.scale);
    m.updateMatrix();
    flat.add(m);
  }
  return flat;
}

function stats(root) {
  let meshes = 0;
  let tris = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.getAttribute('position')?.count || 0) / 3;
  });
  return { meshes, tris: Math.round(tris) };
}

/** Recentre on origin and normalise so the largest dimension is `target`. */
function normalize(root, target = 3) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = target / maxDim;

  const wrapper = new THREE.Group();
  wrapper.add(root);
  root.position.sub(center);
  wrapper.scale.setScalar(scale);
  return { wrapper, size, scale };
}

function simplifyMeshes(root, ratio, minTris = 200) {
  let before = 0;
  let after = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const res = simplifyGeometry(o.geometry, ratio, minTris);
    if (res) {
      before += res.before;
      after += res.after;
    }
  });
  return { before, after };
}

async function exportGlb(root, outFile) {
  const exporter = new GLTFExporter();
  const result = await new Promise((resolve, reject) => {
    exporter.parse(root, resolve, reject, { binary: true, onlyVisible: true });
  });
  const bytes = Buffer.from(result);
  fs.writeFileSync(outFile, bytes);
  return bytes.length;
}

// ── Model definitions ──────────────────────────────────────────────────

const BICYCLE_PALETTE = {
  frame: { color: 0xc0392b, metalness: 0.72, roughness: 0.28 },
  rim: { color: 0xd6cec2, metalness: 0.9, roughness: 0.22 },
  tire: { color: 0x2b2724, metalness: 0.05, roughness: 0.92 },
  drive: { color: 0xb08a4a, metalness: 0.9, roughness: 0.3 },
  seat: { color: 0x3a2f28, metalness: 0.1, roughness: 0.82 },
  metal: { color: 0xc4bdb2, metalness: 0.85, roughness: 0.3 },
};

function classifyBicycle(matName, meshName) {
  const n = `${matName} ${meshName}`.toLowerCase();
  if (/guma|tire|tyre|ban_luar/.test(n)) return 'tire';
  if (/gear|dominan|rantai|chain|pedal/.test(n)) return 'drive';
  if (/pelek|rim|jari|spoke|steel|whit/.test(n)) return 'rim';
  if (/rangka|frame|badan|stank|casing|hp/.test(n)) return 'frame';
  if (/jok|seat|sadel|pegangan|grip/.test(n)) return 'seat';
  return 'metal';
}

const ARDUINO_PALETTE = {
  board: { color: 0x1f6f5c, metalness: 0.25, roughness: 0.55 },
  chip: { color: 0x2a2622, metalness: 0.4, roughness: 0.5 },
  header: { color: 0x1c1a18, metalness: 0.2, roughness: 0.6 },
  metal: { color: 0xc9c3b8, metalness: 0.85, roughness: 0.3 },
  accent: { color: 0xd8b23c, metalness: 0.8, roughness: 0.35 },
};

function classifyArduino(matName, meshName) {
  const n = `${matName} ${meshName}`.toLowerCase();
  if (/circle/.test(n)) return 'accent';
  if (/cube0|pin|header|connector/.test(n)) return 'header';
  if (/material\.00/.test(n)) return 'chip';
  return 'board';
}

const MODELS = [
  {
    id: 'bicycle',
    label: 'Bicycle — Pacific Invert',
    source: path.join(SRC, 'Biycle_Pacific_Invert_6.0', 'FBX', 'Sepeda Facific Invert.fbx'),
    palette: BICYCLE_PALETTE,
    classify: classifyBicycle,
    simplifyRatio: 0.22,
    normalizeTo: 3.4,
  },
  {
    id: 'arduino-mega',
    label: 'Arduino Mega board',
    source: path.join(SRC, 'Arduino Mega.fbx'),
    palette: ARDUINO_PALETTE,
    classify: classifyArduino,
    simplifyRatio: 0.6,
    normalizeTo: 2.2,
  },
];

// ── Run ────────────────────────────────────────────────────────────────

const simplifierReady = await initSimplifier();
console.log('meshoptimizer simplifier supported:', simplifierReady);

for (const model of MODELS) {
  if (!fs.existsSync(model.source)) {
    console.log(`SKIP ${model.id}: source missing`);
    continue;
  }
  console.log(`\n=== ${model.label} ===`);
  const sourceBytes = fs.statSync(model.source).size;

  const root = loadFbx(model.source);
  const original = stats(root);
  console.log(`  parsed: ${original.meshes} meshes, ${original.tris.toLocaleString()} tris`);

  const stripped = stripSceneHelpers(root);
  if (stripped) console.log(`  stripped ${stripped} helper plane(s)`);

  const flat = flattenToStatic(root);
  console.log(`  flattened to ${flat.children.length} static mesh(es)`);

  if (!usesTextures(flat)) {
    const dropped = dropUnusedAttributes(flat, { keepUv: false });
    if (dropped) console.log(`  dropped ${dropped} unused attribute(s)`);
  }

  const sim = simplifyMeshes(flat, model.simplifyRatio);
  if (sim.before) {
    console.log(`  simplified: ${sim.before.toLocaleString()} -> ${sim.after.toLocaleString()} tris`);
  }

  const { group, sourceGroups, paletteSlots } = consolidateByPalette(flat, model.classify, model.palette);
  console.log(`  consolidated: ${sourceGroups} material groups -> ${paletteSlots} palette slots`);

  const { wrapper } = normalize(group, model.normalizeTo);
  const final = stats(wrapper);
  console.log(`  final: ${final.meshes} meshes, ${final.tris.toLocaleString()} tris`);

  const outFile = path.join(OUT_DIR, `${model.id}.glb`);
  const bytes = await exportGlb(wrapper, outFile);
  console.log(`  wrote ${outFile}: ${(bytes / 1024).toFixed(0)} KB (from ${(sourceBytes / 1024).toFixed(0)} KB)`);
}
