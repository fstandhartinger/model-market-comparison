import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadAaBenchmarkSnapshots, retainedAaBenchmarks, reviewAaMappings } from '../lib/aa-snapshot-locks.mjs';
const hash = (s) => createHash('sha256').update(s).digest('hex');
const snapshot = (day, value) => ({ source_url: 'https://artificialanalysis.ai/models/fixture', collected_at: day,
  source_sha256: hash(day), rows: [{ source_id: 'fixture-model', fields: { a: value, b: value + 1 } }] });
const old = snapshot('2026-09-10', 10), current = snapshot('2026-09-29', 20);
const oldBytes = JSON.stringify(old);
const oldLock = { observations_file: 'evidence/old.json', observations_sha256: hash(oldBytes), source_sha256: old.source_sha256, source_file: 'evidence/old.html.gz', protocol_review: 'evidence/original-approved-checks.json' };
const currentLock = { observations_sha256: hash(JSON.stringify(current)), source_sha256: current.source_sha256, source_file: 'evidence/current.html.gz' };
const mappings = [{ benchmark_id: 'aa-a', field: 'a' }, { benchmark_id: 'aa-b', field: 'b' }];

test('a rejected AA protocol does not prevent an independent neighbour review', async () => {
  const called = [];
  const decisions = await reviewAaMappings(mappings, async (mapping) => {
    called.push(mapping.benchmark_id);
    if (mapping.benchmark_id === 'aa-a') throw new Error('Primary protocol review rejected');
  });
  assert.deepEqual(called, ['aa-a', 'aa-b']);
  assert.deepEqual(decisions.map((x) => x.accepted), [false, true]);
  assert.match(decisions[0].reason, /protocol review rejected/);
});

test('a refused field keeps its original value, capture date and source while its neighbour advances', async () => {
  const retained = retainedAaBenchmarks({ previous: {}, priorSnapshotLock: oldLock,
    decisions: [{ benchmark_id: 'aa-a', accepted: false, reason: 'protocol rejected' }, { benchmark_id: 'aa-b', accepted: true }] });
  const views = await loadAaBenchmarkSnapshots({ snapshot: current, lock: { ...currentLock, retained_benchmarks: retained }, mappings,
    read: async (path) => { assert.equal(path, 'evidence/old.json'); return oldBytes; } });
  const a = views.get('aa-a'), b = views.get('aa-b');
  assert.equal(a.snapshot.rows[0].fields.a, 10);
  assert.equal(a.snapshot.collected_at, '2026-09-10');
  assert.equal(a.snapshot.source_sha256, old.source_sha256);
  assert.equal(a.lock.source_file, oldLock.source_file);
  assert.equal(a.lock.protocol_review, oldLock.protocol_review);
  assert.equal(b.snapshot.rows[0].fields.b, 21);
  assert.equal(b.snapshot.collected_at, '2026-09-29');
  assert.equal(b.lock.source_file, currentLock.source_file);
});

test('repeated rejection retains the oldest effective lock; only explicit success releases it', () => {
  const previous = { 'aa-a': { ...oldLock, reason: 'old refusal' } };
  const again = retainedAaBenchmarks({ previous, priorSnapshotLock: { ...currentLock, observations_file: 'new.json' },
    decisions: [{ benchmark_id: 'aa-a', accepted: false, reason: 'still rejected' }] });
  assert.equal(again['aa-a'].observations_file, oldLock.observations_file);
  assert.equal(again['aa-a'].source_sha256, old.source_sha256);
  assert.equal(retainedAaBenchmarks({ previous: again, priorSnapshotLock: oldLock, decisions: [] })['aa-a'].source_sha256, old.source_sha256);
  assert.deepEqual(retainedAaBenchmarks({ previous: again, priorSnapshotLock: oldLock,
    decisions: [{ benchmark_id: 'aa-a', accepted: true }] }), {});
});

test('tampered or misbound retained snapshots fail closed', async () => {
  for (const retained of [
    { ...oldLock, observations_sha256: hash('different') },
    { ...oldLock, source_sha256: hash('different') },
    { ...oldLock, source_file: null },
  ]) {
    await assert.rejects(loadAaBenchmarkSnapshots({ snapshot: current, lock: { ...currentLock, retained_benchmarks: { 'aa-a': retained } }, mappings,
      read: async () => oldBytes }), /AA retained snapshot/);
  }
  await assert.rejects(loadAaBenchmarkSnapshots({ snapshot: current, lock: { ...currentLock, retained_benchmarks: { unknown: oldLock } }, mappings,
    read: async () => oldBytes }), /Unknown AA retained benchmark/);
});
