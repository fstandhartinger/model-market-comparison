// CR-34.2 / CR-34.3: OpenRouter's own runs — identity, attachment scope and the measured cost signal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildOpenRouterBenchmarkObservations, familyIndex, BENCHMARK_IDS } from '../lib/openrouter-benchmark-scores.mjs';
import { buildBenchmarkView, latestScores } from '../lib/benchmark-view.mjs';
import { validateBenchmarkScores } from '../lib/benchmark-scores.mjs';

const VERSION = 'snapshot-2026-09-15';
const SOURCE = { url: 'https://openrouter.ai/benchmarks', retrieved_at: '2026-09-15T23:29:03.209Z', published_at: null,
  sha256: 'a'.repeat(64), file: 'data/raw/benchmarks/daily-evidence/x/y.gz' };

const offer = (slug) => ({ source: 'OpenRouter', platform: 'OpenRouter', or_model_id: slug, or_canonical_slug: `${slug}-20260101` });
const models = [
  // multi-effort family: representative order puts claude-* "high" first
  { id: 'claude-x::high', family_key: 'claude-x', display_name: 'Claude X (high)', variant: 'high', benchmarks: { aa_intelligence_index: 70 }, offers: [offer('anthropic/claude-x')] },
  { id: 'claude-x::low', family_key: 'claude-x', display_name: 'Claude X (low)', variant: 'low', benchmarks: { aa_intelligence_index: 60 }, offers: [offer('anthropic/claude-x')] },
  // single-configuration family
  { id: 'solo::default', family_key: 'solo', display_name: 'Solo', variant: 'default', benchmarks: {}, offers: [offer('vendor/solo')] },
];
const row = (over) => ({ source: 'openrouter', model_permaslug: 'anthropic/claude-x', display_name: 'Claude X',
  benchmark_type: 'gpqa_diamond', accuracy: 0.8, accuracy_stddev: 0.02, total_tasks: 198,
  avg_cost_per_task: 0.25, last_run_timestamp: '2026-09-01T00:00:00.000Z', ...over });
const build = (rows) => buildOpenRouterBenchmarkObservations({ own_data: rows }, models, SOURCE, VERSION);
const scores = (r) => r.observations.filter((o) => !o.benchmark_id.includes('-cost::'));

test('a run without a published effort attaches once to the deterministic family representative', () => {
  const { observations } = build([row()]);
  const score = scores({ observations })[0];
  assert.equal(score.benchmark_id, `${BENCHMARK_IDS.gpqa_diamond}::${VERSION}`);
  assert.equal(score.subject.model_id, 'claude-x::high');
  assert.equal(score.value, 0.8);
  assert.equal(score.unit, 'fraction');
  assert.equal(score.basis, 'measured');
  assert.equal(score.published_stddev, 0.02);
  assert.equal(score.sample_size, 198);
  assert.match(score.protocol, /attached once to claude-x::high/);
  assert.match(score.protocol, /does not assert that OpenRouter tested this exact effort setting/);
  // exactly one row of the family carries it
  assert.equal(scores({ observations }).length, 1);
});

test('a published reasoning effort joins that exact configuration, and never a different one', () => {
  const joined = build([row({ benchmark_type: 'search_browsecomp', accuracy: undefined, primary_score: 0.9,
    primary_metric: 'accuracy', search_engine: 'parallel', search_surface: 'server-tool', run_config: { reasoning_effort: 'low', max_agent_turns: 25, temperature: null } })]);
  assert.equal(scores(joined)[0].subject.model_id, 'claude-x::low');

  const unjoinable = build([row({ benchmark_type: 'search_browsecomp', accuracy: undefined, primary_score: 0.9,
    primary_metric: 'accuracy', search_engine: 'parallel', search_surface: 'server-tool', run_config: { reasoning_effort: 'max', max_agent_turns: 25, temperature: null } })]);
  assert.equal(scores(unjoinable)[0].subject.model_id, null, 'an effort with no catalog configuration is never mapped onto another');
  assert.match(unjoinable.unmatched[0].reason, /reasoning effort "max", which is not a catalog configuration/);
});

test('two permaslugs of one family: the newest run represents it, an exact tie represents nothing', () => {
  const newest = build([
    row({ model_permaslug: 'anthropic/claude-x', accuracy: 0.70, last_run_timestamp: '2026-08-01T00:00:00.000Z' }),
    row({ model_permaslug: 'anthropic/claude-x-20260101', accuracy: 0.81, last_run_timestamp: '2026-09-02T00:00:00.000Z' }),
  ]);
  assert.deepEqual(scores(newest).map((o) => o.value), [0.81]);

  const tie = build([
    row({ model_permaslug: 'anthropic/claude-x', accuracy: 0.70 }),
    row({ model_permaslug: 'anthropic/claude-x-20260101', accuracy: 0.81 }),
  ]);
  assert.equal(scores(tie).length, 0);
  assert.match(tie.rejected[0].reason, /same run timestamp; neither may represent the family/);
});

test('an unknown permaslug is rejected instead of guessed, and an ambiguous one joins nothing', () => {
  const { observations, rejected } = build([row({ model_permaslug: 'who/knows' })]);
  assert.equal(observations.length, 0);
  assert.match(rejected[0].reason, /no OpenRouter offer in the catalog/);

  const shared = [{ ...models[0], offers: [offer('shared/slug')] }, { ...models[2], offers: [offer('shared/slug')] }];
  assert.equal(familyIndex(shared).get('shared/slug'), null, 'a slug two families claim resolves to no family');
});

test('avg_cost_per_task is a separate USD observation on its own -cost board, never inside the score', () => {
  const { observations } = build([row()]);
  const cost = observations.find((o) => o.benchmark_id.includes('-cost::'));
  assert.equal(cost.benchmark_id, `${BENCHMARK_IDS.gpqa_diamond}-cost::${VERSION}`);
  assert.equal(cost.unit, 'USD');
  assert.equal(cost.value, 0.25);
  assert.equal(cost.subject.model_id, 'claude-x::high');
  assert.match(cost.protocol, /not Benchmark Heaven's adjusted cost model/);
  const score = scores({ observations })[0];
  assert.equal(score.value, 0.8, 'the quality value is untouched by the cost');
  // A row without a measured cost produces no cost observation rather than a zero.
  assert.equal(build([row({ avg_cost_per_task: null })]).observations.filter((o) => o.benchmark_id.includes('-cost::')).length, 0);
});

test('CR-65.12: a run that cannot be this model (far above AA on the same test, or a cost the list price cannot explain) is withheld with a reason', () => {
  const micro = [{ id: 'micro::default', family_key: 'micro', display_name: 'Micro', variant: 'default', benchmarks: { aa_gpqa: 0.358 },
    offers: [{ ...offer('vendor/micro'), input_per_1m: 0.035, output_per_1m: 0.14 }] }];
  const run = (over) => buildOpenRouterBenchmarkObservations({ own_data: [row({ model_permaslug: 'vendor/micro', ...over })] }, micro, SOURCE, VERSION);
  // Nova Micro's published GPQA row: 89.1 % against AA's 35.8 % — score and its cost twin are both withheld.
  const far = run({ accuracy: 0.890572, avg_cost_per_task: 0.0001 });
  assert.equal(far.observations.length, 0);
  assert.match(far.rejected[0].reason, /more than 25 percentage points above Artificial Analysis/);
  // τ² has no AA twin; $1.28 per task at $0.14/1M means > 9 M tokens per task.
  const pricey = run({ benchmark_type: 'tau_bench_verified_airline', accuracy: 0.787, avg_cost_per_task: 1.2795 });
  assert.equal(pricey.observations.length, 0);
  assert.match(pricey.rejected[0].reason, /list price cannot explain it/);
  // A plausible run of the same model passes: within 25 pp of AA and a cost of a few thousand tokens.
  const fine = run({ accuracy: 0.40, avg_cost_per_task: 0.0005 });
  assert.equal(fine.observations.length, 2);
  assert.equal(fine.rejected.length, 0);
});

test('CR-65.12 live: Nova Micro shows no OpenRouter GPQA Diamond or τ² value', async () => {
  const ds = JSON.parse(await readFile('data/dataset.json', 'utf8'));
  const hits = ds.benchmark_results.observations.filter((o) => o.subject.model_id?.startsWith('nova-micro') && o.benchmark_id.startsWith('openrouter-'));
  assert.deepEqual(hits.map((o) => o.benchmark_id), []);
  // Retained history states still hold the run; it must not return as a "no longer published" estimate.
  const estimates = ds.benchmark_results.historical.estimates.filter((e) => e.model_id?.startsWith('nova-micro') && e.benchmark_id.startsWith('openrouter-'));
  assert.deepEqual(estimates.map((e) => e.id), []);
});

test('CR-65.13: a run without a stated effort joins OpenRouter\'s default effort and never a non-reasoning configuration', () => {
  const fam = (key, variants, over = {}) => variants.map((v) => ({ id: `${key}::${v}`, family_key: key, display_name: `${key} (${v})`, variant: v,
    deprecated: v !== 'non-reasoning', benchmarks: {}, offers: [offer(`vendor/${key}`)], ...over }));
  const catalog = (key, reasoning, params = []) => ({ id: `vendor/${key}`, canonical_slug: `vendor/${key}-20260101`, reasoning, supported_parameters: params });
  const run = (models, cat, over = {}) => buildOpenRouterBenchmarkObservations({ own_data: [row({ model_permaslug: `vendor/${models[0].family_key}`, ...over })] }, models, SOURCE, VERSION, cat);
  // DeepSeek V4 Flash: the reasoning rows are retired, the active row is non-reasoning, OpenRouter's default effort is "high".
  const flash = run(fam('flash', ['high', 'max', 'non-reasoning']), [catalog('flash', { mandatory: false, default_effort: 'high' })]);
  assert.deepEqual(flash.observations.map((o) => o.subject.model_id), ['flash::high', 'flash::high']);
  assert.match(scores(flash)[0].protocol, /default reasoning effort "high"/);
  // Gemini 2.5 Flash: only a non-reasoning row, and the model can reason with no published default → unjoined, with a reason.
  const gem = run(fam('gem', ['non-reasoning']), [catalog('gem', { mandatory: false }, ['reasoning'])]);
  assert.deepEqual(gem.observations.map((o) => o.subject.model_id), [null, null]);
  assert.match(gem.unmatched[0].reason, /non-reasoning, so the run is not attached/);
  // A model that cannot reason still attaches to its non-reasoning row; without a catalog nothing changes.
  assert.deepEqual(run(fam('plain', ['non-reasoning']), [catalog('plain', undefined, ['temperature'])]).observations.map((o) => o.subject.model_id), ['plain::non-reasoning', 'plain::non-reasoning']);
  assert.deepEqual(scores(build([row()])).map((o) => o.subject.model_id), ['claude-x::high']);
  // A default effort the family has no configuration for falls back to the representative, as before.
  const other = run(fam('multi', ['max', 'low'], { deprecated: false }), [catalog('multi', { default_effort: 'medium' })]);
  assert.equal(scores(other)[0].subject.model_id, 'multi::max');
});

test('CR-65.13 live: no OpenRouter run sits on the non-reasoning rows of DeepSeek V4 Flash, Gemini 2.5 Flash or Qwen3.5-35B-A3B', async () => {
  const ds = JSON.parse(await readFile('data/dataset.json', 'utf8'));
  const hits = ds.benchmark_results.observations.filter((o) => o.benchmark_id.startsWith('openrouter-')
    && ['deepseek-v4-flash::non-reasoning', 'gemini-2.5-flash::non-reasoning', 'qwen3.5-35b-a3b::non-reasoning'].includes(o.subject.model_id));
  assert.deepEqual(hits.map((o) => o.id), []);
  assert.ok(ds.benchmark_results.observations.some((o) => o.id === 'openrouter:deepseek/deepseek-v4-flash-20260423|gpqa_diamond' && o.subject.model_id === 'deepseek-v4-flash::high'));
  // Re-attached or unjoined runs are still published, so retained states give them no "no longer published" estimate.
  const estimates = ds.benchmark_results.historical.estimates.filter((e) => e.benchmark_id.startsWith('openrouter-') && /deepseek-v4-flash|gemini-2.5-flash|qwen3.5-35b|gpt-5/.test(e.model_id ?? ''));
  assert.deepEqual(estimates.map((e) => e.id), []);
});

test('the live dataset carries the OpenRouter boards, separate from same-named boards of other maintainers', async () => {
  const ds = JSON.parse(await readFile('data/dataset.json', 'utf8'));
  validateBenchmarkScores(ds.benchmark_results, { entries: ds.benchmark_results.registry });
  const view = buildBenchmarkView(ds);
  const ids = new Set(ds.benchmark_results.registry.map((e) => e.id));
  for (const family of Object.values(BENCHMARK_IDS)) {
    assert.ok(ids.has(`${family}::${VERSION}`), `${family} registered`);
    assert.ok(ids.has(`${family}-cost::${VERSION}`), `${family} cost registered`);
  }
  const or = view.axes.find((a) => a.benchmarkId === `${BENCHMARK_IDS.gpqa_diamond}::${VERSION}`);
  const aa = view.axes.find((a) => a.benchmarkId.startsWith('aa-gpqa-diamond::'));
  assert.ok(or && aa, 'both GPQA boards exist');
  assert.notEqual(or.benchmarkId, aa.benchmarkId, 'the OpenRouter run is its own registry identity, never merged into AA GPQA');
  assert.ok(latestScores(or.scores).length >= 100, 'OpenRouter GPQA covers the published population');
  assert.equal(or.maintainer ?? ds.benchmark_results.registry.find((e) => e.id === or.benchmarkId).maintainer, 'OpenRouter');

  // CR-34.3: the measured cost rides on the score row, labelled per task, and is not a "#benchmarks" hit.
  const withCost = latestScores(or.scores).find((r) => r.costPerRollout != null && r.modelId);
  assert.ok(withCost, 'a measured avg_cost_per_task reaches the score row');
  assert.ok(withCost.sampleSize > 0, 'the task count reaches the row');
  const coverage = ds.benchmark_results.coverage.by_model[withCost.modelId];
  assert.ok(coverage.capability_available < coverage.available, 'cost boards count as cells but not as benchmarks');
  assert.equal(coverage.total_capability_benchmarks, ds.benchmark_results.registry.filter((e) => e.category !== 'Efficiency').length);
});
