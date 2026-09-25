// D202 (2026-09-25): a reviewed browser-only source is a retained manual snapshot, not a failure.
//
// openai.com/index/* answers our user agent with HTTP 403 although its robots.txt allows the path.
// The five registry entries that read their values from that launch post were captured once in a
// browser and reviewed — their own `how_to_collect.notes` says so — but the daily fetched the URL on
// every run anyway, collected the 403, and filed all five as `source_unreachable_or_manual` with
// `last_ok: never`. These checks pin the declaration, the exclusion and the reported status.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browserOnly, browserOnlyUrls, captureTargets } from '../ops/daily/refresh-benchmarks.mjs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));
const registry = json('data/raw/benchmarks/registry.json');
const plan = json('data/raw/benchmarks/collection-plan.json');
const vendor = json('data/raw/benchmarks/vendor-candidates.json');

const EXPECTED = [
  'openai-agents-last-exam::v1',
  'openai-automationbench-cost::1.0.6',
  'openai-automationbench::1.0.6',
  'openai-deepswe-v1-1::1.1',
  'openai-osworld-2-offline::v2026.08.08',
];

test('the entries that declare browser-only access are the five that share the refusing launch post', () => {
  const declared = registry.entries.filter(browserOnly).map((e) => e.id).sort();
  assert.deepEqual(declared, EXPECTED);
  for (const entry of registry.entries.filter(browserOnly)) {
    assert.equal(entry.primary_url, 'https://openai.com/index/introducing-gpt-6-sol-and-luna/');
    // The declaration carries its own justification, because it is what the health report prints.
    assert.match(entry.how_to_collect.access.reason, /403/);
    assert.ok(entry.how_to_collect.access.reason.length > 60, 'the reason is a sentence, not a label');
  }
});

test('a browser-only URL is queued to neither capturer', () => {
  const { urls, documentUrls } = captureTargets({ registry, plan, vendor });
  const skipped = browserOnlyUrls(registry.entries);
  assert.equal(skipped.size, 1);
  for (const url of skipped) {
    assert.equal(urls.has(url), false, `${url} is not queued to scripts/capture-benchmark-sources.py`);
    assert.equal(documentUrls.has(url), false, `${url} is not queued to scripts/capture-vendor-documents.py`);
  }
});

test('one entry cannot drop a URL another entry still needs', () => {
  const access = { mode: 'browser_only', reason: 'x'.repeat(61) + ' 403' };
  const shared = 'https://shared.test/post';
  const browser = { id: 'a::1', primary_url: shared, how_to_collect: { access } };
  const plainPrimary = { id: 'b::1', primary_url: shared, how_to_collect: {} };
  const plainEvidence = { id: 'c::1', primary_url: 'https://other.test/x', evidence: [{ url: shared }], how_to_collect: {} };
  assert.deepEqual([...browserOnlyUrls([browser])], [shared]);
  assert.deepEqual([...browserOnlyUrls([browser, plainPrimary])], [], 'another entry names it as its primary source');
  assert.deepEqual([...browserOnlyUrls([browser, plainEvidence])], [], 'another entry names it as evidence');
  // Two browser-only entries sharing one URL still drop it — which is today's real case.
  assert.deepEqual([...browserOnlyUrls([browser, { ...browser, id: 'd::1' }])], [shared]);
});

test('an undeclared entry is untouched', () => {
  assert.equal(browserOnly({ id: 'x::1', how_to_collect: { command: 'python3 scripts/capture-benchmark-sources.py U C' } }), false);
  assert.equal(browserOnly({ id: 'x::1' }), false);
  assert.equal(browserOnly(null), false);
  assert.equal(browserOnly({ how_to_collect: { access: { mode: 'manual' } } }), false, 'only the exact declared mode counts');
  // The nine anthropic launch-post entries are fetched normally and must stay that way.
  const { urls } = captureTargets({ registry, plan, vendor });
  assert.ok(urls.has('https://www.anthropic.com/claude-opus-5-5'));
});

// A half-written access declaration would reach the health report as `undefined`, so the registry
// validator refuses it. `validateBenchmarkRegistry` is what `build-dataset` runs, so this fails the build.
test('an incomplete access declaration fails the registry validation', async () => {
  const { validateBenchmarkRegistry } = await import('../lib/benchmark-registry.mjs');
  const good = registry.entries.find(browserOnly);
  const clone = (access) => ({
    ...registry,
    entries: registry.entries.map((e) => (e.id === good.id ? { ...e, how_to_collect: { ...e.how_to_collect, access } } : e)),
  });
  assert.doesNotThrow(() => validateBenchmarkRegistry(clone(good.how_to_collect.access)));
  assert.doesNotThrow(() => validateBenchmarkRegistry(clone(undefined)), 'the field stays optional');
  for (const bad of [null, {}, { mode: 'browser_only' }, { reason: 'x' }, { mode: 'manual', reason: 'x' }, { mode: 'browser_only', reason: '  ' }, 'browser_only']) {
    assert.throws(() => validateBenchmarkRegistry(clone(bad)), /incomplete access declaration/, `refused: ${JSON.stringify(bad)}`);
  }
});
