import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  readMultimodalPreview, readMultimodalPreviewV02, multimodalPreviewV02VisibleKeys,
  validateMultimodalPreviewV02PresentationDerivation,
} from '../lib/jevbench-multimodal-preview.mjs';
import { imageJevBoardSystems, imageJevCapabilityLimits } from '../lib/imagejev-board.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';

const dir = new URL('../data/raw/benchmarks/jevbench/multimodal-preview/', import.meta.url);
const candidateBytes = readFileSync(new URL('preview-v0.2.json', dir));
const candidate = () => JSON.parse(candidateBytes.toString('utf8'));
const derived = () => JSON.parse(readFileSync(new URL('preview-v0.2-presentation-20261001.json', dir), 'utf8'));
const wity = (artifact) => artifact.ranking.find((row) => row.key === 'wity_1');

test('presentation keeps the reviewed candidate bytes immutable and derives from them', () => {
  assert.equal(createHash('sha256').update(candidateBytes).digest('hex'), '39f12af559d052e45261f66f879fbeaf79b54bf1fa9c4142ff12703246845ba8');
  assert.equal(derived().derived_from.sha256, '39f12af559d052e45261f66f879fbeaf79b54bf1fa9c4142ff12703246845ba8');
  assert.equal(validateMultimodalPreviewV02PresentationDerivation(candidate(), derived()).size, 1);
});

test('v0.2 page data keeps 51 distinct entries: 45 composites, 3 measured NULL, 3 reference-only', async () => {
  const { artifact } = await readMultimodalPreviewV02();
  assert.equal(artifact.ranking.length, 45);
  assert.equal(artifact.measured_unrankable_rows.length, 3);
  const unrankable = new Set(artifact.measured_unrankable_rows.map((row) => row.key));
  assert.equal(artifact.reference_rows.filter((row) => !unrankable.has(row.key)).length, 3);
  assert.equal(multimodalPreviewV02VisibleKeys(artifact).size, 51);
  const prior = await readMultimodalPreview();
  assert.equal(prior.ranking.length, 50, 'archive v0.1.4 keeps all 50 rows');
});

test('Wity-1 is primary at its stated API tariff with the base-model reference as a striped alternative', async () => {
  const { artifact } = await readMultimodalPreviewV02();
  const row = wity(artifact);
  assert.equal(row.rank, 1);
  assert.equal(row.score, 69.64955383096422);
  assert.match(row.tracks.core.cost.source, /^Wity stated API tariff/);
  assert.equal(row.pricing_alternative.tracks.core.composite.score, 64.67412023103621);
  assert.equal(row.pricing_alternative.rank_if_applied, 1);
  assert.deepEqual(row.pricing_alternative.tracks.core.cost, wity(candidate()).tracks.core.cost);
  for (const [name, track] of Object.entries(row.tracks)) {
    for (const axis of ['intelligence', 'calibration', 'speed']) assert.equal(track.axes[axis], wity(candidate()).tracks[name].axes[axis]);
    assert.deepEqual(track.speed, wity(candidate()).tracks[name].speed);
  }
  assert.ok(artifact.ranking.every((r, i) => r.rank === i + 1 && (i === 0 || artifact.ranking[i - 1].score >= r.score)));
});

test('Capability Score eligibility uses the frozen 2x JevBench envelope on adjusted p50', async () => {
  const { artifact } = await readMultimodalPreviewV02();
  const limits = imageJevCapabilityLimits(artifact);
  assert.deepEqual([limits.cost, limits.latency, limits.factor], [0.06459465517241379, 1.2329566404223442, 2]);
  const result = jevClassRows(imageJevBoardSystems(artifact), { limits, factor: limits.factor, referenceLabel: limits.referenceLabel });
  const inside = result.rows.filter((row) => row.inClass);
  assert.equal(inside.length, 23);
  assert.deepEqual(inside.slice(0, 5).map((row) => [row.row.key, Number(row.capability.toFixed(5))]), [
    ['surogate_rune_26b_v3', 65.29994], ['autojev_27b', 63.75236], ['imajev_4b', 59.64294],
    ['jevify_gemma4_26b_a4b', 58.57087], ['reflex_4b', 52.71687],
  ]);
  for (const row of result.rows) {
    const core = artifact.ranking.find((r) => r.key === row.row.key).tracks.core;
    assert.equal(row.latency, core.speed.adjusted_p50_s, 'eligibility gates on adjusted, not raw, p50');
  }
  const w = result.rows.find((row) => row.row.key === 'wity_1');
  assert.equal(w.inClass, false);
  assert.match(w.reasons.join(), /latency 3\.0×/);
});

test('derivation guard rejects changes outside the approved pricing and presentation fields', () => {
  const mutate = (fn) => { const d = derived(); fn(d); return d; };
  const cases = [
    (d) => { d.ranking.find((r) => r.key === 'surogate_rune_26b_v3').tracks.core.axes.intelligence += 1; },
    (d) => { wity(d).tracks.core.speed.adjusted_p50_s = 1; },
    (d) => { wity(d).tracks.core.axes.calibration += 1; },
    (d) => { wity(d).pricing_alternative.tracks.core.composite.score = 70; },
    (d) => { wity(d).pricing_alternative.rank_if_applied = 2; },
    (d) => { d.reference_rows[0].reference_score += 1; },
    (d) => { d.measured_unrankable_rows[0].tracks.core.axes.intelligence += 1; },
    (d) => { d.method.Calibration = 'changed'; },
    (d) => { d.capability_eligibility.latency_p50_s_cap = 2; },
    (d) => { d.derived_from.sha256 = '0'.repeat(64); },
    (d) => { d.pricing_alternatives = []; },
  ];
  for (const change of cases) assert.throws(() => validateMultimodalPreviewV02PresentationDerivation(candidate(), mutate(change)));
});

test('speed charts plot the adjusted median p50 on the median-speed scale, not the p50/p95 blend or raw p50', async () => {
  const { speedFromLatency } = await import('../lib/jevbench-jev-class.mjs');
  const charts = readFileSync(new URL('../components/ImageJevV02Charts.tsx', import.meta.url), 'utf8');
  assert.match(charts, /const p50 = core\?\.speed\?\.adjusted_p50_s;/);
  assert.match(charts, /speedFromLatency\(p50\)/);
  assert.match(charts, /speed: point\.tracks\.core\.axes\.speed, cost: point\.tracks\.core\.axes\.cost/, '3D composite ranking keeps the official Speed axis');
  const { artifact } = await readMultimodalPreviewV02();
  const api = wity(artifact).tracks.core;
  const gpu = artifact.ranking.find((row) => row.key === 'surogate_rune_26b_v3').tracks.core;
  for (const core of [api, gpu]) {
    const median = speedFromLatency(core.speed.adjusted_p50_s);
    assert.notEqual(Number(median.toFixed(6)), Number(core.axes.speed.toFixed(6)), 'median speed differs from the p50/p95 blend');
  }
  assert.notEqual(gpu.speed.adjusted_p50_s, gpu.speed.raw_p50_s, 'GPU rows use the adjusted, not raw, p50');
  assert.equal(api.speed.adjusted_p50_s, api.speed.raw_p50_s, 'API rows are measured as is');
});
