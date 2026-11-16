import * as THREE from 'three';

export interface SceneControlState {
  exploded: boolean;
  cadWireframe: boolean;
  cncAxesVisible: boolean;
  weldStage: number; // 0..2
  sheetBendAngle: number; // 0..90 deg
  engineRpmMultiplier: number; // 0.3..2.5
  caliperOpenNorm: number; // 0..1
  robotSpeed: number; // 0.4..2.0
  selectedObjectIndex: number; // -1 or >= 0
  pointerNDC: THREE.Vector2;
  hoveredMeshName: string | null;
}

export interface SceneLabelAnchor {
  id: string;
  object: THREE.Object3D;
  offset: THREE.Vector3;
  title: string;
  description: string;
  requiresExploded?: boolean;
  requiresAxes?: boolean;
}

export interface SceneClickResult {
  title: string;
  description: string;
  focusPos?: [number, number, number];
  focusTarget?: [number, number, number];
  selectedIndex?: number;
  targetSlide?: number;
}

export interface SceneRuntime {
  root: THREE.Group;
  interactables: THREE.Object3D[];
  labelAnchors: SceneLabelAnchor[];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  autoOrbit: boolean;
  orbitSpeed: number;
  darkAtmosphere: boolean;
  update: (dt: number, elapsed: number, state: SceneControlState) => void;
  onObjectClick?: (obj: THREE.Object3D) => SceneClickResult | null;
  triggerWobble?: (obj: THREE.Object3D) => void;
  /** Optional extra teardown (e.g. cancelling a pending model swap). */
  cleanup?: () => void;
  dispose: () => void;
}
