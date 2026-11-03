import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertJoinParity, endpointPrices, openRouterEndpoint, openRouterModel, rawCatalog } from './helpers/live-catalog.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { benchmaxxingSignals } from '../lib/benchmax.mjs';
import { BENCHMAXX_TAG_MIN_COMPARISONS, benchmaxxingLevelFor, benchmaxxingUncertaintyNote } from '../lib/benchmaxxing-levels.mjs';

const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
const model = dataset.models.find((row) => row.id === 'mimo-v2.6-pro::default');

test('CR-117: MiMo-V2.6-Pro identity, licence and exact standard route are source-backed', () => {
  assert.ok(model);
  assert.equal(model.org, 'Xiaomi');
  assert.equal(model.open_weights, true);
  assert.equal(model.release_date, '2026-09-21');
  assert.equal(model.aa_metadata.license_name, 'MIT');
  assert.equal(model.aa_metadata.huggingface_url, 'https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL');
  assert.equal(model.aa_metadata.openrouter_api_id, 'xiaomi/mimo-v2.6-pro');
  // Every route must be the exact standard OpenRouter identity, never a borrowed one. The routes are
  // live facts and come and go (2026-09-23 DeepInfra joined Xiaomi's own endpoint, both under
  // xiaomi/mimo-v2.6-pro): each exists exactly while OpenRouter lists it, at the raw price (R9.1).
  const openRouter = rawCatalog('openrouter.json');
  const slug = 'xiaomi/mimo-v2.6-pro';
  const listedModel = openRouterModel(openRouter, slug);
  const routesListed = (listedModel?.endpoints ?? []).length > 0;
  if (assertJoinParity(assert, model.offers.length > 0, routesListed && listedModel, `${slug} routes`)) {
    assert.deepEqual([...new Set(model.offers.map((offer) => offer.or_model_id))], [slug]);
    assert.deepEqual([...new Set(model.offers.map((offer) => offer.or_canonical_slug))], [listedModel.canonical_slug]);
    assert.equal(model.offers.length, listedModel.endpoints.length, 'one offer per listed endpoint');
  }
  const endpoint = openRouterEndpoint(openRouter, slug, (e) => e.provider_name === 'Xiaomi');
  const firstParty = model.offers.find((offer) => offer.or_provider_slug === 'xiaomi');
  if (assertJoinParity(assert, firstParty, endpoint, `${slug} first-party route`)) {
    const price = endpointPrices(endpoint);
    assert.deepEqual([firstParty.input_per_1m, firstParty.output_per_1m, firstParty.cache_read_per_1m ?? null], [price.input, price.output, price.cacheRead]);
    assert.equal(firstParty.context_length, endpoint.context_length);
    assert.equal(firstParty.max_completion_tokens, endpoint.max_completion_tokens);
  }
});

test('CR-117: AA values and efficiency attach by exact UUID, never by a borrowed model identity', () => {
  // CR-634: AA rescored MiMo-V2.6-Pro on Intelligence Index v5.0 (46.3 on v4.x), so the values are AA's
  // live numbers: the row carries them exactly while AA lists them, and the efficiency join follows the
  // AA efficiency page by the same UUID (R9.1).
  const aa = rawCatalog('artificialanalysis.json').models.find((row) => row.id === '24d8fdfe-6241-424e-b7b7-1b6efb06e4fb');
  const evaluations = aa?.evaluations ?? {};
  const scored = evaluations.artificial_analysis_intelligence_index != null;
  assertJoinParity(assert, model.benchmarks.aa_intelligence_index != null, scored && aa, 'MiMo AA Intelligence Index');
  if (scored) {
    assert.equal(model.benchmarks.aa_intelligence_index, evaluations.artificial_analysis_intelligence_index);
    assert.equal(model.aa_intelligence.status, 'measured');
    for (const [field, key] of [['aa_hle', 'hle'], ['aa_scicode', 'scicode'], ['aa_lcr', 'lcr']]) assert.equal(model.benchmarks[field] ?? null, evaluations[key] ?? null, field);
  }
  const efficiency = rawCatalog('aa-efficiency.json').rows.find((row) => row.source_id === '24d8fdfe-6241-424e-b7b7-1b6efb06e4fb');
  if (assertJoinParity(assert, model.token_efficiency.aa.status === 'available', efficiency, 'MiMo AA efficiency')) {
    assert.equal(model.token_efficiency.aa.source_model_id, efficiency.source_id);
    assert.equal(model.token_efficiency.aa.source_slug, efficiency.slug);
  }
});

test('CR-117: all 17 Xiaomi claims remain self-reported with reviewable provenance', () => {
  const rows = dataset.benchmark_results.observations.filter((row) => row.subject?.model_id === model.id && row.id.startsWith('self-reported:mimo-v26-'));
  assert.equal(rows.length, 17);
  assert.ok(rows.every((row) => row.basis === 'self_reported'));
  assert.ok(rows.every((row) => row.source?.published_at === '2026-09-22' && row.source?.sha256 === '8ba4b07222116198f7fa5df9472c322dae9e1a08266aa8032b1f4ba844c1bbb0'));
  assert.equal(rows.find((row) => row.id.endsWith('mimo-cyber-bench')).value, 81.7);
  assert.match(rows.find((row) => row.id.endsWith('mimo-cyber-bench')).protocol, /80\.2/);
  assert.equal(rows.find((row) => row.id.endsWith('gdpval-aa-2-1')).unit, 'elo');
  assert.equal(registry.entries.filter((row) => row.id.startsWith('xiaomi-')).length, 17);
});

test('CR-117: benchmaxxing rests on measured pairs, and discloses how thin they are', () => {
  const result = benchmaxxingSignals(buildBenchmarkView(dataset), [model.id]);
  // Until AA's 2026-09-27 refresh this model had no qualifying headline/held-out pair at all, so the
  // check read `reports === []`. AA then measured it on enough boards to form seven pairs. What CR-117
  // asked for is the rule, not the emptiness: a verdict exists only where the pairs do, it is built
  // from measured boards and never from Xiaomi's own 17 claims, and thin evidence is disclosed rather
  // than used to hide the tag. Both states satisfy this.
  if (!result.reports.length) {
    assert.equal(result.levels.has(model.id), false);
    assert.equal(result.tagged.has(model.id), false);
    return;
  }
  assert.equal(result.reports.length, 1);
  const [[id, report]] = result.reports;
  assert.equal(id, model.id);
  assert.ok(report.comparisons > 0, 'a verdict rests on real comparisons');
  assert.equal(result.levels.get(model.id), benchmaxxingLevelFor(report.score));
  // The 17 vendor boards do appear in the report's `profile` — that listing is every axis the model
  // could have, self-reported ones included. What must never happen is one of them taking a *side*:
  // the headline/held-out pairs the score is computed from, and the drivers it names.
  const vendor = (id) => String(id).startsWith('xiaomi-');
  const sided = report.profile.axes.filter((axis) => axis.side);
  assert.ok(sided.length > 0, 'the profile marks which axes took a side');
  for (const axis of sided) assert.ok(!vendor(axis.id), `${axis.id} took a side`);
  for (const driver of [...report.drivers.positive, ...report.drivers.negative]) {
    for (const side of [driver.headline, driver.heldout]) assert.ok(!vendor(side.id), `${side.id} drives the verdict`);
  }
  assert.equal(registry.entries.filter((row) => row.id.startsWith('xiaomi-')).length, 17);
  assert.ok(report.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS || benchmaxxingUncertaintyNote(report),
    `${report.comparisons} comparisons is thin evidence and must say so`);
});

test('CR-117.3: the visible MiMo Cyber Bench description discloses the 81.7-versus-80.2 source conflict', () => {
  const entry = registry.entries.find((row) => row.id === 'xiaomi-mimo-cyber-bench::snapshot-2026-09-22');
  assert.match(entry.one_sentence_description, /81\.7/);
  assert.match(entry.one_sentence_description, /80\.2/);
});
