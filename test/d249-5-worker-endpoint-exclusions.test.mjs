// D249.5 (iteration 263, 2026-09-28). One endpoint of `z-ai/glm-5.3-flash` acts on
// `reasoning: { effort: 'low' }` by switching reasoning on, and took 86 of 94 critic calls in the
// 05:17 run that then overran its step and published nothing. The request now names the endpoints
// a given model must not be served from. These tests pin the shape of that list rather than its
// contents, so an entry can be retired without editing a test — but never added without evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadExclusions, ignoredProvidersFor, validateExclusions } from '../ops/rebuild-2026-09/bin/worker-endpoint-exclusions.mjs';

const doc = JSON.parse(readFileSync(new URL('../ops/daily/worker-endpoint-exclusions.json', import.meta.url), 'utf8'));

test('every exclusion names one model, one provider and the measurement behind it', () => {
  validateExclusions(doc);
  for (const entry of doc.exclusions) {
    // A measurement, not an impression: it has to say what was compared against what.
    assert.ok(entry.measurement.length > 120, `${entry.model}/${entry.provider} measurement is too thin`);
    assert.ok(entry.measurement.includes(entry.provider), `${entry.provider} is not named in its own measurement`);
  }
  // A blocklist that grows without anyone noticing is the failure mode here.
  assert.ok(doc.exclusions.length <= 5, 'more than five endpoint exclusions: review them before adding another');
});

test('an exclusion applies to the model it was measured on and to no other', () => {
  assert.deepEqual(ignoredProvidersFor(doc, 'z-ai/glm-5.3-flash'), ['Wafer']);
  for (const other of ['deepseek/deepseek-v4-flash-0731', 'deepseek/deepseek-v4.1-flash', 'moonshotai/kimi-k3']) {
    assert.deepEqual(ignoredProvidersFor(doc, other), [], other);
  }
  assert.deepEqual(ignoredProvidersFor({ exclusions: [] }, 'z-ai/glm-5.3-flash'), []);
});

test('a malformed list throws; a missing one is simply empty', async () => {
  assert.throws(() => validateExclusions({}), /exclusions/);
  assert.throws(() => validateExclusions({ exclusions: [{ model: 'm', provider: 'P' }] }), /measured_at/);
  assert.throws(
    () => validateExclusions({ exclusions: [{ model: 'm', provider: 'P', measured_at: 'yesterday', measurement: 'x', recorded_by: 'y' }] }),
    /YYYY-MM-DD/,
  );
  // The list refines a request; it is not a precondition for making one, so an absent file is empty
  // rather than an exception that would take the daily run down.
  assert.deepEqual(await loadExclusions('/nonexistent/worker-endpoint-exclusions.json'), { exclusions: [] });
});

test('the runner sends the exclusions as provider.ignore and records them on the receipt', () => {
  const source = readFileSync(new URL('../ops/rebuild-2026-09/bin/worker-runner.mjs', import.meta.url), 'utf8');
  assert.match(source, /ignoredProviders\.length \? \{ ignore: ignoredProviders \} : \{\}/);
  assert.match(source, /metadata\.ignored_providers = ignoredProviders;/);
  // The free router and the opencode agent do not go through OpenRouter's provider routing at all.
  assert.match(source, /options\.agent \|\| chosen\.transport === 'router'\s*\n?\s*\? \[\]/);
});

test('D249.6: the receipt names the endpoint before the completion is judged', () => {
  const source = readFileSync(new URL('../ops/rebuild-2026-09/bin/worker-runner.mjs', import.meta.url), 'utf8');
  // The failure receipt is a copy of `metadata` taken in the catch block, so anything recorded only
  // after `validateCompletion` is absent from exactly the receipts that need it most.
  const assignIndex = source.indexOf('provider: body.provider ?? null, finish_reason:');
  const validateIndex = source.indexOf('validateCompletion(body, chosen.id)');
  assert.ok(assignIndex > 0, 'the OpenRouter branch records provider on metadata');
  assert.ok(assignIndex < validateIndex, 'provider is recorded before the completion can throw');
});
