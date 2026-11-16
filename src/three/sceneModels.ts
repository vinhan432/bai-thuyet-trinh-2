import { ModelId, preloadModels } from './modelLoader';

/**
 * Which GLB models each 3D scene uses. Used to warm the next slide's models
 * so they are ready before the presenter arrives, without dumping the whole
 * library on the first page load.
 */
const SCENE_MODELS: Record<string, ModelId[]> = {
  'bicycle-gear': ['bicycle'],
  'everyday-objects': ['bicycle', 'ceiling-fan', 'hand-plane', 'hand-truck'],
  'maintenance-tools': [
    'adjustable-wrench',
    'oil-can',
    'sledgehammer',
    'crowbar',
    'handsaw',
    'tool-chest',
  ],
  'cnc-mill': ['bench-vice', 'measuring-tape', 'old-drill-press'],
  lathe: ['drill', 'wrench', 'drill-press'],
  mechatronics: ['arduino-mega', 'circuit-board', 'laptop'],
  'factory-particles': [
    'generator',
    'power-box',
    'industrial-pipes',
    'tool-chest',
    'security-camera',
    'ceiling-fan',
  ],
  'tools-grid': [
    'wrench',
    'drill',
    'screwdriver',
    'hammer',
    'measuring-tape',
    'bench-vice',
    'handsaw',
    'bolt-cutters',
    'pipe-wrench',
  ],
};

export function preloadSceneModels(sceneId: string): void {
  const ids = SCENE_MODELS[sceneId];
  if (ids) preloadModels(ids);
}

export function sceneUsesModels(sceneId: string): boolean {
  return Boolean(SCENE_MODELS[sceneId]);
}
