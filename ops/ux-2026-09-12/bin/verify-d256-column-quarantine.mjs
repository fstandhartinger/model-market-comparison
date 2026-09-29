#!/usr/bin/env node
// D256 acceptance: replay the real 2026-09-29 board capture — the one that turned `npm test` red and
// would have lost the day at 05:17 — and show that an appended column quarantines its own arm while
// every repo-level continuity suite that reads that board stays green.
//
//   node ops/ux-2026-09-12/bin/verify-d256-column-quarantine.mjs <outDir>
//     [--capture DIR]   evidence directory whose board bytes are replayed
//     [--board ID]      registry/plan id of the board (default vulcanbench-frontier::4)
//
// No model call, no network: everything below is the run's own captured bytes.
//   1  the bytes themselves: the board capture that broke the day carries the two appended columns,
//      every reviewed column unchanged and in order. Derived from the capture, not asserted.
//   2  the collector quarantines that capture instead of failing the arm, and names the columns.
//   3  the control: with the appended columns removed from the same bytes, the arm collects normally —
//      so the fence is the columns, not the capture.
//   4  a renamed, a reordered and a removed column each stay a hard failure. The quarantine is one
//      class of header change, not "any header change is tolerated now".
//   5  the day survives: with a quarantine record beside the capture, the two suites that read this
//      board are green; with the record removed the same tree reproduces the 2026-09-29 failures.
//      That A/B is the whole claim. The record withholds **exactly the arm's own capture set**, derived
//      the way `refresh-benchmarks.mjs` derives `armCaptures` — `spec.source`, the five typed parser
//      sub-source keys and `parser.runs`. Withholding every capture of the host instead (which this
//      script did when first written) made the check pass while the real run would still have failed:
//      `leaderboard.html` belongs to no arm, so a quarantine cannot withhold it, and the guard's date
//      annotation is checked against it.
//   6  it is visible: source-health names the arm and the column on every quarantined run, and the
//      notify human-action block renders on the third with the repair it actually needs.
import { readFile, writeFile, mkdir, rm, readdir, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseQuarantine, quarantineCheck, reviewedProtocols, unreviewedFacts } from '../../../lib/source-quarantine.mjs';
import { sourceHealth, healthMarkdown, isQuarantine } from '../../daily/source-health.mjs';
import { quarantineHumanTodo } from '../../daily/policy.mjs';

const exec = promisify(execFile);
const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = args[0];
if (!OUT || OUT.startsWith('--')) { console.error('usage: verify-d256-column-quarantine.mjs <outDir> [--capture DIR] [--board ID]'); process.exit(2); }
const CAPTURE = flag('--capture', '/opt/benchmarkheaven-daily/runs/2026-09-29T02-33-18-119Z-2827687/work/data/raw/benchmarks/daily-evidence/2026-09-29T02-46-12-668Z');
const BOARD = flag('--board', 'vulcanbench-frontier::4');
const EVIDENCE = 'data/raw/benchmarks/daily-evidence';
const COLLECTOR = 'scripts/collect-public-benchmarks.py';
await mkdir(OUT, { recursive: true });

const checks = [];
const check = (n, name, ok, detail) => {
  checks.push({ n, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${n} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');

// ------------------------------------------------------------------ 1. the bytes that broke the day
const plan = await json(`${EVIDENCE}/../collection-plan.json`);
const spec = plan.entries.find((entry) => entry.benchmark_id === BOARD);
if (!spec) throw new Error(`no plan entry for ${BOARD}`);
const manifest = await json(join(CAPTURE, 'manifest.json'));
// Manifest paths are repo-relative to the checkout the run used, so they resolve against that run's
// work root — everything above `data/raw/benchmarks/daily-evidence/<dir>` in the capture path.
const WORK = CAPTURE.replace(/\/data\/raw\/benchmarks\/daily-evidence\/[^/]+\/?$/, '');
const at = (file) => (file.startsWith('/') ? file : join(WORK, file));
const receipt = manifest.find((r) => r.status === 200 && r.url === spec.source.url);
if (!receipt) throw new Error(`the replayed capture has no 200 receipt for ${spec.source.url}`);
const bytes = gunzipSync(await readFile(at(receipt.file)));
const text = bytes.toString('utf8');
const seen = text.trim().split('\n')[0].split(',');
// The reviewed header is the recipe's own, read out of the collector rather than retyped here.
const reviewed = JSON.parse((await exec('python3', ['-c', `
import re,json
src=open('${COLLECTOR}').read()
m=re.search(r"header=(\\[[^\\]]*\\])\\n",src)
print(json.dumps(eval(m.group(1))))`])).stdout.trim());
const appended = seen.slice(reviewed.length);
// The daily-evidence manifest hashes the *decompressed body* (the registry's own evidence records
// hash the `.gz` — two different conventions in one repo, so this re-derives rather than assumes).
// A capture whose bytes no longer match its receipt is not evidence of anything.
check(1, 'the replayed capture matches the digest its own receipt records',
  sha(bytes) === receipt.sha256 && bytes.length === receipt.bytes,
  { file: receipt.file, recorded: receipt.sha256, recomputed: sha(bytes), bytes: bytes.length, recorded_bytes: receipt.bytes });
check(1, 'every reviewed column is unchanged and in order', JSON.stringify(seen.slice(0, reviewed.length)) === JSON.stringify(reviewed),
  { seen: seen.slice(0, reviewed.length), reviewed });
check(1, 'the board appended columns the registry has not reviewed', appended.length > 0, { appended });

// ------------------------------------------------------------------ 2/3/4. the collector, on those bytes
const registry = await json('data/raw/benchmarks/registry.json');
const entry = registry.entries.find((e) => e.id === BOARD);
// The CSV goes through a temp file, not stdin: `execFile` has no `input` option, so a child that
// reads stdin simply blocks for ever (the same shape as a tool waiting on an open pipe).
const parseWith = async (csvText, withEntry = true) => {
  const path = join(OUT, `probe-${createHash('sha256').update(csvText).digest('hex').slice(0, 12)}.csv`);
  await writeFile(path, csvText);
  return exec('python3', ['-c', `
import importlib.util,json
spec=importlib.util.spec_from_file_location('c','${COLLECTOR}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
reg=json.load(open('data/raw/benchmarks/registry.json'))
entry=[e for e in reg['entries'] if e['id']=='${BOARD}'][0] if ${withEntry ? 'True' : 'False'} else None
rows=m.parse(open(${JSON.stringify(path)},encoding='utf-8').read(),{'kind':'${spec.parser.kind}'},None,entry)
print(json.dumps(len(rows)))`], { maxBuffer: 16_000_000 });
};

const live = await parseWith(text).then(() => null, (e) => e);
const quarantine = live && parseQuarantine(live);
check(2, 'the capture quarantines the arm instead of failing it', !!quarantine,
  quarantine ?? String(live?.message ?? 'the capture parsed').slice(-300));
check(2, 'the quarantine names the appended columns and nothing else', !!quarantine
  && JSON.stringify(quarantine.columns) === JSON.stringify([...appended].sort())
  && quarantine.unreviewed.length === 0, { columns: quarantine?.columns, appended: [...appended].sort() });
check(2, 'the reason says the published rows are unchanged and other sources publish',
  /published rows are unchanged/.test(quarantine?.reason ?? '') && /every other source still publishes/.test(quarantine?.reason ?? ''),
  quarantine?.reason);

// The control has to isolate the column change, because this capture trips *two* independent fences:
// the board appended two columns and shipped a sixteenth protocol revision (GPT-6 Luna) in the same
// push. So: cut the columns away and the unreviewed revision's rows with them, and the arm collects;
// cut only the columns and it quarantines on the revision, naming no column. Two fences, one arm.
const cutColumns = (body) => body.trim().split('\n')
  .map((line) => line.split(',').slice(0, reviewed.length).join(',')).join('\n');
const protocolColumn = reviewed.indexOf('protocol');
const unreviewedRevisions = [...new Set(text.trim().split('\n').slice(1)
  .map((line) => line.split(',')[protocolColumn]))]
  .filter((p) => !(reviewedProtocols(entry.how_to_collect?.version_guard) ?? []).includes(p));
const dropRevisions = (body) => { const lines = body.trim().split('\n');
  return [lines[0], ...lines.slice(1).filter((line) => !unreviewedRevisions.includes(line.split(',')[protocolColumn]))].join('\n'); };

const controlRows = await parseWith(dropRevisions(cutColumns(text))).then((r) => JSON.parse(r.stdout.trim()), (e) => e);
check(3, 'CONTROL: columns cut away and the unreviewed revision dropped, the same bytes collect',
  Number.isInteger(controlRows) && controlRows > 0, controlRows);
const revisionOnly = await parseWith(cutColumns(text)).then(() => null, (e) => e);
const revisionQuarantine = revisionOnly && parseQuarantine(revisionOnly);
check(3, 'the two fences are independent: columns cut away, the revision alone quarantines',
  !!revisionQuarantine && JSON.stringify(revisionQuarantine.unreviewed) === JSON.stringify([...unreviewedRevisions].sort())
  && revisionQuarantine.columns.length === 0,
  { unreviewed: revisionQuarantine?.unreviewed, expected: [...unreviewedRevisions].sort(), columns: revisionQuarantine?.columns });

const mutations = [
  ['renamed', text.replace(',protocol,', ',protocol_id,')],
  ['reordered', text.replace('rank,model,', 'model,rank,')],
  ['removed', text.split('\n').map((l, i) => i === 0 ? l.replace(',mean_usd', '') : l).join('\n')],
];
for (const [why, mutated] of mutations) {
  const error = await parseWith(mutated).then(() => null, (e) => e);
  check(4, `a ${why} column is still a hard failure, not a quarantine`,
    !!error && parseQuarantine(error) === null && /CSV (header changed|row width mismatch)/.test(error.message),
    String(error?.message ?? 'parsed').slice(-200));
}

// ------------------------------------------------------------------ 5. the day survives (A/B)
// A quarantine record beside the capture is what the daily writes; the suites then read the newest
// *accepted* capture. The A/B is run against a copy of the real capture inside this tree.
const probeDir = join(EVIDENCE, `d256-probe-${Date.now()}`);
const SUITES = ['test/d188-protocol-notes-match-source.test.mjs', 'test/vulcanbench-kernelbench.test.mjs'];
const suite = async () => exec('npx', ['node', '--test', ...SUITES], { env: { ...process.env, CI: 'true' }, maxBuffer: 32_000_000 })
  .then((r) => ({ ok: true, out: r.stdout }), (e) => ({ ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }));
try {
  await mkdir(probeDir, { recursive: true });
  const copied = [];
  for (const r of manifest) {
    if (r.status !== 200 || !r.file || !/vulcanbench\.com/.test(r.url)) continue;
    const name = r.file.split('/').pop();
    await cp(at(r.file), join(probeDir, name));
    copied.push({ ...r, file: `${probeDir}/${name}` });
  }
  await writeFile(join(probeDir, 'manifest.json'), JSON.stringify(copied, null, 1));
  // `armCaptures` in refresh-benchmarks.mjs, re-derived rather than assumed: the arm owns its `source`,
  // the five typed parser sub-sources and `parser.runs`, and nothing else on the host.
  const keys = [spec.source, ...['method_source', 'categories_source', 'frontend_source', 'detail_source', 'config_source']
    .map((key) => spec.parser[key]), ...(spec.parser.runs ?? [])].filter(Boolean)
    .map((source) => (source.zip_member ? `${source.url}#zip:${source.zip_member}` : source.url));
  check(5, "the record withholds exactly the arm's own captures, not every capture of the host",
    keys.length > 0 && keys.length < copied.length && keys.includes(spec.source.url),
    { arm_captures: keys, captures_of_the_host: copied.map((r) => r.url) });
  const record = { schema_version: 1, generated_at: new Date().toISOString(), day: '2026-09-29',
    arms: [{ id: BOARD, reason: quarantine?.reason ?? '', unreviewed_protocols: [],
      unreviewed_columns: quarantine?.columns ?? [], captures: keys }] };

  await writeFile(join(probeDir, 'quarantine.json'), JSON.stringify(record, null, 1));
  const withRecord = await suite();
  check(5, 'with the quarantine record the suites that read this board are green', withRecord.ok,
    withRecord.out.split('\n').filter((l) => /^✖|AssertionError/.test(l)).slice(0, 4).join(' | '));

  await rm(join(probeDir, 'quarantine.json'));
  const withoutRecord = await suite();
  check(5, 'CONTROL: without it the same tree reproduces the 2026-09-29 failures', !withoutRecord.ok,
    withoutRecord.ok ? 'the suites passed — this replay proves nothing' : 'red as expected');
  await writeFile(join(OUT, 'suite-without-record.log'), withoutRecord.out);
  await writeFile(join(OUT, 'suite-with-record.log'), withRecord.out);
} finally { await rm(probeDir, { recursive: true, force: true }); }

// ------------------------------------------------------------------ 6. it is visible
const armCheck = quarantineCheck(quarantine ?? { entry: BOARD, unreviewed: [], columns: [], reviewed: [] }, { rows: 34 });
check(6, 'the arm is `attention` in source health, carrying the column field', isQuarantine(armCheck)
  && JSON.stringify(armCheck.unreviewed_columns) === JSON.stringify([...appended].sort()), armCheck);
const health = sourceHealth([{ checked_at: '2026-09-29T05:17:00.000Z', checks: [armCheck] }]);
const md = healthMarkdown(health);
check(6, 'the markdown names the arm and each appended column',
  new RegExp(`${BOARD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} quarantined`).test(md)
  && appended.every((column) => md.includes(column)), md.split('\n').find((l) => l.includes('quarantined')) ?? md.slice(0, 200));
const todo = quarantineHumanTodo([{ id: BOARD, consecutive_quarantined_runs: 3, unreviewed_protocols: [],
  unreviewed_columns: [...appended].sort(), quarantined_since: '2026-09-29T05:17:00.000Z' }]);
check(6, 'the third run asks a human, naming the column and the repair',
  !!todo && appended.every((column) => todo.text.includes(`column ${column}`)) && /version_guard/.test(todo.text)
  && todo.text.split('\n')[0] === '🧑 DU BIST DRAN', todo?.text?.slice(0, 300));
check(6, 'the prose fragment for a column quarantine says column, not revision',
  unreviewedFacts({ unreviewed_columns: ['passed_of'] })[0] === 'column passed_of',
  unreviewedFacts({ unreviewed_columns: ['passed_of'] }));

const passed = checks.filter((c) => c.ok).length;
await writeFile(join(OUT, 'verification.json'), JSON.stringify({ directive: 'D256',
  generated_at: new Date().toISOString(), capture: CAPTURE, board: BOARD, source_url: spec.source.url,
  capture_file: receipt.file, capture_sha256: receipt.sha256, reviewed_header: reviewed, appended_columns: appended,
  unreviewed_revisions_in_the_same_push: unreviewedRevisions,
  quarantine, checks, passed, total: checks.length }, null, 1) + '\n');
console.log(`\nD256: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
