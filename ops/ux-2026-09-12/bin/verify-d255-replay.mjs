#!/usr/bin/env node
// D255 acceptance: replay the real 2026-09-29 DesignArena responses through the collector and the
// daily's retention decision, against the board snapshot the 00:41 run held. Offline by design — it
// reads retained captures, never the live source, so it is falsifiable on any box and costs the
// source nothing.
//
//   node ops/ux-2026-09-12/bin/verify-d255-replay.mjs [captureDir] [outDir]
//
// captureDir defaults to /opt/benchmarkheaven/state/ux-evidence/iter271-designarena and must hold
// probe-run-0041-frontend.json, probe-fullstack.json and probe-registry.json.
// Clear the out dir before re-running: a crashed run leaves the previous verification.json behind.
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BOARD_REGISTRY_INCONSISTENT } from '../../../lib/live-source.mjs';
import { readDesignArenaInconsistency } from '../../daily/daily.mjs';

const ROOT = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const captureDir = resolve(process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter271-designarena');
const outDir = resolve(process.argv[3] || join(captureDir, 'replay'));

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: Boolean(ok), detail: String(detail ?? '') }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

const json = async (file) => JSON.parse(await readFile(join(captureDir, file), 'utf8'));

async function main() {
  await mkdir(outDir, { recursive: true });
  const frontend = await json('probe-run-0041-frontend.json');
  const fullstack = await json('probe-fullstack.json');
  const registry = await json('probe-registry.json');
  const prior = JSON.parse(await readFile(join(ROOT, 'data/raw/designarena.json'), 'utf8'));

  const priorFrontend = prior.leaderboards.frontend.data.map((r) => r.modelId);
  const priorFullstack = prior.leaderboards.fullstack.data.map((r) => r.modelId);
  const nowFrontend = new Set(frontend.data.map((r) => r.modelId));
  const nowFullstack = new Set(fullstack.data.map((r) => r.modelId));
  const missingFrontend = priorFrontend.filter((id) => !nowFrontend.has(id));
  const missingFullstack = priorFullstack.filter((id) => !nowFullstack.has(id));

  check('the replayed captures still reproduce the defect (rows absent from both boards)',
    missingFrontend.length && missingFullstack.length, `frontend ${missingFrontend.join(', ')} | fullstack ${missingFullstack.join(', ')}`);
  check('every absent identity is still served as active by the source\'s own registry for that board',
    [...missingFrontend.map((id) => [id, 'agon_webapps']), ...missingFullstack.map((id) => [id, 'fullstack'])]
      .every(([id, category]) => registry.models?.[id]?.active === true && (registry.models[id].arenas?.agents || []).includes(category)),
    missingFrontend.concat(missingFullstack).map((id) => `${id} active=${registry.models?.[id]?.active}`).join('; '));
  check('the boards are live, not truncated: the source dates its own recompute and its vote total grew',
    frontend.metadata?.lastUpdateTime && Number(frontend.metadata?.totalVotes) > 0,
    `lastUpdateTime ${frontend.metadata?.lastUpdateTime}, totalVotes ${frontend.metadata?.totalVotes}`);

  // Replay the collector over the retained bodies in a disposable checkout.
  const directory = await mkdtemp(join(tmpdir(), 'bh-d255-replay-'));
  try {
    await cp(join(ROOT, 'lib'), join(directory, 'lib'), { recursive: true });
    await mkdir(join(directory, 'scripts'));
    for (const file of ['fetch-live.mjs', 'fetch-aa-efficiency.mjs']) await cp(join(ROOT, 'scripts', file), join(directory, 'scripts', file));
    await mkdir(join(directory, 'data/raw'), { recursive: true });
    await cp(join(ROOT, 'data/source-policies.json'), join(directory, 'data/source-policies.json'));
    const priorBytes = await readFile(join(ROOT, 'data/raw/designarena.json'));
    await writeFile(join(directory, 'data/raw/designarena.json'), priorBytes);
    const hook = join(directory, 'replay-fetch.mjs');
    await writeFile(hook, `const bodies=${JSON.stringify({ agon_webapps: frontend, fullstack })};const registry=${JSON.stringify(registry)};
globalThis.fetch=async(url,opts={})=>{url=String(url);
if(url.endsWith('/api/registry'))return Response.json(registry);
const body=JSON.parse(opts.body||'{}');const served=bodies[body.category];
if(!served)return new Response('no such board',{status:404});
return Response.json(served);};`);
    const evidence = join(directory, 'evidence');
    await mkdir(evidence);
    const run = spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'da'],
      { cwd: directory, encoding: 'utf8', timeout: 60_000, env: { ...process.env, BH_EVIDENCE_DIR: evidence } });
    await writeFile(join(outDir, 'collector-replay.log'), `status ${run.status}\n\n${run.stdout}\n${run.stderr}`);

    check('the collector refuses the capture and names the determination', run.status === 1 && new RegExp(BOARD_REGISTRY_INCONSISTENT).test(run.stderr), `exit ${run.status}`);
    check('the previously published board survives byte-for-byte',
      (await readFile(join(directory, 'data/raw/designarena.json'))).equals(priorBytes), `retained collected_at ${prior.collected_at}`);

    let record = null;
    try { record = JSON.parse(await readFile(join(evidence, 'designarena-board-inconsistency.json'), 'utf8')); } catch { /* reported below */ }
    await writeFile(join(outDir, 'sidecar.json'), JSON.stringify(record, null, 2) + '\n');
    const named = (record?.boards ?? []).flatMap((b) => b.contradicted.map((c) => `${b.board}:${c.id}`));
    check('the sidecar names every contradicted identity, per board',
      named.length === missingFrontend.length + missingFullstack.length
      && missingFrontend.every((id) => named.includes(`frontend:${id}`))
      && missingFullstack.every((id) => named.includes(`fullstack:${id}`)), named.join(', '));
    check('the sidecar records the date the run keeps publishing', record?.retained_collected_at === prior.collected_at, String(record?.retained_collected_at));

    // The daily's half: the same three conditions it checks before withholding anything.
    const runDir = join(directory, 'run'), work = join(directory, 'stage');
    await mkdir(join(runDir, 'before/raw'), { recursive: true });
    await mkdir(join(work, 'data/raw'), { recursive: true });
    await writeFile(join(runDir, 'before/raw/designarena.json'), priorBytes);
    await writeFile(join(work, 'data/raw/designarena.json'), priorBytes);
    const error = new Error(run.stderr);
    const retained = await readDesignArenaInconsistency({ sourcesDir: evidence, runDir, work, error });
    check('the daily recognises it and withholds only this source', Boolean(retained), retained?.reason?.slice(0, 180) ?? 'not recognised');

    await writeFile(join(work, 'data/raw/designarena.json'), Buffer.concat([priorBytes, Buffer.from('\n')]));
    check('a capture that did land is not a withheld capture', (await readDesignArenaInconsistency({ sourcesDir: evidence, runDir, work, error })) === null);
    await writeFile(join(work, 'data/raw/designarena.json'), priorBytes);
    check('any other failure of the same step still fails the run closed',
      (await readDesignArenaInconsistency({ sourcesDir: evidence, runDir, work, error: new Error('fetch-da FAILED: HTTP 503 for https://www.designarena.ai/api/leaderboard') })) === null);
  } finally { await rm(directory, { recursive: true, force: true }); }

  const passed = checks.filter((c) => c.ok).length;
  await writeFile(join(outDir, 'verification.json'), JSON.stringify({
    verifier: 'verify-d255-replay', capture_dir: captureDir, ran_at: new Date().toISOString(),
    passed, total: checks.length, checks,
  }, null, 2) + '\n');
  console.log(`\n${passed}/${checks.length}`);
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(2); });
