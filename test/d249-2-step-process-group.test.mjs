// D249.2 (2026-09-29): a step killed on the clock left its workers running. `daily.mjs` ran every step
// through `promisify(execFile)`, whose `timeout` signals the direct child and nothing below it, so the
// `bash worker.sh` processes `refresh-benchmarks.mjs` spawns were reparented to init and went on writing
// into the run directory — measured at three minutes past the kill on the 2026-09-28 05:17 run, while
// the report writer and `source-health.mjs` were already reading that directory.
//
// These tests pin the process group: a timeout signals `-pid`, a step that ignores the signal is
// SIGKILLed one grace period later, and everything a caller reads off a failed step (`killed`,
// `signal`, `code`, `stdout`, `stderr`) keeps the shape `execFile` gave it, because D249.1's timeout
// detection and every log reader depend on it.
//
// The first test is the control: run the *old* mechanism against the same fixture and the grandchild
// survives. Without it this suite would pass just as well on the defect.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runStep, killLiveStepGroups, STEP_GROUP_KILL_GRACE_MS } from '../ops/daily/step-process.mjs';

const execFileAsync = promisify(execFile);
const dailySrc = readFileSync(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** A step that spawns a worker which writes a line into `out` every 150 ms, then waits for it. */
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  const worker = join(dir, 'worker.sh');
  const step = join(dir, 'step.mjs');
  const out = join(dir, 'ticks.txt');
  await writeFile(worker, '#!/bin/bash\nfor i in $(seq 1 60); do echo "tick $i" >> "$1"; sleep 0.15; done\n');
  await writeFile(step, [
    "import { execFile } from 'node:child_process';",
    "import { promisify } from 'node:util';",
    'const exec = promisify(execFile);',
    "console.log('step started');",
    `await exec('bash', [${JSON.stringify(worker)}, ${JSON.stringify(out)}], { timeout: 600000 });`,
  ].join('\n'));
  const ticks = async () => {
    try { return (await readFile(out, 'utf8')).trim().split('\n').filter(Boolean).length; }
    catch { return 0; }
  };
  return { dir, step, out, ticks, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

/** True while any `bash <worker>` from this fixture is still running. */
async function workersAlive(worker) {
  const { stdout } = await execFileAsync('ps', ['-eo', 'args=']).catch(() => ({ stdout: '' }));
  return stdout.split('\n').some((line) => line.startsWith('bash ') && line.includes(worker));
}

test('control: the mechanism this replaces leaves the step\'s worker running after the kill', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  await assert.rejects(execFileAsync(process.execPath, [f.step], { timeout: 600, killSignal: 'SIGTERM' }));
  const atKill = await f.ticks();
  await sleep(900);
  const later = await f.ticks();
  assert.ok(later > atKill, `the old mechanism should keep writing after the kill (${atKill} → ${later})`);
  for (const pid of (await execFileAsync('ps', ['-eo', 'pid=,args='])).stdout.split('\n')
    .filter((line) => line.includes(join(f.dir, 'worker.sh')) && / bash /.test(` ${line} `))
    .map((line) => Number(line.trim().split(/\s+/)[0])).filter(Boolean)) {
    try { process.kill(pid, 'SIGKILL'); } catch { /* already gone */ }
  }
});

test('a timed-out step takes its workers with it', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  await assert.rejects(runStep(process.execPath, [f.step], { timeout: 600, killSignal: 'SIGTERM', killGraceMs: 300 }));
  const atKill = await f.ticks();
  await sleep(900);
  assert.equal(await f.ticks(), atKill, 'no line may be written into the run directory after the kill');
  assert.equal(await workersAlive(join(f.dir, 'worker.sh')), false, 'no worker may outlive its step');
});

test('a timed-out step also kills a worker that ignores SIGTERM after the step exits', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const step = join(dir, 'parent-exits.mjs');
  const pidFile = join(dir, 'stubborn-worker.pid');
  const workerCommand = 'trap "" TERM; echo $$ > "$1"; exec sleep 45';
  await writeFile(step, [
    "import { spawn } from 'node:child_process';",
    `spawn('bash', ['-c', ${JSON.stringify(workerCommand)}, 'fixture-worker', ${JSON.stringify(pidFile)}], { stdio: 'inherit' });`,
    'setInterval(() => {}, 1000);',
  ].join('\n'));
  let workerPid = null;
  t.after(() => { if (workerPid) try { process.kill(workerPid, 'SIGKILL'); } catch { /* already gone */ } });
  const error = await runStep(process.execPath, [step], {
    timeout: 1_200, killSignal: 'SIGTERM', killGraceMs: 300, stdioGraceMs: 800,
  }).then(() => null, (e) => e);
  assert.ok(error?.killed, 'the parent step must time out');
  workerPid = Number((await readFile(pidFile, 'utf8')).trim());
  const stat = await readFile(`/proc/${workerPid}/stat`, 'utf8').catch(() => '');
  const state = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[0];
  assert.ok(!state || state === 'Z', `the same-group worker must be dead after timeout (state ${state || 'missing'}; runStep signal ${error.signal})`);
});

test('a timed-out step rejects with the error shape every reader already expects', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const step = join(dir, 'slow.mjs');
  await writeFile(step, "console.log('out line'); console.error('err line'); setInterval(() => {}, 1000);\n");
  const error = await runStep(process.execPath, [step], { timeout: 700, killSignal: 'SIGTERM' }).then(
    () => null, (e) => e);
  assert.ok(error, 'a step that never exits must reject');
  assert.equal(error.killed, true);
  assert.equal(error.signal, 'SIGTERM');
  assert.match(error.stdout, /out line/);
  assert.match(error.stderr, /err line/);
  // The predicate in daily.mjs's command() — D249.1 depends on it to record a TIMEOUT line.
  assert.equal(error.killed === true || error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT', true);
});

test('a timed-out step that handles SIGTERM with exit zero still rejects as killed', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const step = join(dir, 'graceful-timeout.mjs');
  await writeFile(step, "process.on('SIGTERM', () => { console.log('handled timeout'); process.exit(0); }); setInterval(() => {}, 1000);\n");
  const error = await runStep(process.execPath, [step], { timeout: 1_200, killSignal: 'SIGTERM' })
    .then(() => null, (e) => e);
  assert.ok(error, 'a graceful exit cannot convert a timeout into success');
  assert.equal(error.killed, true);
  assert.equal(error.code, 0);
  assert.equal(error.signal, null);
  assert.match(error.stdout, /handled timeout/);
});

test('a step that ignores the signal is SIGKILLed one grace period later', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const step = join(dir, 'stubborn.mjs');
  await writeFile(step, "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);\n");
  const began = Date.now();
  const error = await runStep(process.execPath, [step], { timeout: 400, killSignal: 'SIGTERM', killGraceMs: 400 })
    .then(() => null, (e) => e);
  assert.ok(error, 'a step that swallows SIGTERM must still end');
  assert.equal(error.signal, 'SIGKILL');
  assert.ok(Date.now() - began < 10_000, 'it must not wait for the step to change its mind');
});

test('an ordinary step resolves with its output, and a failing one rejects with its exit code', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const ok = join(dir, 'ok.mjs'), bad = join(dir, 'bad.mjs');
  await writeFile(ok, "process.stdout.write('hello'); process.stderr.write('warned');\n");
  await writeFile(bad, "process.stdout.write('partial'); process.stderr.write('why'); process.exit(3);\n");
  assert.deepEqual(await runStep(process.execPath, [ok]), { stdout: 'hello', stderr: 'warned' });
  const error = await runStep(process.execPath, [bad]).then(() => null, (e) => e);
  assert.equal(error.code, 3);
  assert.equal(error.killed, false);
  assert.equal(error.stdout, 'partial');
  assert.equal(error.stderr, 'why');
});

test('a step that cannot be spawned rejects with the spawn error, not a timeout', async () => {
  const error = await runStep('/nonexistent/bh-step-binary', []).then(() => null, (e) => e);
  assert.equal(error.code, 'ENOENT');
  assert.equal(error.killed, false);
});

test('maxBuffer is enforced and the overrunning step is killed', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const step = join(dir, 'loud.mjs');
  await writeFile(step, "setInterval(() => process.stdout.write('x'.repeat(4096)), 5);\n");
  const error = await runStep(process.execPath, [step], { maxBuffer: 1024, timeout: 10_000 }).then(() => null, (e) => e);
  assert.equal(error.code, 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER');
});

test('a step gets a closed stdin, so a tool that would prompt fails instead of hanging', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'd249-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const step = join(dir, 'reads.mjs');
  await writeFile(step, [
    "const chunks = [];",
    "for await (const chunk of process.stdin) chunks.push(chunk);",
    "process.stdout.write(`stdin ended after ${chunks.length} chunks`);",
  ].join('\n'));
  const { stdout } = await runStep(process.execPath, [step], { timeout: 5_000 });
  assert.equal(stdout, 'stdin ended after 0 chunks');
});

test('the parent\'s own death clears the step groups it detached', async (t) => {
  const f = await fixture();
  t.after(f.cleanup);
  const pending = runStep(process.execPath, [f.step], { timeout: 30_000 }).catch(() => {});
  await sleep(700);
  assert.ok(await workersAlive(join(f.dir, 'worker.sh')), 'the fixture must actually be running');
  killLiveStepGroups();
  await pending;
  await sleep(300);
  assert.equal(await workersAlive(join(f.dir, 'worker.sh')), false,
    'killLiveStepGroups is what an exiting daily.mjs calls; it must reach the workers');
});

test('daily.mjs runs its steps through runStep, not through execFile', () => {
  assert.match(dailySrc, /import \{ runStep \} from '\.\/step-process\.mjs'/);
  assert.match(dailySrc, /await runStep\(file, args, \{ cwd, env, timeout, killSignal: 'SIGTERM'/);
  assert.equal(/^import .*\bexecFile\b.*from 'node:child_process'/m.test(dailySrc), false,
    'a second, group-unaware exec path in daily.mjs is how this defect comes back');
  assert.ok(STEP_GROUP_KILL_GRACE_MS > 0);
});

// The publish gate is the second place a timeout kills a child: its stage runs `npm test`,
// `next build` and `build-dataset` inside the staging checkout whose commit the verdict is about.
// Killing only the `node gate.mjs` wrapper left those three writing into it.
test('a timed-out publish-gate stage takes the build and test processes with it', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'd249-2-gate-'));
  const work = await mkdtemp(join(tmpdir(), 'd249-2-work-'));
  t.after(() => Promise.all([rm(home, { recursive: true, force: true }), rm(work, { recursive: true, force: true })]));
  const worker = join(home, 'worker.sh');
  const out = join(work, 'build-output.txt');
  await writeFile(worker, '#!/bin/bash\nfor i in $(seq 1 60); do echo "wrote $i" >> "$1"; sleep 0.15; done\n');
  await mkdir(join(home, 'gate'), { recursive: true });
  await writeFile(join(home, 'gate', 'gate.mjs'), [
    "import { execFile } from 'node:child_process';",
    "import { promisify } from 'node:util';",
    'const exec = promisify(execFile);',
    `await exec('bash', [${JSON.stringify(worker)}, ${JSON.stringify(out)}], { timeout: 600000 });`,
  ].join('\n'));
  const { runGateStage } = await import('../ops/daily/publish-gate.mjs');
  const result = await runGateStage('precommit', { home, work, env: process.env, timeoutMs: 600 });
  assert.equal(result.ok, false);
  assert.match(result.log, /timed out after 600 ms/);
  const atKill = (await readFile(out, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).length;
  await sleep(900);
  const later = (await readFile(out, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).length;
  assert.equal(later, atKill, 'a killed gate stage may not keep writing into the staging checkout');
  assert.equal(await workersAlive(worker), false);
});

test('publish-gate runs its stage through runStep and keeps execFile only for reading bytes', () => {
  const gateSrc = readFileSync(new URL('../ops/daily/publish-gate.mjs', import.meta.url), 'utf8');
  assert.match(gateSrc, /await runStep\(process\.execPath, \[gatePath\(home\), stage\]/);
  // The surviving `exec` reads HEAD:data/dataset.json as a Buffer for the verdict's binding hash;
  // runStep decodes to utf8, so that one call must stay on execFile.
  assert.match(gateSrc, /await exec\('git', \['show', 'HEAD:data\/dataset\.json'\][\s\S]*encoding: 'buffer'/);
});
