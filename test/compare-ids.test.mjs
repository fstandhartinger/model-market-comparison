import assert from 'node:assert/strict';
import test from 'node:test';
import { compareQuery, looseModelKey, normalizeModelKey, prettyModelName, resolveCompareIds } from '../lib/compare-ids.mjs';

// CR-122: a compare link posted under a release announcement names a model the catalog does not have yet.
const families = [
  { id: 'claude-fable-5.1::max', name: 'Claude Fable 5.1', org: 'Anthropic', score: 53.4, current: true, variants: ['claude-fable-5.1::max', 'claude-fable-5.1::low'] },
  { id: 'gpt-6-astra::max', name: 'GPT-6 Astra', org: 'OpenAI', score: 52.7, current: true, variants: ['gpt-6-astra::max', 'gpt-6-astra::non-reasoning'] },
  { id: 'claude-opus-5::max', name: 'Claude Opus 5', org: 'Anthropic', score: 50.8, current: true, variants: ['claude-opus-5::max', 'claude-opus-5::low'] },
];

test('a known variant id resolves to its family representative', () => {
  const { picks, pending } = resolveCompareIds(['claude-opus-5::low'], families);
  assert.deepEqual(picks, ['claude-opus-5::max']);
  assert.equal(pending.length, 0);
});

test('id variants resolve to the same model (case, dots, dashes, vendor prefix, date suffix)', () => {
  for (const raw of ['claude-opus-5', 'Claude-Opus-5', 'anthropic/claude-opus-5', 'claude-opus-5-20260724', 'opus-5', 'claude opus 5']) {
    assert.deepEqual(resolveCompareIds([raw], families).picks, ['claude-opus-5::max'], raw);
  }
  assert.deepEqual(resolveCompareIds(['gpt6-astra'], families).picks, ['gpt-6-astra::max']);
});

test('an unknown id is kept as pending with a readable name, not dropped', () => {
  const { entries, picks, pending } = resolveCompareIds(['claude-fable-5.1::max', 'gpt-6-sol'], families);
  assert.deepEqual(picks, ['claude-fable-5.1::max']);
  assert.deepEqual(pending, [{ kind: 'pending', id: 'gpt-6-sol', name: 'GPT-6 Sol', org: 'OpenAI', score: null }]);
  assert.deepEqual(entries.map((e) => e.name), ['Claude Fable 5.1', 'GPT-6 Sol']);
  assert.equal(compareQuery(entries).toString(), 'model=claude-fable-5.1%3A%3Amax&model=gpt-6-sol');
});

test('the same URL resolves to real numbers once the id exists in the data', () => {
  const later = [...families, { id: 'gpt-6-sol::max', name: 'GPT-6 Sol', org: 'OpenAI', score: 55.1, current: true, variants: ['gpt-6-sol::max'] }];
  const { picks, pending } = resolveCompareIds(['claude-fable-5.1::max', 'gpt-6-sol'], later);
  assert.deepEqual(picks, ['claude-fable-5.1::max', 'gpt-6-sol::max']);
  assert.equal(pending.length, 0);
});

test('readable names for the ids a launch bot would write', () => {
  assert.equal(prettyModelName('gpt-6-sol'), 'GPT-6 Sol');
  assert.equal(prettyModelName('gpt-6'), 'GPT-6');
  assert.equal(prettyModelName('claude-opus-5.5'), 'Claude Opus 5.5');
  assert.equal(prettyModelName('claude-opus-5-5'), 'Claude Opus 5.5');
  assert.equal(prettyModelName('claude-sonnet-5.5::max'), 'Claude Sonnet 5.5');
  assert.equal(prettyModelName('anthropic/claude-haiku-6'), 'Claude Haiku 6');
  assert.equal(prettyModelName('gemini-4-pro'), 'Gemini 4 Pro');
});

test('junk parameters and duplicates never reach the page', () => {
  const { entries } = resolveCompareIds(['<script>', 'gpt-6-sol', 'GPT-6-SOL', '', 'a'.repeat(200), 'claude-opus-5::max', 'claude-opus-5'], families);
  assert.deepEqual(entries.map((e) => e.id), ['gpt-6-sol', 'claude-opus-5::max']);
});

test('at most four models, in the order of the URL', () => {
  const { entries } = resolveCompareIds(['gpt-6-sol', 'claude-opus-5::max', 'claude-opus-5.5', 'gpt-6-astra::max', 'claude-fable-5.1::max'], families);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map((e) => e.kind), ['pending', 'known', 'pending', 'known']);
});

test('normalisation keys are stable', () => {
  assert.equal(normalizeModelKey('Anthropic/Claude-Opus-5.5-20261101'), 'claude-opus-5-5');
  assert.equal(looseModelKey('claude-opus-5.5'), 'opus-5-5');
  assert.equal(normalizeModelKey('gpt-6-sol::max'), 'gpt-6-sol');
});

test('the preview text names both models and never implies a number for a pending one', async () => {
  const { compareDescription, compareHeadline } = await import('../lib/compare-ids.mjs');
  const { entries } = resolveCompareIds(['claude-fable-5.1::max', 'gpt-6-sol'], families);
  assert.equal(compareHeadline(entries), 'Claude Fable 5.1 vs GPT-6 Sol');
  const text = compareDescription(entries);
  assert.match(text, /Claude Fable 5\.1 \(AA Intelligence Index 53\.4\) vs GPT-6 Sol/);
  assert.match(text, /GPT-6 Sol is not measured yet — the numbers land here as soon as they are published\./);
  assert.doesNotMatch(text, /GPT-6 Sol \(/, 'a pending model never carries an index value');
  const known = compareDescription(resolveCompareIds(['claude-fable-5.1::max', 'gpt-6-astra::max'], families).entries);
  assert.match(known, /^Claude Fable 5\.1 \(AA Intelligence Index 53\.4\) vs GPT-6 Astra \(AA Intelligence Index 52\.7\)/);
  assert.doesNotMatch(known, /not measured yet/);
});

test('the compare page builds its preview tags and image from the URL on the server', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../app/compare/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /generateMetadata/);
  assert.match(page, /resolveCompareRequest/);
  assert.match(page, /\/api\/og\/compare\?/, 'the share image names the models of the URL');
  const component = readFileSync(new URL('../components/BenchmarkCompare.tsx', import.meta.url), 'utf8');
  assert.match(component, /resolveCompareIds/, 'the client resolves the same ids and keeps unknown ones');
  assert.match(component, /data-bh-coming-soon/);
});
