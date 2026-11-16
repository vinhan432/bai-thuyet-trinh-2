import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { MaterialBank } from './materials';

export interface SpurGearOptions {
  outerRadius?: number;
  innerRadius?: number;
  teeth?: number;
  toothDepth?: number;
  thickness?: number;
  spokes?: number;
  rimMaterial?: THREE.Material;
  hubMaterial?: THREE.Material;
  boltMaterial?: THREE.Material;
}

/**
 * Bakes every mesh under `group` into one mesh per distinct material.
 * A composite gear is ~19 small meshes; merged it becomes 3-4 draw calls,
 * which is the single biggest win for the 23-scene deck.
 */
export function mergeGroupByMaterial(group: THREE.Group): THREE.Group {
  group.updateMatrixWorld(true);
  const inverseGroup = new THREE.Matrix4().copy(group.matrixWorld).invert();

  const byMaterial = new Map<THREE.Material, { geometries: THREE.BufferGeometry[]; cast: boolean; receive: boolean }>();
  const toRemove: THREE.Object3D[] = [];

  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const material = mesh.material as THREE.Material;

    let geo = mesh.geometry.clone();
    // Bake into the group's own local space.
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseGroup, mesh.matrixWorld));

    // Normalize so every geometry can merge: keep only position/normal/uv,
    // add missing ones, and make everything non-indexed so indexed
    // (Cylinder/Torus/Box) and non-indexed (Extrude) parts combine.
    const source = geo.index ? geo.toNonIndexed() : geo;
    if (source !== geo) geo.dispose();
    const position = source.getAttribute('position');
    const normalized = new THREE.BufferGeometry();
    normalized.setAttribute('position', position.clone());
    const normal = source.getAttribute('normal');
    normalized.setAttribute(
      'normal',
      normal ? normal.clone() : new THREE.BufferAttribute(new Float32Array(position.count * 3), 3),
    );
    const uv = source.getAttribute('uv');
    normalized.setAttribute(
      'uv',
      uv ? uv.clone() : new THREE.BufferAttribute(new Float32Array(position.count * 2), 2),
    );
    source.dispose();
    geo = normalized;

    let bucket = byMaterial.get(material);
    if (!bucket) {
      bucket = { geometries: [], cast: false, receive: false };
      byMaterial.set(material, bucket);
    }
    bucket.geometries.push(geo);
    bucket.cast = bucket.cast || mesh.castShadow;
    bucket.receive = bucket.receive || mesh.receiveShadow;
    toRemove.push(mesh);
  });

  toRemove.forEach((m) => m.parent?.remove(m));

  byMaterial.forEach((bucket, material) => {
    if (bucket.geometries.length === 0) return;
    const merged =
      bucket.geometries.length === 1
        ? bucket.geometries[0]
        : BufferGeometryUtils.mergeGeometries(bucket.geometries, false);
    if (!merged) {
      // Attributes still differed: keep them separate rather than losing geometry.
      bucket.geometries.forEach((g) => {
        const m = new THREE.Mesh(g, material);
        m.castShadow = bucket.cast;
        m.receiveShadow = bucket.receive;
        group.add(m);
      });
      return;
    }
    if (bucket.geometries.length > 1) {
      bucket.geometries.forEach((g) => g.dispose());
    }
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = bucket.cast;
    mesh.receiveShadow = bucket.receive;
    group.add(mesh);
  });

  return group;
}

/**
 * Builds a composite 4-part procedural spur gear (beveled toothed ring + web
 * spokes + stepped central hub collar + perimeter hex bolts), merged down to
 * one mesh per material.
 */
export function createCompositeSpurGear(
  mats: MaterialBank,
  opts: SpurGearOptions = {},
): THREE.Group {
  const outerRadius = opts.outerRadius ?? 1.25;
  const innerRadius = opts.innerRadius ?? 0.36;
  const teeth = opts.teeth ?? 20;
  const toothDepth = opts.toothDepth ?? 0.16;
  const thickness = opts.thickness ?? 0.28;
  const spokes = opts.spokes ?? 6;

  const rimMat = opts.rimMaterial ?? mats.goldenMetal;
  const hubMat = opts.hubMaterial ?? mats.matteSteel;
  const boltMat = opts.boltMaterial ?? mats.chromeAccent;

  const group = new THREE.Group();

  // 1. Primary silhouette: beveled toothed rim.
  const shape = new THREE.Shape();
  const rootR = outerRadius - toothDepth;
  const pitchR = outerRadius - toothDepth * 0.45;
  const pitchAngle = (Math.PI * 2) / teeth;

  for (let i = 0; i < teeth; i++) {
    const baseA = i * pitchAngle;
    const pts: [number, number][] = [
      [rootR, baseA + pitchAngle * 0.08],
      [pitchR, baseA + pitchAngle * 0.2],
      [outerRadius, baseA + pitchAngle * 0.3],
      [outerRadius, baseA + pitchAngle * 0.5],
      [pitchR, baseA + pitchAngle * 0.6],
      [rootR, baseA + pitchAngle * 0.72],
    ];
    pts.forEach(([r, a], j) => {
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0 && j === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();

  // Lightening cutouts between hub and rim.
  const webInner = innerRadius * 1.48;
  const webOuter = outerRadius - toothDepth - 0.16;
  if (webOuter - webInner > 0.14 && spokes >= 3) {
    const gapAngle = (Math.PI * 2) / spokes;
    const holeSpan = gapAngle * 0.54;
    for (let s = 0; s < spokes; s++) {
      const a0 = s * gapAngle + gapAngle * 0.23;
      const a1 = a0 + holeSpan;
      const hole = new THREE.Path();
      const segs = 10;
      for (let k = 0; k <= segs; k++) {
        const a = a0 + (k / segs) * (a1 - a0);
        const hx = Math.cos(a) * webInner;
        const hy = Math.sin(a) * webInner;
        if (k === 0) hole.moveTo(hx, hy);
        else hole.lineTo(hx, hy);
      }
      for (let k = segs; k >= 0; k--) {
        const a = a0 + (k / segs) * (a1 - a0);
        hole.lineTo(Math.cos(a) * webOuter, Math.sin(a) * webOuter);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  } else {
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(centerHole);
  }

  const gearGeo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.026,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  gearGeo.center();

  const gearMesh = new THREE.Mesh(gearGeo, rimMat);
  gearMesh.castShadow = true;
  gearMesh.receiveShadow = true;
  group.add(gearMesh);

  // 2. Machined web chamfer rings.
  if (webOuter - webInner > 0.18) {
    const grooveGeo = new THREE.TorusGeometry(webOuter + 0.04, 0.024, 8, 32);
    const grooveRing = new THREE.Mesh(grooveGeo, boltMat);
    grooveRing.position.z = thickness * 0.52;
    const grooveBack = grooveRing.clone();
    grooveBack.position.z = -thickness * 0.52;
    group.add(grooveRing, grooveBack);
  }

  // 3. Stepped hub collar.
  const hubGeo = new THREE.CylinderGeometry(innerRadius * 1.28, innerRadius * 1.34, thickness * 1.48, 24);
  hubGeo.rotateX(Math.PI / 2);
  const hubMesh = new THREE.Mesh(hubGeo, hubMat);
  hubMesh.castShadow = true;
  group.add(hubMesh);

  // 4. Bore rings + keyway.
  const boreGeo = new THREE.TorusGeometry(innerRadius * 0.72, 0.038, 10, 24);
  const boreFront = new THREE.Mesh(boreGeo, boltMat);
  boreFront.position.z = thickness * 0.75;
  const boreBack = boreFront.clone();
  boreBack.position.z = -thickness * 0.75;
  const keywayBar = new THREE.Mesh(
    new THREE.BoxGeometry(innerRadius * 0.28, innerRadius * 0.24, thickness * 1.62),
    mats.copperMetal,
  );
  keywayBar.position.set(0, innerRadius * 0.62, 0);
  group.add(boreFront, boreBack, keywayBar);

  // 5. Socket-head fasteners with washer collars.
  const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, thickness * 1.6, 6);
  boltGeo.rotateX(Math.PI / 2);
  const washerGeo = new THREE.CylinderGeometry(0.062, 0.062, thickness * 1.52, 10);
  washerGeo.rotateX(Math.PI / 2);
  const boltRadius = innerRadius * 1.02;
  for (let b = 0; b < 6; b++) {
    const ang = (b / 6) * Math.PI * 2;
    const bx = Math.cos(ang) * boltRadius;
    const by = Math.sin(ang) * boltRadius;
    const washer = new THREE.Mesh(washerGeo, mats.darkIron);
    washer.position.set(bx, by, 0);
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(bx, by, 0);
    group.add(washer, bolt);
  }

  return mergeGroupByMaterial(group);
}

/**
 * Recursively disposes geometries and any material not in the shared bank.
 *
 * Meshes flagged `userData.sharedGeometry` come from the GLB model cache and
 * share their buffers with every other clone, so they are left alone.
 */
export function disposeObjectTree(root: THREE.Object3D, sharedMaterials: Set<THREE.Material>): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh || (obj as THREE.LineSegments).isLineSegments || (obj as THREE.Points).isPoints) {
      if (mesh.userData?.sharedGeometry) return;
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          if (!sharedMaterials.has(m)) m.dispose();
        });
      } else if (mesh.material && !sharedMaterials.has(mesh.material)) {
        mesh.material.dispose();
      }
    }
  });
}
