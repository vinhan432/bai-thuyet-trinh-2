import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODELS, ModelId } from './modelManifest';

/**
 * Lazily loads the GLB models in public/models and hands out independent
 * clones.
 *
 * Scenes are built synchronously when a slide mounts, so they cannot await a
 * fetch. Instead a scene renders its procedural placeholder immediately and
 * swaps in the real mesh the moment the model arrives.
 */

export type { ModelId };

const cache = new Map<ModelId, THREE.Group>();
const pending = new Map<ModelId, Promise<THREE.Group | null>>();
const listeners = new Map<ModelId, Set<(root: THREE.Group | null) => void>>();

const loader = new GLTFLoader();

function basePath(): string {
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return base.endsWith('/') ? base : `${base}/`;
}

function load(id: ModelId): Promise<THREE.Group | null> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(id);
  if (inflight) return inflight;

  const entry = MODELS[id];
  if (!entry) return Promise.resolve(null);

  const promise = loader
    .loadAsync(`${basePath()}${entry.url}`)
    .then((gltf) => {
      const root = gltf.scene;
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std && 'envMapIntensity' in std) std.envMapIntensity = 1.1;
        }
      });
      cache.set(id, root);
      pending.delete(id);
      listeners.get(id)?.forEach((cb) => cb(root));
      listeners.delete(id);
      return root;
    })
    .catch((err) => {
      console.warn(`[models] failed to load ${id}:`, err);
      pending.delete(id);
      listeners.get(id)?.forEach((cb) => cb(null));
      listeners.delete(id);
      return null;
    });

  pending.set(id, promise);
  return promise;
}

export function preloadModel(id: ModelId): void {
  void load(id);
}

export function preloadModels(ids: ModelId[]): void {
  ids.forEach(preloadModel);
}

/** A fresh, independent clone, or null while the model is still loading. */
export function getModelClone(id: ModelId): THREE.Group | null {
  const root = cache.get(id);
  if (!root) {
    preloadModel(id);
    return null;
  }
  const clone = root.clone(true);
  clone.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Buffers are shared with every other clone: never dispose them.
      mesh.userData.sharedGeometry = true;
    }
  });
  return clone;
}

/**
 * True when a model contains a skinned mesh. Rigged models keep their
 * hierarchy, so they are scaled as a whole instead of being flattened.
 */
function hasSkinnedMesh(root: THREE.Object3D): boolean {
  let found = false;
  root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}

/**
 * Flatten every descendant mesh's transform into its geometry, so the model
 * behaves as one rigid object under a single scale.
 *
 * The geometry is cloned first: `Object3D.clone()` shares buffers with the
 * cached original, so baking in place would corrupt every other clone.
 */
function bakeChildTransforms(root: THREE.Object3D): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(mesh);
  });

  for (const mesh of meshes) {
    mesh.updateWorldMatrix(true, false);
    const local = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);

    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.applyMatrix4(local);
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    mesh.userData.sharedGeometry = false;

    if (mesh.parent !== root) {
      mesh.parent?.remove(mesh);
      root.add(mesh);
    }
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    mesh.updateMatrix();
  }
}

/** Bounding box of a rigged model, measured from its bones. */
function measureRig(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let found = false;
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    o.getWorldPosition(v);
    box.expandByPoint(v);
    found = true;
  });
  return found ? box : new THREE.Box3().setFromObject(root);
}

/**
 * Scale a model so its largest dimension equals `target`, and centre it on
 * its parent's origin.
 *
 * The bounding box is measured in world space, so the centre is converted back
 * into the parent's local space before it is applied — otherwise a model
 * inside an offset group would be dragged back to the world origin.
 */
export function fitModel(model: THREE.Object3D, target: number): THREE.Vector3 {
  model.scale.setScalar(1);
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.updateMatrixWorld(true);

  const rigged = hasSkinnedMesh(model);
  if (!rigged) {
    bakeChildTransforms(model);
    model.updateMatrixWorld(true);
  }

  const box = rigged ? measureRig(model) : new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = target / maxDim;

  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = rigged ? measureRig(model) : new THREE.Box3().setFromObject(model);
  const worldCentre = scaledBox.getCenter(new THREE.Vector3());
  const parent = model.parent;
  const localCentre = parent ? parent.worldToLocal(worldCentre.clone()) : worldCentre;

  model.position.set(-localCentre.x, -localCentre.y, -localCentre.z);
  model.updateMatrixWorld(true);

  return size.multiplyScalar(scale);
}

/**
 * Fit a model and rest it on a surface: its lowest point ends up at `groundY`
 * in the parent's space.
 */
export function fitModelOnGround(model: THREE.Object3D, target: number, groundY = 0): THREE.Vector3 {
  const size = fitModel(model, target);
  const box = new THREE.Box3().setFromObject(model);
  const parent = model.parent;
  const worldLow = new THREE.Vector3(box.min.x, box.min.y, box.min.z);
  const localLow = parent ? parent.worldToLocal(worldLow) : worldLow;
  model.position.y += groundY - localLow.y;
  model.updateMatrixWorld(true);
  return size;
}

/**
 * Drop a model clone into `parent` once ready, replacing `placeholder`.
 * Returns a cleanup function that cancels the swap.
 */
export function mountModelWhenReady(
  id: ModelId,
  parent: THREE.Object3D,
  options: {
    placeholder?: THREE.Object3D | null;
    onPlaceholderRemoved?: (placeholder: THREE.Object3D) => void;
    onReady?: (root: THREE.Group) => void;
  } = {},
): () => void {
  let cancelled = false;
  let mounted: THREE.Group | null = null;

  const unsubscribe = onModelReady(id, (source) => {
    if (cancelled || !source) return;
    const clone = getModelClone(id);
    if (!clone) return;
    mounted = clone;
    if (options.placeholder) {
      parent.remove(options.placeholder);
      options.onPlaceholderRemoved?.(options.placeholder);
    }
    parent.add(clone);
    options.onReady?.(clone);
  });

  return () => {
    cancelled = true;
    unsubscribe();
    if (mounted) {
      parent.remove(mounted);
      mounted = null;
    }
  };
}

/** Subscribe to a model becoming available. Fires immediately when cached. */
export function onModelReady(id: ModelId, cb: (root: THREE.Group | null) => void): () => void {
  const cached = cache.get(id);
  if (cached) {
    cb(cached);
    return () => {};
  }
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(cb);
  preloadModel(id);
  return () => {
    listeners.get(id)?.delete(cb);
  };
}

export function isModelReady(id: ModelId): boolean {
  return cache.has(id);
}
