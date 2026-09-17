import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runDaily } from '../ops/daily/daily.mjs';
import { DAILY_FRESH_SOURCES, parseScope, pricesScopeViolations, sourceFreshnessErrors } from '../ops/daily/policy.mjs';
const exec = promisify(execFile);

const day = '2026-09-17';
const dated = (overrides = {}) => ({ sources: { ...Object.fromEntries(DAILY_FRESH_SOURCES.map((k) => [k, '2026-09-16'])), ...overrides } });

test('CR-66.7: scope names are checked', () => {
  assert.equal(parseScope(), 'full');
  assert.equal(parseScope('prices'), 'prices');
  assert.throws(() => parseScope('benchmarks'), /Unknown daily scope/);
});

test('CR-66.7: a prices run needs today\'s OpenRouter and leaves every benchmark and efficiency source date as it was', () => {
  const before = dated();
  // Prices scope: OpenRouter today, everything else kept with its own date → fresh.
  assert.deepEqual(sourceFreshnessErrors({ scope: 'prices', day, before, after: dated({ openrouter: day }) }), []);
  // The full scope would refuse the same dataset: its benchmark sources are not today's.
  assert.equal(sourceFreshnessErrors({ scope: 'full', day, before, after: dated({ openrouter: day }) }).length, DAILY_FRESH_SOURCES.length - 1);
  assert.deepEqual(sourceFreshnessErrors({ scope: 'full', day, before, after: dated(Object.fromEntries(DAILY_FRESH_SOURCES.map((k) => [k, day]))) }), []);
  // A stale OpenRouter capture or a re-dated benchmark source fails a prices run.
  assert.match(sourceFreshnessErrors({ scope: 'prices', day, before, after: dated() }).join(), /openrouter is not today/);
  assert.match(sourceFreshnessErrors({ scope: 'prices', day, before, after: dated({ openrouter: day, epoch_eci: day }) }).join(), /epoch_eci changed in a prices-only run/);
});

test('CR-66.7: a prices run may publish price files only', () => {
  assert.deepEqual(pricesScopeViolations(['data/dataset.json', 'data/raw/openrouter.json', 'data/raw/chutes.json', 'data/raw/aws-bedrock.json', 'data/raw/openrouter-data-policy.json']), []);
  const forbidden = ['data/raw/benchmarks/scores.json', 'data/raw/artificialanalysis.json', 'data/raw/designarena.json', 'data/raw/epoch-eci.json',
    'data/raw/aa-efficiency.json', 'data/raw/aa-coding-agents-v1.5.json', 'data/raw/openrouter-efficiency.json', 'data/raw/chutes-efficiency.json', 'data/raw/openrouter-benchmarks.json', 'data/raw/lumina-ledger.json'];
  assert.deepEqual(pricesScopeViolations(forbidden), forbidden);
});

test('CR-66.7: runDaily --scope prices collects OpenRouter without efficiency and runs no worker, benchmark or review step', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-daily-prices-'));
  try {
    const repo = join(directory, 'repo'), origin = join(directory, 'origin.git');
    await mkdir(repo);
    const git = async (...args) => (await exec('git', args, { cwd: repo })).stdout.trim();
    await git('init', '-b', 'main'); await git('config', 'user.name', 'Synthetic test'); await git('config', 'user.email', 'fixture@example.test');
    const files = {
      'data/dataset.json': JSON.stringify({ models: [], sources: {}, benchmark_results: { divergences: [] } }),
      'data/raw/aa-coding-agents.json': JSON.stringify({ version: '1.4', fixture: true }),
      'data/raw/openrouter.json': JSON.stringify({ withdrawal_run: null }),
      'ops/rebuild-2026-09/bin/pick-worker-models.mjs': `throw new Error('a prices run must not select workers');`,
      'scripts/fetch-live.mjs': `import {appendFileSync} from 'node:fs';appendFileSync('fetch-live-args.txt', process.argv.slice(2).join(' ') + '\\n');`,
      'scripts/build-dataset.mjs': `throw new Error('synthetic stop after collection');`,
    };
    for (const [path, body] of Object.entries(files)) { await mkdir(join(repo, path, '..'), { recursive: true }); await writeFile(join(repo, path), body); }
    await git('add', '.'); await git('commit', '-m', 'Synthetic fixture');
    await exec('git', ['clone', '--bare', repo, origin]); await git('remote', 'add', 'origin', origin);
    const result = await runDaily({ repo, home: join(directory, 'home'), dryRun: true, scope: 'prices' });
    assert.equal(result.scope, 'prices');
    assert.equal(result.published, false);
    assert.match(result.error, /synthetic stop after collection/);
    assert.equal(await readFile(join(result.run_dir, 'work/fetch-live-args.txt'), 'utf8'), 'or-prices\n');
    const names = result.steps.map((s) => s.name);
    assert.ok(names.includes('fetch-or') && result.steps.find((s) => s.name === 'fetch-or').ok);
    for (const skipped of ['worker-catalog', 'fetch-aa', 'fetch-da', 'fetch-coding-v1.5', 'fetch-epoch-eci', 'build-epoch-provenance', 'fetch-openrouter-benchmarks', 'fetch-lumina-ledger', 'review-live', 'refresh-benchmarks']) {
      assert.ok(!names.includes(skipped), `${skipped} must not run in the prices scope`);
    }
    assert.equal(result.workers, undefined);
    assert.match(await readFile(join(result.run_dir, 'reports/summary.txt'), 'utf8'), /nur Preise/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
