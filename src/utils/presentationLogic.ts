export type TransitionKind = 'default' | 'morph' | 'darkReveal' | 'bounce';

export const SLIDE_TRANSITIONS: Record<string, TransitionKind> = {
  '1→2': 'morph',
  '2→3': 'morph',
  '3→4': 'bounce',
  '4→5': 'morph',
  '5→6': 'morph',
  '6→7': 'morph',
  '7→8': 'default',
  '8→9': 'morph',
  '9→10': 'darkReveal',
  '10→11': 'default',
  '11→12': 'morph',
  '12→13': 'default',
  '13→14': 'default',
  '14→15': 'default',
  '15→16': 'darkReveal',
  '16→17': 'default',
  '17→18': 'morph',
  '18→19': 'default',
  '19→20': 'bounce',
  '20→21': 'morph',
  '21→22': 'morph',
  '22→23': 'morph',
};

export function getTransitionKind(fromSlideId: number, toSlideId: number): TransitionKind {
  return SLIDE_TRANSITIONS[`${fromSlideId}→${toSlideId}`] ?? 'default';
}

export function clampSlideIndex(index: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return Math.max(0, Math.min(totalSlides - 1, Math.trunc(index)));
}

export function nextSlideIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return (currentIndex + 1) % totalSlides;
}

export function prevSlideIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return currentIndex <= 0 ? 0 : currentIndex - 1;
}

export function parseNumericJumpBuffer(buffer: string, totalSlides: number): number | null {
  const trimmed = buffer.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1 || parsed > totalSlides) return null;
  return parsed - 1;
}

/**
 * Exponential frame-rate independent damping helper: 1 - Math.exp(-k * dt)
 */
export function dampValue(current: number, target: number, lambda: number, dt: number): number {
  const alpha = 1 - Math.exp(-Math.max(0, lambda) * Math.min(Math.max(0, dt), 0.1));
  return current + (target - current) * alpha;
}

/**
 * Computes angular velocity multiplier for meshing spur gears.
 * Negative sign reverses rotation direction between adjacent meshing gears.
 */
export function computeGearMeshingAngle(driverAngle: number, driverTeeth: number, drivenTeeth: number): number {
  if (drivenTeeth <= 0) return 0;
  return -driverAngle * (driverTeeth / drivenTeeth);
}

/**
 * Computes caliper readout in millimeters from normalized jaw opening [0..1].
 * Range maps cleanly between 12.50 mm (closed on small shaft) and 45.00 mm (wide shaft).
 */
export function computeCaliperMm(normalizedOpen: number): string {
  const clamped = Math.max(0, Math.min(1, normalizedOpen));
  const mm = 12.5 + clamped * 32.5;
  return `${mm.toFixed(2)} mm`;
}

/**
 * Computes 4-cylinder inline/V4 piston vertical offsets in firing order 1-3-4-2.
 */
export function computeV4PistonOffsets(crankAngle: number, strokeAmplitude = 0.24): [number, number, number, number] {
  // Firing phases for 1-3-4-2 across 720deg (or 180deg crank throw symmetry)
  const phases = [0, Math.PI, Math.PI, 0];
  return [
    Math.sin(crankAngle + phases[0]) * strokeAmplitude,
    Math.sin(crankAngle + phases[1]) * strokeAmplitude,
    Math.sin(crankAngle + phases[2]) * strokeAmplitude,
    Math.sin(crankAngle + phases[3]) * strokeAmplitude,
  ];
}

/**
 * Formats slide counter with zero-padding, e.g., "04 / 23".
 */
export function formatSlideCounter(index: number, totalSlides: number): string {
  const current = String(clampSlideIndex(index, totalSlides) + 1).padStart(2, '0');
  const total = String(totalSlides).padStart(2, '0');
  return `${current} / ${total}`;
}
