import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('paid gated source recovery scopes credentials and preserves anonymous fetching', () => {
  const result = spawnSync('/usr/bin/python3', ['-I', fileURLToPath(new URL('./priority-evaluation-hf-credentials.py', import.meta.url))], {
    encoding: 'utf8', timeout: 15000,
    env: { PATH: '/usr/bin:/bin' },
  });
  assert.equal(result.status, 0, result.stderr);
});
