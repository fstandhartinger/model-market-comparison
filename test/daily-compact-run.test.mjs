import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { compactPublishedRun } from '../ops/daily/compact-run.mjs';

test('only verified publication removes duplicate staging; exact audit datasets and source evidence survive', async () => {
  const runDir = await mkdtemp(join(tmpdir(), 'bh-published-storage-'));
  const before = Buffer.from('{"synthetic":"old"}\n'), after = Buffer.from('{"synthetic":"new"}\n');
  try {
    for (const name of ['reports', 'work', 'before', 'benchmark-candidates', 'sources', 'gauntlet', 'review', 'workers']) {
      await mkdir(join(runDir, name)); await writeFile(join(runDir, name, 'sentinel'), name);
    }
    await writeFile(join(runDir, 'reports/dataset-before.json'), before);
    await writeFile(join(runDir, 'reports/dataset-after.json'), after);
    for (const state of [{ published: false, liveVerified: false, dryRun: false }, { published: true, liveVerified: false, dryRun: false }, { published: true, liveVerified: true, dryRun: true }]) {
      assert.equal((await compactPublishedRun({ runDir, ...state })).applied, false);
      await access(join(runDir, 'work/sentinel'));
    }
    assert.equal((await compactPublishedRun({ runDir, published: true, liveVerified: true, dryRun: false })).applied, true);
    for (const name of ['work', 'before', 'benchmark-candidates']) await assert.rejects(access(join(runDir, name)), { code: 'ENOENT' });
    assert.deepEqual(gunzipSync(await readFile(join(runDir, 'reports/dataset-before.json.gz'))), before);
    assert.deepEqual(gunzipSync(await readFile(join(runDir, 'reports/dataset-after.json.gz'))), after);
    for (const name of ['sources', 'gauntlet', 'review', 'workers', 'reports']) assert.equal(await readFile(join(runDir, name, 'sentinel'), 'utf8'), name);
  } finally { await rm(runDir, { recursive: true, force: true }); }
});
