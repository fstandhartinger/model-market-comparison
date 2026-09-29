import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { sha256Hex, parseRealSwe, parseChunkTruth } from '../lib/realswe.mjs';
import { checkRealSweSnapshot, REALSWE_CAPTURE_TARGET } from '../ops/daily/realswe-check.mjs';
import { captureTargets } from '../ops/daily/refresh-benchmarks.mjs';
import { sourceCoverage } from '../ops/daily/source-coverage.mjs';
import { collectRealSwe } from '../scripts/collect-realswe.mjs';

const repo = new URL('..', import.meta.url);
const read = (path) => readFile(new URL(path, repo));
const lock = JSON.parse(await read('data/raw/benchmarks/ingestion-lock.json')).realswe;
const registry = JSON.parse(await read('data/raw/benchmarks/registry.json'));
const entries = registry.entries.filter((e) => e.id.startsWith('realswe'));
const oldHtml = gunzipSync(await read(lock.source_file)).toString();
const oldChunk = gunzipSync(await read(lock.chunk_file)).toString();
const fixture = (html = oldHtml, data = oldChunk) => {
  const url = REALSWE_CAPTURE_TARGET.url, marker = REALSWE_CAPTURE_TARGET.follow_script_marker;
  const chunkUrl = 'https://withspecific.com/_next/static/chunks/today.js';
  const receipts = [
    { url, file: 'new-page.gz', sha256: sha256Hex(html), retrieved_at: '2026-09-29T12:00:00Z', status: 200, follow_marker: marker, marker_matches: [chunkUrl] },
    { url: chunkUrl, file: 'new-chunk.gz', sha256: sha256Hex(data), retrieved_at: '2026-09-29T12:00:03Z', status: 200, discovered_from: url, follow_marker: marker },
  ];
  const bytes = new Map([['new-page.gz', gzipSync(html)], ['new-chunk.gz', gzipSync(data)]]);
  return { entries, lock, receipts, read: async (path) => bytes.get(path) ?? read(path) };
};

test('daily target discovers the current chunk and omits stale pinned URLs', () => {
  const { urls } = captureTargets({ registry: { entries }, plan: { entries: [] }, vendor: { observations: [] } });
  assert.deepEqual([...urls.values()], [REALSWE_CAPTURE_TARGET]);
  assert.equal(urls.has(lock.chunk_url), false);
});

test('current identical sample is checked without changing dates or source locks', async () => {
  const before = JSON.stringify(lock);
  const checks = await checkRealSweSnapshot(fixture());
  assert.equal(checks.length, 2);
  assert.ok(checks.every((c) => c.status === 'checked_unchanged'));
  assert.equal(checks[0].rollouts, 640);
  assert.equal(checks[0].locked_snapshot, '2026-09-12');
  assert.equal(checks[0].source.retrieved_at, '2026-09-29T12:00:00Z');
  assert.equal(JSON.stringify(lock), before);
  const census = sourceCoverage({ registry: { entries }, plan: { entries: [] }, report: { checks, checked_at: '2026-09-29' } });
  assert.equal(census.totals.checked, 2);
});

test('cosmetic page changes do not claim the scores changed', async () => {
  const checks = await checkRealSweSnapshot(fixture(`<!-- different build -->${oldHtml}`));
  assert.equal(checks[0].status, 'checked_unchanged');
});

test('a coherent changed cost is retained for a reviewed release', async () => {
  assert.ok(oldHtml.includes('$6.96'));
  const checks = await checkRealSweSnapshot(fixture(oldHtml.replaceAll('$6.96', '$7.96')));
  assert.ok(checks.every((c) => c.status === 'source_changed_retained'));
  assert.notEqual(checks[0].prior_semantic_sha256, checks[0].current_semantic_sha256);
});

test('missing, mismatched, corrupt or inconsistent evidence cannot pass', async () => {
  const cases = [
    (f) => { f.receipts[0].follow_error = 'robots disallows a declared script'; },
    (f) => { f.receipts.pop(); },
    (f) => { f.receipts[1].discovered_from = 'https://unrelated.test/'; },
    (f) => { f.receipts[1].sha256 = '0'.repeat(64); },
    (f) => { f.lock = { ...lock, source_file_sha256: '0'.repeat(64) }; },
    (f) => { f.lock = { ...lock, snapshot_date: '2026-09-29' }; },
  ];
  for (const mutate of cases) {
    const f = fixture(); mutate(f);
    assert.ok((await checkRealSweSnapshot(f)).every((c) => c.status === 'retained_after_failure'));
  }
  const checks = await checkRealSweSnapshot(fixture(oldHtml, oldChunk.replace('valid:80', 'valid:79')));
  assert.match(checks[0].reason, /chunk says/);
  assert.equal(checks[0].status, 'retained_after_failure');
});

test('September 29 capture reconciles the new layout and literal trial map', async () => {
  const receipts = JSON.parse(await read('test/fixtures/realswe-20260929/manifest.json'));
  const html = gunzipSync(await read(receipts[0].file)).toString();
  const chunk = gunzipSync(await read(receipts[1].file)).toString();
  const parsed = parseRealSwe(html, { chunk });
  assert.equal(parsed.probe.rollouts, 640);
  assert.equal(parsed.probe.configurations, 8);
  const astra = parsed.configs.find((c) => c.slug === 'astra');
  assert.equal(astra.exact_score, 46.25);
  assert.equal(astra.passes, 37);
  assert.equal(parsed.costProvenance.get('grok').basis, 'native-terminal-usage-with-request-level-long-context-pricing');
  const checks = await checkRealSweSnapshot({ entries, lock, receipts, read });
  assert.ok(checks.every((c) => c.status === 'source_changed_retained'));
  const corrupt = chunk.replace('"entitlement-overage-lines":[1,2,3,4,5,7,8]', '"entitlement-overage-lines":[1,1,3,4,5,7,8]');
  assert.notEqual(corrupt, chunk);
  assert.throws(() => parseChunkTruth(corrupt), /invalid passing-trial/);
});

test('offline collector hashes both supplied files and rejects partial input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-realswe-offline-'));
  try {
    const receipt = await collectRealSwe({ directory, page: oldHtml, chunk: oldChunk, chunkUrl: lock.chunk_url });
    assert.equal(receipt.source_sha256, lock.source_sha256);
    assert.equal(receipt.chunk_sha256, lock.chunk_sha256);
    assert.equal(sha256Hex(await readFile(receipt.source_file)), receipt.source_file_sha256);
    await assert.rejects(collectRealSwe({ directory, page: oldHtml }), /requires both/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
