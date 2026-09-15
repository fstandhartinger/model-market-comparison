import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_WORKER_TIMEOUT_SECONDS } from '../ops/daily/gauntlet.mjs';

// 2026-09-15 daily run: DeepSeek critics reason for 120–310 s without streaming; a 180 s default
// aborted a review of the Chutes efficiency contract that completes in ~121 s.
test('unattended worker calls get the 600 s budget the passing runs used', async () => {
  assert.ok(DEFAULT_WORKER_TIMEOUT_SECONDS >= 600);
  assert.ok(DEFAULT_WORKER_TIMEOUT_SECONDS <= 1800, 'still inside the accepted BH_WORKER_TIMEOUT range');
  const source = await readFile(new URL('../ops/daily/gauntlet.mjs', import.meta.url), 'utf8');
  assert.match(source, /process\.env\.BH_WORKER_TIMEOUT \|\| DEFAULT_WORKER_TIMEOUT_SECONDS/);
  assert.doesNotMatch(source, /BH_WORKER_TIMEOUT \|\| 180\b/);
});
