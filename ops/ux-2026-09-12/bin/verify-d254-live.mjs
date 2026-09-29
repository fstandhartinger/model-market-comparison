#!/usr/bin/env node
// D254 live acceptance: did a real unattended run classify the model's own answers as `content`?
//
//   node ops/ux-2026-09-12/bin/verify-d254-live.mjs [runDir] [outDir]
//
// With no runDir it takes the newest directory under /opt/benchmarkheaven-daily/runs that has a
// workers/unavailable-models.jsonl. Writes <outDir>/verification.json and prints one line per check.
//
// What it can and cannot prove. A run that recorded no `Incomplete completion` / `Empty completion`
// answer proves nothing either way — it is reported as INCONCLUSIVE, not as a pass. The unfakeable
// evidence is a run that did record one: it must carry `"failure": "content"`, and once a route has
// collected HARD_EXCLUSION_STRIKES of them in a role, no later worker receipt in that run may leave it
// out of `hard_excluded_models` for that role.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { hardExcludedWorkerModels, workerFailureClass, HARD_EXCLUSION_STRIKES, MODEL_ANSWER_FAILURE } from '../../daily/gauntlet.mjs';

const RUNS = '/opt/benchmarkheaven-daily/runs';
const readJSONL = async (path) => (await readFile(path, 'utf8')).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

async function newestRun() {
  const entries = await readdir(RUNS, { withFileTypes: true });
  for (const name of entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse()) {
    try { await readFile(join(RUNS, name, 'workers', 'unavailable-models.jsonl'), 'utf8'); return join(RUNS, name); }
    catch { /* a run that never excluded a route has no log; keep looking */ }
  }
  throw new Error(`no run under ${RUNS} has workers/unavailable-models.jsonl`);
}

const runDir = process.argv[2] || await newestRun();
const outDir = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/d254-live';
const checks = [];
const check = (name, verdict, detail) => checks.push({ name, verdict, detail });

const records = await readJSONL(join(runDir, 'workers', 'unavailable-models.jsonl'));
const answers = records.filter((r) => MODEL_ANSWER_FAILURE.test(String(r.reason ?? '')));

if (!answers.length) {
  check('the run recorded a model-answer failure at all', 'INCONCLUSIVE',
    `${records.length} exclusion record(s), none of them an Incomplete/Empty completion — this run does not exercise D254`);
} else {
  const misfiled = answers.filter((r) => r.failure !== 'content');
  check('every Incomplete/Empty completion is filed as the model\'s own answer', misfiled.length ? 'FAIL' : 'PASS',
    `${answers.length} model-answer record(s); ${misfiled.length} filed as ${[...new Set(misfiled.map((r) => r.failure))].join(', ') || 'content'}`);
}

// Nothing that is not the model's answer may have been filed content by the runner's path. A rejected
// review is filed `content` by recordInvalidModel and is not one of these two messages, so it is excluded
// from this check by reason, not by trust.
const runnerReasons = /^(The operation was aborted|fetch failed|Worker process failed|Provider returned|.* completion HTTP )/;
const wrongWay = records.filter((r) => r.failure === 'content' && runnerReasons.test(String(r.reason ?? '')));
check('a transport failure is never filed as the model\'s answer', wrongWay.length ? 'FAIL' : 'PASS',
  wrongWay.length ? wrongWay.map((r) => `${r.model}: ${r.reason}`).join(' | ') : 'none');

// The bound actually took effect: a route hardened by the records is absent from every later receipt's
// offered pool. Receipts carry `hard_excluded_models`, so the run states this itself.
const workers = (await readdir(join(runDir, 'workers'))).filter((f) => /^worker-\d/.test(f) || /^worker-failure-/.test(f));
const receipts = [];
for (const f of workers) {
  try { receipts.push(JSON.parse(await readFile(join(runDir, 'workers', f), 'utf8'))); } catch { /* a truncated receipt is not evidence */ }
}
receipts.sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));
const violations = [];
for (const role of ['producer', 'critic']) {
  const hardened = hardExcludedWorkerModels(records, { role });
  for (const model of hardened) {
    // The first receipt that starts after the strike that hardened it must already name it.
    const strikes = records.filter((r) => r.model === model && r.failure === 'content'
      && (!['producer', 'critic'].includes(r.role) || r.role === role));
    const at = strikes[HARD_EXCLUSION_STRIKES - 1]?.at;
    if (!at) continue;
    for (const receipt of receipts) {
      const isRole = Array.isArray(receipt.producers) && receipt.producers.length ? 'critic' : 'producer';
      if (isRole !== role || String(receipt.started_at) <= String(at)) continue;
      if (!(receipt.hard_excluded_models ?? []).includes(model)) violations.push(`${role} receipt ${receipt.started_at} does not name ${model}`);
    }
  }
  check(`a route with ${HARD_EXCLUSION_STRIKES} own answers stays out of every later ${role} receipt`,
    violations.length ? 'FAIL' : 'PASS',
    `${hardened.length} hardened route(s) for ${role}: ${hardened.join(', ') || 'none'}`);
}

// A cross-check that does not trust the field at all: reclassify from the reason and compare.
const reclassified = records.map((r) => ({ ...r, failure: r.failure === 'content' ? 'content' : workerFailureClass(r.reason) }));
for (const role of ['producer', 'critic']) {
  const written = hardExcludedWorkerModels(records, { role }).sort();
  const derived = hardExcludedWorkerModels(reclassified, { role }).sort();
  check(`the ${role} hard-exclusion set the run wrote matches the one its reasons imply`,
    JSON.stringify(written) === JSON.stringify(derived) ? 'PASS' : 'FAIL', `written [${written}] vs derived [${derived}]`);
}

const passed = checks.filter((c) => c.verdict === 'PASS').length;
const failed = checks.filter((c) => c.verdict === 'FAIL').length;
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'verification.json'), JSON.stringify({ run_dir: runDir, checked_at: new Date().toISOString(), passed, failed, checks }, null, 2));
for (const c of checks) console.log(`${c.verdict.padEnd(12)} ${c.name} — ${c.detail}`);
console.log(`\n${passed}/${checks.length} pass, ${failed} fail${checks.some((c) => c.verdict === 'INCONCLUSIVE') ? ', some INCONCLUSIVE (this run does not exercise D254)' : ''}`);
console.log(`receipt: ${join(outDir, 'verification.json')}`);
process.exitCode = failed ? 1 : 0;
