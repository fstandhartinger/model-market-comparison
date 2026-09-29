import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, symlink, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { sha256 } from '../ops/daily/gauntlet.mjs';

const repo = fileURLToPath(new URL('..', import.meta.url));
test('real offline ingester preserves a retained AA observation and advances its accepted sibling', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-aa-real-ingest-'));
  // Inputs stay read-only links except the two test-owned AA files. The real
  // ingester writes only its explicit --draft --out file inside this scratch dir.
  const linkExcept = async (relative, excluded) => {
    await mkdir(join(dir, relative), { recursive: true });
    for (const name of await readdir(join(repo, relative))) if (!excluded.includes(name)) {
      await symlink(join(repo, relative, name), join(dir, relative, name));
    }
  };
  try {
    await linkExcept('data', ['raw']);
    await linkExcept('data/raw', ['benchmarks']);
    await linkExcept('data/raw/benchmarks', ['aa-observed-fields.json', 'ingestion-lock.json']);
    await symlink(join(repo, 'ops'), join(dir, 'ops'));
    const path = 'data/raw/benchmarks/aa-observed-fields.json';
    const oldBytes = await readFile(join(repo, path));
    const prior = JSON.parse(oldBytes), next = structuredClone(prior);
    const target = next.rows.find((r) => Number.isFinite(r.fields.gpqa) && Number.isFinite(r.fields.hle));
    assert.ok(target, 'fixture needs a model present on both boards');
    target.fields.gpqa = .234567;
    target.fields.hle = .345678;
    next.collected_at = '2026-09-29T12:00:00Z';
    const primary = JSON.stringify({ synthetic_test_only: true, rows: next.rows });
    next.source_sha256 = sha256(primary);
    const source = 'synthetic-current.json.gz';
    await writeFile(join(dir, source), gzipSync(primary));
    const priorFile = join(dir, 'retained.json');
    await writeFile(priorFile, oldBytes);
    const lockPath = 'data/raw/benchmarks/ingestion-lock.json';
    const lock = JSON.parse(await readFile(join(repo, lockPath)));
    const retainedId = 'aa-gpqa-diamond::snapshot-2026-09-10';
    const originalLock = structuredClone(lock.aa);
    const nextBytes = JSON.stringify(next);
    lock.aa = { ...lock.aa, source_sha256: next.source_sha256, observations_sha256: sha256(nextBytes), source_file: source,
      retained_benchmarks: { [retainedId]: { ...originalLock, observations_file: priorFile, reason: 'Synthetic fixture: protocol rejected' } } };
    await writeFile(join(dir, path), nextBytes);
    await writeFile(join(dir, lockPath), JSON.stringify(lock));
    const out = join(dir, 'draft.json');
    const args = [join(repo, 'scripts/ingest-benchmark-scores.mjs'), '--draft', '--out', out];
    const run = () => spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8', timeout: 30_000,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, OPENAI_API_KEY: '' } });
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    const draft = JSON.parse(await readFile(out));
    const baseline = JSON.parse(await readFile(join(repo, 'data/raw/benchmarks/scores.json')));
    const id = `aa:${target.source_id}:gpqa`;
    assert.deepEqual(draft.observations.find((r) => r.id === id), baseline.observations.find((r) => r.id === id),
      'all retained fields, including the original capture hash/date and value, are unchanged');
    const advanced = draft.observations.find((r) => r.id === `aa:${target.source_id}:hle`);
    assert.equal(advanced.value, .345678);
    assert.equal(advanced.source.retrieved_at, next.collected_at);
    assert.equal(advanced.source.sha256, next.source_sha256);
    assert.equal(advanced.source.file, source);
    const acceptedHash = sha256(await readFile(out));
    await writeFile(priorFile, Buffer.concat([oldBytes, Buffer.from(' ')]));
    const bad = run();
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /AA retained snapshot hash mismatch/);
    assert.equal(sha256(await readFile(out)), acceptedHash, 'corrupt retained bytes cannot overwrite a prior draft');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
