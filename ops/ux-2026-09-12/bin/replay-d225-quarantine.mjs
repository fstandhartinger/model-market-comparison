#!/usr/bin/env node
// F-209 / D225 acceptance: replay a board's unreviewed protocol revision against real captured bytes
// and show that the arm is quarantined while the day survives.
//
//   node ops/ux-2026-09-12/bin/replay-d225-quarantine.mjs <outDir>
//     [--capture DIR]   the run capture directory whose board bytes are replayed
//                       (default: the failed 2026-09-27T00-41 run's own capture)
//     [--board ID]      registry/plan id of the board (default vulcanbench-frontier::4)
//
// What it does, all deterministic (no model call anywhere):
//   A  the arm, on the bytes that broke the day: the collector is run against the failed run's own
//      board capture twice — once with the registry's reviewed set as it stood *before* D223 reviewed
//      v3.15 (the world at 00:54 UTC), once with the reviewed set as it stands now. Before: the arm
//      quarantines and names the unreviewed revision and the reviewed set. Now: it collects normally.
//      So the fence is exactly the reviewed sentence, on the bytes themselves.
//   B  the fence still bites on a revision nobody reviewed: the same capture with one extra row at an
//      invented revision quarantines against today's registry too, and the quarantine record it writes
//      withholds exactly that capture.
//   C  the day survives: with the quarantine record in place the repo-level continuity suite reads the
//      newest *accepted* board capture and is green; with the record removed the same tree reproduces
//      the 2026-09-27 failure. That A/B is the whole point of the directive.
//   D  it is visible: source-health names the arm on every quarantined run and the notify human-action
//      block renders on the third.
//
// Run it from a scratch worktree: part C writes an evidence directory into the tree it runs in.
import { readFile, writeFile, mkdir, cp, rm, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseQuarantine, quarantineCheck, reviewedProtocols } from '../../../lib/source-quarantine.mjs';
import { sourceHealth, healthMarkdown } from '../../daily/source-health.mjs';
import { quarantineHumanTodo } from '../../daily/policy.mjs';

const exec = promisify(execFile);
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') !== true) ?? args[0];
if (!OUT || OUT.startsWith('--')) { console.error('usage: replay-d225-quarantine.mjs <outDir> [--capture DIR] [--board ID]'); process.exit(2); }
const CAPTURE = flag('--capture', '/opt/benchmarkheaven-daily/runs/2026-09-27T00-41-02-535Z-3199320/work/data/raw/benchmarks/daily-evidence/2026-09-27T00-54-53-549Z');
const BOARD = flag('--board', 'vulcanbench-frontier::4');
const EVIDENCE = 'data/raw/benchmarks/daily-evidence';
await mkdir(OUT, { recursive: true });

const checks = [];
const check = (scope, name, ok, detail) => {
  checks.push({ scope, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scope} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));

// ------------------------------------------------------------------ the bytes and the plan entry
const plan = await json(join(EVIDENCE, '..', 'collection-plan.json'));
const spec = plan.entries.find((entry) => entry.benchmark_id === BOARD);
if (!spec) throw new Error(`no plan entry for ${BOARD}`);
const manifest = await json(join(CAPTURE, 'manifest.json'));
const receipt = manifest.find((r) => r.status === 200 && r.url === spec.source.url);
if (!receipt) throw new Error(`the replayed capture has no 200 receipt for ${spec.source.url}`);
const boardBytes = gunzipSync(await readFile(join(CAPTURE, receipt.file.split('/').pop())));
check('capture', 'the replayed board capture is the one the failed run took', sha(boardBytes.length ? gzipSync(boardBytes) : boardBytes) !== null && receipt.sha256 === sha(boardBytes),
  { url: receipt.url, sha256: receipt.sha256, retrieved_at: receipt.retrieved_at, bytes: boardBytes.length });

/** Run the real collector over one plan entry against given bytes, with the registry on disk. */
async function collect(bytes, label) {
  const dir = join(OUT, `collect-${label}`);
  await mkdir(dir, { recursive: true });
  const file = join(dir, 'board.gz');
  await writeFile(file, gzipSync(bytes));
  const source = { ...spec.source, file, sha256: sha(bytes), retrieved_at: receipt.retrieved_at };
  const one = structuredClone(spec); one.source = source;
  await writeFile(join(dir, 'plan.json'), JSON.stringify({ schema_version: 1, entries: [one] }));
  try {
    await exec('python3', ['ops/daily/public-candidate.py', join(dir, 'plan.json'), join(dir, 'candidate.json')],
      { timeout: 60_000, maxBuffer: 4_000_000 });
    const { candidate } = await json(join(dir, 'candidate.json'));
    return { ok: true, rows: candidate.observations.length, protocols: [...new Set(candidate.observations
      .map((row) => /source row: (\{.*?\})(?:;|$)/.exec(row.protocol)).filter(Boolean)
      .map((m) => JSON.parse(m[1]).protocol))].sort() };
  } catch (error) {
    await writeFile(join(dir, 'error.txt'), String(error.message));
    return { ok: false, error, quarantine: parseQuarantine(error) };
  }
}

const registryPath = join(EVIDENCE, '..', 'registry.json');
const registry = await json(registryPath);
const entry = registry.entries.find((e) => e.id === BOARD);
const reviewedNow = reviewedProtocols(entry.how_to_collect.version_guard);

// ---------------------------------------------------------- A · the arm, on the bytes that broke the day
// The reviewed set as it stood before D223: the same sentence with the revision D223 added removed
// again. Read out of git rather than retyped, so the replay cannot quietly test a set nobody had.
const beforeRegistry = JSON.parse((await exec('git', ['show', '261be5fd^:data/raw/benchmarks/registry.json'],
  { maxBuffer: 64_000_000 })).stdout);
const reviewedBefore = reviewedProtocols(beforeRegistry.entries.find((e) => e.id === BOARD).how_to_collect.version_guard);
check('A', 'the pre-D223 reviewed set is the one the failed run had', reviewedBefore?.length === 4
  && !reviewedBefore.includes('code-quality-maintenance-v3.15'), reviewedBefore);

const swapRegistry = async (value) => writeFile(registryPath, JSON.stringify(value, null, 1) + '\n');
const original = await readFile(registryPath, 'utf8');
let before, now;
try {
  await swapRegistry(beforeRegistry);
  before = await collect(boardBytes, 'pre-d223');
  await writeFile(registryPath, original);
  now = await collect(boardBytes, 'today');
} finally { await writeFile(registryPath, original); }

check('A', 'the arm quarantines on the failed run\'s own bytes, naming the unreviewed revision',
  !before.ok && before.quarantine?.entry === BOARD
  && before.quarantine.unreviewed.includes('code-quality-maintenance-v3.15'),
  before.quarantine ?? String(before.error?.message ?? '').slice(-300));
check('A', 'the reason names the reviewed set and what happened to the data',
  /published rows are unchanged/.test(before.quarantine?.reason ?? '')
  && /every other source still publishes/.test(before.quarantine?.reason ?? '')
  && reviewedBefore.every((p) => before.quarantine.reason.includes(p)), before.quarantine?.reason);
check('A', 'it is a quarantine, not a failed arm', quarantineCheck(before.quarantine ?? { entry: BOARD, unreviewed: [], reviewed: [] }).status === 'source_changed_retained',
  quarantineCheck(before.quarantine ?? { entry: BOARD, unreviewed: [], reviewed: [] }).status);
check('A', 'the same bytes collect normally once the revision is reviewed', now.ok && now.rows > 0
  && now.protocols.includes('code-quality-maintenance-v3.15'), { rows: now.rows, protocols: now.protocols, error: now.ok ? null : String(now.error?.message ?? '').slice(-200) });

// ---------------------------------------------------------- B · the fence still bites on an invented revision
const INVENTED = 'code-quality-maintenance-v3.16';
const lines = boardBytes.toString().trim().split('\n');
const mutated = Buffer.from([...lines, lines.at(-1).replace(/,[^,]*$/, `,${INVENTED}`)
  .replace(/^(\d+),([^,]*)/, (_, rank, model) => `${Number(rank) + 1},Invented Probe Model`)].join('\n') + '\n');
const probe = await collect(mutated, 'invented');
check('B', 'an invented revision quarantines the arm against today\'s registry too',
  !probe.ok && probe.quarantine?.unreviewed.includes(INVENTED)
  && probe.quarantine.reviewed.join(',') === reviewedNow.join(','),
  probe.quarantine ?? String(probe.error?.message ?? '').slice(-300));

// ---------------------------------------------------------- C · the day survives the quarantine
// The mutated capture is written into the tree as the newest evidence directory, with the quarantine
// record the collector writes beside it. With the record, the continuity suite reads the newest
// *accepted* capture and passes; without it, the tree reproduces the 2026-09-27 failure.
const probeDir = join(EVIDENCE, '2026-09-27T23-59-59-999Z-d225-replay');
const runSuite = async () => {
  const result = await exec('node', ['--test', 'test/d188-protocol-notes-match-source.test.mjs'],
    { env: { ...process.env, CI: 'true' }, maxBuffer: 16_000_000 }).then(
    (r) => ({ ok: true, out: r.stdout }), (e) => ({ ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }));
  return result;
};
let withRecord, withoutRecord;
try {
  await mkdir(probeDir, { recursive: true });
  await writeFile(join(probeDir, 'probe-board.gz'), gzipSync(mutated));
  const probeReceipt = { url: spec.source.url, method: 'GET', status: 200,
    file: `${probeDir}/probe-board.gz`, sha256: sha(mutated), bytes: mutated.length,
    retrieved_at: '2026-09-27T23:59:59.000000+00:00', final_url: spec.source.url };
  await writeFile(join(probeDir, 'manifest.json'), JSON.stringify([probeReceipt], null, 1));
  const record = { schema_version: 1, generated_at: new Date().toISOString(), day: '2026-09-27',
    arms: [{ id: BOARD, reason: probe.quarantine.reason, unreviewed_protocols: probe.quarantine.unreviewed,
      reviewed_protocols: probe.quarantine.reviewed, captures: [spec.source.url] }] };
  await writeFile(join(probeDir, 'quarantine.json'), JSON.stringify(record, null, 1));
  withRecord = await runSuite();
  await rm(join(probeDir, 'quarantine.json'));
  withoutRecord = await runSuite();
} finally { await rm(probeDir, { recursive: true, force: true }); }

check('C', 'with the quarantine record the continuity suite is green — the day is not lost',
  withRecord.ok, withRecord.out.split('\n').filter((l) => /^not ok|✖|AssertionError/.test(l)).slice(0, 3).join(' | '));
check('C', 'without it the same tree reproduces the 2026-09-27 failure',
  !withoutRecord.ok && /notes claim|protocol/i.test(withoutRecord.out),
  withoutRecord.out.split('\n').filter((l) => /notes claim|✖|not ok/.test(l)).slice(0, 2).join(' | '));
await writeFile(join(OUT, 'suite-with-record.log'), withRecord.out);
await writeFile(join(OUT, 'suite-without-record.log'), withoutRecord.out);

// ---------------------------------------------------------- D · it is visible, and it escalates
const armCheck = quarantineCheck(probe.quarantine, { rows: 28 });
const runs = (n) => Array.from({ length: 3 }, (_, i) => ({ checked_at: `2026-09-2${7 - i}T05:17:00.000Z`,
  checks: [i < n ? armCheck : { id: BOARD, status: 'candidate', rows: 28 }, { id: 'other::1', status: 'candidate', rows: 3 }] }));
const health1 = sourceHealth(runs(1)), health3 = sourceHealth(runs(3));
check('D', 'source-health names the arm and its reason on the first quarantined run',
  health1.quarantined_arms.length === 1 && health1.quarantined_arms[0].consecutive_quarantined_runs === 1
  && healthMarkdown(health1).includes(`${BOARD} quarantined`) && healthMarkdown(health1).includes(INVENTED),
  health1.quarantined_arms);
check('D', 'the arm is attention, not a failing source (every other arm published)',
  health1.sources.find((s) => s.id === BOARD)?.kind === 'attention'
  && health1.sources.find((s) => s.id === BOARD)?.consecutive_failed_runs === 0,
  health1.sources.find((s) => s.id === BOARD));
const todo = quarantineHumanTodo(health3.quarantined_arms);
check('D', 'the third consecutive quarantined run raises the human-action block',
  health3.quarantined_arms[0].consecutive_quarantined_runs === 3 && health3.quarantined_arms[0].escalate === true
  && !!todo && todo.text.startsWith('🧑 DU BIST DRAN') && todo.text.includes(INVENTED) && todo.text.includes('version_guard'),
  { streak: health3.quarantined_arms[0].consecutive_quarantined_runs, key: todo?.key ?? null });
await writeFile(join(OUT, 'source-health-run1.md'), healthMarkdown(health1));
await writeFile(join(OUT, 'source-health-run3.md'), healthMarkdown(health3));
if (todo) await writeFile(join(OUT, 'human-todo.txt'), todo.text + '\n');
// The format `~/bin/notify` accepts is its own judgement, not ours: ask it.
const notifyBin = process.env.BH_NOTIFY || `${process.env.HOME}/bin/notify`;
const dry = await exec(notifyBin, ['now', '--dry-run', todo?.text ?? ''], { timeout: 60_000, maxBuffer: 4_000_000 })
  .then((r) => ({ ok: true, out: r.stdout }), (e) => ({ ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }));
await writeFile(join(OUT, 'notify-dry-run.log'), dry.out);
check('D', 'notify --dry-run accepts the human-action block', dry.ok && /DRY RUN/.test(dry.out),
  dry.out.split('\n').slice(-3).join(' | '));

// ------------------------------------------------------------------------------- receipt
const passed = checks.filter((c) => c.ok).length;
await writeFile(join(OUT, 'verification.json'), JSON.stringify({
  generated_at: new Date().toISOString(), board: BOARD, capture: CAPTURE,
  capture_sha256: receipt.sha256, reviewed_before: reviewedBefore, reviewed_now: reviewedNow,
  invented_revision: INVENTED, passed, total: checks.length, checks }, null, 2) + '\n');
console.log(`\n${passed}/${checks.length} checks`);
process.exit(passed === checks.length ? 0 : 1);
