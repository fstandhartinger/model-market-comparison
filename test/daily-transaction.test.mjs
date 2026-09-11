import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runDaily, matchesPublishedSnapshot, linkDryRunDependencies } from '../ops/daily/daily.mjs';
import { assessCommitScope, parseStatusPorcelain } from '../ops/daily/policy.mjs';
const exec = promisify(execFile);

test('real Git excludes the controlled dry-run dependency symlink while data-only scope stays enforced', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-dry-dependencies-'));
  try {
    const repo = join(dir, 'repo'), work = join(dir, 'work');
    await mkdir(join(repo, 'node_modules'), { recursive: true }); await mkdir(work);
    await writeFile(join(repo, 'node_modules/sentinel'), 'original dependencies');
    await exec('git', ['init', '-b', 'main'], { cwd: work });
    await linkDryRunDependencies(repo, work);
    await mkdir(join(work, 'data')); await writeFile(join(work, 'data/candidate.json'), '{}');
    const status = async () => parseStatusPorcelain((await exec('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: work })).stdout);
    assert.deepEqual((await status()).map((r) => r.path), ['data/candidate.json']);
    assert.equal(assessCommitScope((await status()).map((r) => r.path)).ok, true);
    await writeFile(join(work, 'unexpected-code.mjs'), 'not permitted');
    assert.deepEqual(assessCommitScope((await status()).map((r) => r.path)).rejected, ['unexpected-code.mjs']);
    assert.equal(await readFile(join(repo, 'node_modules/sentinel'), 'utf8'), 'original dependencies');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('actual isolated daily transaction cannot alter main or remote after a partial collector writes then fails', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-daily-transaction-'));
  try {
    const repo = join(directory, 'repo'), origin = join(directory, 'origin.git');
    await mkdir(repo);
    const git = async (...args) => (await exec('git', args, { cwd: repo })).stdout.trim();
    await git('init', '-b', 'main'); await git('config', 'user.name', 'Synthetic test'); await git('config', 'user.email', 'fixture@example.test');
    const files = {
      'data/dataset.json': JSON.stringify({ models: [], benchmark_results: { divergences: [] } }),
      'data/raw/aa-coding-agents.json': JSON.stringify({ version: '1.4', fixture: true }),
      'data/raw/artificialanalysis.json': 'ACCEPTED_FIXTURE_BYTES\n',
      'ops/rebuild-2026-09/bin/pick-worker-models.mjs': `console.log(JSON.stringify({free_verified:[],cheap_verified:[{id:'deepseek/fixture',family:'deepseek',aa_intelligence_index:34,input_per_1m:0,output_per_1m:0},{id:'z-ai/fixture',family:'z-ai',aa_intelligence_index:34,input_per_1m:0,output_per_1m:0}]}));`,
      'scripts/fetch-live.mjs': `import {writeFileSync} from 'node:fs';writeFileSync('data/raw/artificialanalysis.json','PARTIAL_STAGED_FIXTURE');throw new Error('synthetic incomplete collection');`,
    };
    for (const [path, body] of Object.entries(files)) { await mkdir(join(repo, path, '..'), { recursive: true }); await writeFile(join(repo, path), body); }
    await git('add', '.'); await git('commit', '-m', 'Synthetic fixture');
    await exec('git', ['clone', '--bare', repo, origin]); await git('remote', 'add', 'origin', origin);
    const before = await git('rev-parse', 'HEAD');
    // Leading porcelain whitespace is meaningful: exercise the overlay parser.
    await writeFile(join(repo, 'data/raw/artificialanalysis.json'), 'OWNER_LOCAL_FIXTURE\n');
    const result = await runDaily({ repo, home: join(directory, 'home'), dryRun: true });
    assert.equal(result.exit_code, 1); assert.equal(result.published, false);
    assert.match(result.error, /synthetic incomplete collection/);
    assert.equal(await readFile(join(repo, 'data/raw/artificialanalysis.json'), 'utf8'), 'OWNER_LOCAL_FIXTURE\n');
    assert.equal(await git('rev-parse', 'HEAD'), before);
    assert.equal((await exec('git', ['--git-dir', origin, 'rev-parse', 'main'])).stdout.trim(), before);
    assert.equal(await readFile(join(result.run_dir, 'work/data/raw/artificialanalysis.json'), 'utf8'), 'PARTIAL_STAGED_FIXTURE');
    assert.match(await readFile(join(result.run_dir, 'reports/summary.txt'), 'utf8'), /^STATUS: problem/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('deployment equality permits the API runtime marker but rejects any changed source date, value or extra field', () => {
  const expected = { sources: { aa: '2026-01-01' }, models: [{ id: 'fixture', price: 2 }] };
  assert.equal(matchesPublishedSnapshot({ ...expected, _source: 'bundled' }, expected), true);
  assert.equal(matchesPublishedSnapshot({ ...expected, _source: 'postgres' }, expected), true);
  assert.equal(matchesPublishedSnapshot({ ...expected, _source: 'unknown' }, expected), false);
  assert.equal(matchesPublishedSnapshot({ ...expected, _source: 'bundled', extra: true }, expected), false);
  assert.equal(matchesPublishedSnapshot({ ...expected, _source: 'bundled', sources: { aa: '2026-01-02' } }, expected), false);
  assert.equal(matchesPublishedSnapshot({ ...expected, _source: 'bundled', models: [{ id: 'fixture', price: 3 }] }, expected), false);
});
