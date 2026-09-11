import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exportSession } from '../ops/rebuild-2026-09/bin/worker-export.mjs';

test('large worker export survives immediate process exit without a truncated pipe', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-export-fixture-'));
  try {
    const binary = join(dir, 'export-fixture');
    await writeFile(binary, `#!/usr/bin/env node\nprocess.stdout.write(JSON.stringify({session:process.argv[3],text:'x'.repeat(256000)}));process.exit(0);\n`);
    await chmod(binary, 0o755);
    const result = await exportSession(binary, 'synthetic-session', dir);
    assert.equal(result.text.length, 256000);
    assert.equal(result.session, 'synthetic-session');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
