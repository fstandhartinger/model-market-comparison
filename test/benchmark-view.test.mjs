import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildBenchmarkView, cohortOf, distribution, latestScores, normalize, profileAnomalies, selectBenchmarkView } from '../lib/benchmark-view.mjs';

const row = (id, value, extra = {}) => ({ id, modelId: id, subjectId: id, value, date: '2026-09-10', basis: 'measured', lowSample: false, ...extra });
test('radar preserves zero, reverses lower-better, and withholds missing or uninformative ranges', () => {
  const stats = { n: 20, min: -10, max: 30 };
  assert.equal(normalize(0, stats, true), 25);
  assert.equal(normalize(0, stats, false), 75);
  assert.equal(normalize(-10, stats, true), 0);
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(normalize(value, stats, true), null);
  assert.equal(normalize(20, { n: 1, min: 20, max: 20 }, true), null);
  assert.equal(normalize(20, { n: 20, min: 20, max: 20 }, true), null);
  assert.equal(normalize(20, stats, null), null);
});
test('observation selection prefers measured and latest, never highest or vendor-derived claims', () => {
  const rows = [row('old', 99, { modelId: 'a', date: '2025-01-01' }), row('new', 40, { modelId: 'a' }), row('vendor', 100, { modelId: 'a', basis: 'self_reported', derived: true, date: '2026-10-01' })];
  assert.equal(latestScores(rows)[0].value, 40);
  assert.equal(latestScores(rows, 'all')[0].value, 40);
  assert.equal(latestScores(rows, 'self_reported')[0].value, 100);
});
test('peer distribution excludes unmatched identities, claims, low battle counts, and duplicate source identities', () => {
  const models = ['a','b','clone','c','d'].map((id) => ({ id, family: id }));
  const scores = [row('a', 0), row('b', 10), row('clone', 10, { subjectId: 'b' }), row('c', 900, { basis: 'self_reported' }), row('d', 500, { lowSample: true }), row('unmatched', 1000, { modelId: null })];
  assert.deepEqual(distribution({ scores }, models), { n: 2, families: 2, mean: 5, sd: 5, min: 0, max: 10 });
});
function fixture({ target = 100, lower = false, allStrong = false, peerCount = 20, familyCount = 10, axesCount = 6 } = {}) {
  const models = [{ id: 'target', family: 'target' }, ...Array.from({ length: peerCount }, (_, i) => ({ id: `p${i}`, family: `f${i % familyCount}` }))];
  const axes = Array.from({ length: axesCount }, (_, i) => {
    const scores = [row('target', i === 0 || allStrong ? target : 0), ...models.slice(1).map((m, i) => row(m.id, i % 2 ? -1 : 1))];
    const axis = { id: `axis${i}`, family: `bench${i}`, scores, higherBetter: i === 0 ? !lower : true };
    return { ...axis, stats: distribution(axis, models) };
  });
  return { models, axes };
}
test('profile flags require both relative strength and peer deviation and expose independently computable inputs', () => {
  const view = fixture(), result = profileAnomalies(view, 'target');
  assert.equal(result.flags.length, 1);
  const f = result.flags[0];
  assert.equal(f.direction, 'strong'); assert.equal(f.profileN, 5); assert.equal(f.peers, 21);
  assert.ok(Math.abs(f.mean - 100 / 21) < 1e-10);
  assert.ok(Math.abs(f.z - (100 - f.mean) / f.sd) < 1e-10);
  assert.equal(f.baseline, 0); assert.equal(f.gap, f.z);
  assert.equal(profileAnomalies(fixture({ allStrong: true }), 'target').flags.length, 0);
  assert.equal(profileAnomalies(fixture({ target: -100 }), 'target').flags[0].direction, 'weak');
  assert.equal(profileAnomalies(fixture({ target: -100, lower: true }), 'target').flags[0].direction, 'strong');
});
test('tiny peer groups, narrow family coverage, and insufficient model profile never trigger flags', () => {
  for (const settings of [{ peerCount: 18 }, { familyCount: 8 }, { axesCount: 5 }]) assert.equal(profileAnomalies(fixture(settings), 'target').flags.length, 0);
  const view = fixture({ axesCount: 5 }); view.axes.push({ ...view.axes[1], id: 'other-version' });
  assert.equal(profileAnomalies(view, 'target').flags.length, 0, 'repeating another version is not another benchmark family');
});
test('explicit CoT settings, dataset splits, and harnesses create separate evaluation axes', () => {
  const make = (configuration, harness = null) => ({ id: 'test', benchmark_id: 'test::v2', subject: { harness }, protocol: `protocol; source row: ${JSON.stringify({ configuration })}` });
  assert.notEqual(cohortOf(make('with CoT')), cohortOf(make('without CoT')));
  assert.notEqual(cohortOf(make('validation')), cohortOf(make('test')));
  assert.notEqual(cohortOf(make(null, 'Codex')), cohortOf(make(null, 'Claude Code')));
});
test('two harnesses of one model stay separate axes and rows, never merged', () => {
  const observation = (harness, value) => ({
    id: `realswe:${harness}`, benchmark_id: 'realswe::snapshot-2026-09-12',
    subject: { model_id: null, source_id: `realswe:${harness}`, name: 'GPT-6 Astra', harness, variant: null },
    value, unit: 'percent', basis: 'measured', protocol: 'Real-SWE public leaderboard',
    confidence_interval: { level: 0.95, lower: value, upper: value },
    source: { url: 'https://realswe.withspecific.com/', retrieved_at: '2026-09-12', published_at: null, file: 'evidence' },
  });
  const ds = {
    models: [],
    sources: { artificialanalysis: '2026-09-01', designarena: '2026-09-01' },
    benchmark_results: {
      registry: [{ id: 'realswe::snapshot-2026-09-12', family: 'realswe', name: 'Real-SWE', version: 'snapshot-2026-09-12',
        category: 'Coding', one_sentence_description: 'Resolution rate on a public sample.', scoring: { unit: 'percent', higher_better: true },
        primary_url: 'https://realswe.withspecific.com/' }],
      observations: [observation('Codex CLI', 20), observation('Claude Code', 30)],
      collections: [],
    },
  };
  const axes = buildBenchmarkView(ds).axes.filter((a) => a.benchmarkId === 'realswe::snapshot-2026-09-12');
  assert.equal(axes.length, 2, 'each harness is its own axis');
  assert.deepEqual(axes.map((a) => a.cohort).sort(), ['Claude Code', 'Codex CLI']);
  for (const axis of axes) {
    assert.equal(axis.scores.length, 1);
    assert.equal(axis.scores[0].harness, axis.cohort);
    assert.equal(axis.scores[0].modelId, null);
  }
});
test('actual source adapter keeps all version identities, values and dated legacy inputs, without mutating data', async () => {
  const ds = JSON.parse(await readFile('data/dataset.json', 'utf8')), before = JSON.stringify(ds);
  const view = buildBenchmarkView(ds), ids = new Set(view.axes.map((a) => a.benchmarkId));
  for (const b of ds.benchmark_results.registry) assert.ok(ids.has(b.id), b.id);
  const byId = new Map(ds.benchmark_results.observations.map((o) => [o.id, o]));
  let count = 0;
  for (const a of view.axes) for (const r of a.scores) {
    if (r.id.startsWith('legacy:')) continue;
    const original = byId.get(r.id); count++;
    assert.equal(r.value, original.value); assert.equal(a.benchmarkId, original.benchmark_id);
    assert.equal(r.date, original.source.retrieved_at); assert.equal(view.sources[r.source].url, original.source.url);
  }
  assert.equal(count, byId.size);
  const old = view.axes.filter((a) => a.benchmarkId === 'aa-coding-agent-index::1.4');
  const current = view.axes.filter((a) => a.benchmarkId === 'aa-coding-agent-index::1.5');
  assert.ok(old.length && current.length);
  assert.ok(old.flatMap((a) => a.scores).every((r) => r.date === '2026-09-09'));
  const selected = selectBenchmarkView(view, ['gpt-5.6-sol::high']);
  assert.ok(selected.axes.flatMap((a) => a.scores).every((r) => r.modelId === 'gpt-5.6-sol::high'));
  assert.deepEqual(selected.axes.map((a) => a.stats), view.axes.map((a) => a.stats), 'peers independent of selection');
  // Guards against shipping the whole matrix instead of the selected model's rows (that is megabytes).
  // The ceiling tracks the registry: 2026-09-16 raised from 500 KB with CR-34.2's twelve OpenRouter boards, to
  // 560 KB in iteration 81 (SWE-rebench, GSO and τ^τ-bench's six harness axes add ~1 KB of axis metadata each), and
  // to 575 KB in iteration 113 (CR-81/82: ArXivMath/BrokenArXiv 08/2026 and WeirdML v3 join as their own axes).
  assert.ok(JSON.stringify(selected).length < 575_000, 'initial benchmark payload bounded to selected models');
  assert.equal(JSON.stringify(ds), before);
});

// CR-36.2: one Compare entry per model; each benchmark takes the best of its reasoning variants and names it.
import { compareFamilies, selectFamilyBenchmarkView } from '../lib/benchmark-view.mjs';
function familyFixture() {
  const models = [
    { id: 'fable::max', name: 'Claude Fable 5.1 (Adaptive Reasoning, Max Effort)', org: 'Anthropic', family: 'fable', variant: 'max', released: '2026-09-01' },
    { id: 'fable::high', name: 'Claude Fable 5.1 (Adaptive Reasoning, High Effort)', org: 'Anthropic', family: 'fable', variant: 'high', released: '2026-09-01' },
    { id: 'astra::xhigh', name: 'GPT-6 Astra (xhigh)', org: 'OpenAI', family: 'astra', variant: 'xhigh', released: '2026-09-03' },
    { id: 'old', name: 'Opus 4.7 (medium)', org: 'Anthropic', family: 'opus47', variant: 'medium', historical: true, deprecated: true },
  ];
  const aa = { id: 'aa', family: 'aa_intelligence_index', higherBetter: true, scores: [row('fable::max', 53, { modelId: 'fable::max' }), row('fable::high', 51, { modelId: 'fable::high' }), row('astra::xhigh', 52, { modelId: 'astra::xhigh' })] };
  const swe = { id: 'swe', family: 'swe', higherBetter: true, scores: [row('s1', 70, { modelId: 'fable::max' }), row('s2', 74, { modelId: 'fable::high' }), row('s3', 99, { modelId: 'fable::high', basis: 'self_reported', derived: true })] };
  const cost = { id: 'cost', family: 'cost', higherBetter: false, scores: [row('c1', 2, { modelId: 'fable::max' }), row('c2', 3, { modelId: 'fable::high' })] };
  const unknown = { id: 'unk', family: 'unk', higherBetter: null, scores: [row('u1', 5, { modelId: 'fable::high' }), row('u2', 9, { modelId: 'fable::max' })] };
  return { models, axes: [aa, swe, cost, unknown], indexAxes: [], missing: [{ model_id: 'fable::high', benchmark_id: 'x' }, { model_id: 'fable::max', benchmark_id: 'y' }] };
}
test('compare families: one entry per model, representative = strongest current variant, variant detail dropped from the name', () => {
  const fams = compareFamilies(familyFixture());
  assert.equal(fams.length, 3);
  const fable = fams.find((f) => f.family === 'fable');
  assert.deepEqual([fable.id, fable.name, fable.score, fable.variants.length, fable.current], ['fable::max', 'Claude Fable 5.1', 53, 2, true]);
  assert.equal(fams.find((f) => f.family === 'astra').name, 'GPT-6 Astra');
  assert.equal(fams.find((f) => f.family === 'opus47').current, false);
});
test('family view: best-of per benchmark, direction-aware, measured before claims, variant named, one entry per picked model', () => {
  const view = selectFamilyBenchmarkView(familyFixture(), ['fable::high', 'fable::max', 'astra::xhigh']);
  assert.deepEqual(view.picks, ['fable::max', 'astra::xhigh']);
  const rows = (id) => view.axes.find((a) => a.id === id).scores.filter((r) => r.modelId === 'fable::max');
  // Higher-better: the high variant's measured 74 beats max's 70; its self-reported 99 travels along but is not measured.
  assert.equal(latestScores(rows('swe'))[0].value, 74);
  assert.equal(latestScores(rows('swe'))[0].variantLabel, 'high');
  assert.equal(latestScores(rows('swe'))[0].bestOf, 2);
  // Lower-better: 2 (max) wins.
  assert.equal(latestScores(rows('cost'))[0].value, 2);
  assert.equal(latestScores(rows('cost'))[0].variantId, 'fable::max');
  // Unknown direction: no "best" — the representative's own row.
  assert.equal(latestScores(rows('unk'))[0].value, 9);
  // No variant row survives under its own id; the representative carries the family name.
  assert.ok(view.axes.every((a) => a.scores.every((r) => r.modelId !== 'fable::high')));
  assert.equal(view.models.find((m) => m.id === 'fable::max').name, 'Claude Fable 5.1');
  assert.deepEqual(view.missing.map((m) => m.model_id), ['fable::max']);
});
