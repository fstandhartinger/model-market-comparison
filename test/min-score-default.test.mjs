import test from 'node:test';
import assert from 'node:assert/strict';
import { derivedMinScore, minScoreLabel, DERIVED_MIN_SCORE_FLOOR } from '../lib/value-map.mjs';
import { paretoFrontier } from '../lib/pareto.mjs';

const pool = [
  { id: 'astra', x: 2.4, y: 91.2 },
  { id: 'fable', x: 1.9, y: 90.1 },
  { id: 'mid', x: 0.6, y: 84.0 },
  { id: 'glm', x: 0.31, y: 78.6 },
  { id: 'flash', x: 0.08, y: 72.9 },
  { id: 'free', x: 0, y: 99 },            // free routes are not on the log axis
  { id: 'flash-low', x: 0.08, y: 70.2 },  // equally cheap, lower score: not the anchor
];

test('CR-18.1: default = score of the cheapest plotted model (ties: highest score), rounded down to the step', () => {
  assert.equal(derivedMinScore(pool, { score: 'composite' }), 72);
  assert.equal(derivedMinScore(pool, { score: 'composite', step: 5 }), 70);
});

test('CR-18.1: that model passes and sits on the Pareto line, which reaches the right edge of the cloud', () => {
  const min = derivedMinScore(pool, { score: 'composite' });
  const plotted = pool.filter((p) => p.x > 0);
  const passing = plotted.filter((p) => p.y >= min);
  const frontier = paretoFrontier(passing);
  assert.ok(frontier.some((p) => p.id === 'flash'), 'cheapest top model on the frontier');
  assert.equal(Math.min(...frontier.map((p) => p.x)), Math.min(...plotted.map((p) => p.x)), 'line reaches the cheapest plotted cost');
});

test('CR-18.2: never below 65 for the Composite; Elo boards keep their own default', () => {
  assert.equal(DERIVED_MIN_SCORE_FLOOR, 65);
  assert.equal(derivedMinScore([{ x: 0.01, y: 50 }, { x: 1, y: 90 }], { score: 'composite' }), 65);
  assert.equal(derivedMinScore([{ x: 0.01, y: 1200 }], { score: 'designarena_fullstack' }), null);
});

test('CR-18.3: nothing plottable keeps the fixed default (null); input is not mutated', () => {
  assert.equal(derivedMinScore([], { score: 'composite' }), null);
  assert.equal(derivedMinScore([{ x: 0, y: 90 }, { x: NaN, y: 80 }], { score: 'composite' }), null);
  const copy = JSON.stringify(pool); derivedMinScore(pool); assert.equal(JSON.stringify(pool), copy);
});

test('CR-29.1: slider label names the Main Composite Score on its second line, else the selected score', () => {
  assert.deepEqual(minScoreLabel('composite', 'Composite'), { title: 'Minimum Capability Score', sub: 'Benchmark Heaven Main Composite Score' });
  assert.equal(minScoreLabel('aa_intelligence_index', 'AA Intelligence').sub, 'AA Intelligence');
});

import { valueMapYDomain } from '../lib/value-map.mjs';
test('CR-32.4: Y axis fits the plotted scores; 100 only when the best score is near it; Elo scale-aware', () => {
  const low = valueMapYDomain([41.2, 55.0, 68.7]);
  assert.ok(low.domain[1] < 100 && low.domain[1] >= 68.7, `top ${low.domain[1]}`);
  assert.ok(low.domain[0] <= 41.2, 'points never clipped at the bottom');
  assert.equal(low.ticks[low.ticks.length - 1], low.domain[1]);
  assert.equal(valueMapYDomain([72, 99.5]).domain[1], 100);
  assert.equal(valueMapYDomain([41, 68], { full: true }).domain[1], 100, 'cogwheel full scale keeps 100');
  const elo = valueMapYDomain([1171, 1350], { elo: true });
  assert.ok(elo.domain[0] <= 1171 && elo.domain[1] >= 1350 && elo.domain[1] < 1500, JSON.stringify(elo));
});

import { SIMPLE_SCORE_CHOICES, costMeasureChoices, activeCostMeasure } from '../lib/value-map.mjs';
import { FIXED_BLENDS } from '../lib/effective-cost.mjs';
test('CR-32.1: the score picker offers the Main Composite first and the headline indices and boards', () => {
  assert.equal(SIMPLE_SCORE_CHOICES[0], 'composite');
  for (const k of ['aa_intelligence_index', 'aa_coding_index', 'epoch_eci', 'epoch_eci_software', 'designarena_fullstack']) assert.ok(SIMPLE_SCORE_CHOICES.includes(k), k);
});
test('CR-32.2: each cost measure maps to one price setting and is recognised back', () => {
  const choices = costMeasureChoices(FIXED_BLENDS, 20);
  assert.deepEqual(choices.map((c) => c.id), ['adjusted', 'blended', 'input', 'output']);
  const inputOnly = Math.max(...FIXED_BLENDS.map((b) => b.value));
  assert.deepEqual(choices.find((c) => c.id === 'input').patch, { priceMode: 'raw', inputWeight: inputOnly });
  assert.deepEqual(choices.find((c) => c.id === 'output').patch, { priceMode: 'raw', inputWeight: 0 });
  for (const c of choices) assert.equal(activeCostMeasure(choices, c.patch.priceMode, c.patch.inputWeight ?? 20), c.id, c.id);
  assert.equal(activeCostMeasure(costMeasureChoices(FIXED_BLENDS, 3), 'raw', 3), 'blended', 'a hand-picked blend stays "blended"');
  assert.match(costMeasureChoices(FIXED_BLENDS, 3)[1].label, /3:1/);
});
