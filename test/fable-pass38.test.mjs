// Fable pass 38 (2026-09-27): source pin for the one fix Fable shipped — F-207(a): a 3D top-five label sits on a translucent plate
// and carries a 3 × 11 px colour bar instead of an 8 px disc that read as a sixth sphere. The halo on the labelled sphere (F-207(b))
// and the context chart's pixel-scale rendering (F-208) are directed, not shipped here; their pins belong to the implementing iteration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const three = readFileSync(new URL('../components/JevCapability3D.tsx', import.meta.url), 'utf8');

test('F-207(a): the DOM top-five label has a translucent panel-colour plate', () => {
  const rule = css.match(/\.bh-jev-3d-labels \.bh-jev-3d-model-label \{([^}]*)\}/);
  assert.ok(rule, 'the plate rule exists');
  assert.match(rule[1], /background: rgb\(var\(--panel\) \/ \.8\d?\);/);
  assert.match(rule[1], /padding: 1px 5px 1px 4px;/);
  assert.match(rule[1], /border-radius: 4px;/);
});

test('F-207(a): the class marker is a bar, not a disc', () => {
  const rule = css.match(/\.bh-jev-3d-model-dot \{([^}]*)\}/);
  assert.ok(rule, 'the marker rule exists');
  assert.match(rule[1], /width: 3px;/);
  assert.match(rule[1], /height: 11px;/);
  assert.doesNotMatch(rule[1], /border-radius: 9999px/);
  assert.match(three, /dot\.className = 'bh-jev-3d-model-dot'/, 'the DOM label path still creates the marker the rule targets');
});
