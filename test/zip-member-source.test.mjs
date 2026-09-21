import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { captureKey } from '../ops/daily/refresh-benchmarks.mjs';

// 2026-09-21: Epoch's data-download link for FrontierSWE became a 404 on 2026-09-19; the relay CSV now only ships
// as a member of benchmark_data.zip. A member is its own capture, keyed apart from its archive and its siblings.
test('zip members are captured and looked up as their own sources', () => {
  const zip = 'https://epoch.ai/data/benchmark_data.zip';
  assert.equal(captureKey({ url: 'https://www.frontierswe.com/' }), 'https://www.frontierswe.com/');
  assert.equal(captureKey({ url: zip, zip_member: 'frontierswe_external.csv' }), `${zip}#zip:frontierswe_external.csv`);
  assert.notEqual(captureKey({ url: zip, zip_member: 'frontierswe_external.csv' }), captureKey({ url: zip, zip_member: 'frontiercode_external.csv' }));
  assert.notEqual(captureKey({ url: zip, zip_member: 'frontierswe_external.csv' }), captureKey({ url: zip }));
});

test('FrontierSWE relay points at the archive member, and the pinned capture is the same bytes', async () => {
  const plan = JSON.parse(await readFile(new URL('../data/raw/benchmarks/collection-plan.json', import.meta.url)));
  const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url)));
  const method = plan.entries.find((e) => e.benchmark_id === 'frontierswe::2').parser.method_source;
  assert.deepEqual([method.url, method.zip_member], ['https://epoch.ai/data/benchmark_data.zip', 'frontierswe_external.csv']);
  const pinned = gunzipSync(await readFile(new URL(`../${method.file}`, import.meta.url)));
  assert.equal(createHash('sha256').update(pinned).digest('hex'), method.sha256);
  const entry = registry.entries.find((e) => e.id === 'frontierswe::2');
  const relay = entry.evidence.filter((s) => s.url === method.url);
  assert.equal(relay.length, 1);
  assert.equal(relay[0].zip_member, 'frontierswe_external.csv');
  assert.ok(entry.publication_urls.some((u) => u.url === method.url));
  assert.ok(!JSON.stringify([entry.publication_urls, entry.evidence, method]).includes('data-download?search=frontierswe'));
});
