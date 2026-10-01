import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { imageJevBoardRows, imageJevBoardSystems, imageJevCapabilityLimits, imageJevCompareRows, imageJevSliderPresets } from '../lib/imagejev-board.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';
import { readArchivedMultimodalPreviewV014, readMultimodalPreview } from '../lib/jevbench-multimodal-preview.mjs';

const v02Path = '/home/flori/wt/imagejev-v02-full-roster-20260930/data/raw/benchmarks/jevbench/multimodal-preview/preview-v0.2.json';
let v02Exists = false;
try { await access(v02Path); v02Exists = true; } catch { /* optional read-only compatibility fixture */ }
const explicitLimitsSupported = /function jevClassRows\s*\(\s*systems\s*,\s*\{[^}]*\blimits\b/.test(jevClassRows.toString());

function assertOnlyRanksDiffer(before, after, path = '') {
  if (typeof before === 'number' || typeof after === 'number') {
    if (path.split('.').at(-1) === 'rank') return;
    assert.equal(after, before, `unexpected numeric change at ${path}`);
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    assert.equal(after.length, before.length, `array length changed at ${path}`);
    before.forEach((value, index) => assertOnlyRanksDiffer(value, after[index], `${path}.${index}`));
    return;
  }
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      assertOnlyRanksDiffer(before[key], after[key], path ? `${path}.${key}` : key);
    }
  }
}

test('ImageJevBench v0.1.5 prices Wity-1 at its API tariff and preserves all other numeric aggregates', async () => {
  const [current, frozen] = await Promise.all([readMultimodalPreview(), readArchivedMultimodalPreviewV014()]);
  assert.equal(current.revision, 'v0.1.5');
  assert.equal(current.n_systems, 50);
  assert.equal(frozen.artifact.revision, 'v0.1.4');
  const byKey = new Map(frozen.artifact.ranking.map((row) => [row.key, row]));
  assert.equal(current.ranking.length, 50);

  const wity = current.ranking.find((row) => row.key === 'wity_1');
  assert.ok(wity);
  assert.equal(wity.rank, 1);
  assert.equal(wity.tracks.all.cost.source, 'Wity stated API tariff: USD 0.042/M input; output, thinking, and images free; measured Wity usage (zero output tokens)');
  assert.deepEqual(current.ranking.slice(0, 5).map((row) => row.key), [
    'wity_1', 'imajev_4b', 'jev_omni', 'neohorse_jev_4b', 'visual_jev_4b',
  ]);
  assert.ok(Math.abs(wity.tracks.all.cost.usd_per_1000 - 0.007401701754386) < 1e-12);
  assert.ok(Math.abs(wity.tracks.all.cost.score - 73.92005255304716) < 1e-9);
  assert.ok(Math.abs(wity.tracks.all.composite.score - 80.19853920531308) < 1e-9);
  assert.ok(Math.abs(wity.pricing_alternative.tracks.all.usd_per_1000 - 0.026434649122807023) < 1e-12);
  assert.ok(Math.abs(wity.pricing_alternative.tracks.all.cost_score - 57.334793493313725) < 1e-9);
  assert.ok(Math.abs(wity.pricing_alternative.tracks.all.composite - 74.36394536053653) < 1e-9);
  assert.equal(wity.pricing_alternative.would_rank, 2);

  for (const track of ['all', 'core', 'everyday_photo']) {
    const ordered = [...current.ranking].sort((a, b) => b.tracks[track].composite.score - a.tracks[track].composite.score
      || a.name.localeCompare(b.name));
    assert.ok(ordered.every((row, index) => row.tracks[track].rank === index + 1), `${track} ranks follow track scores`);
  }
  for (const row of current.ranking.filter((item) => item.key !== 'wity_1')) {
    assertOnlyRanksDiffer(byKey.get(row.key), row, row.key);
  }
});

test('ImageJevBench adapter maps v0.1.5 board, comparison, presets and frozen capability limits', async () => {
  const artifact = await readMultimodalPreview();
  const systems = imageJevBoardSystems(artifact);
  const board = imageJevBoardRows(artifact);
  const compare = imageJevCompareRows(artifact);
  const limits = imageJevCapabilityLimits(artifact);
  assert.equal(systems.length, 50);
  assert.equal(board.length, 50);
  assert.equal(compare.length, 50);
  assert.deepEqual(Object.keys(systems[0].axes), ['intelligence', 'calibration', 'speed', 'cost']);
  assert.equal(systems.find((row) => row.api_flag).class, 'decision-api');
  assert.equal(systems.find((row) => row.key === 'imajev_4b').class, 'jev-rebuild');
  assert.deepEqual(limits, {
    cost: 0.06459465517241379,
    latency: 1.2329566404223442,
    factor: 2,
    referenceLabel: 'Jev 1.13.0 (JevBench)',
  });
  assert.deepEqual(board.find((row) => row.key === 'wity_1').alt, {
    axes: { cost: 57.334793493313725 },
    usd_per_1000: 0.026434649122807023,
    label: 'Base-model price',
    note: 'Qwen3.6-35B-A3B base-model market reference (USD 0.15/M input, USD 1.00/M output)',
  });
  assert.deepEqual(compare.find((row) => row.key === 'wity_1').alt, board.find((row) => row.key === 'wity_1').alt);
  assert.deepEqual(imageJevSliderPresets(artifact)[0], {
    name: 'Official 25:25:25:25',
    weights: { intelligence: 25, calibration: 25, speed: 25, cost: 25 },
  });
});

test('ImageJevBench systems meet capability limits using explicit frozen caps', { todo: !explicitLimitsSupported }, async () => {
  const artifact = await readMultimodalPreview();
  const systems = imageJevBoardSystems(artifact);
  const limits = imageJevCapabilityLimits(artifact);
  const result = jevClassRows(systems, {
    limits: { cost: limits.cost, latency: limits.latency },
    referenceLabel: limits.referenceLabel,
  });
  const qualifying = result.rows.filter((row) => row.inClass);
  assert.equal(qualifying.length, 38);
  assert.ok(qualifying.some((row) => row.row.key === 'wity_1'));
});

test('ImageJevBench adapter accepts the read-only v0.2 core-headline artifact', { skip: !v02Exists }, async () => {
  const artifact = JSON.parse(await readFile(v02Path, 'utf8'));
  const systems = imageJevBoardSystems(artifact);
  assert.equal(artifact.headline_track, 'core');
  assert.equal(systems.length, artifact.ranking.length);
  assert.ok(systems.every((row) => Number.isFinite(row.jevbench_score)));
  assert.deepEqual(imageJevCapabilityLimits(artifact), {
    cost: 0.06459465517241379,
    latency: 1.2329566404223442,
    factor: 2,
    referenceLabel: 'Jev 1.13.0 (JevBench)',
  });
  assert.equal(imageJevBoardRows(artifact).find((row) => row.key === 'wity_1')?.alt, undefined);
});
