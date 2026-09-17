import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { benchmaxxingFamilySignals, benchmaxxingSignals, scoreBenchmaxxing } from '../lib/benchmax.mjs';
import { BENCHMAXX_TAG_MIN_COMPARISONS, BENCHMAXX_UNCERTAIN_MARK, benchmaxxingLevelFor, benchmaxxingUncertaintyNote } from '../lib/benchmaxxing-levels.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { paretoFrontier } from '../lib/pareto.mjs';
import { FRONTIER_GRACE_RATIO, frontierGrace } from '../lib/value-map.mjs';
import { pickChart } from '../lib/pick-chart.mjs';

// CR-77 (Florian 2026-09-17, PRIORITY): the Benchmaxxing tag level follows the published score alone — the old
// guards (n ≥ 10 comparisons, an 80 % bootstrap interval above zero) only mark a shown tag uncertain — and the
// value map's green line accepts a grace band on the capability axis, so Claude Fable 5.1 is part of the line.
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('CR-77.1: the level edges decide alone — 2.9 none, 3.0 light, 5.9 light, 6.0 medium, 11.9 medium, 12.0 strong', () => {
  for (const [score, expected] of [[2.9, null], [3.0, 'light'], [5.9, 'light'], [6.0, 'medium'], [11.9, 'medium'], [12.0, 'strong']]) {
    assert.equal(benchmaxxingLevelFor(score), expected, `score ${score}`);
  }
});

/** A synthetic catalog with two topics. Every base model sits on every board; `thin` is measured on four headline and
 *  three held-out boards only (n = 6: enough to be scored, fewer than the ten comparisons the old guard demanded), and
 *  it ranks top on the headline boards and bottom on the held-out ones. */
function thinCatalog() {
  const base = Array.from({ length: 14 }, (_, i) => `m${i}`);
  const board = (id, category, tier, extra) => ({ id, benchmarkId: id, name: id, family: id, version: 'v1', cohort: 'published',
    unit: 'points', higherBetter: true, category, kind: 'capability', benchmaxxingTier: tier,
    scores: base.map((modelId, i) => ({ modelId, value: 10 + i * 3, basis: 'measured', lowSample: false }))
      .concat(extra == null ? [] : [{ modelId: 'thin', value: extra, basis: 'measured', lowSample: false }]) });
  const axes = [];
  for (const [topic, key] of [['Reasoning', 'a'], ['Coding', 'b']]) {
    // Headline boards the thin model tops; held-out boards it sits at the bottom of.
    for (let k = 0; k < 3; k += 1) axes.push(board(`${key}-headline-${k}`, topic, 'headline', k < 2 ? 100 : null));
    for (let k = 0; k < 3; k += 1) axes.push(board(`${key}-heldout-${k}`, topic, 'heldout', k === 0 || (key === 'a' && k === 1) ? 0 : null));
  }
  return { models: [...base, 'thin'].map((id) => ({ id, name: id, org: `lab-${id}`, family: id })), axes };
}

test('CR-77.1: a model with few comparisons is tagged now, and CR-77.2 says why its tag is uncertain', () => {
  const view = thinCatalog();
  const report = scoreBenchmaxxing(view, 'thin');
  assert.equal(report.status, 'scored');
  assert.ok(report.comparisons < BENCHMAXX_TAG_MIN_COMPARISONS, `n = ${report.comparisons} must be below the old guard`);
  const level = benchmaxxingLevelFor(report.score);
  assert.ok(level, `thin reaches a level (score ${report.score})`);
  const { levels, tagged, uncertain } = benchmaxxingSignals(view);
  // The old rule dropped this tag; now it is shown, with the reason attached.
  assert.equal(levels.get('thin'), level);
  assert.ok(tagged.has('thin'));
  assert.match(uncertain.get('thin').note, /^Based on only \d+ comparisons/);
  assert.match(uncertain.get('thin').note, /treat this tag as uncertain$/);
  assert.equal(uncertain.get('thin').thinComparisons, true);
  // A model with no score is never tagged, however the guards fall.
  for (const [id] of [...levels]) assert.ok(benchmaxxingSignals(view).reports.some(([rid]) => rid === id), `${id} is scored`);
});

test('CR-77.2: the note names the reason — thin coverage, an interval below zero, or both; none when the evidence holds', () => {
  assert.equal(benchmaxxingUncertaintyNote({ comparisons: 14, intervalLower: 0.4 }), null);
  assert.equal(benchmaxxingUncertaintyNote({ comparisons: 7, intervalLower: 2 }), 'Based on only 7 comparisons — treat this tag as uncertain');
  assert.equal(benchmaxxingUncertaintyNote({ comparisons: 14, intervalLower: -2 }), 'The 80 % interval reaches below zero — treat this tag as uncertain');
  assert.equal(benchmaxxingUncertaintyNote({ comparisons: 7, intervalLower: -2 }), 'Based on only 7 comparisons and the 80 % interval reaches below zero — treat this tag as uncertain');
  assert.equal(benchmaxxingUncertaintyNote({ comparisons: 14, intervalLower: null }), 'No interval could be computed — treat this tag as uncertain');
  assert.equal(benchmaxxingUncertaintyNote({ comparisons: 1, intervalLower: 3 }), 'Based on only 1 comparison — treat this tag as uncertain');
});

test('CR-77.1/77.2 on the real dataset: DeepSeek V4.1 Flash carries the medium tag, marked uncertain', async () => {
  const view = buildBenchmarkView(JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8')));
  const fam = benchmaxxingFamilySignals(view);
  const family = 'deepseek-v4.1-flash';
  assert.equal(fam.familyLevels.get(family), 'medium', 'DeepSeek V4.1 Flash is tagged medium');
  assert.ok(fam.familyUncertain.has(family), 'and its thin evidence is disclosed, not used to hide the tag');
  // Florian named these three as well; each carries the level its score implies.
  for (const other of ['gemini-3.7-flash', 'muse-spark-1.1', 'muse-spark-1.2']) {
    const [id, report] = fam.reports.find(([rid]) => (view.models.find((m) => m.id === rid)?.family ?? rid) === other) ?? [];
    assert.ok(id, `${other} is scored`);
    assert.equal(fam.familyLevels.get(other) ?? null, benchmaxxingLevelFor(report.score), other);
  }
  // Every tagged id has a level, and no unscored model is tagged.
  const scored = new Set(fam.reports.map(([id]) => id));
  for (const id of fam.tagged) assert.ok(fam.levels.get(id), id);
  for (const [id] of fam.reports) assert.ok(scored.has(id));
  const signals = benchmaxxingSignals(view);
  for (const id of signals.tagged) assert.ok(signals.reports.some(([rid]) => rid === id), `${id} is scored`);
});

test('CR-77.2: no surface still claims a tag needs ten comparisons and an interval above zero', () => {
  for (const path of ['components/BenchmaxxingOverview.tsx', 'components/ModelExplorer.tsx', 'components/SignalValue.tsx',
    'lib/benchmaxxing-interpretation.mjs', 'app/about/page.tsx', 'app/benchmaxxing/page.tsx']) {
    const text = src(path);
    assert.ok(!/BENCHMAXX_GUARD_TEXT|needs ≥ 10 comparisons|a tag needs n ≥/.test(text), `${path} still suppresses tags in its wording`);
  }
  assert.ok(src('app/globals.css').includes('.bh-bmx-uncertain'), 'the uncertainty marker has a style');
  assert.ok(src('components/SignalValue.tsx').includes('BENCHMAXX_UNCERTAIN_MARK'), 'the pill can show the marker');
  assert.equal(BENCHMAXX_UNCERTAIN_MARK, '◔');
});

// ---- CR-77.3: the green line's grace band -------------------------------------------------------------------

const ids = (points) => points.map((p) => p.id);

test('CR-77.3: grace 0 is the strict Pareto rule, ties kept, order by cost', () => {
  const points = [{ id: 'cheapest', x: 0.1, y: 60 }, { id: 'tradeoff', x: 1, y: 80 }, { id: 'strongest', x: 4, y: 90 },
    { id: 'dominated', x: 2, y: 70 }];
  assert.deepEqual(ids(paretoFrontier(points)), ['cheapest', 'tradeoff', 'strongest']);
  assert.deepEqual(ids(paretoFrontier(points, { grace: 0 })), ['cheapest', 'tradeoff', 'strongest']);
  // A negative or non-finite grace can never widen the line.
  assert.deepEqual(ids(paretoFrontier(points, { grace: -5 })), ['cheapest', 'tradeoff', 'strongest']);
  assert.deepEqual(ids(paretoFrontier(points, { grace: NaN })), ['cheapest', 'tradeoff', 'strongest']);
});

test('CR-77.3: a model marginally behind the frontier at its price joins the line; a clearly worse one does not', () => {
  // The real shape of 17 Sep 2026: Fable 5.1 is 0.13 points behind GPT-6 Astra at a higher price; Fable 5 is 2.07 behind.
  const points = [{ id: 'sol', x: 1.15, y: 95.32 }, { id: 'opus5', x: 3.54, y: 96.55 }, { id: 'astra', x: 4.12, y: 97.88 },
    { id: 'fable5.1', x: 6.98, y: 97.75 }, { id: 'fable5', x: 12.51, y: 95.8 }];
  assert.deepEqual(ids(paretoFrontier(points)), ['sol', 'opus5', 'astra']);
  const graced = ids(paretoFrontier(points, { grace: 0.5 }));
  assert.deepEqual(graced, ['sol', 'opus5', 'astra', 'fable5.1']);
  assert.ok(!graced.includes('fable5'), 'a model 2 points behind is not "marginally behind"');
  // Deterministic and independent of input order.
  assert.deepEqual(ids(paretoFrontier([...points].reverse(), { grace: 0.5 })), graced);
  // The band is a tolerance, not a cloud: the line still grows by exactly one model here.
  assert.equal(graced.length, paretoFrontier(points).length + 1);
});

test('CR-77.3: the band is half a percent of the capability scale — 0.5 points on 0–100, relative on Elo boards', () => {
  assert.equal(FRONTIER_GRACE_RATIO, 0.005);
  assert.equal(frontierGrace([80, 95, 97.9]), 0.5);
  assert.equal(frontierGrace([]), 0.5);
  assert.equal(frontierGrace([1100, 1300], { elo: true }), 1);
  assert.equal(frontierGrace([1200], { elo: true }), 0);
  assert.equal(frontierGrace(null, { elo: true }), 0);
});

test('CR-77.3: both green lines use the band — the value map and the wizard chart', () => {
  const scatter = src('components/CostCapabilityScatter.tsx');
  assert.match(scatter, /paretoFrontier\(passing, \{ grace \}\)/);
  assert.match(scatter, /frontierGrace\(passing\.map\(\(p\) => p\.y\), \{ elo: score\.startsWith\("designarena"\) \}\)/);
  assert.match(src('lib/pick-chart.mjs'), /paretoFrontier\(passing, \{ grace: frontierGrace\(/);
  // The homepage caption keeps Florian's sentence and names the tolerance in its tooltip; /about explains it.
  assert.match(scatter, /Models on the green line are the most capable in their price range\./);
  assert.match(scatter, /title=\{FRONTIER_GRACE_NOTE\}/);
  assert.match(src('app/about/page.tsx'), /id="value-map"/);
  assert.match(src('app/about/page.tsx'), /half a point of capability/);
});

test('CR-77.3: the wizard chart keeps a monotone, readable line with the band applied', () => {
  const candidates = [
    { id: 'a', scores: { composite: 95.3 }, cost: 1.15 },
    { id: 'b', scores: { composite: 96.5 }, cost: 3.54 },
    { id: 'c', scores: { composite: 97.9 }, cost: 4.12 },
    { id: 'd', scores: { composite: 97.75 }, cost: 6.98 },
    { id: 'e', scores: { composite: 70 }, cost: 9 },
  ];
  const chart = pickChart(candidates, 'composite');
  assert.deepEqual(chart.frontier, ['a', 'b', 'c', 'd']);
  assert.ok(!chart.frontier.includes('e'));
  // Every frontier member is a plotted, passing point, listed by increasing cost.
  const byId = new Map(chart.points.map((p) => [p.id, p]));
  const costs = chart.frontier.map((id) => byId.get(id).x);
  assert.deepEqual(costs, [...costs].sort((x, y) => x - y));
});
