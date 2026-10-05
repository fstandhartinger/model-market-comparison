import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { jevClassRows, spearman, trafficLightZone, ratioPosition } from '../lib/jevbench-jev-class.mjs';
import { jevBoardAlternative, jevV15BoardRow, jevV15BoardScore } from '../lib/jevbench-v15-board.mjs';
import { weightedJevScore } from '../lib/jevbench-axis-weights.mjs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const system = (key, cost, latency, speed = 80) => ({ key, display: key, ranked: true, class: 'native-logit', axes: { intelligence: 80, calibration: 80, cost: 80, speed }, cost: { usd_per_1000: cost }, speed: { p50_s_adjusted: latency } });

test('CR-248: legacy classifier output stays byte-identical to 0f399889', () => {
  // SHA-256 of the complete pre-change return (reference, limits, rows) from git show 0f399889.
  for (const [file, expected] of [
    ['v1.4.2/jevbench-v1.4.2-results.json', '92202a9c9edd84be67e88785387429e1037d986af195cf0b10709620afae403f'],
    ['v1.5/jevbench-v1.5.4-results.json', 'b1be5628917c8fedf2d4bf11925e79ddc168b4b8db0834b42c9a8a471d439bbe'],
  ]) {
    const systems = JSON.parse(read(`../data/raw/benchmarks/jevbench/${file}`)).systems;
    const { reference, limits, rows } = jevClassRows(systems);
    assert.equal(createHash('sha256').update(JSON.stringify({ reference, limits, rows })).digest('hex'), expected);
  }
});

test('CR-248: explicit limits need no reference row and use both cap boundaries', () => {
  const systems = [system('boundary', 4, 2), system('costly', 4.01, 1), system('slow', 1, 2.01), system('carryover', 1, null, 80)];
  const result = jevClassRows(systems, { limits: { cost: 4, latency: 2 }, referenceLabel: 'Anchor', factor: 2 });
  assert.deepEqual(result.rows.filter((r) => r.inClass).map((r) => r.row.key), ['boundary', 'carryover']);
  assert.equal(result.reference.display, 'Anchor');
  assert.equal(result.reference.cost, 2); assert.equal(result.reference.latency, 1);
  assert.ok(result.rows.every((r) => !r.isReference));
  assert.equal(result.rows.find((r) => r.row.key === 'costly').reasons[0], 'cost 2.0× Anchor');
  assert.equal(result.n, 3);
  assert.throws(() => jevClassRows(systems, { limits: { cost: 0, latency: 1 } }), /positive/);
});

test('CR-248: traffic lights include the reference in green and cap in amber', () => {
  for (const [ratio, expected] of [[0, 'green'], [0.8, 'green'], [1, 'green'], [1.6, 'amber'], [2, 'amber'], [2.001, 'red']]) assert.equal(trafficLightZone(ratio), expected);
  assert.equal(trafficLightZone(null), null); assert.equal(trafficLightZone(NaN), null);
  assert.equal(trafficLightZone(3, 3), 'amber');
  assert.equal(ratioPosition(0), 0); assert.equal(ratioPosition(1), 25); assert.equal(ratioPosition(2), 37.5); assert.equal(ratioPosition(128), 100);
});

test('CR-248: Spearman averages tied ranks and ignores missing pairs', () => {
  assert.equal(spearman([1, 2, 3], [2, 4, 9]), 1);
  assert.equal(spearman([1, 2, 3], [9, 4, 2]), -1);
  assert.equal(spearman([1, 1, 2], [3, 3, 9]), 1);
  assert.ok(Math.abs(spearman([1, 1, 2], [1, 2, 3]) - Math.sqrt(0.75)) < 1e-12);
  assert.equal(spearman([1, null, 3], [2, 5, 6]), 1);
  assert.equal(spearman([1, 1], [2, 3]), null); assert.equal(spearman([], []), null);
  assert.throws(() => spearman([1], []), /paired/);
  const measured = jevClassRows(JSON.parse(read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-results.json')).systems);
  assert.equal(measured.n, 109); assert.ok(Math.abs(measured.costLatencySpearman - 0.08715) < 0.00001);
});

test('CR-248: generic headline renders JevBench Capability Score by default and separate accessible bars', () => {
  const source = read('../components/JevCapabilityRanking.tsx');
  assert.match(source, /benchName = 'JevBench'/);
  assert.match(source, /\{benchName\} Capability Score<\/h2>/);
  assert.match(source, /classLabel = 'Jev-class'/); assert.match(source, /referenceLabel = 'Jev'/);
  assert.match(source, /TrafficLightBar kind="cost"/); assert.match(source, /TrafficLightBar kind="latency"/);
  assert.match(source, /data-bh-tl-cost=/); assert.match(source, /data-bh-tl-latency=/); assert.match(source, /role="img"/);
  assert.match(source, /derived from Speed axis/); assert.match(source, /group-hover:block group-focus-within:block/);
  assert.doesNotMatch(source, /data-bh-jev14-cost-bar|Thin red line/);
  assert.match(read('../app/jev-models/page.tsx'), /const description = '[^']*JevBench Capability Score/);
});

test('CR-248: alternative cost is rescored live and ranked against other current scores', () => {
  const row = jevV15BoardRow({ ...system('a', 1, 1), axes: { intelligence: 80, calibration: 80, speed: 80, cost: 40 }, alt: { axes: { cost: 100 }, label: 'Base price', note: 'Reference price assumption' } });
  const other = { ...row, key: 'b', axes: { intelligence: 90, calibration: 90, speed: 90, cost: 90 }, alt: undefined };
  const before = JSON.stringify(row);
  for (const weights of [{ intelligence: 25, calibration: 25, speed: 25, cost: 25 }, { intelligence: 100, calibration: 0, speed: 0, cost: 0 }]) {
    for (const scorer of [jevV15BoardScore, weightedJevScore]) {
      const rows = [row, other].map((r) => ({ ...r, jevbench_score: scorer(r.axes, weights) }));
      const alt = jevBoardAlternative(row, rows, weights, scorer);
      assert.equal(alt.score, scorer({ ...row.axes, cost: 100 }, weights));
      assert.equal(alt.rank, 2); assert.equal(alt.label, 'Base price');
      const tied = [{ ...other, jevbench_score: alt.score }];
      assert.equal(jevBoardAlternative(row, tied, weights, scorer).rank, 1);
      assert.equal(jevBoardAlternative(other, rows, weights, scorer), null);
    }
  }
  const costOnly = { intelligence: 0, calibration: 0, speed: 0, cost: 100 };
  assert.equal(jevBoardAlternative(row, [{ ...other, jevbench_score: 90 }], costOnly).rank, 1);
  assert.equal(JSON.stringify(row), before, 'never mutate official axes or price');
  const chart = read('../components/JevBoardInteractive.tsx');
  assert.match(chart, /alternative=\{jevBoardAlternative\(row, rows, weights, rescore\)\}/);
  assert.match(chart, /rows.some\(\(r\) => r.alt\)/);
  assert.match(read('../components/JevBoardShared.tsx'), /data-bh-jev-alt-score/);
  assert.match(read('../app/globals.css'), /\.bh-jev-alt-bar \{ background: repeating-linear-gradient/);
});
