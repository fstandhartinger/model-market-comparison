import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevGatePenalties, weightedJevScore, OFFICIAL_WEIGHTS } from '../lib/jevbench-axis-weights.mjs';
import { jevV15BoardScore, jevV15SliderPresets } from '../lib/jevbench-v15-board.mjs';

// CR-256 (Florian 1 Oct 2026): "Intelligence 95 / Speed 5 — why is the order not the Intelligence order?" The answer
// is the v1.5 low-axis gates, which apply even at weight 0. These tests pin the worked example and require that the
// gates the board shows explain every score exactly.
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const artifact = JSON.parse(read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json'));
const systems = artifact.systems.filter((s) => s.axes && Number.isFinite(s.axes.intelligence));
const byName = (re) => systems.find((s) => re.test(s.display));
const SCREENSHOT = { intelligence: 95, calibration: 0, speed: 5, cost: 0 };
const INTELLIGENCE_ONLY = { intelligence: 100, calibration: 0, speed: 0, cost: 0 };

test('CR-256: the screenshot numbers are the harmonic mean times the weight-0 Cost gate', () => {
  const luna = byName(/^GPT-6 Luna \(low/);
  const p = jevGatePenalties(luna.axes, SCREENSHOT, { gatesAlways: true });
  assert.deepEqual(p.gates.map((g) => [g.axis, g.weighted]), [['cost', false]]);
  assert.equal(p.ungated.toFixed(1), '93.9');
  assert.equal(p.factor.toFixed(2), '0.61');
  assert.equal(jevV15BoardScore(luna.axes, SCREENSHOT).toFixed(1), '57.3');
  const canvas = byName(/^Open Jev JSON Canvas/);
  assert.equal(jevV15BoardScore(canvas.axes, SCREENSHOT).toFixed(1), '75.3');
  assert.equal(jevGatePenalties(canvas.axes, SCREENSHOT, { gatesAlways: true }).gates[0].axis, 'cost');
});

test('CR-256: shown gates explain every score exactly, for presets and custom weights, both scorers', () => {
  const weightSets = [OFFICIAL_WEIGHTS, SCREENSHOT, INTELLIGENCE_ONLY, { intelligence: 0, calibration: 50, speed: 50, cost: 0 }, { intelligence: 10, calibration: 0, speed: 0, cost: 90 },
    ...jevV15SliderPresets(artifact).map((p) => p.weights)];
  for (const w of weightSets) for (const s of systems) {
    for (const [score, gatesAlways] of [[jevV15BoardScore, true], [weightedJevScore, false]]) {
      const expected = score(s.axes, w);
      const p = jevGatePenalties(s.axes, w, { gatesAlways });
      const explained = p.ungated == null ? null : p.ungated * p.factor;
      if (expected == null) assert.equal(explained, null);
      else assert.ok(Math.abs(expected - explained) < 1e-9, `${s.display} ${JSON.stringify(w)}`);
    }
  }
});

test('CR-256: "Intelligence only" equals the Intelligence column except for rows with a shown gate', () => {
  const scored = systems.map((s) => ({ s, score: jevV15BoardScore(s.axes, INTELLIGENCE_ONLY), p: jevGatePenalties(s.axes, INTELLIGENCE_ONLY, { gatesAlways: true }) }));
  for (const { s, score, p } of scored) {
    if (!p.gates.length) assert.ok(Math.abs(score - s.axes.intelligence) < 1e-9, s.display);
    else assert.ok(score <= s.axes.intelligence && (score < s.axes.intelligence || s.axes.intelligence === 0), s.display);
    assert.ok(Math.abs(p.ungated - s.axes.intelligence) < 1e-9);
  }
  const ungatedOrder = [...scored].sort((a, b) => b.p.ungated - a.p.ungated).map((x) => x.s.key);
  const intelligenceOrder = [...scored].sort((a, b) => b.s.axes.intelligence - a.s.axes.intelligence).map((x) => x.s.key);
  assert.deepEqual(ungatedOrder, intelligenceOrder);
});

test('CR-256: the v1.4 scorer drops a gate together with its weight-0 axis', () => {
  const p = jevGatePenalties({ intelligence: 90, calibration: 90, speed: 90, cost: 30 }, INTELLIGENCE_ONLY);
  assert.equal(p.gates.length, 0);
  assert.equal(weightedJevScore({ intelligence: 90, calibration: 90, speed: 90, cost: 30 }, INTELLIGENCE_ONLY), 90);
});

test('CR-256: the board names the gates in the row tag, the weights panel and the method notes', () => {
  const shared = read('../components/JevBoardShared.tsx');
  assert.match(shared, /data-bh-jev-gate=\{row\.key\}/);
  assert.match(shared, /applies although its weight is 0/);
  const board = read('../components/JevBoardInteractive.tsx');
  assert.match(board, /data-bh-jev-gates-applied/);
  assert.match(board, /\+ Penalties applied:/);
  assert.match(board, /gate=\{gates\.get\(row\.key\) \?\? null\}/);
  assert.match(read('../components/JevBenchV15Preview.tsx'), /data-bh-jev-gates-method/);
  assert.match(read('../app/jev-models/multimodal-preview/page.tsx'), /gate ×…/);
});
