import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('prospective fixed-cohort offline helpers enforce authentic-input contracts on synthetic metadata', () => {
  const run = spawnSync('python3', ['-B', 'ops/jevbench-v163/test_source.py'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 15000,
    env: { PATH: process.env.PATH, OPENAI_API_KEY: '', PYTHONDONTWRITEBYTECODE: '1' },
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
