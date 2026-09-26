// Fable pass 37 (2026-09-26): source pins for the two fixes Fable shipped — F-201 (the 3D top-five labels are positioned by
// their transform alone, so they sit beside their spheres instead of stacking at the left edge) and F-202 (the bubble charts'
// 2× label and direction hints never drop under the 10 px floor on phones).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const bubble = readFileSync(new URL('../components/JevBubbleChart.tsx', import.meta.url), 'utf8');
const three = readFileSync(new URL('../components/JevCapability3D.tsx', import.meta.url), 'utf8');

test('F-201: every child of the 3D label layer is absolutely positioned (transform-only placement)', () => {
  assert.match(css, /\.bh-jev-3d-labels > \* \{[^}]*position: absolute;[^}]*white-space: nowrap;/);
  assert.match(three, /className = 'bh-jev-3d-model-label'/, 'the DOM label path still uses the class the rule targets');
});

test('F-202: the bubble separator label and its direction hints are 10 px at every width', () => {
  assert.doesNotMatch(bubble, /fontSize=\{narrow \? 9 : 10\}/);
  const sep = bubble.slice(bubble.indexOf('const separator = ('), bubble.indexOf('</g>;', bubble.indexOf('const separator = (')));
  const sizes = [...sep.matchAll(/fontSize="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length >= 5, `expected the label and four hint texts, saw ${sizes.length}`);
  assert.ok(sizes.every((s) => s >= 10), `separator text sizes ${sizes.join(', ')}`);
});
