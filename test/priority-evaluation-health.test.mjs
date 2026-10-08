import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('paid pickup health distinguishes acknowledged review hold and fails closed for other failures', () => {
  const r = spawnSync('/usr/bin/python3', ['-I', fileURLToPath(new URL('./priority-evaluation-health.py', import.meta.url))], {encoding:'utf8',timeout:15000,env:{PATH:'/usr/bin:/bin'}});
  assert.equal(r.status,0,r.stderr);
});
