import * as THREE from 'three';

export interface MaterialBank {
  goldenMetal: THREE.MeshStandardMaterial;
  warmMetal: THREE.MeshStandardMaterial;
  copperMetal: THREE.MeshStandardMaterial;
  matteSteel: THREE.MeshStandardMaterial;
  darkIron: THREE.MeshStandardMaterial;
  chromeAccent: THREE.MeshStandardMaterial;
  blueprintWire: THREE.MeshBasicMaterial;
  glowingAmber: THREE.MeshStandardMaterial;
  glowingLavender: THREE.MeshStandardMaterial;
  glowingMint: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  brushedBump: THREE.CanvasTexture;
  caliperScaleTex: THREE.CanvasTexture;
  gaugeDialTex: THREE.CanvasTexture;
  blueprintGridTex: THREE.CanvasTexture;
  dispose: () => void;
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const v = 108 + Math.floor(Math.sin(y * 0.7) * 18 + (Math.random() - 0.5) * 32);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 256, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 1;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 120);
  grad.addColorStop(0, 'rgba(61, 48, 40, 0.42)');
  grad.addColorStop(0.55, 'rgba(61, 48, 40, 0.16)');
  grad.addColorStop(1, 'rgba(61, 48, 40, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCaliperScaleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#E5DDD0';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#2D2520';
  ctx.fillStyle = '#2D2520';
  ctx.font = 'bold 18px monospace';

  for (let i = 0; i <= 60; i++) {
    const x = 24 + i * 7.6;
    const isMajor = i % 10 === 0;
    const isMid = i % 5 === 0 && !isMajor;
    const h = isMajor ? 44 : isMid ? 30 : 18;
    ctx.lineWidth = isMajor ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x, 128 - h);
    ctx.stroke();
    if (isMajor) {
      ctx.fillText(String(i), x - 7, 62);
    }
  }
  ctx.font = '600 16px sans-serif';
  ctx.fillStyle = '#5C534B';
  ctx.fillText('mm · ĐỘ CHÍNH XÁC 0.02', 24, 30);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createCarGaugeDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFF7EB';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2D2520';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 16; i++) {
    const angle = Math.PI * 0.75 + (i / 16) * Math.PI * 1.5;
    const rOut = 108;
    const rIn = i % 2 === 0 ? 88 : 96;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(angle) * rIn, 128 + Math.sin(angle) * rIn);
    ctx.lineTo(128 + Math.cos(angle) * rOut, 128 + Math.sin(angle) * rOut);
    ctx.stroke();
  }
  ctx.fillStyle = '#E87B5A';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('km/h', 128, 185);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBlueprintGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#F5EDE3';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(106, 173, 207, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(106, 173, 207, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Materials use MeshStandardMaterial (not Physical) so no clearcoat/anisotropy
 * shader branches run per pixel. Image-based lighting from the studio
 * environment still gives the polished metal read at a fraction of the cost.
 */
export function createMaterialBank(maxAnisotropy: number): MaterialBank {
  const brushedBump = createBrushedMetalTexture();
  const contactShadowTex = createContactShadowTexture();
  const caliperScaleTex = createCaliperScaleTexture(maxAnisotropy);
  const gaugeDialTex = createCarGaugeDialTexture(maxAnisotropy);
  const blueprintGridTex = createBlueprintGridTexture(maxAnisotropy);

  const goldenMetal = new THREE.MeshStandardMaterial({
    color: 0xd4a03c,
    metalness: 0.88,
    roughness: 0.26,
    bumpMap: brushedBump,
    bumpScale: 0.008,
    envMapIntensity: 1.15,
  });

  const warmMetal = new THREE.MeshStandardMaterial({
    color: 0xe2d9cc,
    metalness: 0.8,
    roughness: 0.32,
    bumpMap: brushedBump,
    bumpScale: 0.006,
    envMapIntensity: 1.05,
  });

  const copperMetal = new THREE.MeshStandardMaterial({
    color: 0xd08a5c,
    metalness: 0.9,
    roughness: 0.24,
    bumpMap: brushedBump,
    bumpScale: 0.007,
    envMapIntensity: 1.2,
  });

  const matteSteel = new THREE.MeshStandardMaterial({
    color: 0x9a938c,
    metalness: 0.5,
    roughness: 0.58,
  });

  const darkIron = new THREE.MeshStandardMaterial({
    color: 0x453c36,
    metalness: 0.6,
    roughness: 0.55,
  });

  const chromeAccent = new THREE.MeshStandardMaterial({
    color: 0xf6f1ea,
    metalness: 0.95,
    roughness: 0.12,
    envMapIntensity: 1.3,
  });

  const blueprintWire = new THREE.MeshBasicMaterial({
    color: 0x4e96bd,
    wireframe: true,
    transparent: true,
    opacity: 0.75,
  });

  const glowingAmber = new THREE.MeshStandardMaterial({
    color: 0xffb55e,
    emissive: 0xf27d32,
    emissiveIntensity: 1.5,
    roughness: 0.4,
    metalness: 0.1,
  });

  const glowingLavender = new THREE.MeshStandardMaterial({
    color: 0xc5aee6,
    emissive: 0x8c6bb8,
    emissiveIntensity: 0.7,
    roughness: 0.35,
    metalness: 0.2,
  });

  const glowingMint = new THREE.MeshStandardMaterial({
    color: 0x82c9b5,
    emissive: 0x4ba88d,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    metalness: 0.15,
  });

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });

  const allMaterials: THREE.Material[] = [
    goldenMetal,
    warmMetal,
    copperMetal,
    matteSteel,
    darkIron,
    chromeAccent,
    blueprintWire,
    glowingAmber,
    glowingLavender,
    glowingMint,
    contactShadowMat,
  ];
  const allTextures: THREE.Texture[] = [
    brushedBump,
    contactShadowTex,
    caliperScaleTex,
    gaugeDialTex,
    blueprintGridTex,
  ];

  return {
    goldenMetal,
    warmMetal,
    copperMetal,
    matteSteel,
    darkIron,
    chromeAccent,
    blueprintWire,
    glowingAmber,
    glowingLavender,
    glowingMint,
    contactShadowMat,
    brushedBump,
    caliperScaleTex,
    gaugeDialTex,
    blueprintGridTex,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
      allTextures.forEach((t) => t.dispose());
    },
  };
}

export function makeSoftPolymer(color: number, roughness = 0.72): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.06,
    roughness,
  });
}

export function createContactShadowDisc(
  mat: THREE.MeshBasicMaterial,
  radius = 2.2,
  y = -1.25,
): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 28);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = -1;
  return mesh;
}
