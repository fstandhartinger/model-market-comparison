import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binRoot = path.join(repoRoot, 'ops/ux-2026-09-12/bin');
const readScript = (name) => readFileSync(path.join(binRoot, name), 'utf8');
const heredoc = (text, marker) => {
  const match = text.match(new RegExp(`<<'${marker}'\\n([\\s\\S]*?)\\n${marker}`));
  assert.ok(match, `${marker} heredoc exists`);
  return match[1];
};
const tempDir = () => mkdtempSync(path.join(tmpdir(), 'bh-ux-scheduler-'));

test('history cadence ignores attempts and deduplicates completed jobs by job stamp', () => {
  const code = heredoc(readScript('tick.sh'), 'PY_HISTORY');
  const history = [
    '20260929T181907Z work recovery-deterministic rc=0',
    '20260929T185005Z work codex-luna-xhigh started',
    '20260929T185005Z work codex-luna-xhigh rc=75 actual=codex gpt-6-luna xhigh',
    '20260929T190000Z work completed-pr codex-luna-xhigh actual=devin model=devin-sonnet-high job=a',
    '20260929T190000Z work completed-pr codex-luna-xhigh actual=devin model=devin-sonnet-high job=a',
    '20260929T190100Z review codex-luna-xhigh rc=75',
  ].join('\n');
  const dir = tempDir();
  try {
    const input = path.join(dir, 'history.log');
    writeFileSync(input, history);
    const result = execFileSync('python3', ['-', input], { input: code, encoding: 'utf8' });
    assert.deepEqual(result.trim().split('\n'), ['work', '1', '1', 'devin']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('completion history uses the executed provider family', () => {
  const script = readScript('iterate.sh');
  const start = script.indexOf('actual_model=');
  const end = script.indexOf('if [ "$ROLE" = design ]; then rm -f "$STATE/next-role"; fi', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const dir = tempDir();
  try {
    const env = {
      PATH: '/usr/bin:/bin', STATE: dir, TS: '20260929T190000Z', ROLE: 'work',
      ENGINE: 'codex-luna-xhigh', ENGINE_USED: 'claude-sonnet-5-5-high',
      BOARD_ENGINE: 'codex', JOB: 'fallback-test',
    };
    execFileSync('bash', ['-c', script.slice(start, end)], { env });
    assert.match(readFileSync(path.join(dir, 'history.log'), 'utf8'), /actual=devin/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('review picker selects an eligible alternate family and leaves Claude out', () => {
  const dir = tempDir();
  try {
    const home = path.join(dir, 'home');
    const bin = path.join(home, 'bin');
    const state = path.join(dir, 'state');
    mkdirSync(bin, { recursive: true });
    mkdirSync(state, { recursive: true });
    const quota = path.join(bin, 'quota-pace');
    const calls = path.join(dir, 'quota-calls.log');
    writeFileSync(quota, `#!/bin/sh
printf '%s\\n' "$*" >> '${calls}'
case "$1" in
  pick)
    case " $* " in
      *" --order devin "*) echo devin ;;
      *" --order codex,devin "*) echo codex ;;
      *) echo claude ;;
    esac ;;
  allow) echo 'yes: eligible' ;;
  *) exit 64 ;;
esac
`);
    chmodSync(quota, 0o755);
    writeFileSync(path.join(state, 'history.log'),
      '20260929T190000Z work completed-pr codex-luna-xhigh actual=codex model=gpt-6-luna-xhigh job=impl-1\n');
    const output = execFileSync(path.join(binRoot, 'pick-engine.sh'), ['review', 'codex'], {
      env: { HOME: home, BH_UX_STATE: state, PATH: '/usr/bin:/bin' }, encoding: 'utf8',
    });
    assert.equal(output.trim(), 'devin-sonnet-high');
    const quotaCalls = readFileSync(calls, 'utf8');
    assert.match(quotaCalls, /--order codex,devin/);
    assert.match(quotaCalls, /--order devin/);
    assert.doesNotMatch(quotaCalls, /claude/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generated work prompt keeps the literal deferred section heading', () => {
  const script = readScript('iterate.sh');
  const match = script.match(/cat > "\$RUN_DIR\/PROMPT\.md" <<EOF_PROMPT\n[\s\S]*?\nEOF_PROMPT/);
  assert.ok(match, 'prompt heredoc exists');
  const dir = tempDir();
  try {
    const env = {
      PATH: '/usr/bin:/bin', RUN_DIR: dir, ROLE: 'work', ENGINE: 'codex-luna-xhigh',
      CR: 'CR-226', WT: dir, BRANCH: 'jobs/fixture', BASE: '0'.repeat(40), GIT_STATE_NOTE: '',
    };
    execFileSync('bash', ['-c', match[0]], { env, stdio: 'pipe' });
    assert.match(readFileSync(path.join(dir, 'PROMPT.md'), 'utf8'), /Deferred items:/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('only unique IDs in the explicit deferred section are persisted with reasons', () => {
  const code = heredoc(readScript('iterate.sh'), 'PY_IDS');
  const report = [
    'No change. F-100 is already complete. CR-226 is allocation only.',
    'Deferred items:',
    '- F-219: its generator is outside this worktree.',
    '- F-219: its generator is outside this worktree.',
  ].join('\n');
  const dir = tempDir();
  try {
    const source = path.join(dir, 'OUTPUT.md');
    const target = path.join(dir, 'deferred-items.log');
    writeFileSync(source, report);
    execFileSync('python3', ['-', source, target, 'fixture'], { input: code, encoding: 'utf8' });
    const lines = readFileSync(target, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /F-219: its generator is outside this worktree/);
    assert.doesNotMatch(lines[0], /F-100/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
