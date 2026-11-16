import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSlideIndex,
  nextSlideIndex,
  prevSlideIndex,
  parseNumericJumpBuffer,
  getTransitionKind,
  dampValue,
  computeGearMeshingAngle,
  computeCaliperMm,
  computeV4PistonOffsets,
  formatSlideCounter,
} from './presentationLogic';

test('slide navigation wraps forward from last slide and clamps backward at 0', () => {
  assert.equal(nextSlideIndex(0, 23), 1);
  assert.equal(nextSlideIndex(22, 23), 0);
  assert.equal(prevSlideIndex(0, 23), 0);
  assert.equal(prevSlideIndex(5, 23), 4);
  assert.equal(clampSlideIndex(-4, 23), 0);
  assert.equal(clampSlideIndex(99, 23), 22);
});

test('numeric jump buffer parses valid 1..23 slide numbers and rejects invalid input', () => {
  assert.equal(parseNumericJumpBuffer('1', 23), 0);
  assert.equal(parseNumericJumpBuffer('12', 23), 11);
  assert.equal(parseNumericJumpBuffer('23', 23), 22);
  assert.equal(parseNumericJumpBuffer('0', 23), null);
  assert.equal(parseNumericJumpBuffer('24', 23), null);
  assert.equal(parseNumericJumpBuffer('abc', 23), null);
});

test('transition mapping returns morph and darkReveal on key narrative shifts', () => {
  assert.equal(getTransitionKind(5, 6), 'morph');
  assert.equal(getTransitionKind(9, 10), 'darkReveal');
  assert.equal(getTransitionKind(15, 16), 'darkReveal');
  assert.equal(getTransitionKind(22, 23), 'morph');
  assert.equal(getTransitionKind(7, 8), 'default');
});

test('kinematic helpers compute meshing gear ratio, caliper mm, V4 offsets, and exponential damping', () => {
  assert.equal(computeGearMeshingAngle(1.0, 20, 10), -2.0);
  assert.equal(computeCaliperMm(0), '12.50 mm');
  assert.equal(computeCaliperMm(1), '45.00 mm');

  const pistons = computeV4PistonOffsets(Math.PI / 2, 0.25);
  assert.ok(Math.abs(pistons[0] - 0.25) < 1e-6);
  assert.ok(Math.abs(pistons[1] + 0.25) < 1e-6);
  assert.ok(Math.abs(pistons[2] + 0.25) < 1e-6);
  assert.ok(Math.abs(pistons[3] - 0.25) < 1e-6);

  const damped = dampValue(0, 10, 6, 0.016);
  assert.ok(damped > 0 && damped < 10);
});

test('formatSlideCounter formats zero-padded tabular index', () => {
  assert.equal(formatSlideCounter(0, 23), '01 / 23');
  assert.equal(formatSlideCounter(11, 23), '12 / 23');
});
