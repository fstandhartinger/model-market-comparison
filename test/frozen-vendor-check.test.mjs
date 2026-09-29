import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { checkFrozenVendorSources, frozenVendorEntries } from '../ops/daily/frozen-vendor-check.mjs';
import { captureTargets } from '../ops/daily/refresh-benchmarks.mjs';
import { sourceCoverage } from '../ops/daily/source-coverage.mjs';
const hash = (v) => createHash('sha256').update(v).digest('hex');
const read = (p) => readFile(new URL(`../${p}`, import.meta.url));
const plan = { entries: [] };

function fixture() {
  const entries = [{ id: 'vendor-a::1', source_type: 'vendor_report', primary_url: 'https://example.test/report' }];
  const observations = [{ id: 'a', benchmark_id: entries[0].id, basis: 'self_reported', value: 90,
    source: { url: entries[0].primary_url, file: 'old.gz', sha256: hash('original'), retrieved_at: '2026-09-10' } }];
  const receipts = [{ url: entries[0].primary_url, file: 'current.gz', sha256: hash('original'), status: 200, retrieved_at: '2026-09-29' }];
  const files = new Map([['old.gz', gzipSync('original')], ['current.gz', gzipSync('original')]]);
  return { entries, observations, receipts, plan, read: async (p) => files.get(p), files };
}

test('unchanged bytes produce a daily check without changing observation provenance', async () => {
  const f = fixture(), before = JSON.stringify(f.observations);
  const checks = await checkFrozenVendorSources(f);
  assert.equal(checks[0].status, 'checked_unchanged');
  assert.equal(checks[0].sources[0].retrieved_at, '2026-09-29');
  assert.equal(JSON.stringify(f.observations), before);
  const coverage = sourceCoverage({ registry: { entries: f.entries }, plan, report: { checks } });
  assert.equal(coverage.entries[0].mode, 'frozen_document');
  assert.equal(coverage.entries[0].status, 'checked');
});

test('changed bytes, unavailable sources, and corrupt original evidence remain distinct holds', async () => {
  const f = fixture(); f.files.set('current.gz', gzipSync('changed')); f.receipts[0].sha256 = hash('changed');
  assert.equal((await checkFrozenVendorSources(f))[0].status, 'source_changed_retained');
  f.receipts[0].status = 429;
  assert.equal((await checkFrozenVendorSources(f))[0].status, 'retained_after_failure');
  const corrupt = fixture(); corrupt.files.set('old.gz', gzipSync('corrupt'));
  assert.match((await checkFrozenVendorSources(corrupt))[0].reason, /hash mismatch/);
});

test('Vite claims compare the discovered module, never the landing HTML', async () => {
  const f = fixture(); f.entries[0].how_to_collect = { format: 'StepFun Vite module JavaScript' };
  f.files.set('page.gz', gzipSync('landing HTML'));
  const original = f.receipts[0];
  f.receipts = [{ ...original, file: 'page.gz', sha256: hash('landing HTML') },
    { ...original, url: 'https://example.test/assets/main-today.js', discovered_from: original.url }];
  assert.equal((await checkFrozenVendorSources(f))[0].status, 'checked_unchanged');
  const targets = captureTargets({ registry: { entries: f.entries }, plan, vendor: { observations: [] } });
  assert.equal(targets.urls.get(original.url).follow_module_script, true);
  f.receipts.pop();
  assert.match((await checkFrozenVendorSources(f))[0].reason, /exactly one captured module/);
});

test('existing score adapters and reviewed browser-only holds retain their ownership', () => {
  const f = fixture();
  assert.deepEqual(frozenVendorEntries({ entries: f.entries, plan: { entries: [{ benchmark_id: f.entries[0].id, parser: {} }] } }), []);
  assert.deepEqual(frozenVendorEntries({ entries: f.entries, plan: { entries: [{ benchmark_id: f.entries[0].id, refresh: 'manual' }] } }), []);
  f.entries[0].how_to_collect = { access: { mode: 'browser_only' } };
  assert.deepEqual(frozenVendorEntries(f), []);
});

test('all 93 current frozen vendor entries bind every published claim to readable original bytes', async () => {
  // Synthetic unchanged receipts test existing evidence integrity, not live freshness.
  const registry = JSON.parse(await read('data/raw/benchmarks/registry.json'));
  const plan = JSON.parse(await read('data/raw/benchmarks/collection-plan.json'));
  const scores = JSON.parse(await read('data/raw/benchmarks/scores.json'));
  const entries = frozenVendorEntries({ entries: registry.entries, plan });
  assert.equal(entries.length, 93);
  const selected = new Set(entries.map((e) => e.id));
  const rows = scores.observations.filter((r) => selected.has(r.benchmark_id) && r.basis === 'self_reported');
  const receipts = [...new Map(rows.map((r) => [r.source.url, { ...r.source, status: 200 }])).values()];
  const step = entries.find((e) => e.id.startsWith('stepfun-'));
  const module = receipts.find((r) => r.url === step.primary_url);
  module.discovered_from = step.primary_url; module.url += '/assets/fixture.js';
  receipts.push({ ...module, url: step.primary_url, discovered_from: undefined });
  const checks = await checkFrozenVendorSources({ entries, plan, observations: rows, receipts, read });
  assert.equal(checks.length, 93);
  assert.ok(checks.every((c) => c.status === 'checked_unchanged'), JSON.stringify(checks.filter((c) => c.status !== 'checked_unchanged')));
});
