import test from 'node:test';
import assert from 'node:assert/strict';
import { imageJevBoardSystems, imageJevCapabilityLimits } from '../lib/imagejev-board.mjs';
import { readMultimodalPreview, readMultimodalPreviewV02 } from '../lib/jevbench-multimodal-preview.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';

test('current-main adapter retains Wity v0.2 API price and nested base-model alternative cost', async () => {
  const { artifact } = await readMultimodalPreviewV02();
  const original = artifact.ranking.find((row) => row.key === 'wity_1');
  const row = imageJevBoardSystems(artifact).find((item) => item.key === 'wity_1');
  assert.equal(row.jevbench_score, 69.64955383096422);
  assert.equal(row.cost.usd_per_1000, original.tracks.core.cost.usd_per_1000);
  assert.equal(row.alt.usd_per_1000, 0.03538636363636363);
  assert.equal(row.alt.axes.cost, original.pricing_alternative.tracks.core.cost_score);
  assert.ok(row.alt.usd_per_1000 > row.cost.usd_per_1000);
});

test('nested alternative costs preserve zero and fall back to the archived flat format', async () => {
  const artifact = await readMultimodalPreview();
  const original = artifact.ranking.find((row) => row.key === 'wity_1');
  const flat = original.pricing_alternative.tracks[artifact.headline_track ?? 'all'];
  assert.equal(imageJevBoardSystems(artifact).find((row) => row.key === 'wity_1').alt.usd_per_1000, flat.usd_per_1000);
  const candidate = structuredClone(artifact);
  const alternative = candidate.ranking.find((row) => row.key === 'wity_1').pricing_alternative.tracks[candidate.headline_track ?? 'all'];
  alternative.cost = { usd_per_1000: 0 };
  assert.equal(imageJevBoardSystems(candidate).find((row) => row.key === 'wity_1').alt.usd_per_1000, 0);
  alternative.cost.usd_per_1000 = null;
  assert.equal(imageJevBoardSystems(candidate).find((row) => row.key === 'wity_1').alt.usd_per_1000, flat.usd_per_1000);
});

test('rebased v0.2 preserves official caps and changes cost and latency caps independently', async () => {
  const { artifact } = await readMultimodalPreviewV02();
  const systems = imageJevBoardSystems(artifact);
  const limits = imageJevCapabilityLimits(artifact);
  const options = { limits, factor: limits.factor, referenceLabel: limits.referenceLabel };
  const official = jevClassRows(systems, { ...options, costFactor: 2, latencyFactor: 2 });
  const inside = official.rows.filter((row) => row.inClass);
  assert.equal(inside.length, 23);
  assert.equal(inside[0].row.key, 'surogate_rune_26b_v3');
  assert.equal(Number(inside[0].capability.toFixed(1)), 65.3);
  const custom = jevClassRows(systems, { ...options, costFactor: 3, latencyFactor: 2 });
  assert.equal(custom.limits.latency, official.limits.latency);
  assert.equal(custom.limits.cost, official.limits.cost * 1.5);
});
