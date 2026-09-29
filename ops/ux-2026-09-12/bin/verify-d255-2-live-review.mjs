#!/usr/bin/env node
// D255.2 acceptance: a withheld DesignArena board must pass the daily live review, and every way of
// faking one must still fail it.
//
// Replays `reviewLive` against a real run's *own captures* — it reads no live source and costs
// DesignArena nothing. Pass a run directory, or nothing to take the newest run that carries a
// board-inconsistency determination.
//
//   node ops/ux-2026-09-12/bin/verify-d255-2-live-review.mjs [runDir] [outDir]
//
// Clear the out dir before running: a crashed run leaves the previous verification.json behind.
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { reviewLive } from '../../../ops/daily/review-live.mjs';

const RUNS = '/opt/benchmarkheaven-daily/runs';
const SIDECAR = 'designarena-board-inconsistency.json';

async function newestWithheldRun() {
  const entries = (await readdir(RUNS)).filter((name) => /^\d{4}-\d{2}-\d{2}T/.test(name)).sort().reverse();
  for (const name of entries) if (existsSync(join(RUNS, name, 'sources', SIDECAR))) return join(RUNS, name);
  throw new Error('no run under ' + RUNS + ' carries a board-inconsistency determination');
}

const checks = [];
const record = (name, ok, detail) => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`); };

/** Run the review over a copy of the run, after `mutate` has had a chance to change the copy. */
async function replay(label, runDir, mutate) {
  const scratch = await mkdtemp(join(tmpdir(), 'd255-2-'));
  const copy = join(scratch, 'run');
  await cp(runDir, copy, { recursive: true, dereference: false, force: true, filter: (p) => !/\/work\/node_modules(\/|$)/.test(p) });
  const rawDir = join(copy, 'work', 'data', 'raw');
  try {
    if (mutate) await mutate({ runDir: copy, rawDir });
    const { report } = await reviewLive({ runDir: copy, rawDir, batchSize: 10, maxPacketBytes: 50000, write: false });
    return { ok: true, report };
  } catch (error) {
    return { ok: false, message: error.message };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

const runDir = resolve(process.argv[2] && !process.argv[2].startsWith('-') ? process.argv[2] : await newestWithheldRun());
const outDir = resolve(process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/d255-2-live-review');
await mkdir(outDir, { recursive: true });
console.log(`run: ${runDir}`);

// 1. The real run passes, and the report names the withholding rather than hiding it.
const live = await replay('withheld run', runDir, null);
record('the withheld run passes the live review', live.ok, live.ok ? '' : live.message);
const withheld = live.report?.datasets?.da?.withheld ?? null;
record('the review report names the withheld board', Boolean(withheld?.boards?.length),
  withheld ? `retained ${withheld.retained_collected_at}, boards ${withheld.boards.map((b) => `${b.board}(${b.contradicted.join('+')})`).join(', ')}` : 'absent');
record('retained.designarena_board carries the same determination',
  live.report?.retained?.designarena_board?.retained_collected_at === withheld?.retained_collected_at,
  JSON.stringify(live.report?.retained?.designarena_board?.retained_collected_at ?? null));
record('no DesignArena row is presented to the critic as freshly sourced',
  !live.report?.datasets?.da?.registry_models && !(live.report?.coverage?.required_rows === undefined),
  `covered rows ${live.report?.coverage?.covered_rows}`);

// 2. The control: without the determination this run fails exactly as it did before D255.2.
const noSidecar = await replay('no sidecar', runDir, ({ runDir: copy }) => rm(join(copy, 'sources', SIDECAR), { force: true }));
record('without the determination the same run fails, as it did before this change',
  !noSidecar.ok && /da \w+ leaderboard rows mismatch/.test(noSidecar.message || ''), (noSidecar.message || 'it passed').slice(0, 140));

// 3. A determination cannot cover a withdrawal the registry corroborates.
const corroborated = await replay('registry corroborates', runDir, async ({ runDir: copy }) => {
  // Make the registry disown one contradicted identity: that absence becomes a real withdrawal.
  const manifest = (await readFile(join(copy, 'sources', 'live-manifest.jsonl'), 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const reg = manifest.filter((r) => r.url.endsWith('/api/registry')).at(-1);
  const { gunzipSync, gzipSync } = await import('node:zlib');
  const { createHash } = await import('node:crypto');
  const body = JSON.parse(gunzipSync(await readFile(join(copy, 'sources', `${reg.sha256}.gz`))).toString('utf8'));
  const victim = Object.keys(body.models).find((id) => id === 'kimi-k3') ?? Object.keys(body.models)[0];
  body.models[victim].active = false;
  const text = JSON.stringify(body);
  const sha = createHash('sha256').update(text).digest('hex');
  await writeFile(join(copy, 'sources', `${sha}.gz`), gzipSync(Buffer.from(text)));
  reg.sha256 = sha; reg.file = join(copy, 'sources', `${sha}.gz`);
  await writeFile(join(copy, 'sources', 'live-manifest.jsonl'), manifest.map((r) => JSON.stringify(r)).join('\n') + '\n');
});
record('an absence the registry corroborates still fails closed',
  !corroborated.ok && /corroborates/.test(corroborated.message || ''), (corroborated.message || 'it passed').slice(0, 160));

// 4. A withheld board may not differ by one byte from the snapshot the run started from.
const edited = await replay('staged board edited', runDir, async ({ rawDir }) => {
  const staged = JSON.parse(await readFile(join(rawDir, 'designarena.json'), 'utf8'));
  const key = Object.keys(staged.leaderboards)[0];
  staged.leaderboards[key].data[0].elo += 1;
  await writeFile(join(rawDir, 'designarena.json'), JSON.stringify(staged, null, 1) + '\n');
});
record('a withheld board edited by one value fails closed',
  !edited.ok && /equals the snapshot this run started from/.test(edited.message || ''), (edited.message || 'it passed').slice(0, 140));

// 5. A withheld board may not claim this run's freshness.
const redated = await replay('staged board redated', runDir, async ({ rawDir }) => {
  const staged = JSON.parse(await readFile(join(rawDir, 'designarena.json'), 'utf8'));
  staged.collected_at = new Date().toISOString().slice(0, 10);
  await writeFile(join(rawDir, 'designarena.json'), JSON.stringify(staged, null, 1) + '\n');
});
record('a withheld board redated to today fails closed',
  !redated.ok && /equals the snapshot this run started from|claims this run's freshness/.test(redated.message || ''),
  (redated.message || 'it passed').slice(0, 140));

// 6. The determination cannot name a board the capture does not actually contradict.
const overclaimed = await replay('determination overclaims', runDir, async ({ runDir: copy }) => {
  const record_ = JSON.parse(await readFile(join(copy, 'sources', SIDECAR), 'utf8'));
  record_.boards[0].contradicted.push({ id: 'a-model-that-never-ran', display_name: 'Invented', active: true, category: record_.boards[0].category });
  await writeFile(join(copy, 'sources', SIDECAR), JSON.stringify(record_, null, 1) + '\n');
});
record('a determination that names an identity the capture does not show fails closed',
  !overclaimed.ok && /contradicted identities/.test(overclaimed.message || ''), (overclaimed.message || 'it passed').slice(0, 140));

const passed = checks.filter((c) => c.ok).length;
await writeFile(join(outDir, 'verification.json'), JSON.stringify({
  check: 'D255.2 — a withheld DesignArena board passes the daily live review, and every fake still fails it',
  run_dir: runDir, generated_at: new Date().toISOString(), passed, total: checks.length, checks,
}, null, 1) + '\n');
console.log(`\n${passed}/${checks.length} — ${join(outDir, 'verification.json')}`);
process.exitCode = passed === checks.length ? 0 : 1;
