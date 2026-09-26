// Florian 25 Sep 2026: /jev-models leads with the Capability ranking of Jev-class systems, then the bubble charts,
// then the composite chart with weight sliders. These tests pin the rule, the slider formula and the page order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevClassRows, medianLatency, medianLatencySpeed, speedFromLatency } from '../lib/jevbench-jev-class.mjs';
import { weightedJevScore, OFFICIAL_WEIGHTS, isOfficialWeights } from '../lib/jevbench-axis-weights.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const artifact = JSON.parse(read('../data/raw/benchmarks/jevbench/v1.4.2/jevbench-v1.4.2-results.json'));

test('equal slider weights reproduce every published v1.4.2 JevBench score', () => {
  let checked = 0;
  for (const row of artifact.systems) {
    if (row.jevbench_score == null) continue;
    assert.ok(Math.abs(weightedJevScore(row.axes, OFFICIAL_WEIGHTS) - row.jevbench_score) < 1e-6, row.key);
    assert.ok(Math.abs(weightedJevScore(row.axes, { intelligence: 1, calibration: 1, speed: 1, cost: 1 }) - row.jevbench_score) < 1e-6, row.key);
    checked += 1;
  }
  assert.ok(checked >= 90);
  assert.equal(isOfficialWeights({ intelligence: 10, calibration: 10, speed: 10, cost: 10 }), true);
  assert.equal(isOfficialWeights({ intelligence: 40, calibration: 20, speed: 20, cost: 20 }), false);
});

test('a zero weight drops its axis and its gate', () => {
  const axes = { intelligence: 80, calibration: 60, speed: 20, cost: 90 };
  const score = weightedJevScore(axes, { intelligence: 50, calibration: 50, speed: 0, cost: 0 });
  assert.ok(Math.abs(score - 2 / (1 / 80 + 1 / 60)) < 1e-9, 'no Speed gate when Speed has no weight');
  assert.equal(weightedJevScore(axes, { intelligence: 0, calibration: 0, speed: 0, cost: 0 }), null);
  assert.ok(Math.abs(weightedJevScore(axes, { intelligence: 1, calibration: 0, speed: 0, cost: 0 }) - 80) < 1e-9);
});

test('Jev-class = cost and median latency each at most 2x Jev 1.13.0', () => {
  const { reference, limits, rows } = jevClassRows(artifact.systems);
  assert.equal(reference.key, 'jev-1.13.0');
  assert.ok(Math.abs(limits.cost - 2 * reference.cost) < 1e-12);
  assert.ok(Math.abs(limits.latency - 2 * reference.latency) < 1e-12);
  const byKey = new Map(rows.map((r) => [r.key ?? r.row.key, r]));
  assert.equal(byKey.get('jev-1.13.0').inClass, true);
  for (const key of ['gpt-6-luna', 'gpt-6-luna-low', 'gpt-5.6-luna', 'deepseek-flash', 'gemini-3.1-flash-lite']) assert.equal(byKey.get(key).inClass, false, key);
  for (const r of rows) {
    if (r.latencyBasis !== 'p50') continue;
    assert.equal(r.inClass, r.cost <= limits.cost && r.latency <= limits.latency, r.row.key);
  }
  // Rows carried from v1.3 have no recorded p50; the Speed axis decides at the 2x-latency equivalent (−6.02 points).
  const jevk5 = byKey.get('jevk5-v02');
  assert.equal(jevk5.latencyBasis, 'speed-axis');
  assert.equal(jevk5.inClass, true);
  assert.ok(Math.abs(limits.speedFloor - (reference.speed - 20 * Math.log10(2))) < 1e-9);
  assert.equal(medianLatency({ speed: { p50_s_raw: 0.3, adjustment: 'x2 + 0.15 s' } }), null, 'raw latency of a self-hosted row is not the adjusted one');
});

// CR-176.3: the Capability-vs-speed bubble chart must agree with the latency line. It plots the median-latency
// speed (speedFromLatency of the adjusted p50, the latency the gate uses), NOT the published composite Speed axis
// (a p50/p95 blend). With live v1.4.2 data the blend moved 7 in-class systems to the wrong side of the line.
test('CR-176.3: every in-class row plots at or right of the latency line on the speed chart', () => {
  const { reference, rows } = jevClassRows(artifact.systems);
  const line = speedFromLatency(2 * reference.latency);
  assert.ok(Math.abs(line - (speedFromLatency(reference.latency) - 20 * Math.log10(2))) < 1e-12, 'line = 2x the reference median latency');
  let checked = 0, withMedian = 0;
  for (const r of rows) {
    if (!r.inClass) continue;
    const plotted = medianLatencySpeed(r.row) ?? r.row.axes?.speed; // the chart's plotSpeed: median fallback to composite
    assert.ok(plotted != null, r.row.key);
    assert.ok(plotted >= line - 1e-9, `${r.row.key}: plotted ${plotted} < line ${line}`);
    checked += 1;
    if (medianLatencySpeed(r.row) != null) withMedian += 1;
  }
  assert.ok(checked >= 40, `only ${checked} checked`);
  assert.ok(withMedian >= checked - 3, 'only the v1.3 carryovers should lack a median');
});

test('CR-176.4/.5: $/1k keeps numeric sort but loses the green heat in the board views', () => {
  const chart = read('../components/JevBoardInteractive.tsx');
  assert.match(chart, /label="\$\/1k decisions"/); // CR-176.4: header names the unit
  assert.ok(!/HeatTd heat=\{heat\} column="usd"/.test(chart), 'no heat on the $/1k table cell');
  assert.match(chart, /k="usd" label="\$\/1k/);
});

test('page order: Capability headline, bubble charts, then the composite chart with sliders, compare and table', () => {
  const page = read('../app/jev-models/page.tsx');
  const headline = page.indexOf('<JevCapabilityRanking');
  const bubbles = page.indexOf('<JevBubbleCharts');
  const board = page.indexOf('<JevModelsV14Board');
  assert.ok(headline > 0 && headline < bubbles && bubbles < board, 'Capability ranking, then bubbles, then the board');
  const ranking = read('../components/JevCapabilityRanking.tsx');
  assert.match(ranking, /at most 2× Jev 1\.13\.0/);
  assert.match(ranking, /data-bh-jev-class-outside/);
  const chart = read('../components/JevBoardInteractive.tsx');
  const above = chart.indexOf('<JevWeightSliders position="above"');
  const bars = chart.indexOf('data-bh-jev14-bars>');
  const below = chart.indexOf('<JevWeightSliders position="below"');
  assert.ok(above > 0 && above < bars && bars < below, 'sliders above and below the bars');
  assert.match(chart, /data-bh-jev-fairness|data-bh-jev14-top-five-note/);
  const bubble = read('../components/JevBubbleChart.tsx');
  assert.match(bubble, /data-bh-jev-bubble-tooltip/);
  assert.match(bubble, /data-bh-jev-bubble-label/);
  assert.match(page, /data-bh-jev-class-method/);
});
