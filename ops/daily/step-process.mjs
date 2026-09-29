// D249.2 (2026-09-29): a step that is killed on the clock must take its workers with it.
//
// What happened. `daily.mjs` runs every step through `promisify(execFile)` with a `timeout` and
// `killSignal: 'SIGTERM'`. Node's timeout calls `child.kill()`, which signals the direct child and
// nothing below it. `refresh-benchmarks.mjs` spawns `bash ops/daily/worker.sh` per review call, and
// those workers spawn `curl`; when the parent kills the step, the workers are reparented to init and
// keep running. Measured on the 2026-09-28 05:17 run that died at 08:03:32Z: six gauntlet artifact
// directories carry mtimes up to 08:06:49Z — three minutes of writes into a run directory whose owner
// was already gone, while `profile-run.mjs`, `source-health.mjs` and the report writer were reading it.
// Reproduced in `iter272-d249-2/before/` with a 3 s step and a one-tick-per-second worker: the worker
// logged ticks 5–11 after the kill and was still alive when the parent had finished.
//
// So the evidence a killed run leaves is not a snapshot of the moment it died; it is whatever the
// orphans had finished writing by the time something read it. That is unfalsifiable by construction —
// the receipt cannot say whether a half-written artifact was the step's last act or an orphan's first.
//
// The fix is the process group, not a longer wait. Each step is spawned `detached: true`, which makes
// it a process-group leader, and a timeout signals `-pid`: the step, its workers, and their `curl`s,
// all at once. The group gets `killSignal` first so a worker can still finish its own receipt, and
// SIGKILL one grace period later for anything that ignores it.
//
// Detaching costs one thing and it is paid back here: a detached group no longer dies with the
// parent's own group, so `killLiveStepGroups()` is registered on the parent's exit and on the signals
// a cron kill uses. Net, a step outlives its parent in strictly fewer cases than before this change.
//
// This is deliberately not `execFile` with an extra flag: Node's `timeout` handling is what signals
// the wrong pid, so the timer has to be ours.

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

/** Time a signalled group keeps to exit before it is SIGKILLed. */
export const STEP_GROUP_KILL_GRACE_MS = 20_000;
const STEP_GROUP_POLL_MS = 100;

/**
 * Snapshot live members of this detached session/process group. After its leader exits, a PGID
 * alone is not enough to signal safely: the numeric id can be reused. Linux start ticks let the
 * timeout path prove a member still belongs to the group it originally spawned.
 */
function liveGroupMembers(pgid) {
  const members = new Map();
  let entries;
  try { entries = readdirSync('/proc'); } catch { return members; }
  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    let stat;
    try { stat = readFileSync(`/proc/${entry}/stat`, 'utf8'); } catch { continue; }
    const close = stat.lastIndexOf(')');
    if (close < 0) continue;
    const fields = stat.slice(close + 2).trim().split(/\s+/);
    // fields[0..3] are state, parent pid, process group, and session; starttime is field 22.
    if (fields[0] === 'Z' || Number(fields[2]) !== pgid || Number(fields[3]) !== pgid) continue;
    const starttime = Number(fields[19]);
    if (Number.isFinite(starttime)) members.set(Number(entry), starttime);
  }
  return members;
}

/** Groups this process has spawned and not yet reaped, so the parent's own death can clear them. */
const liveGroups = new Set();
let exitHooksInstalled = false;

/** Signal a whole process group, ignoring a group that has already gone. */
function signalGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH' || error.code === 'EPERM') return false;
    throw error;
  }
}

/** SIGKILL every step group still running. Synchronous, so it is usable from an `exit` handler. */
export function killLiveStepGroups() {
  for (const pid of [...liveGroups]) {
    signalGroup(pid, 'SIGKILL');
    liveGroups.delete(pid);
  }
}

function installExitHooks() {
  if (exitHooksInstalled) return;
  exitHooksInstalled = true;
  process.on('exit', killLiveStepGroups);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      killLiveStepGroups();
      process.exit(128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1));
    });
  }
}

/**
 * Run one pipeline step. Resolves `{ stdout, stderr }` like `promisify(execFile)` and rejects with the
 * same error shape — `killed`, `signal`, `code`, `stdout`, `stderr` — so every existing reader of a
 * step failure keeps working, including D249.1's timeout detection in `daily.mjs`.
 *
 * `timeout` kills the child's *process group*, not the child. `killGraceMs` later the group is
 * SIGKILLed; `stdioGraceMs` bounds how long we then wait for the pipes to close, so one unkillable
 * descendant holding a pipe open cannot hang the run.
 */
export function runStep(file, args = [], {
  cwd,
  env,
  timeout = 0,
  killSignal = 'SIGTERM',
  maxBuffer = 1024 * 1024,
  killGraceMs = STEP_GROUP_KILL_GRACE_MS,
  stdioGraceMs = 5_000,
  spawnImpl = spawn,
} = {}) {
  installExitHooks();
  return new Promise((resolve, reject) => {
    // stdin is closed rather than piped: no step reads it, and a tool that would have blocked on an
    // open pipe until the timeout (git asking for a credential) now fails in the second it takes to
    // notice. Nothing in the pipeline writes to a step's stdin.
    const child = spawnImpl(file, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const command = [file, ...args].join(' ');
    const out = [], err = [];
    let outBytes = 0, errBytes = 0;
    let settled = false, timedOut = false, overflow = null, spawnError = null;
    let killTimer = null, groupPollTimer = null, stdioTimer = null;
    let groupDeadline = 0, stdioDeadline = 0, groupKillSent = false, groupDrained = false;
    let knownGroupMembers = new Map(), deferredFinish = null;
    const group = () => (Number.isInteger(child.pid) && child.pid > 0 ? child.pid : null);

    const forget = () => {
      const pid = group();
      if (pid !== null) liveGroups.delete(pid);
      for (const timer of [killTimer, groupPollTimer, stdioTimer]) if (timer) clearTimeout(timer);
      killTimer = groupPollTimer = stdioTimer = null;
    };

    const originalGroupStillLive = () => {
      const pid = group();
      if (pid === null || groupDrained) return false;
      const current = liveGroupMembers(pid);
      const matchesOriginal = [...current].some(([member, starttime]) => knownGroupMembers.get(member) === starttime);
      if (matchesOriginal) for (const [member, starttime] of current) knownGroupMembers.set(member, starttime);
      return matchesOriginal;
    };

    const killGroup = (signal, { afterLeaderExit = false } = {}) => {
      const pid = group();
      // Before the group exists there is nothing to signal. After its leader is reaped, require a live
      // member whose pid and /proc start tick were captured from this original group before signalling.
      if (pid === null) return false;
      if (child.exitCode !== null || child.signalCode !== null) {
        if (!afterLeaderExit || !originalGroupStillLive()) return false;
      }
      return signalGroup(pid, signal);
    };

    let finish;
    const pollTimedOutGroup = () => {
      groupPollTimer = null;
      if (settled || !timedOut) return;
      if (!originalGroupStillLive()) {
        groupDrained = true;
        if (deferredFinish) finish(deferredFinish.error, deferredFinish.code, deferredFinish.signal, true);
        return;
      }
      if (!groupKillSent && Date.now() >= groupDeadline) {
        groupKillSent = killGroup('SIGKILL', { afterLeaderExit: true });
      }
      if (groupKillSent && Date.now() >= stdioDeadline) {
        // SIGKILL is pending for an uninterruptible member; stop waiting on its inherited pipes.
        const result = deferredFinish ?? { error: overflow ?? spawnError, code: child.exitCode, signal: child.signalCode };
        finish(result.error, result.code, result.signal, true);
        return;
      }
      groupPollTimer = setTimeout(pollTimedOutGroup, STEP_GROUP_POLL_MS);
    };

    finish = (error, code, signal, force = false) => {
      if (settled) return;
      if (!force && timedOut && !groupDrained && originalGroupStillLive()) {
        deferredFinish ??= { error, code, signal };
        if (!groupPollTimer) groupPollTimer = setTimeout(pollTimedOutGroup, STEP_GROUP_POLL_MS);
        return;
      }
      if (timedOut && !groupDrained && !force) groupDrained = true;
      settled = true;
      forget();
      const stdout = Buffer.concat(out).toString('utf8');
      const stderr = Buffer.concat(err).toString('utf8');
      if (!error && code === 0 && !signal) return resolve({ stdout, stderr });
      const failure = error ?? new Error(`Command failed: ${command}\n${stderr}`);
      failure.cmd = command;
      failure.code = failure.code ?? (code === null ? undefined : code);
      failure.killed = timedOut || Boolean(signal);
      failure.signal = signal ?? null;
      failure.stdout = stdout;
      failure.stderr = stderr;
      reject(failure);
    };

    child.on('error', (error) => {
      // A spawn failure (ENOENT) never produced a group; report it as execFile would.
      spawnError = error;
      finish(error, null, null);
    });

    const collect = (stream, chunks, isOut) => {
      if (!stream) return;
      stream.on('data', (chunk) => {
        const bytes = isOut ? (outBytes += chunk.length) : (errBytes += chunk.length);
        if (bytes > maxBuffer) {
          if (!overflow) {
            overflow = new Error(`${isOut ? 'stdout' : 'stderr'} maxBuffer length exceeded`);
            overflow.code = 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
            killGroup('SIGKILL');
          }
          return;
        }
        chunks.push(chunk);
      });
      stream.on('error', () => {});
    };
    collect(child.stdout, out, true);
    collect(child.stderr, err, false);

    if (timeout > 0) {
      killTimer = setTimeout(() => {
        timedOut = true;
        const pid = group();
        knownGroupMembers = pid === null ? new Map() : liveGroupMembers(pid);
        groupDeadline = Date.now() + killGraceMs;
        stdioDeadline = groupDeadline + stdioGraceMs;
        killGroup(killSignal);
        groupPollTimer = setTimeout(pollTimedOutGroup, STEP_GROUP_POLL_MS);
      }, timeout);
    }

    // `exit` fires when the step itself is gone; `close` waits for every descendant holding a pipe.
    // We prefer `close`, but never wait on it indefinitely — an orphan that survived SIGKILL (an
    // uninterruptible read) would otherwise stall the whole run at the one place that must not stall.
    child.on('exit', (code, signal) => {
      stdioTimer = setTimeout(() => finish(overflow ?? spawnError, code, signal), stdioGraceMs);
      child.on('close', () => finish(overflow ?? spawnError, code, signal));
    });

    const pid = group();
    if (pid !== null) liveGroups.add(pid);
  });
}
