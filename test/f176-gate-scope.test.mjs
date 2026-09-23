// Iteration 189 (2026-09-23) — D189: the pass-33 acceptance gate could not see what it judged.
// `verify-fable-pass33-design.mjs` scoped F-176(b) to [data-bh-jevc-chart], an attribute only the
// v1.1/v1.2 hub charts carry, so the check read empty text and passed while the licence sentence was
// live in the v1.4 capability suite; and its text helper called innerText on SVG <text>, which is
// undefined there, so the run died before the mobile and dark contexts.
// These pins are behavioural: the selector is resolved against the component that renders the target,
// and each helper is evaluated against an SVG-shaped node rather than matched by spelling.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gate = readFileSync(new URL('../ops/ux-2026-09-12/bin/verify-fable-pass33-design.mjs', import.meta.url), 'utf8');
const chart = readFileSync(new URL('../components/JevCapabilityChart.tsx', import.meta.url), 'utf8');

test('D189: F-176(b) is scoped to an element the capability chart actually renders', () => {
  const m = gate.match(/const cap = p\.locator\('\[([a-z0-9-]+)\]'\)/);
  assert.ok(m, 'the F-176(b) check still resolves its container through one attribute selector');
  const attr = m[1];
  assert.ok(
    new RegExp(`\\b${attr}\\b`).test(chart),
    `the gate judges [${attr}], which components/JevCapabilityChart.tsx does not render — the check would read empty text and pass blind`,
  );
  // The v1.1/v1.2 hub charts carry data-bh-jevc-chart; the v1.4 capability suite never does.
  assert.equal(attr, 'data-bh-jev14-capability-suite');
  assert.equal(/data-bh-jevc-chart/.test(chart), false, 'the v1.4 capability chart does not carry the old hub attribute');
});

test('D189: an absent container fails F-176(b) instead of passing it', () => {
  assert.match(gate, /capPresent && !\/three\\\.js r\\d\+ is included\/i\.test\(capText\)/, 'a missing capability suite cannot satisfy the licence check');
  assert.match(gate, /\(b\) capability suite present to judge/, 'the gate states separately that it found something to judge');
});

test('D189: every page-evaluate text helper survives an SVG node', () => {
  // SVG <text>/<tspan> expose textContent but not innerText; the F-174 label sweep queries them.
  const helpers = [...gate.matchAll(/const t = \(el\) => \(el \? ([^;]+?) : ''\);/g)].map((m) => m[1]);
  assert.ok(helpers.length >= 2, `expected the evaluate helpers, found ${helpers.length}`);
  for (const body of helpers) {
    const fn = new Function('el', `return el ? ${body} : '';`);
    assert.equal(fn({ textContent: ' a  b ' }), 'a b', `helper "${body}" must fall back to textContent`);
    assert.equal(fn({ innerText: ' c  d ' }), 'c d', `helper "${body}" must still read innerText`);
    assert.equal(fn(null), '');
  }
});

test('D189: ONLY skips the other groups’ page work, not just their checks', () => {
  assert.match(gate, /const wantHub = !ONLY \|\| \[[^\]]*\]\.includes\(ONLY\)/, 'the hub evaluate is gated by ONLY');
  assert.match(gate, /const hub = !wantHub \? null : await p\.evaluate/, 'the hub evaluate does not run for an unrelated group');
  assert.match(gate, /if \(!ONLY \|\| ONLY === 'F-171'\) for \(const key of/, 'the leaf-page loop is gated by ONLY');
});
