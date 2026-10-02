import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readMultimodalPreviewV02 } from '../lib/jevbench-multimodal-preview.mjs';
import { imageJevBoardSystems, imageJevCapabilityLimits } from '../lib/imagejev-board.mjs';
import { jevClassRows, speedFromLatency } from '../lib/jevbench-jev-class.mjs';
import { capsFromUrl, capsToUrl } from '../lib/jevbench-class-caps.mjs';
import { OFFICIAL_WEIGHTS, weightedJevScore } from '../lib/jevbench-axis-weights.mjs';
import { jevV15BoardScore } from '../lib/jevbench-v15-board.mjs';
import { imageJevV02WhatIfRows, imageJevV02WeightsFromUrl, imageJevV02WeightsToUrl, imageJevV02ScatterScale } from '../lib/imagejev-v02-explorer.mjs';

const { artifact } = await readMultimodalPreviewV02();
const systems = imageJevBoardSystems(artifact);
const limits = imageJevCapabilityLimits(artifact);
const options = { limits, factor: limits.factor, referenceLabel: limits.referenceLabel };
const classify = (caps) => jevClassRows(systems, { ...options, ...caps });
const eligible = (result) => result.rows.filter((row) => row.inClass);
const intelligenceOnly = { intelligence: 100, calibration: 0, speed: 0, cost: 0 };
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('actual v0.2 CORE adapter preserves official 23/Rune65.3 and independent cost/latency gates', () => {
  const official = classify({ costFactor: 2, latencyFactor: 2 });
  assert.equal(eligible(official).length, 23);
  assert.equal(eligible(official)[0].row.key, 'surogate_rune_26b_v3');
  assert.equal(eligible(official)[0].capability.toFixed(1), '65.3');
  for (const [caps, count, wityFits] of [
    [{ costFactor: 3.2, latencyFactor: 2 }, 34, false],
    [{ costFactor: 2, latencyFactor: 3.2 }, 24, true],
    [{ costFactor: Infinity, latencyFactor: 2 }, 36, false],
    [{ costFactor: 2, latencyFactor: Infinity }, 24, true],
  ]) {
    const result = classify(caps);
    assert.equal(eligible(result).length, count);
    assert.equal(result.rows.find((row) => row.row.key === 'wity_1').inClass, wityFits);
    assert.deepEqual(result.reference, official.reference);
    for (const row of result.rows) {
      const before = official.rows.find((item) => item.row.key === row.row.key);
      assert.deepEqual(row.row, before.row, 'caps never reprice or rescore the row');
      assert.equal(row.capability, before.capability);
      if (caps.latencyFactor === 2) assert.equal(row.latencyRatio, before.latencyRatio);
      if (caps.costFactor === 2) assert.equal(row.costRatio, before.costRatio);
    }
  }
});

test('real URL hydration/history helpers round-trip caps and weights, preserving revision/hash/other keys', () => {
  const original = 'https://benchmarkheaven.com/image-jev-bench?version=v0.2.0&revision=pin&view=intelligence&extra=a%26b&extra=two#imagejev-v02-capability';
  for (const caps of [{ costFactor: 2, latencyFactor: 2 }, { costFactor: 3.2, latencyFactor: Infinity }, { costFactor: Infinity, latencyFactor: 1 }]) {
    const weighted = imageJevV02WeightsToUrl(original, intelligenceOnly);
    const withCaps = capsToUrl(weighted, caps);
    assert.deepEqual(capsFromUrl(withCaps), caps);
    assert.deepEqual(imageJevV02WeightsFromUrl(withCaps), intelligenceOnly);
    const reverse = new URL(imageJevV02WeightsToUrl(capsToUrl(original, caps), intelligenceOnly));
    const forward = new URL(withCaps);
    reverse.searchParams.sort(); forward.searchParams.sort();
    assert.equal(forward.href, reverse.href, 'control order preserves the same URL state');
    const reset = new URL(imageJevV02WeightsToUrl(capsToUrl(withCaps, { costFactor: 2, latencyFactor: 2 }), OFFICIAL_WEIGHTS));
    assert.equal(reset.searchParams.has('w'), false);
    assert.equal(reset.searchParams.has('costcap'), false);
    assert.equal(reset.searchParams.has('latcap'), false);
    assert.deepEqual([...reset.searchParams], [...new URL(original).searchParams]);
    assert.equal(reset.hash, new URL(original).hash);
    assert.deepEqual(imageJevV02WeightsFromUrl(reset.href), OFFICIAL_WEIGHTS);
  }
  assert.deepEqual(imageJevV02WeightsFromUrl(`${original.split('#')[0]}&w=40,20,20,20`), { intelligence: 40, calibration: 20, speed: 20, cost: 20 });
  for (const value of ['0-0-0-0', '101-0-0-0', '-1-2-3-4', '1--2-3', 'a-b-c-d', '1e2-0-0-0', '---', '25-25-25']) {
    const url = new URL(original); url.searchParams.set('w', value);
    assert.deepEqual(imageJevV02WeightsFromUrl(url.href), OFFICIAL_WEIGHTS, value);
  }
});

test('official WhatIf keeps every published score and rank; custom math matches current main CR256', () => {
  const before = JSON.stringify(artifact);
  const official = imageJevV02WhatIfRows(artifact.ranking, OFFICIAL_WEIGHTS);
  assert.equal(official.length, 45);
  assert.deepEqual(official.map((row) => [row.system.key, row.score, row.system.rank]), artifact.ranking.map((row) => [row.key, row.score, row.rank]));
  const weights = [OFFICIAL_WEIGHTS, intelligenceOnly, { intelligence: 95, calibration: 0, speed: 5, cost: 0 }, { intelligence: 0, calibration: 100, speed: 0, cost: 0 }, { intelligence: 40, calibration: 20, speed: 20, cost: 20 }];
  for (const w of weights) for (const { system, score, penalties } of imageJevV02WhatIfRows(artifact.ranking, w)) {
    const expected = jevV15BoardScore(system.tracks.core.axes, w);
    assert.ok(Math.abs(score - expected) < 0.005, `${system.key} ${JSON.stringify(w)}`);
    assert.ok(Math.abs(expected - penalties.ungated * penalties.factor) < 1e-9, system.key);
    for (const gate of penalties.gates) assert.equal(gate.weighted, w[gate.axis] > 0);
  }
  assert.equal(JSON.stringify(artifact), before, 'axes, official tariffs, scores and NULLs are unchanged');
});

test('Intelligence only retains visible zero-weight penalties and discriminates from the old order', () => {
  const custom = imageJevV02WhatIfRows(artifact.ranking, intelligenceOnly);
  assert.deepEqual(custom.slice(0, 5).map((row) => row.system.key), ['wity_1', 'kushal_gemma4_31b_it_autoloops', 'surogate_rune_26b_v3', 'imajev_4b', 'jpt_9b']);
  const luna = custom.find((row) => row.system.key === 'gpt6_luna');
  assert.ok(luna.penalties.gates.some((gate) => gate.axis === 'cost' && !gate.weighted));
  assert.ok(luna.score < weightedJevScore(luna.system.tracks.core.axes, intelligenceOnly));
  assert.equal(luna.penalties.ungated, luna.system.tracks.core.axes.intelligence);
  const rawOrder = [...artifact.ranking].sort((a, b) => b.tracks.core.axes.intelligence - a.tracks.core.axes.intelligence).map((row) => row.key);
  assert.equal(rawOrder[0], 'gpt6_luna');
  assert.notDeepEqual(custom.map((row) => row.system.key), rawOrder);
});

test('NULLs and reference-only rows cannot acquire a custom WhatIf rank, including at weight 0', () => {
  const clone = structuredClone(artifact.ranking[0]);
  clone.tracks.core.axes.cost = null;
  const nullScore = { ...artifact.ranking[0], score: null };
  const nullRank = { ...artifact.ranking[0], rank: null };
  assert.deepEqual(imageJevV02WhatIfRows([clone, nullScore, nullRank, ...artifact.measured_unrankable_rows, ...artifact.reference_rows], intelligenceOnly), []);
  assert.deepEqual(imageJevV02WhatIfRows(artifact.ranking, { intelligence: 0, calibration: 0, speed: 0, cost: 0 }), []);
});

test('actual scatter scale puts adjusted-p50 and cost boundaries on the frozen official lines', () => {
  const points = systems.map((row) => ({ key: row.key, cost: row.cost.usd_per_1000, speed: speedFromLatency(row.speed.p50_s_adjusted) }));
  const official = classify({ costFactor: 2, latencyFactor: 2 });
  for (const kind of ['cost', 'speed']) {
    const scale = imageJevV02ScatterScale(kind, points, limits);
    assert.equal(scale.plotted.length, 45);
    assert.ok(scale.capX >= 44 && scale.capX <= 338);
    for (const point of scale.plotted) {
      const row = official.rows.find((item) => item.row.key === point.key);
      const fits = kind === 'cost' ? row.cost <= limits.cost : row.latency <= limits.latency;
      assert.equal(scale.xAt(point) >= scale.capX, fits, `${kind} ${point.key}`);
    }
    const boundary = { cost: limits.cost, speed: speedFromLatency(limits.latency) };
    assert.equal(scale.xAt(boundary), scale.capX);
    assert.equal(imageJevV02ScatterScale(kind, points, null).capX, null);
    assert.equal(imageJevV02ScatterScale(kind, points, { cost: Infinity, latency: Infinity }).capX, null);
  }
  const cost = imageJevV02ScatterScale('cost', [{ cost: 0, speed: 90 }, { cost: null, speed: null }, { cost: limits.cost, speed: 50 }], limits);
  assert.equal(cost.plotted.length, 1);
  assert.ok(Number.isFinite(cost.xAt(cost.plotted[0])));
  assert.ok(Number.isFinite(imageJevV02ScatterScale('cost', [], limits).capX));
  assert.equal(imageJevV02ScatterScale('cost', [], null).capX, null);
});

test('actual client wiring uses tested entry points, visible gates, popstate and official bubble disclosure', () => {
  const whatIf = read('../components/ImageJevV02WhatIf.tsx');
  assert.match(whatIf, /imageJevV02WhatIfRows\(systems, weights\)/);
  assert.match(whatIf, /imageJevV02WeightsFromUrl\(window.location.href\)/);
  assert.match(whatIf, /imageJevV02WeightsToUrl\(window.location.href, next\)/);
  assert.match(whatIf, /addEventListener\('popstate', readWeights\)/);
  assert.match(whatIf, /data-bh-imagejev-v02-gate=\{system.key\}/);
  assert.match(whatIf, /applies although its weight is 0/);
  const charts = read('../components/ImageJevV02Charts.tsx');
  assert.match(charts, /imageJevV02ScatterScale\(kind, points, caps\)/);
  assert.match(charts, /Custom caps in the headline ranking do not move this line or filter these points/);
  assert.match(charts, /speedLabel="Median speed"/);
  const ranking = read('../components/JevCapabilityRanking.tsx');
  assert.match(ranking, /capsFromUrl\(window.location.href\)/);
  assert.match(ranking, /capsToUrl\(window.location.href, next\)/);
  assert.match(ranking, /Charts below use the official 2× caps/);

});
