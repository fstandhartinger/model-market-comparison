import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_TEST_SCRIPT, LARGE_HOST_MIN_CPUS, dailyTestCommand } from '../ops/daily/test-command.mjs';

// CR-777 (self-heal 2026-11-18): the daily npm-test step was killed at its 60 min cap with zero failing tests.
test('daily npm-test: a large host runs the exact package suite at the gate lane concurrency 12', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.test, DEFAULT_TEST_SCRIPT, 'guard follows the real package script');
  assert.deepEqual(dailyTestCommand(pkg.scripts.test, { cpus: 64 }), { file: 'node', args: ['--test', '--test-concurrency=12', 'test/'], concurrency: 12 });
  assert.deepEqual(dailyTestCommand(pkg.scripts.test, { cpus: LARGE_HOST_MIN_CPUS }).concurrency, 12);
});

test('daily npm-test: a small host, a changed script or an unknown CPU count keeps npm test', () => {
  const npm = { file: 'npm', args: ['test'], concurrency: null };
  assert.deepEqual(dailyTestCommand(DEFAULT_TEST_SCRIPT, { cpus: LARGE_HOST_MIN_CPUS - 1 }), npm);
  assert.deepEqual(dailyTestCommand('node --test --test-concurrency=4 test/ test/extra/', { cpus: 64 }), npm);
  assert.deepEqual(dailyTestCommand(undefined, { cpus: 64 }), npm);
  assert.deepEqual(dailyTestCommand(DEFAULT_TEST_SCRIPT, { cpus: Number.NaN }), npm);
});

test('daily npm-test: the step keeps its 60 min cap and the isolated environment', async () => {
  const src = await readFile(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
  const line = src.split('\n').find((l) => l.includes("command('npm-test'"));
  assert.match(line, /testCommand\.file, testCommand\.args, work, 3_600_000, isolatedEnvironment\);$/);
  assert.match(src, /dailyTestCommand\(testScript\)/);
});
