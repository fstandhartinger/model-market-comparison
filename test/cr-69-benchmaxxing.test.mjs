// CR-69 (Florian 2026-09-17): the Benchmaxxing score is the signed common-cohort percentile gap between public
// headline boards and held-out boards of the same topic, shrunk toward zero; tags need a bootstrap lower bound above 0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  BENCHMAXX_TIERS, BENCHMAXX_TIER_TABLE, benchmaxxingFamilySignals, benchmaxxingInterval, benchmaxxingSide, benchmaxxingSignals,
  benchmaxxingTier, isSignalAxis, scoreBenchmaxxing,
} from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

const scoresOf = (rows) => Object.entries(rows).map(([modelId, value]) => ({ modelId, value, basis: 'measured', lowSample: false }));
const board = (id, category, tier, rows, extra = {}) => ({ id, benchmarkId: id, name: id, family: id, version: 'v1', cohort: 'published', unit: 'points',
  higherBetter: true, category, kind: 'capability', benchmaxxingTier: tier, scores: scoresOf(rows), ...extra });

// 30 peer families with a shared skill order plus noise; `m` sits at a chosen percentile per board.
function catalog(place, { topics = ['Coding', 'Math'], extraAxes = () => [], noise = 3 } = {}) {
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const peers = Array.from({ length: 30 }, (_, i) => `p${i}::v`);
  const axes = [];
  for (const topic of topics) for (const [tier, count] of [['headline', 3], ['heldout', 3]]) for (let k = 0; k < count; k += 1) {
    const rows = Object.fromEntries(peers.map((id, i) => [id, i + rnd() * noise]));
    rows.m = place(tier, topic, k) * 0.3;
    axes.push(board(`${topic}-${tier}-${k}`, topic, tier, rows));
  }
  return { models: [...peers, 'm'].map((id) => ({ id, family: id.split('::')[0] })), axes: [...axes, ...extraAxes(peers)] };
}

test('CR-69.1: the tier table loads, uses only known tiers with a reason, and Terminal-Bench 4.0 overrides the family', () => {
  for (const [key, entry] of Object.entries(BENCHMAXX_TIER_TABLE.tiers)) {
    assert.ok(BENCHMAXX_TIERS.includes(entry.tier), `${key}: ${entry.tier}`);
    assert.ok(typeof entry.reason === 'string' && entry.reason.length > 10, `${key} has a reason`);
  }
  assert.equal(benchmaxxingTier({ family: 'aa-terminal-bench', version: '2.1' }).tier, 'headline');
  assert.equal(benchmaxxingTier({ family: 'aa-terminal-bench', version: '4.0' }).tier, 'heldout');
  assert.equal(benchmaxxingTier({ family: 'no-such-board', version: '1' }).tier, 'secondary');
});

test('CR-69.1: every signal board with at least 10 measured models has a deliberate tier', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const untiered = view.axes.filter(isSignalAxis).filter((a) => benchmaxxingTier(a).untiered)
    .filter((a) => new Set(a.scores.filter((r) => r.basis === 'measured' && r.modelId && !r.lowSample).map((r) => r.modelId)).size >= 10)
    .map((a) => `${a.family}@${a.version}`);
  assert.deepEqual([...new Set(untiered)], [], 'add these boards to data/benchmaxxing-tiers.json');
});

test('CR-69.2: better on headline than held-out boards gives a positive score, the reverse a negative one', () => {
  const up = catalog((tier) => (tier === 'headline' ? 95 : 20));
  const down = catalog((tier) => (tier === 'headline' ? 20 : 95));
  const flat = catalog(() => 50);
  const a = scoreBenchmaxxing(up, 'm'), b = scoreBenchmaxxing(down, 'm'), c = scoreBenchmaxxing(flat, 'm');
  assert.equal(a.status, 'scored');
  assert.ok(a.rawScore > 50 && a.score > 0, `headline-favoured: raw ${a.rawScore}`);
  assert.ok(b.rawScore < -50 && b.score < 0, `held-out-favoured: raw ${b.rawScore}`);
  assert.ok(Math.abs(c.score) < Math.abs(a.score) / 3, 'no direction, no sign');
  assert.equal(a.comparisons, 3 * 2 + 3 * 2 - 1, 'n = distinct headline + distinct held-out boards - 1');
  assert.ok(Math.abs(a.score) < Math.abs(a.rawScore), 'shrunk toward zero');
  assert.equal(a.shrinkage.priorMean, 0);
  assert.equal(a.drivers.positive.length, 3);
  for (const d of a.drivers.positive) assert.ok(d.gap > 0 && d.headlinePercentile > d.heldoutPercentile && d.cohort >= 10);
});

test('CR-69.2: specialisation between topics is not a signal — pairs never cross topics', () => {
  // Top on every Coding board, bottom on every Math board: no within-topic direction.
  const v = catalog((tier, topic) => (topic === 'Coding' ? 95 : 5));
  const r = scoreBenchmaxxing(v, 'm');
  assert.ok(Math.abs(r.rawScore) < 15, `raw ${r.rawScore}`);
  for (const p of [...r.drivers.positive, ...r.drivers.negative]) assert.ok(p.category === 'Coding' || p.category === 'Math');
  assert.ok(r.domainSpecialization > 50, 'specialisation stays disclosed');
});

test('CR-69.2: aggregate, judged, domain and secondary boards never enter a pair', () => {
  const noisy = (peers) => ['aggregate', 'domain', 'secondary', 'judged'].map((tier) => board(`noise-${tier}`, 'Coding', tier,
    Object.fromEntries([...peers.map((id, i) => [id, i]), ['m', tier === 'judged' ? 0 : 1000]]), tier === 'judged' ? { judged: true } : {}));
  const base = catalog((tier) => (tier === 'headline' ? 70 : 40));
  const withNoise = catalog((tier) => (tier === 'headline' ? 70 : 40), { extraAxes: noisy });
  const a = scoreBenchmaxxing(base, 'm'), b = scoreBenchmaxxing(withNoise, 'm');
  assert.equal(b.score, a.score);
  for (const axis of withNoise.axes.filter((x) => x.id.startsWith('noise-'))) assert.equal(benchmaxxingSide(axis), null, axis.id);
  const used = new Set([...b.drivers.positive, ...b.drivers.negative].flatMap((p) => [p.headline.id, p.heldout.id]));
  assert.ok(![...used].some((id) => id.startsWith('noise-')));
});

test('CR-69.2: pairs from one topic only are not eligible', () => {
  const r = scoreBenchmaxxing(catalog((tier) => (tier === 'headline' ? 90 : 10), { topics: ['Coding'] }), 'm');
  assert.equal(r.status, 'insufficient-coverage');
  assert.equal(r.topics, 1);
  assert.equal(r.score, null);
});

test('CR-69.3: bootstrap interval is deterministic and contains the score', () => {
  const v = catalog((tier, topic, k) => (tier === 'headline' ? 80 + k : 30 - k));
  const a = benchmaxxingInterval(v, 'm'), b = benchmaxxingInterval(v, 'm');
  assert.deepEqual(a, b);
  const s = scoreBenchmaxxing(v, 'm').score;
  assert.ok(a.lower <= s && s <= a.upper && a.lower > 0);
});

// Regression fixture: the live view of 17 Sep 2026 ~11:00 UTC (signal axes only). Names appear only here.
const fixture = JSON.parse(await readFile(new URL('./fixtures/benchmaxxing-view-20260917.json', import.meta.url), 'utf8'));
const fixtureView = { models: fixture.models, axes: fixture.axes.map(({ rows, ...a }) => ({ ...a, name: a.id, unit: 'score', scores: scoresOf(rows) })) };
const LOW = ['gpt-6-astra::max', 'claude-opus-5::max', 'kimi-k3::max', 'claude-fable-5.1::max', 'gpt-5.6-sol::max'];
const HIGH = ['glm-5.2::max', 'minimax-m3::default', 'mimo-v2.5::default', 'ling-3.0-flash::default', 'deepseek-v4.1-flash::max', 'nex-n2-pro::default',
  'ring-2.6-1t::default', 'hy3::default', 'mimo-v2.5-pro::default'];

test('CR-69.3 regression (17 Sep view): expected tags; frontier models named by Florian stay untagged', () => {
  const fam = benchmaxxingFamilySignals(fixtureView);
  const familyOf = (id) => id.split('::')[0];
  assert.deepEqual([...fam.taggedFamilies].sort(), ['minimax-m2.7', 'nemotron-3-ultra-550b-a55b', 'qwen3.5-122b-a10b', 'qwen3.5-397b-a17b', 'qwen3.6-27b', 'qwen3.6-35b-a3b'].sort());
  assert.deepEqual([...fam.weakFamilies].sort(), ['gemini-3.1-pro-preview', 'kimi-k2.6', 'mimo-v2.5-pro', 'mistral-medium-3.5', 'qwen3-coder-next', 'qwen3.7-max'].sort());
  for (const id of ['gpt-6-astra::max', 'claude-opus-5::max', 'gpt-5.6-sol::max', 'claude-fable-5.1::max', 'kimi-k3::max']) {
    assert.ok(!fam.taggedFamilies.has(familyOf(id)) && !fam.weakFamilies.has(familyOf(id)), `${id} untagged`);
  }
  const astra = scoreBenchmaxxing(fixtureView, 'gpt-6-astra::max');
  assert.ok(Math.abs(astra.score - -7.0) < 0.2, `GPT-6 Astra ${astra.score}`);
  for (const [, r] of fam.reports) if (fam.tagged.has(r.profile.modelId) || fam.weak.has(r.profile.modelId)) assert.ok(r.interval.lower > 0);
});

test("CR-69.3 regression (17 Sep view): Florian's LOW models score below his HIGH models", () => {
  const score = (id) => scoreBenchmaxxing(fixtureView, id).score;
  for (const id of [...LOW, ...HIGH]) assert.equal(typeof score(id), 'number', `${id} is scored`);
  let ok = 0, total = 0;
  for (const l of LOW) for (const h of HIGH) { total += 1; ok += score(l) < score(h) ? 1 : score(l) === score(h) ? 0.5 : 0; }
  assert.ok(ok / total >= 0.85, `pair accuracy ${(ok / total).toFixed(2)}`);
  const mean = (ids) => ids.reduce((s, id) => s + score(id), 0) / ids.length;
  assert.ok(mean(LOW) < 0 && 0 < mean(HIGH), `LOW ${mean(LOW).toFixed(1)} HIGH ${mean(HIGH).toFixed(1)}`);
});

test('CR-69.3: with no model credibly above zero nothing is tagged', () => {
  // Every board orders the models identically: no gap anywhere, so no tag (not a fixed share).
  const v = catalog(() => 50, { noise: 0 });
  const { tagged, weak } = benchmaxxingSignals(v);
  assert.equal(tagged.size + weak.size, 0);
});
