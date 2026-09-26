import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
const model = dataset.models.find((row) => row.id === 'claude-opus-5.5::max');

test('CR-123: Claude Opus 5.5 is in the catalog at its evaluated configuration and official price', () => {
  assert.ok(model);
  assert.equal(model.org, 'Anthropic');
  assert.equal(model.family_key, 'claude-opus-5.5');
  assert.equal(model.variant, 'max');
  assert.equal(model.release_date, '2026-09-22');
  assert.equal(model.open_weights, false);
  // Launch-post pricing table: input 4, output 20, cache read 0.20, cache write 5 per 1M tokens.
  // CR-125: once OpenRouter lists the model its endpoints join the launch-post offer; the Anthropic row keeps the list price.
  const anthropic = model.offers.filter((offer) => offer.platform === 'Anthropic');
  assert.deepEqual(anthropic.map((offer) => [offer.input_per_1m, offer.output_per_1m, offer.cache_read_per_1m, offer.cache_write_per_1m]),
    [[4, 20, 0.2, 5]]);
});

test('CR-123: all 16 Anthropic claims stay self-reported with reviewable provenance', () => {
  const rows = dataset.benchmark_results.observations.filter((row) => row.subject?.model_id === model.id
    && row.id.startsWith('self-reported:claude-opus-55-'));
  // CR-173 (2026-09-26): the Terminal-Bench 4.0 cell (66.4) is xhigh per the table caption and left the max row set; the
  // post's own chart dataset point for max (64.8) took its place, so there are still 16 max-joined Opus 5.5 claims.
  assert.equal(rows.length, 16);
  assert.ok(rows.every((row) => row.basis === 'self_reported'));
  assert.ok(rows.every((row) => row.comparison_key === null));
  assert.ok(rows.every((row) => row.source?.published_at === '2026-09-22'));
  assert.ok(rows.every((row) => row.source?.url === 'https://www.anthropic.com/claude-opus-5-5'
    || row.source?.url === 'https://www.anthropic.com/claude-opus-5-5-system-card'));
  assert.equal(rows.find((row) => row.id.endsWith('terminal-bench-4-0-chart-max')).value, 64.8);
  assert.equal(dataset.benchmark_results.observations.find((row) => row.id === 'self-reported:claude-opus-55-terminal-bench-4-0-xhigh').value, 66.4);
  assert.equal(rows.find((row) => row.id.endsWith('gdpval-aa-v2-1')).unit, 'Elo');
  assert.equal(rows.find((row) => row.id.endsWith('gdpval-aa-v2-1')).value, 1846);
  assert.equal(registry.entries.filter((row) => row.id.startsWith('anthropic-')).length, 16);
});

test('CR-123: the effort the vendor names is disclosed, not silently folded into the max row', () => {
  const rows = dataset.benchmark_results.observations.filter((row) => row.id.startsWith('self-reported:claude-opus-55-'));
  // CR-173 (2026-09-26): disclosed and now also joined — the xhigh cell sits on claude-opus-5.5::xhigh.
  const tb = rows.find((row) => row.id.endsWith('terminal-bench-4-0-xhigh'));
  assert.equal(tb.subject.variant, 'xhigh effort');
  assert.equal(tb.subject.model_id, 'claude-opus-5.5::xhigh');
  assert.match(tb.protocol, /xhigh effort/);
  // The Table 8.1.A value for HealthBench Professional is the length-adjusted score, not the raw 77.1%.
  assert.match(rows.find((row) => row.id.endsWith('healthbench-professional')).protocol, /length-adjusted/);
  // Anthropic states these two were run by Artificial Analysis; the claim is still Anthropic's to make.
  for (const id of ['gdpval-aa-v2-1', 'aa-briefcase-v1-1']) {
    assert.match(rows.find((row) => row.id.endsWith(id)).protocol, /run independently by Artificial Analysis/);
  }
});

test('CR-123: no Opus 5.5 claim reaches a composite or a measured cohort', () => {
  const view = dataset.benchmark_results;
  const rows = view.observations.filter((row) => row.id.startsWith('self-reported:claude-opus-55-'));
  assert.ok(rows.every((row) => row.basis !== 'measured'));
  // A self-reported row is never an anchor, so the model gets no category score from these 16 claims.
  assert.equal(model.category_scores, undefined);
});
