import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = fileURLToPath(new URL('../ops/priority-evaluation/', import.meta.url));

// N68: the fast-lane worker's own suite. HOME is an empty directory, so an unstubbed side effect finds no ~/bin tool
// (N65: a by-hand run reached the real urgent-autofix). Scoring and measurement pins plus the site checkout are bound
// to test-local synthetic fixtures; tests must not read host job paths or the live deploy checkout. The merge queue
// still confirms any LeChonk-only file failure on Sandy, and the minimum-count/skip checks keep this suite in the gate.
function unittest(file, minimumRan) {
  const sandbox = mkdtempSync(join(tmpdir(), 'fastlane-gate-'));
  try {
    mkdirSync(join(sandbox, 'bin'));
    writeFileSync(join(sandbox, 'bin', 'job-preamble.txt'), 'test preamble\n');
    const result = spawnSync('/usr/bin/python3', ['-I', join(dir, file)], {
      cwd: sandbox,
      encoding: 'utf8',
      timeout: 600000,
      maxBuffer: 64 * 1024 * 1024,
      env: {PATH: '/usr/bin:/bin', HOME: sandbox, TMPDIR: sandbox, LANG: 'C.UTF-8', PYTHONDONTWRITEBYTECODE: '1'},
    });
    assert.equal(result.status, 0, (result.stderr ?? '').slice(-6000) + String(result.error ?? ''));
    const ran = /^Ran (\d+) tests?/m.exec(result.stderr);
    assert.ok(ran && Number(ran[1]) >= minimumRan, `only ${ran?.[1]} tests ran in ${file}`);
    // A missing PostgreSQL skips every database test and would otherwise pass as green.
    const skipped = /skipped=(\d+)/.exec(result.stderr);
    assert.ok(Number(skipped?.[1] ?? 0) <= 5, `${skipped?.[1]} tests skipped in ${file}`);
  } finally {
    for (const name of readdirSync(sandbox)) {
      try {
        process.kill(Number(readFileSync(join(sandbox, name, 'pgdata', 'postmaster.pid'), 'utf8').split('\n')[0]), 'SIGQUIT');
      } catch {}
    }
    rmSync(sandbox, {recursive: true, force: true});
  }
}

test('fast-lane autopickup suite passes', () => unittest('test_autopickup.py', 170));
test('fast-lane installer inventory covers modules and operator commands', () => unittest('test_installer_inventory.py', 2));
