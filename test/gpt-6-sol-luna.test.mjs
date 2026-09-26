import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
const POST = 'https://openai.com/index/introducing-gpt-6-sol-and-luna/';
const SOURCE_SHA = 'de4e8f71186ee5dad44f6d9924f7418c7c8e1dbf726340e464a37b58375c58f5';
const all = dataset.benchmark_results.observations.filter((row) => row.id.startsWith('self-reported:gpt-6-') && row.id.includes('-openai-'));
// CR-173 (2026-09-26): the chart-dataset rows carry the effort in their id; CR-126's six printed rows do not.
const EFFORT_ID = /^self-reported:gpt-6-(astra|sol|luna)-(low|medium|high|xhigh|max)-openai-/;
const claims = all.filter((row) => !EFFORT_ID.test(row.id));
const charted = all.filter((row) => EFFORT_ID.test(row.id));
const claim = (id) => all.find((row) => row.id === id);

test("CR-126.1: OpenAI's own runs keep their own registry identities and printed versions", () => {
  const own = registry.entries.filter((row) => row.id.startsWith('openai-'));
  // CR-173 (2026-09-26): three cost-per-task identities from the same post's chart datasets.
  assert.deepEqual(own.map((row) => row.id).sort(), [
    'openai-agents-last-exam-cost::v1',
    'openai-agents-last-exam::v1',
    'openai-automationbench-cost::1.0.6',
    'openai-automationbench::1.0.6',
    'openai-deepswe-v1-1-cost::1.1',
    'openai-deepswe-v1-1::1.1',
    'openai-osworld-2-offline-cost::v2026.08.08',
    'openai-osworld-2-offline::v2026.08.08',
  ]);
  assert.ok(own.every((row) => row.source_type === 'vendor_report' && row.primary_url === POST && row.status === 'active'));
  const cost = registry.entries.find((row) => row.id === 'openai-automationbench-cost::1.0.6');
  assert.equal(cost.scoring.unit, 'USD');
  assert.equal(cost.scoring.higher_better, false);
  assert.equal(cost.category, 'Efficiency');
  // A lab's own run is a different implementation from the board's: those identities stay untouched.
  assert.ok(registry.entries.some((row) => row.id === 'osworld-2::v2026.08.08'));
  assert.ok(registry.entries.some((row) => row.id === 'aa-automationbench::1.0.6'));
});

test('CR-126.2: exactly the six printed values are ingested, all self-reported and sourced', () => {
  assert.equal(claims.length, 6);
  assert.ok(claims.every((row) => row.basis === 'self_reported' && row.comparison_key === null));
  assert.ok(claims.every((row) => row.source.url === POST && row.source.published_at === '2026-09-22' && row.source.sha256 === SOURCE_SHA));
  assert.equal(claim('self-reported:gpt-6-sol-openai-automationbench-1-0-6').value, 33.2);
  assert.equal(claim('self-reported:gpt-6-sol-openai-automationbench-1-0-6-cost').value, 0.27);
  assert.equal(claim('self-reported:gpt-6-sol-openai-automationbench-1-0-6-cost').unit, 'USD');
  assert.equal(claim('self-reported:gpt-6-sol-openai-agents-last-exam-v1').value, 56.4);
  assert.equal(claim('self-reported:gpt-6-sol-openai-deepswe-v1-1').value, 68.8);
  assert.equal(claim('self-reported:gpt-6-luna-openai-deepswe-v1-1').value, 66.6);
  assert.equal(claim('self-reported:gpt-6-sol-openai-osworld-2-offline').value, 60.5);
});

test('CR-126.1: every claim sits on the effort configuration OpenAI names, never on a neighbouring one', () => {
  const known = new Set(dataset.models.map((row) => row.id));
  for (const row of claims) {
    assert.ok(known.has(row.subject.model_id), `${row.id} joins a catalog configuration`);
    assert.equal(row.subject.model_id.split('::')[1], row.subject.variant, row.id);
  }
  assert.equal(claim('self-reported:gpt-6-sol-openai-automationbench-1-0-6').subject.model_id, 'gpt-6-sol::xhigh');
  assert.equal(claim('self-reported:gpt-6-sol-openai-automationbench-1-0-6-cost').subject.model_id, 'gpt-6-sol::xhigh');
  assert.equal(claim('self-reported:gpt-6-sol-openai-osworld-2-offline').subject.model_id, 'gpt-6-sol::xhigh');
  assert.equal(claim('self-reported:gpt-6-sol-openai-agents-last-exam-v1').subject.model_id, 'gpt-6-sol::max');
  assert.equal(claim('self-reported:gpt-6-sol-openai-deepswe-v1-1').subject.model_id, 'gpt-6-sol::max');
  assert.equal(claim('self-reported:gpt-6-luna-openai-deepswe-v1-1').subject.model_id, 'gpt-6-luna::max');
});

test('CR-126.2: the two launch models carry OpenAI\'s published release date and price', () => {
  for (const id of ['gpt-6-sol::xhigh', 'gpt-6-sol::max', 'gpt-6-luna::max']) {
    const model = dataset.models.find((row) => row.id === id);
    assert.ok(model, id);
    assert.equal(model.org, 'OpenAI');
    assert.equal(model.release_date, '2026-09-22');
  }
  const sol = dataset.models.find((row) => row.id === 'gpt-6-sol::max');
  const luna = dataset.models.find((row) => row.id === 'gpt-6-luna::max');
  assert.ok(sol.offers.some((offer) => offer.input_per_1m === 2 && offer.output_per_1m === 10), 'GPT-6 Sol USD 2 / 10 per 1M tokens');
  assert.ok(luna.offers.some((offer) => offer.input_per_1m === 0.1 && offer.output_per_1m === 0.5), 'GPT-6 Luna USD 0.10 / 0.50 per 1M tokens');
});

test('CR-126.3: the competitor cells of the same post stay refused as secondary quotes', () => {
  // CR-173 (2026-09-26): 30.3 left this list — it is GPT-6 Astra's own (low) AutomationBench point, now ingested from
  // the chart dataset. Three refusals were answered by the chart datasets and retired (Astra low and Luna AutomationBench,
  // Luna OSWorld); the four secondary-quote refusals stay.
  const values = new Set(all.filter((row) => row.benchmark_id.startsWith('openai-automationbench::')
    || row.benchmark_id.startsWith('openai-deepswe-v1-1::') || row.benchmark_id.startsWith('openai-osworld-2-offline::')).map((row) => row.value));
  for (const quoted of [26.9, 31.4, 69.9, 60.3]) assert.equal(values.has(quoted), false);
  assert.ok(all.every((row) => /^GPT-6 (Astra|Sol|Luna)$/.test(row.subject.name)));
  const refusals = dataset.benchmark_results.rejected.filter((row) => String(row.source_id ?? '').startsWith(POST));
  assert.equal(refusals.length, 4);
  assert.ok(refusals.filter((row) => /secondary quote/.test(row.reason)).length >= 4);
});

test('CR-173: every GPT-6 chart-dataset point is ingested once, on its own effort, with its scaling recorded', () => {
  // 3 models x 5 efforts x 4 charts, score and cost each, minus the 5 score configurations and the 1 cost configuration
  // CR-126 already carries from the printed text (those rows are kept unchanged and the chart point is skipped).
  assert.equal(charted.length, 3 * 5 * 4 * 2 - 6);
  const keys = new Set(all.map((row) => `${row.benchmark_id}|${row.subject.model_id}`));
  assert.equal(keys.size, all.length, 'one row per identity and configuration');
  const known = new Set(dataset.models.map((row) => row.id));
  for (const row of charted) {
    assert.ok(known.has(row.subject.model_id), row.id);
    assert.equal(row.subject.model_id.split('::')[1], row.subject.variant, row.id);
    assert.ok(row.source.url === POST && row.source.sha256 === SOURCE_SHA && row.comparison_key === null, row.id);
    assert.match(row.source.locator, /exact datapoint: \{/);
    if (row.unit === 'USD') assert.equal(row.basis, 'self_reported', row.id);
    else {
      assert.equal(row.basis, 'derived', row.id);
      assert.equal(row.source_basis, 'self_reported', row.id);
      assert.equal(Math.round(row.derivation.inputs[0] * 1e6), Math.round(row.value * 1e4), row.id);
    }
  }
  assert.equal(claim('self-reported:gpt-6-sol-low-openai-automationbench-1-0-6').value, 21.16);
  assert.equal(claim('self-reported:gpt-6-astra-max-openai-osworld-2-offline').value, 73.49);
  assert.equal(claim('self-reported:gpt-6-luna-high-openai-deepswe-v1-1-cost').value, 0.0838);
  // The printed CR-126 rows keep their values; the chart's more precise point for them is not a second row.
  assert.equal(claim('self-reported:gpt-6-sol-openai-automationbench-1-0-6-cost').value, 0.27);
  assert.equal(claim('self-reported:gpt-6-sol-xhigh-openai-automationbench-1-0-6-cost'), undefined);
});
