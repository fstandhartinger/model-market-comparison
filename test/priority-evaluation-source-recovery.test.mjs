import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('operator source-access correction preserves original SLA and refuses sent or changed state', () => {
  const result = spawnSync('/usr/bin/python3', ['-I', fileURLToPath(new URL('./priority-evaluation-source-recovery.py', import.meta.url))], {
    encoding: 'utf8', timeout: 15000, env: { PATH: '/usr/bin:/bin' },
  });
  assert.equal(result.status, 0, result.stderr);
});
