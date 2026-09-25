// D203 (2026-09-25): the iteration launcher handed an agent a checkout stopped mid-rebase.
//
// `ops/ux-2026-09-12/bin/iterate.sh` starts every iteration with
// `git pull --rebase --autostash -q origin main || echo "warn: pull failed"`. The `||` swallowed the
// failure and the agent was launched anyway — but a rebase that stops on a conflict does not leave the
// checkout as it found it: HEAD is detached, `data/dataset.json` holds conflict markers, and the index
// is half-staged.
//
// Measured this morning: the daily published `5dbcd095` ("Refresh Benchmark Heaven data 2026-09-25")
// at 09:53 while iteration 216's eight gated commits were still unpushed. The 10:00 iteration's pull
// stopped replaying at commit 3 of 8, and the next agent opened on `UU data/dataset.json` with the
// eight commits stranded on a detached HEAD. Two things make that worse than a plain failure: an agent
// that does not notice can commit the conflict markers or `git rebase --abort` the work away, and every
// other job sharing this checkout (the merge queue, the self-heal repair job) needs a clean index and
// blocks until someone clears it.
//
// The launcher now restores the pre-pull state instead. `git rebase --abort` puts the branch, the local
// commits and — because the pull uses `--autostash` — another writer's uncommitted files back exactly as
// they were, and the prompt tells the agent to rebase deliberately. `data/dataset.json` is generated, so
// the note names the only correct resolution: take origin's side and re-run `build-dataset.mjs` so the
// `data/raw` edits are re-projected. Restoring it rather than rebuilding it makes prebuild refuse every
// deploy, which is the trap recorded after the last registry edit committed without its dataset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ITERATE = fileURLToPath(new URL('../ops/ux-2026-09-12/bin/iterate.sh', import.meta.url));

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const sh = (cwd, script) => execFileSync('bash', ['-c', script], { cwd, encoding: 'utf8' });

// A scratch origin whose main has moved on, and a work checkout holding one unpushed commit that
// touches the same generated file — the shape of this morning's failure.
function scenario(root) {
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const other = join(root, 'other');
  execFileSync('git', ['init', '-q', '--bare', origin]);
  execFileSync('git', ['clone', '-q', origin, work], { stdio: 'ignore' });
  sh(work, 'git config user.email t@t && git config user.name T && git checkout -q -b main');
  writeFileSync(join(work, 'dataset.json'), '{"generated_at":"A"}\n');
  writeFileSync(join(work, 'raw.txt'), 'raw\n');
  sh(work, 'git add -A && git commit -qm base && git push -q -u origin main');
  // the bare repo's HEAD still points at master after `git init --bare`; the second clone needs main
  execFileSync('git', ['-C', origin, 'symbolic-ref', 'HEAD', 'refs/heads/main']);
  execFileSync('git', ['clone', '-q', origin, other], { stdio: 'ignore' });
  sh(other, 'git config user.email t@t && git config user.name T');
  writeFileSync(join(other, 'dataset.json'), '{"generated_at":"ORIGIN-DAILY"}\n');
  sh(other, 'git commit -qam "daily refresh" && git push -q origin main');
  writeFileSync(join(work, 'dataset.json'), '{"generated_at":"LOCAL"}\n');
  sh(work, 'git commit -qam "local registry work"');
  return { origin, work };
}

// Runs the real launcher against the scratch repo. `noop-engine` matches no branch of its engine
// case statement, so the git work happens and no CLI is launched.
function runLauncher(root, work) {
  const state = join(root, 'state');
  const logs = join(root, 'logs');
  mkdirSync(state, { recursive: true });
  mkdirSync(logs, { recursive: true });
  execFileSync('bash', [ITERATE, 'noop-engine', 'work'], {
    encoding: 'utf8',
    env: { ...process.env, BH_UX_REPO: work, BH_UX_STATE: state, BH_UX_LOGS: logs },
  });
  const log = sh(root, `cat ${JSON.stringify(logs)}/*.log`);
  return { log };
}

test('D203: a conflicted startup pull is aborted, not handed to the agent', () => {
  const root = mkdtempSync(join(tmpdir(), 'bh-iterate-'));
  try {
    const { work } = scenario(root);
    const before = git(work, 'rev-parse', 'HEAD');

    // Another writer shares this checkout: one tracked edit and one untracked file, both uncommitted.
    writeFileSync(join(work, 'raw.txt'), 'raw-edited-by-another-writer\n');
    writeFileSync(join(work, 'other-writer.txt'), 'uncommitted\n');

    const { log } = runLauncher(root, work);

    // The pull really did conflict — otherwise this test would pass on a scenario that never failed.
    assert.match(log, /CONFLICT \(content\): Merge conflict in dataset\.json/);
    assert.match(log, /warn: rebase conflicted; aborted and restored the pre-pull worktree/);

    // No stopped rebase is left behind, on either layout.
    assert.equal(existsSync(join(work, '.git/rebase-merge')), false, 'rebase-merge left behind');
    assert.equal(existsSync(join(work, '.git/rebase-apply')), false, 'rebase-apply left behind');

    // The branch, not a detached HEAD, and the unpushed commit is intact.
    assert.equal(git(work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');
    assert.equal(git(work, 'rev-parse', 'HEAD'), before, 'local commit lost');
    assert.equal(git(work, 'log', '-1', '--format=%s'), 'local registry work');

    // No conflict markers reach the working tree.
    assert.equal(readFileSync(join(work, 'dataset.json'), 'utf8').includes('<<<<<<<'), false);

    // The other writer's uncommitted work is restored by the autostash, and no stash is orphaned.
    assert.equal(readFileSync(join(work, 'raw.txt'), 'utf8'), 'raw-edited-by-another-writer\n');
    assert.equal(readFileSync(join(work, 'other-writer.txt'), 'utf8'), 'uncommitted\n');
    assert.equal(git(work, 'stash', 'list'), '', 'autostash was not reapplied');

    // Only that writer's two files are dirty; the index is not left half-staged for the merge queue.
    const status = git(work, 'status', '--porcelain').split('\n').map((l) => l.trim().split(/\s+/).pop()).sort();
    assert.deepEqual(status, ['other-writer.txt', 'raw.txt']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('D203: a clean startup pull still fast-forwards and warns about nothing', () => {
  const root = mkdtempSync(join(tmpdir(), 'bh-iterate-'));
  try {
    const { work } = scenario(root);
    // Drop the conflicting local commit: now the pull is an ordinary fast-forward.
    sh(work, 'git reset -q --hard origin/main');
    const { log } = runLauncher(root, work);

    assert.equal(/warn:/.test(log), false, 'a clean pull must not warn');
    assert.equal(git(work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');
    assert.equal(git(work, 'log', '-1', '--format=%s'), 'daily refresh');
    assert.equal(git(work, 'status', '--porcelain'), '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('D203: an unreachable remote is reported as a failed pull, not a false abort', () => {
  const root = mkdtempSync(join(tmpdir(), 'bh-iterate-'));
  try {
    const { work } = scenario(root);
    const before = git(work, 'rev-parse', 'HEAD');
    sh(work, `git remote set-url origin ${JSON.stringify(join(root, 'gone.git'))}`);

    const { log } = runLauncher(root, work);

    assert.match(log, /warn: pull failed/);
    // Nothing was rebased, so the launcher must not claim it restored anything.
    assert.equal(/aborted and restored/.test(log), false);
    assert.equal(git(work, 'rev-parse', 'HEAD'), before);
    assert.equal(git(work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// The repair above is only useful if the agent is told; assert the note reaches the prompt rather
// than only the log, since the log is not read by the iteration it belongs to.
test('D203: the startup-pull outcome is interpolated into the agent prompt', () => {
  const src = readFileSync(ITERATE, 'utf8');
  const promptLine = src.split('\n').find((l) => l.includes('Evidence goes to'));
  assert.ok(promptLine?.includes('$GIT_STATE_NOTE'), 'PROMPT does not carry $GIT_STATE_NOTE');
  // Each of the three outcomes sets the note, and the conflict branch names the generated-file rule.
  assert.equal(src.match(/GIT_STATE_NOTE="/g)?.length, 4, 'expected one initialiser and three outcomes');
  assert.match(src, /never hand-merge it/);
  assert.match(src, /build-dataset\.mjs/);
});
