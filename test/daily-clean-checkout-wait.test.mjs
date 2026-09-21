import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const root = new URL('../', import.meta.url);

// 2026-09-21: a finished ProgramBench intake remained dirty for long enough to block two
// refreshes. Publication now uses origin/main in its disposable clone and never needs to
// read, clean or advance the writer-owned primary checkout.
test('publication is independent of the writer-owned primary checkout', async () => {
  const src = await readFile(new URL('ops/daily/daily.mjs', root), 'utf8');
  assert.match(src, /const base = await git\('base', \['rev-parse', 'origin\/main'\]\)/);
  assert.match(src, /before = await readJSON\(join\(work, 'data\/dataset\.json'\)\)/);
  assert.match(src, /ignored_for_publication: !dryRun/);
  assert.doesNotMatch(src, /Daily publication requires a clean checkout/);
  assert.doesNotMatch(src, /install-published/);
  assert.doesNotMatch(src, /merge', '--ff-only', 'origin\/main/);
});

test('the supervisor\'s dated brief backups can never make the checkout dirty again', async () => {
  const ignore = await readFile(new URL('.gitignore', root), 'utf8');
  assert.match(ignore, /^\*\.bak-\*$/m);
  // Real git, not a string check: an untracked *.bak-* file is invisible to the gate's own status call.
  const { stdout } = await exec('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root.pathname });
  assert.ok(!/\.bak-/.test(stdout), `no .bak- path is reported as untracked:\n${stdout.split('\n').filter((l) => l.includes('.bak-')).join('\n')}`);
});
