// D217 (2026-09-26, recurring): the github.com credential helper in ~/.gitconfig vanished under this
// account twice in five days. `git fetch` of a public repo succeeds without it, so the first step that
// noticed was the push — after a ~73-minute collection — and the run lost a whole day's work to
// "could not read Username for 'https://github.com'". The daily now proves the credential with a no-op
// `--dry-run` push before it collects anything.
//
// Two things must hold: the check runs before the work, and it can never publish or hang.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const src = readFileSync(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');

test('the credential is proved before the run collects anything, and can never wait on a terminal', () => {
  const preflight = src.indexOf("await command('push-credential'");
  assert.ok(preflight > 0, 'the daily has no push-credential preflight');
  // Before the staging clone and before every source fetch — otherwise it saves nothing.
  for (const later of ["'clone', 'git'", "`fetch-${source", "await command('npm-ci'"]) {
    assert.ok(src.indexOf(later) > preflight, `push-credential must run before ${later}`);
  }
  const step = src.slice(preflight, preflight + 400);
  assert.match(step, /--dry-run/, 'the preflight must not actually push');
  assert.match(step, /GIT_TERMINAL_PROMPT: '0'/, 'the preflight must never wait for a terminal prompt');
  // Fatal for a publishing run; a dry run publishes nothing, so there it is only a warning.
  assert.match(src.slice(preflight, preflight + 1200), /if \(!dryRun\) throw new Error\(reason\);/);
});

test('a no-op --dry-run push of the base sha moves no ref', () => {
  const dir = mkdtempSync(join(tmpdir(), 'd217-'));
  const bare = join(dir, 'origin.git'), clone = join(dir, 'work');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@e',
      GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@e' } }).trim();
  git(dir, 'init', '--bare', '-b', 'main', bare);
  git(dir, 'clone', bare, clone);
  execFileSync('bash', ['-c', 'echo one > a.txt'], { cwd: clone });
  git(clone, 'add', 'a.txt'); git(clone, 'commit', '-m', 'one'); git(clone, 'push', 'origin', 'main');
  const base = git(clone, 'rev-parse', 'origin/main');

  // A local commit the preflight must not publish.
  execFileSync('bash', ['-c', 'echo two > a.txt'], { cwd: clone });
  git(clone, 'add', 'a.txt'); git(clone, 'commit', '-m', 'two');
  const local = git(clone, 'rev-parse', 'HEAD');
  assert.notEqual(local, base);

  git(clone, 'push', '--dry-run', 'origin', `${base}:refs/heads/main`);
  assert.equal(git(bare, 'rev-parse', 'refs/heads/main'), base, 'the preflight published something');
});
