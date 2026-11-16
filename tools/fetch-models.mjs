// Downloads CC0 models from Poly Haven and packs them into single-file GLBs.
//
//   node tools/fetch-models.mjs            # everything in MODELS
//   node tools/fetch-models.mjs Drill_01   # just one slug
//
// Poly Haven publishes every model under CC0 (public domain).
//
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { packGlb, decimateGltf } from './pack-glb.mjs';

const OUT_DIR = 'public/models';
const CACHE_DIR = 'tools/.cache';
const RES = '1k';

// Textures are downscaled before packing: 512px is indistinguishable from 1k
// at these on-screen sizes but roughly 15x smaller.
const TEX_MAX = 512;
const TEX_QUALITY = 78;

// Models above their budget are decimated before packing.
const DECIMATE = {
  'drill-press': 0.3,
  'old-drill-press': 0.5,
  generator: 0.5,
  'power-box': 0.6,
  'circuit-board': 0.6,
  'industrial-pipes': 0.6,
  'ceiling-fan': 0.6,
  'security-camera': 0.6,
  laptop: 0.6,
  'oil-can': 0.6,
  'tool-chest': 0.6,
  'pipe-wrench': 0.6,
  'hand-truck': 0.6,
  'hand-plane': 0.6,
};

function hasMagick() {
  try {
    execFileSync('magick', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const MAGICK = hasMagick();

function shrinkTexture(file) {
  if (!MAGICK) return fs.statSync(file).size;
  const ext = path.extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return fs.statSync(file).size;
  try {
    execFileSync(
      'magick',
      [file, '-resize', `${TEX_MAX}x${TEX_MAX}>`, '-strip', '-quality', String(TEX_QUALITY), file],
      { stdio: 'ignore' },
    );
  } catch {
    // leave the original in place if conversion fails
  }
  return fs.statSync(file).size;
}

// ── The models to fetch, and what each is for ──────────────────────────
const MODELS = [
  // Hand tools — slide 20 "Công cụ và công nghệ"
  { slug: 'combination_wrench', id: 'wrench', label: 'Cờ-lê hai đầu' },
  { slug: 'adjustable_wrench', id: 'adjustable-wrench', label: 'Cờ-lê điều chỉnh' },
  { slug: 'flathead_screwdriver', id: 'screwdriver', label: 'Tuốc-nơ-vít' },
  { slug: 'cross_pein_hammer', id: 'hammer', label: 'Búa nguội' },
  { slug: 'handsaw_wood', id: 'handsaw', label: 'Cưa tay' },
  { slug: 'measuring_tape_01', id: 'measuring-tape', label: 'Thước cuộn' },
  { slug: 'bench_vice_01', id: 'bench-vice', label: 'Ê-tô bàn nguội' },
  { slug: 'Drill_01', id: 'drill', label: 'Máy khoan' },
  { slug: 'bolt_cutters_01', id: 'bolt-cutters', label: 'Kìm cắt bu-lông' },

  // Maintenance — slide 13
  { slug: 'small_oil_can_01', id: 'oil-can', label: 'Bình tra dầu' },
  { slug: 'metal_tool_chest', id: 'tool-chest', label: 'Tủ đồ nghề' },
  { slug: 'pipe_wrench', id: 'pipe-wrench', label: 'Cờ-lê ống nước' },
  { slug: 'crowbar_01', id: 'crowbar', label: 'Xà beng' },
  { slug: 'sledgehammer_01', id: 'sledgehammer', label: 'Búa tạ' },

  // Electrical / mechatronics — slide 17
  { slug: 'circuit_board', id: 'circuit-board', label: 'Bo mạch điện tử' },
  { slug: 'power_box_01', id: 'power-box', label: 'Tủ điện công nghiệp' },
  { slug: 'security_camera_01', id: 'security-camera', label: 'Camera giám sát' },
  { slug: 'classic_laptop', id: 'laptop', label: 'Máy tính kỹ thuật' },

  // Industrial environment — slide 19
  { slug: 'modular_industrial_pipes_01', id: 'industrial-pipes', label: 'Hệ ống công nghiệp' },
  { slug: 'portable_generator', id: 'generator', label: 'Máy phát điện' },
  { slug: 'ceiling_fan', id: 'ceiling-fan', label: 'Quạt trần' },

  // Workshop machines — slides 8, 9
  { slug: 'drill_press_01', id: 'drill-press', label: 'Máy khoan bàn' },
  { slug: 'old_drill_press', id: 'old-drill-press', label: 'Máy khoan cũ' },

  // Everyday objects for slide 4's stand-ins — kept for other scenes
  { slug: 'hand_plane_no4', id: 'hand-plane', label: 'Bào tay' },
  { slug: 'hand_truck', id: 'hand-truck', label: 'Xe đẩy hàng' },
];

// ── Helpers ────────────────────────────────────────────────────────────

async function fetchTo(url, dest) {
  if (fs.existsSync(dest)) return dest;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

// Poly Haven's .gltf files reference textures at a `textures/` path that does
// not exist on their CDN. The real files live under Models/jpg/<res>/<slug>/.
const CHANNEL_BY_TOKEN = {
  diff: 'Diffuse', nor_gl: 'nor_gl', nor_dx: 'nor_dx', arm: 'arm',
  rough: 'Rough', metal: 'Metal', ao: 'AO', disp: 'Displacement',
};

function resolveTextureUrl(uri, slug, apiFiles) {
  const base = path.basename(uri);
  const m = base.match(new RegExp(`^${slug}_(.+)_${RES}\\.(jpg|png|exr)$`));
  if (!m) return null;
  const channel = CHANNEL_BY_TOKEN[m[1]] ?? m[1];
  const entry = apiFiles[channel]?.[RES] ?? apiFiles[channel]?.['2k'];
  return entry?.jpg?.url ?? entry?.png?.url ?? null;
}

async function downloadPackage(slug) {
  const res = await fetch(`https://api.polyhaven.com/files/${slug}`);
  if (!res.ok) throw new Error(`files API HTTP ${res.status} for ${slug}`);
  const files = await res.json();

  const entry = files.gltf?.[RES] ?? files.gltf?.['2k'] ?? files.gltf?.['4k'];
  if (!entry?.gltf?.url) throw new Error(`no gltf for ${slug}`);

  const gltfUrl = entry.gltf.url;
  const pkgDir = path.join(CACHE_DIR, slug);
  const gltfPath = await fetchTo(gltfUrl, path.join(pkgDir, path.basename(gltfUrl)));
  const json = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));

  for (const b of json.buffers || []) {
    if (b.uri) {
      const base = gltfUrl.slice(0, gltfUrl.lastIndexOf('/') + 1);
      await fetchTo(base + b.uri, path.join(pkgDir, decodeURIComponent(b.uri)));
    }
  }

  for (const img of json.images || []) {
    if (!img.uri) continue;
    const realUrl = resolveTextureUrl(img.uri, slug, files);
    if (!realUrl) throw new Error(`cannot resolve texture ${img.uri} for ${slug}`);
    const localName = path.basename(new URL(realUrl).pathname);
    const localPath = await fetchTo(realUrl, path.join(pkgDir, 'textures', localName));
    shrinkTexture(localPath);
    img.uri = `textures/${localName}`;
  }

  fs.writeFileSync(gltfPath, JSON.stringify(json));
  return gltfPath;
}

// ── Run ────────────────────────────────────────────────────────────────

const only = process.argv[2];
const list = only ? MODELS.filter((m) => m.slug === only) : MODELS;
if (only && list.length === 0) {
  console.error(`unknown slug: ${only}`);
  process.exit(1);
}

const report = [];

for (const model of list) {
  process.stdout.write(`${model.slug.padEnd(30)} `);
  try {
    const gltfPath = await downloadPackage(model.slug);

    const ratio = DECIMATE[model.id];
    if (ratio) {
      const json = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));
      const binPath = path.join(path.dirname(gltfPath), decodeURIComponent(json.buffers[0].uri));
      const bin = fs.readFileSync(binPath);
      const res = await decimateGltf(json, bin, ratio);
      if (res.after > 0) {
        fs.writeFileSync(binPath, bin);
        fs.writeFileSync(gltfPath, JSON.stringify(json));
        process.stdout.write(`[${res.before.toLocaleString()}->${res.after.toLocaleString()}t] `);
      }
    }

    const outPath = path.join(OUT_DIR, `${model.id}.glb`);
    const packed = packGlb(gltfPath, outPath);
    console.log(
      `-> ${model.id}.glb  ${String(Math.round(packed.bytes / 1024)).padStart(5)} KB  ${String(packed.triangles).padStart(7)} tris`,
    );
    report.push({ ...model, kb: Math.round(packed.bytes / 1024), tris: packed.triangles });
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
}

// ── Credits ────────────────────────────────────────────────────────────

const lines = [
  '# 3D model credits',
  '',
  '## Poly Haven (CC0 — public domain)',
  '',
  'https://polyhaven.com/models — no attribution required, credited here anyway.',
  '',
  '| File | Model | Source |',
  '|---|---|---|',
];
for (const r of report) lines.push(`| \`${r.id}.glb\` | ${r.label} (${r.slug}) | Poly Haven |`);
lines.push(
  '',
  '## Converted from the project\u2019s own source files',
  '',
  '| File | Source |',
  '|---|---|',
  '| `bicycle.glb` | `3D models/Biycle_Pacific_Invert_6.0` |',
  '| `arduino-mega.glb` | `3D models/Arduino Mega.fbx` |',
  '',
);
fs.writeFileSync(path.join(OUT_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${report.length} models, ${report.reduce((s, r) => s + r.kb, 0)} KB`);
