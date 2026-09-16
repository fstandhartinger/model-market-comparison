import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const root = new URL('../', import.meta.url);

// 2026-09-16: the scheduled daily runs of 15 and 16 September both died at the clean-checkout gate,
// because this repo has a second writer (the UX workstream) whose cron ticks every 10 minutes. The gate
// stays — publication must never carry someone else's half-finished work — but it now waits.
test('publication waits for the other writer before it gives up for the day', async () => {
  const src = await readFile(new URL('ops/daily/daily.mjs', root), 'utf8');
  assert.match(src, /const CLEAN_CHECKOUT_WAIT_MS = Number\(process\.env\.BH_CLEAN_CHECKOUT_WAIT_MS \?\? 30 \* 60_000\)/);
  assert.match(src, /const CLEAN_CHECKOUT_POLL_MS = Number\(process\.env\.BH_CLEAN_CHECKOUT_POLL_MS \?\? 60_000\)/);
  assert.match(src, /for \(let attempt = 1; dirty\.length && Date\.now\(\) < deadline; attempt\+\+\)/, 're-reads the status while waiting');
  assert.match(src, /if \(dirty\.length\) throw new Error\(`Daily publication requires a clean checkout/, 'still fails closed when the wait runs out');
  assert.match(src, /still dirty after \$\{Math\.round\(CLEAN_CHECKOUT_WAIT_MS \/ 60000\)\} min: \$\{dirty\.slice\(0, 5\)/, 'the error names what was dirty');
  // The wait is bounded well inside the 3 h the shell entry point allows.
  assert.ok(30 * 60_000 * 2 < 3 * 60 * 60_000);
  const shell = await readFile(new URL('../../benchmarkheaven-daily/run.sh', new URL('ops/', root)), 'utf8').catch(() => '');
  if (shell) assert.match(shell, /3h node ops\/daily\/daily\.mjs/, 'the entry point still allows three hours');
});

test('the supervisor\'s dated brief backups can never make the checkout dirty again', async () => {
  const ignore = await readFile(new URL('.gitignore', root), 'utf8');
  assert.match(ignore, /^\*\.bak-\*$/m);
  // Real git, not a string check: an untracked *.bak-* file is invisible to the gate's own status call.
  const { stdout } = await exec('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root.pathname });
  assert.ok(!/\.bak-/.test(stdout), `no .bak- path is reported as untracked:\n${stdout.split('\n').filter((l) => l.includes('.bak-')).join('\n')}`);
});
