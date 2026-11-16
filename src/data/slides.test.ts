import test from 'node:test';
import assert from 'node:assert/strict';
import { SLIDES, ASSEMBLY_CUBE_PARTS, ENGINE_PARTS } from './slides';

test('deck contains exactly 23 sequential slides', () => {
  assert.equal(SLIDES.length, 23);
  SLIDES.forEach((slide, index) => {
    assert.equal(slide.id, index + 1, `Slide at index ${index} should have id ${index + 1}`);
  });
});

test('no two consecutive slides share the same layout archetype', () => {
  for (let i = 1; i < SLIDES.length; i++) {
    assert.notEqual(
      SLIDES[i].layout,
      SLIDES[i - 1].layout,
      `Slide ${SLIDES[i].id} repeats layout "${SLIDES[i].layout}" from Slide ${SLIDES[i - 1].id}`,
    );
  }
});

test('all slides have non-empty Vietnamese headings and eyebrow', () => {
  for (const slide of SLIDES) {
    assert.ok(slide.title.trim().length > 0, `Slide ${slide.id} missing title`);
    assert.ok(slide.eyebrow.trim().length > 0, `Slide ${slide.id} missing eyebrow`);
    assert.ok(slide.shortTitle.trim().length > 0, `Slide ${slide.id} missing shortTitle`);
  }
});

test('exploded assembly and V4 engine configs define distinct labeled Vietnamese parts', () => {
  assert.equal(ASSEMBLY_CUBE_PARTS.length, 5);
  assert.equal(ENGINE_PARTS.length, 6);
  for (const part of [...ASSEMBLY_CUBE_PARTS, ...ENGINE_PARTS]) {
    assert.ok(part.meshName.length > 0);
    assert.ok(part.label.length > 0);
    assert.ok(part.description.length > 0);
  }
});
