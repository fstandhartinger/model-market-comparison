import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { auditSnapshot, compareSnapshots, sourceDigest } from '../lib/cr43-revalidation.mjs';

const fixture = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cr43-'));
  const body = Buffer.from('{"rows":[1,2]}\n');
  const file = path.join(dir, 'source.json.gz');
  writeFileSync(file, gzipSync(body));
  const sha256 = createHash('sha256').update(body).digest('hex');
  const source = { file, sha256, url: 'https://example.test/source', retrieved_at: '2026-09-19T00:00:00Z', locator: 'fixture row' };
  const observation = { id: 'fixture:one', benchmark_id: 'fixture::v1', subject: { name: 'Fixture', model_id: 'fixture' }, value: 42, unit: 'percent', basis: 'measured', source, protocol: 'captured 2026-09-18' };
  return { dir, source, observation };
};

test('CR-43 hashes compressed evidence by decompressed content', () => {
  const { dir, source } = fixture();
  assert.deepEqual(sourceDigest(dir, source).issues, []);
  const audited = auditSnapshot({ observations: [fixture().observation], missing: [] }, { root: dir });
  assert.equal(audited.pass, true);
  assert.equal(audited.source_files_with_issues, 0);
});

test('CR-43 fails closed on a changed source and incomplete provenance', () => {
  const { dir, observation } = fixture();
  const changed = { ...observation, source: { ...observation.source, sha256: '0'.repeat(64), locator: null }, protocol: null };
  const audited = auditSnapshot({ observations: [changed], missing: [] }, { root: dir });
  assert.equal(audited.pass, false);
  assert.match(audited.issues.join('\n'), /hash mismatch/);
  assert.match(audited.issues.join('\n'), /source provenance is incomplete/);
});

test('CR-43 distinguishes protocol refreshes from numeric or provenance changes', () => {
  const { observation } = fixture();
  const refreshed = { ...observation, protocol: 'captured 2026-09-19' };
  const numericChange = { ...observation, value: 43 };
  assert.equal(compareSnapshots({ observations: [observation] }, { observations: [refreshed] }).metadata_only_count, 1);
  assert.equal(compareSnapshots({ observations: [observation] }, { observations: [numericChange] }).provenance_or_value_changed_count, 1);
});
