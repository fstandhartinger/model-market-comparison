// CR-87.6: reader-chosen JevBench weights — the default reproduces every published Main Score and rank, each arithmetic
// sensitivity weighting reproduces the artifact's rank_under, the four named presets resolve, and URL parsing is defensive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJevbenchV11, jevbenchV11View } from '../lib/jevbench-v11.mjs';
import { DEFAULT_WEIGHTS, PRESETS, describe, isDefault, parseParams, percents, presetFor, ratioText, rerank, toParam } from '../lib/jevbench-weights.mjs';

const view = jevbenchV11View(await readJevbenchV11());

test('the default weights are the published ones and reproduce every Main Score and the official ranking', async () => {
  const { artifact } = await readJevbenchV11();
  for (const k of ['capability', 'speed', 'cost']) assert.ok(Math.abs(DEFAULT_WEIGHTS[k] - artifact.weights[k]) < 1e-12, k);
  const { ranked, partial } = rerank(view.ranked, view.partial, DEFAULT_WEIGHTS);
  ranked.forEach((r, i) => { assert.equal(r.key, view.ranked[i].key); assert.equal(r.rank, i + 1); assert.equal(r.delta, 0); assert.ok(Math.abs(r.score - r.main) < 0.05, r.key); });
  assert.ok(partial.every((r) => r.rank === null));
});

test('every arithmetic sensitivity weighting reproduces the published rank_under', async () => {
  const { artifact } = await readJevbenchV11();
  for (const [name, sw] of Object.entries(artifact.sensitivity_weightings)) {
    if (sw.combine !== 'arith') continue;
    const { ranked } = rerank(view.ranked, view.partial, { capability: sw.capability, speed: sw.speed, cost: sw.cost });
    for (const r of ranked) {
      assert.equal(r.rank, r.rankUnder[name], `${name}: ${r.key}`);
      assert.ok(Math.abs(r.score - r.sensitivity[name]) < 1e-6, `${name}: ${r.key} score`);
    }
  }
});

test('the four named presets: Balanced is the default and official; the others say they are not', () => {
  assert.deepEqual(PRESETS.map((p) => [p.name, p.ratio]), [['Balanced', '33:33:33'], ['Emphasis on Accuracy', '60:20:20'], ['Emphasis on Speed', '20:60:20'], ['Emphasis on Cost', '20:20:60']]);
  assert.deepEqual(PRESETS.map((p) => describe(p.w).title), ['JevBench Main Composite Score – (Balanced 33:33:33)', 'JevBench Composite Score – Emphasis on Accuracy (60:20:20)',
    'JevBench Composite Score – Emphasis on Speed (20:60:20)', 'JevBench Composite Score – Emphasis on Cost (20:20:60)']);
  assert.equal(describe(DEFAULT_WEIGHTS).official, true);
  for (const p of PRESETS.slice(1)) { const d = describe(p.w); assert.equal(d.official, false); assert.equal(d.title, `JevBench Composite Score – ${p.name} (${p.ratio})`); }
  const c = describe({ capability: 0.5, speed: 0.1, cost: 0.4 });
  assert.equal(c.title, 'Custom weights (50:10:40) — not the official JevBench Main Composite Score');
  assert.equal(c.preset, null);
});

test('cost emphasis re-ranks (the ranking really moves) and deltas are consistent', () => {
  const { ranked } = rerank(view.ranked, view.partial, PRESETS.find((p) => p.id === 'cost').w);
  assert.ok(ranked.some((r) => r.delta !== 0));
  assert.equal(ranked.reduce((a, r) => a + r.delta, 0), 0);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].score >= ranked[i].score);
});

test('URL parsing: presets, custom, normalisation, clamping, junk falls back to the default', () => {
  const sp = (q) => parseParams(q);
  assert.ok(isDefault(sp('')));
  assert.ok(isDefault(sp('?w=33-33-33')));
  assert.ok(isDefault(sp('?w=1-1-1')));
  assert.equal(presetFor(sp('?w=60-20-20')).id, 'accuracy');
  assert.equal(presetFor(sp('?w=20-20-60')).id, 'cost');
  assert.equal(presetFor(sp('?w=20:60:20')).id, 'speed');
  assert.equal(presetFor(sp('?preset=cost')).id, 'cost');
  assert.equal(presetFor(sp('?w=3-1-1')).id, 'accuracy');
  assert.equal(ratioText(sp('?w=50-10-40')), '50:10:40');
  for (const bad of ['?w=0-0-0', '?w=-10-20-20', '?w=abc', '?w=10-20', '?w=10-20-30-40', '?w=NaN-1-1', '?w=Infinity-1-1', '?preset=nope']) assert.ok(isDefault(sp(bad)), bad);
  const clamped = sp('?w=500-0-100'); assert.ok(Math.abs(clamped.capability - 0.5) < 1e-12 && Math.abs(clamped.cost - 0.5) < 1e-12);
});

test('toParam round-trips and the default adds nothing to the URL', () => {
  assert.equal(toParam(DEFAULT_WEIGHTS), null);
  for (const p of PRESETS.slice(1)) assert.equal(presetFor(parseParams(`?w=${toParam(p.w)}`)).id, p.id);
  const w = { capability: 0.45, speed: 0.15, cost: 0.4 };
  assert.equal(toParam(w), '45-15-40');
  const q = percents({ capability: 1 / 3, speed: 1 / 3, cost: 1 / 3 }); assert.equal(q.capability + q.speed + q.cost, 100);
});

test('every benchmarked project has a link', () => {
  for (const r of [...view.ranked, ...view.partial]) assert.match(r.link ?? '', /^https:\/\//, r.key);
});
