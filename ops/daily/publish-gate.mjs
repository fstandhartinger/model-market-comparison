// CR-66.2: the publish gate (critic check of the staged dataset, outside this repo under
// $BH_DAILY_HOME/gate) used to run only as git hooks inside daily.mjs's 120 s git timeout, and a
// manual `bash ops/daily/run.sh` skipped it. daily.mjs now calls both stages explicitly with their
// own timeout and publishes only on a PASS verdict bound to the committed dataset bytes and commit.
// The hooks remain as a second line; they reuse this result for the same dataset and commit.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export const GATE_TIMEOUT_MS = 7 * 60_000;
// The gate's internal per-stage deadline; must stay below the process timeout.
export const GATE_STAGE_BUDGET_MS = 5 * 60_000;

export const gatePath = (home) => join(home, 'gate', 'gate.mjs');

/** Whether this run must pass the gate: always when the gate is installed or BH_GATE_REQUIRED=1. */
export function gateRequirement({ home, env = process.env }) {
  const installed = Boolean(home) && existsSync(gatePath(home));
  return { installed, required: installed || env.BH_GATE_REQUIRED === '1' };
}

/** Run one gate stage (`precommit` before the commit, `prepush` before the push) in the staging checkout. */
export async function runGateStage(stage, { home, work, env = process.env, timeoutMs = GATE_TIMEOUT_MS }) {
  const begin = Date.now();
  try {
    const { stderr } = await exec(process.execPath, [gatePath(home), stage], {
      cwd: work, timeout: timeoutMs, killSignal: 'SIGTERM', maxBuffer: 32_000_000,
      env: { ...env, BH_GATE_REQUIRED: '1', BH_DAILY_HOME: home, BH_GATE_STAGE_BUDGET_MS: String(Math.min(GATE_STAGE_BUDGET_MS, timeoutMs - 30_000)) },
    });
    return { stage, ok: true, duration_ms: Date.now() - begin, log: stderr.slice(-2000) };
  } catch (error) {
    return { stage, ok: false, duration_ms: Date.now() - begin, log: [error.stderr, error.killed ? `timed out after ${timeoutMs} ms` : error.message].filter(Boolean).join('\n').slice(-2000) };
  }
}

/**
 * The decision to publish. A verdict counts only when it is PASS and bound to the exact committed
 * dataset (sha256 of HEAD:data/dataset.json) and, when it names one, the same commit.
 */
export function assessVerdict(verdict, { datasetSha256, commit, required }) {
  if (!verdict) return required ? { ok: false, reason: 'publish gate verdict missing' } : { ok: true, reason: 'publish gate not installed and not required' };
  if (verdict.verdict !== 'PASS') return { ok: false, reason: `publish gate verdict ${verdict.verdict ?? 'invalid'}: ${(verdict.reasons || []).slice(0, 3).join(' | ')}` };
  if (verdict.dataset_sha256 !== datasetSha256) return { ok: false, reason: 'publish gate verdict belongs to a different dataset' };
  if (verdict.commit && commit && verdict.commit !== commit) return { ok: false, reason: `publish gate verdict belongs to commit ${verdict.commit.slice(0, 7)}` };
  return { ok: true, reason: 'PASS' };
}

export const readVerdict = (runDir) => readFile(join(runDir, 'gate', 'verdict.json'), 'utf8').then(JSON.parse).catch(() => null);

/**
 * Stage 1 before committing, stage 2 before pushing. `commit()` creates the local staging commit and
 * returns its sha; `push()` publishes it and is called only after a bound PASS.
 */
export async function gatedPublish({ home, work, runDir, env = process.env, commit, push, run = runGateStage, timeoutMs = GATE_TIMEOUT_MS }) {
  const { installed, required } = gateRequirement({ home, env });
  const gate = { installed, required, stages: [] };
  if (!installed) {
    if (required) return { published: false, gate, error: `BH_GATE_REQUIRED=1 but no gate at ${gatePath(home)}` };
    const sha = await commit();
    const pushed = await push(sha);
    return { published: true, commit: pushed ?? sha, gate: { ...gate, decision: assessVerdict(null, { required }) } };
  }
  const first = await run('precommit', { home, work, env, timeoutMs });
  gate.stages.push(first);
  if (!first.ok) {
    gate.verdict = await readVerdict(runDir);
    return { published: false, gate, error: `publish gate stage 1 failed: ${gate.verdict?.reasons?.[0] ?? first.log.split('\n').filter(Boolean).at(-1) ?? 'no verdict'}` };
  }
  const sha = await commit();
  const second = await run('prepush', { home, work, env, timeoutMs });
  gate.stages.push(second);
  const verdict = await readVerdict(runDir);
  gate.verdict = verdict;
  const datasetSha256 = createHash('sha256').update((await exec('git', ['show', 'HEAD:data/dataset.json'], { cwd: work, maxBuffer: 1e9, encoding: 'buffer' })).stdout).digest('hex');
  gate.decision = assessVerdict(verdict, { datasetSha256, commit: sha, required });
  gate.dataset_sha256 = datasetSha256;
  if (!second.ok || !gate.decision.ok) return { published: false, commit: sha, gate, error: `publish gate refused: ${gate.decision.ok ? second.log.split('\n').filter(Boolean).at(-1) : gate.decision.reason}` };
  const pushed = await push(sha, datasetSha256);
  return { published: true, commit: pushed ?? sha, gate };
}
