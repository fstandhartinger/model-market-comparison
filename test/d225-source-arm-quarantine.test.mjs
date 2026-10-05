// F-209 / D225 — a source change quarantines its own arm, never the day.
//
// 2026-09-27: VulcanBench published five rows at `code-quality-maintenance-v3.15`. The repo-level
// continuity test read that capture, went red, and because the publish gate runs the whole `npm test`
// suite *no* source published — while the daily's own per-arm machinery exists precisely to fail one
// arm soft and let the rest through. The design authority's decision (pass 38, decision 3): the fence
// stays, the blast radius does not.
//
// Nothing here is a typed expectation about VulcanBench: the reviewed set comes from the registry's
// own `version_guard`, and the two implementations of that sentence — the JS the daily reads it with
// and the python the collector enforces it with — are pinned to each other against the live registry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { QUARANTINE_MARK, reviewedProtocols, parseQuarantine, quarantineCheck,
  acceptedCaptures, newestAccepted, withheldKeys, retainedCaptureDecisions } from '../lib/source-quarantine.mjs';
import { sourceHealth, healthMarkdown, isQuarantine, QUARANTINE_ESCALATION_RUNS } from '../ops/daily/source-health.mjs';
import { planNotifications, quarantineHumanTodo } from '../ops/daily/policy.mjs';

const exec = promisify(execFile);
const registry = JSON.parse(await readFile('data/raw/benchmarks/registry.json', 'utf8'));
const COLLECTOR = 'scripts/collect-public-benchmarks.py';

test('the reviewed protocol set is read out of the registry, and only where the guard states one', () => {
  const guards = registry.entries.filter((entry) => reviewedProtocols(entry.how_to_collect?.version_guard));
  assert.ok(guards.length, 'at least one registry entry states a closed protocol allow-list');
  for (const entry of guards) {
    const reviewed = reviewedProtocols(entry.how_to_collect.version_guard);
    // A guard that states a list states a *closed* one: the fence is only as strong as this sentence.
    assert.ok(reviewed.length, `${entry.id}: empty allow-list`);
    assert.deepEqual(reviewed, [...new Set(reviewed)].sort(), `${entry.id}: allow-list not a normalised set`);
  }
  // No list, no fence: a board without a protocol column must not be quarantined by accident.
  assert.equal(reviewedProtocols('Exact 18-column header; every row states n=23.'), null);
  assert.equal(reviewedProtocols(undefined), null);
});

test('the collector and the daily read the same guard sentence', async () => {
  // Two implementations of one rule is a defect waiting to happen, so they are compared, not trusted.
  const { stdout } = await exec('python3', ['-c', `
import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('c','${COLLECTOR}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
reg=json.load(open('data/raw/benchmarks/registry.json'))
print(json.dumps({e['id']: m.reviewed_protocols(e) for e in reg['entries']}))
print(m.QUARANTINE_MARK)`], { maxBuffer: 8_000_000 });
  const [pythonJson, pythonMark] = stdout.trim().split('\n');
  assert.equal(pythonMark, QUARANTINE_MARK, 'the marker the collector raises is the one the daily recognises');
  const fromPython = JSON.parse(pythonJson);
  for (const entry of registry.entries) {
    assert.deepEqual(fromPython[entry.id], reviewedProtocols(entry.how_to_collect?.version_guard),
      `${entry.id}: the collector and the daily disagree about the reviewed protocol set`);
  }
});

test('an unreviewed revision quarantines its own arm; a reviewed one collects', async () => {
  const entry = registry.entries.find((e) => reviewedProtocols(e.how_to_collect?.version_guard)
    && e.how_to_collect.version_guard.includes('code-quality-maintenance'));
  assert.ok(entry, 'the fixture board is still in the registry');
  const reviewed = reviewedProtocols(entry.how_to_collect.version_guard);
  const run = async (protocol) => exec('python3', ['-c', `
import importlib.util,json
spec=importlib.util.spec_from_file_location('c','${COLLECTOR}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
reg=json.load(open('data/raw/benchmarks/registry.json'))
entry=[e for e in reg['entries'] if e['id']=='${entry.id}'][0]
head='rank,model,lab,harness,effort,best_effort,n,combined_33,combined_33_se,code_quality,passed,mean_minutes,mean_usd,mean_raw_tokens,median_output_tokens,mean_output_tokens,report,protocol,passed_of,combined_timeouts_zero'
row='1,Fixture Model,Lab,Codex,max,True,23,90.0,0.4,80.0,23,10.0,1.0,100,10,10,benchmarks/fixture.html,${protocol},23,90.0'
rows=m.parse(head+chr(10)+row,{'kind':'vulcanbench_frontier_csv'},None,entry)
print(json.dumps([r['context']['protocol'] for r in rows]))`], { maxBuffer: 8_000_000 });

  // A reviewed revision parses normally — the fence is not a blanket refusal of new rows.
  const ok = JSON.parse((await run(reviewed[0])).stdout.trim());
  assert.deepEqual(ok, [reviewed[0]]);

  // An unreviewed revision of the same family raises the one error shape the daily quarantines on.
  const unreviewed = 'code-quality-maintenance-v9.99';
  assert.ok(!reviewed.includes(unreviewed), 'the fixture revision must not be reviewed');
  const error = await run(unreviewed).then(() => null, (e) => e);
  assert.ok(error, 'an unreviewed revision must not parse');
  const quarantine = parseQuarantine(error);
  assert.ok(quarantine, `the failure must be a quarantine, got: ${String(error.message).slice(-400)}`);
  assert.equal(quarantine.entry, entry.id);
  assert.deepEqual(quarantine.unreviewed, [unreviewed]);
  assert.deepEqual(quarantine.reviewed, reviewed);
  // The reason a human reads names the revision, the reviewed set and what happened to the data.
  assert.match(quarantine.reason, new RegExp(unreviewed));
  assert.match(quarantine.reason, /published rows are unchanged/);
  assert.match(quarantine.reason, /every other source still publishes/);
  // A wholly different protocol family is also unreviewed, so it quarantines the same way: one rule,
  // "the board states a protocol the registry has not reviewed", and the reason names what was seen.
  // Data safety is identical either way — the arm publishes nothing and its rows stay as they were.
  const alien = await run('some-other-protocol-v1.0').then(() => null, (e) => e);
  assert.ok(alien, 'an unreviewed protocol must not parse');
  assert.deepEqual(parseQuarantine(alien)?.unreviewed, ['some-other-protocol-v1.0']);
});

test('D256: a column appended to the reviewed header quarantines the arm; any other header change fails', async () => {
  // 2026-09-29: VulcanBench appended `passed_of` and `combined_timeouts_zero` and shipped a sixteenth
  // protocol revision in the same push. The header guard runs before the row loop, so it raised a plain
  // error: the arm failed instead of quarantining, its capture counted as accepted, and two repo-level
  // continuity suites read a board the collector had refused — the blast radius F-209 exists to bound.
  // Those two columns were reviewed into the guard the same day (D256.1), so the probe here names two
  // columns the board does not publish: the rule under test is "appended", never these two literals.
  const entry = registry.entries.find((e) => reviewedProtocols(e.how_to_collect?.version_guard)
    && e.how_to_collect.version_guard.includes('code-quality-maintenance'));
  assert.ok(entry, 'the fixture board is still in the registry');
  const reviewed = reviewedProtocols(entry.how_to_collect.version_guard);
  const HEAD = 'rank,model,lab,harness,effort,best_effort,n,combined_33,combined_33_se,code_quality,passed,mean_minutes,mean_usd,mean_raw_tokens,median_output_tokens,mean_output_tokens,report,protocol,passed_of,combined_timeouts_zero';
  const ROW = `1,Fixture Model,Lab,Codex,max,True,23,90.0,0.4,80.0,23,10.0,1.0,100,10,10,benchmarks/fixture.html,${reviewed[0]},23,90.0`;
  const run = async (head, row, withEntry = true) => exec('python3', ['-c', `
import importlib.util,json
spec=importlib.util.spec_from_file_location('c','${COLLECTOR}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
reg=json.load(open('data/raw/benchmarks/registry.json'))
entry=[e for e in reg['entries'] if e['id']=='${entry.id}'][0] if ${withEntry ? 'True' : 'False'} else None
rows=m.parse(${JSON.stringify(head)}+chr(10)+${JSON.stringify(row)},{'kind':'vulcanbench_frontier_csv'},None,entry)
print(json.dumps([r['id'] for r in rows]))`], { maxBuffer: 8_000_000 });

  // The reviewed header still parses — this is not a blanket refusal of the board.
  assert.deepEqual(JSON.parse((await run(HEAD, ROW)).stdout.trim()), ['Fixture Model [max]']);

  // Two appended columns: every reviewed column present, in order, same name. That is a quarantine,
  // and it names the columns rather than a revision, because no revision is what changed.
  const appended = await run(`${HEAD},judge_panel,retry_count`, `${ROW},muse+grok,1`).then(() => null, (e) => e);
  assert.ok(appended, 'an appended column must not parse');
  const quarantine = parseQuarantine(appended);
  assert.ok(quarantine, `the failure must be a quarantine, got: ${String(appended.message).slice(-400)}`);
  assert.equal(quarantine.entry, entry.id);
  assert.deepEqual(quarantine.columns, ['judge_panel', 'retry_count']);
  assert.deepEqual(quarantine.unreviewed, [], 'an appended column is not a revision claim');
  assert.match(quarantine.reason, /judge_panel/);
  assert.match(quarantine.reason, /published rows are unchanged/);
  assert.match(quarantine.reason, /every other source still publishes/);
  // It reaches source-health as `attention` and its prose says column, not revision.
  const check = quarantineCheck(quarantine, { rows: 34 });
  assert.ok(isQuarantine(check));
  assert.deepEqual(check.unreviewed_columns, ['judge_panel', 'retry_count']);
  assert.match(healthMarkdown(sourceHealth([{ checked_at: '2026-09-29T05:17:00.000Z', checks: [check] }])),
    /unreviewed column judge_panel, column retry_count/);
  // And the escalation block asks for the right repair, keyed on the columns.
  const todo = quarantineHumanTodo([{ id: entry.id, consecutive_quarantined_runs: 3,
    unreviewed_protocols: [], unreviewed_columns: ['judge_panel'], quarantined_since: '2026-09-29T05:17:00.000Z' }]);
  assert.match(todo.text, /column judge_panel/);
  assert.equal(todo.key, `quarantine:${entry.id}@judge_panel`);

  // A renamed, reordered or removed column is a *different* class — it may mean the recipe points at
  // the wrong artifact — and stays the hard failure it has always been.
  for (const [head, why] of [
    [HEAD.replace(',protocol', ',protocol_id'), 'renamed column'],
    [HEAD.replace('rank,model', 'model,rank'), 'reordered columns'],
    [HEAD.replace(',mean_usd', ''), 'removed column'],
  ]) {
    const error = await run(head, ROW).then(() => null, (e) => e);
    assert.ok(error, `${why} must not parse`);
    assert.equal(parseQuarantine(error), null, `${why} is not a quarantine`);
    // A removed column trips the generic row-width guard first; either way it is a hard failure.
    assert.match(error.message, /CSV (header changed|row width mismatch)/);
  }

  // With no registry entry there is no arm to quarantine, so an appended column stays a hard failure.
  const noEntry = await run(`${HEAD},judge_panel`, `${ROW},muse+grok`, false).then(() => null, (e) => e);
  assert.ok(noEntry, 'an appended column must not parse without a registry entry either');
  assert.equal(parseQuarantine(noEntry), null);
});

test('D256: the generic reviewed-header guard quarantines an appended column too', async () => {
  // 26 plan entries state a reviewed header through the generic `csv` recipe's `require_header`, and
  // every one of them had the same gap: the check runs before any row is read, so an appended column
  // raised a plain error, the arm failed instead of quarantining, and its capture counted as accepted
  // evidence. One rule for all of them. The fixture is whichever entry the plan actually states, so
  // this cannot pass by asserting a board we no longer collect.
  const plan = JSON.parse(await readFile('data/raw/benchmarks/collection-plan.json', 'utf8')).entries;
  const withHeader = plan.filter((e) => e.parser?.kind === 'csv' && Array.isArray(e.parser.require_header)
    && registry.entries.some((r) => r.id === e.benchmark_id));
  assert.ok(withHeader.length, 'at least one plan entry states a reviewed CSV header');
  const fixture = withHeader[0];
  const header = fixture.parser.require_header;
  const run = (head) => exec('python3', ['-c', `
import importlib.util,json,sys
spec=importlib.util.spec_from_file_location('c','${COLLECTOR}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
reg=json.load(open('data/raw/benchmarks/registry.json'))
plan=json.load(open('data/raw/benchmarks/collection-plan.json'))['entries']
pe=[e for e in plan if e['benchmark_id']==sys.argv[1]][0]
entry=[e for e in reg['entries'] if e['id']==pe['benchmark_id']][0]
head=json.loads(sys.argv[2])
print(len(m.parse(','.join(head)+chr(10)+','.join(['1']*len(head)),pe['parser'],None,entry)))`,
    fixture.benchmark_id, JSON.stringify(head)], { maxBuffer: 8_000_000 });

  // Appended: a quarantine naming the column.
  const appended = await run([...header, 'a_new_column']).then(() => null, (e) => e);
  assert.ok(appended, 'an appended column must not parse');
  const quarantine = parseQuarantine(appended);
  assert.ok(quarantine, `the failure must be a quarantine, got: ${String(appended.message).slice(-300)}`);
  assert.equal(quarantine.entry, fixture.benchmark_id);
  assert.deepEqual(quarantine.columns, ['a_new_column']);
  assert.deepEqual(quarantine.unreviewed, []);

  // Renamed: still a hard failure. This guard states an exact header and must keep doing so.
  const renamed = await run([...header.slice(0, -1), 'renamed_column']).then(() => null, (e) => e);
  assert.ok(renamed, 'a renamed column must not parse');
  assert.equal(parseQuarantine(renamed), null, 'a renamed column is not a quarantine');
  assert.match(renamed.message, /CSV header changed/);
});

test('a caller with no registry entry keeps the original family floor', async () => {
  // Only a test parses without the registry. It must still not accept an arbitrary protocol: without
  // a reviewed set there is no fence to quarantine against, so the family literal is the floor.
  const run = (protocol) => exec('python3', ['-c', `
import importlib.util,json
spec=importlib.util.spec_from_file_location('c','${COLLECTOR}')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
head='rank,model,lab,harness,effort,best_effort,n,combined_33,combined_33_se,code_quality,passed,mean_minutes,mean_usd,mean_raw_tokens,median_output_tokens,mean_output_tokens,report,protocol,passed_of,combined_timeouts_zero'
row='1,Fixture Model,Lab,Codex,max,True,23,90.0,0.4,80.0,23,10.0,1.0,100,10,10,benchmarks/fixture.html,${protocol},23,90.0'
print(len(m.parse(head+chr(10)+row,{'kind':'vulcanbench_frontier_csv'},None)))`], { maxBuffer: 8_000_000 });
  assert.equal((await run('code-quality-maintenance-v3.99')).stdout.trim(), '1');
  const alien = await run('code-quality-maintenance-v4.0').then(() => null, (e) => e);
  assert.ok(alien, 'another protocol family must fail closed even with no reviewed set');
  assert.match(alien.message, /protocol family changed/);
  assert.equal(parseQuarantine(alien), null, 'with no reviewed set there is nothing to quarantine against');
});

test('any other collector failure is still a failing arm, not a quarantine', () => {
  assert.equal(parseQuarantine(new Error('Prior result identities disappeared; source/version/reordering needs review')), null);
  assert.equal(parseQuarantine(new Error(`${QUARANTINE_MARK} not-json — prose`)), null, 'a malformed payload is not a quarantine');
  assert.equal(parseQuarantine(new Error(`${QUARANTINE_MARK} {"entry":"x","unreviewed":[]} — prose`)), null, 'an empty revision list is not a quarantine');
  assert.equal(parseQuarantine(new Error(`${QUARANTINE_MARK} {"entry":"x","unreviewed":[],"unreviewed_columns":[]} — prose`)), null,
    'D256: a quarantine has to name something unreviewed — neither list populated is malformed, not a licence to withhold');
});

test('a quarantined arm is `attention` in source health, and only when it carries the structured field', () => {
  const quarantine = quarantineCheck({ entry: 'board::1', unreviewed: ['p-v2'], reviewed: ['p-v1'], reason: 'board::1: …' }, { rows: 28 });
  assert.equal(quarantine.status, 'source_changed_retained');
  assert.ok(isQuarantine(quarantine));
  // CR-34.2's changed-capture retention uses the same status and must not be read as a quarantine.
  assert.ok(!isQuarantine({ id: 'openrouter-benchmarks', status: 'source_changed_retained' }));
  assert.ok(!isQuarantine({ id: 'x', status: 'retained_after_failure', reason: 'boom' }));
});

test('the quarantine streak is counted per arm and escalates on the third consecutive run', () => {
  const quarantine = quarantineCheck({ entry: 'board::1', unreviewed: ['p-v2'], reviewed: ['p-v1'], reason: 'board::1: unreviewed p-v2' });
  const ok = { id: 'board::1', status: 'candidate', rows: 5 };
  const other = { id: 'other::1', status: 'candidate', rows: 5 };
  const runs = (armChecks) => armChecks.map((check, i) => ({
    checked_at: `2026-09-2${9 - i}T05:17:00.000Z`, checks: [check, other] }));

  const one = sourceHealth(runs([quarantine, ok, ok]));
  assert.equal(one.quarantined_arms.length, 1);
  assert.equal(one.quarantined_arms[0].consecutive_quarantined_runs, 1);
  assert.equal(one.quarantined_arms[0].escalate, false);
  // A quarantined arm is `attention`, so it must not be counted as a failing source.
  assert.equal(one.sources.find((s) => s.id === 'board::1').kind, 'attention');
  assert.equal(one.sources.find((s) => s.id === 'board::1').consecutive_failed_runs, 0);
  // It is named in the markdown on every run it stays quarantined — the soft failure nobody reads
  // is the failure this directive was written against.
  assert.match(healthMarkdown(one), /board::1 quarantined/);
  assert.match(healthMarkdown(one), /p-v2/);

  const three = sourceHealth(runs([quarantine, quarantine, quarantine]));
  assert.equal(three.quarantined_arms[0].consecutive_quarantined_runs, QUARANTINE_ESCALATION_RUNS);
  assert.equal(three.quarantined_arms[0].escalate, true);
  assert.equal(three.quarantined_arms[0].quarantined_since, '2026-09-27T05:17:00.000Z');

  // A run that collected again clears the streak.
  assert.equal(sourceHealth(runs([ok, quarantine, quarantine])).quarantined_arms.length, 0);
});

test('the human todo appears on the third run, in the format ~/bin/notify accepts, once per revision set', () => {
  const arm = (runs) => [{ id: 'board::1', consecutive_quarantined_runs: runs, unreviewed_protocols: ['p-v2'],
    reviewed_protocols: ['p-v1'], quarantined_since: '2026-09-25T05:17:00.000Z' }];
  assert.equal(quarantineHumanTodo(arm(QUARANTINE_ESCALATION_RUNS - 1)), null);
  const todo = quarantineHumanTodo(arm(QUARANTINE_ESCALATION_RUNS));
  assert.ok(todo);
  // The shape ~/bin/notify enforces: the status label first, the block header, one bullet, and
  // Why / `Steps:` alone on its line / numbered actions / Time under it.
  const lines = todo.text.split('\n');
  assert.equal(lines[0], '🧑 DU BIST DRAN');
  assert.ok(lines.includes('🧑 Für dich'));
  const body = todo.text.slice(todo.text.indexOf('🧑 Für dich'));
  assert.match(body, /^- board::1: quarantined for 3 consecutive daily runs$/m);
  assert.match(body, /^ {2}Why: .+$/m);
  assert.match(body, /^ {2}Steps:$/m);
  assert.match(body, /^ {2}1\. .+$/m);
  assert.match(body, /^ {2}Time: \d+ min$/m);
  // It names the revision and the registry field to review.
  assert.match(body, /p-v2/);
  assert.match(body, /version_guard/);

  // Planned independently of the run's own status — a run that failed for another reason must not
  // swallow it — and deduped on the arm and the exact revisions.
  const plan = (notified, arms) => planNotifications({ status_ok: false, rc: 1, notified, quarantined_arms: arms,
    top5: { previous: [], current: [] }, now: Date.parse('2026-09-27T06:00:00Z') });
  const first = plan({}, arm(3)).sends.filter((s) => s.kind === 'quarantine');
  assert.equal(first.length, 1);
  assert.equal(first[0].key, 'quarantine:board::1@p-v2');
  assert.equal(plan({ 'quarantine:board::1@p-v2': 'x' }, arm(3)).sends.filter((s) => s.kind === 'quarantine').length, 0);
  // A *new* unreviewed revision asks again rather than hiding behind the answered one.
  const next = [{ ...arm(3)[0], unreviewed_protocols: ['p-v2', 'p-v3'] }];
  assert.equal(plan({ 'quarantine:board::1@p-v2': 'x' }, next).sends.filter((s) => s.kind === 'quarantine').length, 1);
  assert.equal(plan({}, arm(1)).sends.filter((s) => s.kind === 'quarantine').length, 0);
});

test('a quarantined capture is retained but not read as accepted evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'd225-'));
  try {
    const URL_ = 'https://example.test/board.csv';
    const dir = async (name, manifest, quarantine) => {
      await mkdir(join(root, name), { recursive: true });
      await writeFile(join(root, name, 'manifest.json'), JSON.stringify(manifest));
      if (quarantine) await writeFile(join(root, name, 'quarantine.json'), JSON.stringify(quarantine));
    };
    const receipt = (file) => ({ status: 200, url: URL_, file, sha256: file });
    await dir('2026-09-25', [receipt('old.gz')]);
    await dir('2026-09-26', [receipt('new.gz')], { schema_version: 1, arms: [
      { id: 'board::1', reason: 'board::1: unreviewed p-v2', unreviewed_protocols: ['p-v2'], captures: [URL_] }] });
    const pool = await acceptedCaptures({ dirs: [join(root, '2026-09-25'), join(root, '2026-09-26')],
      readJson: async (path) => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; } } });
    // The newer capture is retained on disk and named as withheld; the accepted one is the older.
    assert.equal(pool.accepted.length, 1);
    assert.equal(newestAccepted(pool, URL_).file, 'old.gz');
    assert.equal(pool.withheld.length, 1);
    assert.deepEqual([...withheldKeys({ arms: [{ captures: [URL_] }] })], [URL_]);

    // With no accepted capture at all, the failure says the newest one is quarantined — so a check
    // can never pass by quietly ignoring evidence it was supposed to read.
    const onlyQuarantined = await acceptedCaptures({ dirs: [join(root, '2026-09-26')],
      readJson: async (path) => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; } } });
    assert.throws(() => newestAccepted(onlyQuarantined, URL_), /quarantined/);
    // A URL nobody ever captured still reports plainly that it is missing.
    assert.throws(() => newestAccepted(pool, 'https://example.test/other.csv'), /no retained capture/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CR-287: a parser or review failure withholds fresh captures while shared accepted sources remain usable', async () => {
  const url = 'https://example.test/board.csv', shared = 'https://example.test/method';
  const record = retainedCaptureDecisions({
    entries: [{ benchmark_id: 'parser::1' }, { benchmark_id: 'review::1' }, { benchmark_id: 'accepted::1' }],
    checks: [[{ status: 'retained_after_failure', reason: 'unreviewed harness' }],
      [{ status: 'retained_budget_exhausted', reason: 'no reviewer admitted' }], [{ status: 'checked_unchanged' }]],
    captures: [new Set([url, shared]), new Set(['https://example.test/review']), new Set([shared])],
    accepted: new Set([shared]),
  });
  assert.deepEqual(record.arms.map((arm) => [arm.id, arm.status, arm.captures]), [
    ['parser::1', 'retained_after_failure', [url]],
    ['review::1', 'retained_budget_exhausted', ['https://example.test/review']],
  ]);
  const files = {
    'old/manifest.json': [{ url, status: 200, file: 'old.gz' }],
    'new/manifest.json': [{ url, status: 200, file: 'rejected.gz' }, { url: shared, status: 200, file: 'shared.gz' }],
    'new/capture-decisions.json': record,
  };
  const pool = await acceptedCaptures({ dirs: ['old', 'new'], readJson: async (path) => files[path] ?? null });
  assert.equal(newestAccepted(pool, url).file, 'old.gz');
  assert.equal(newestAccepted(pool, shared).file, 'shared.gz');
  assert.equal(pool.withheld[0].file, 'rejected.gz');
  const rejectedOnly = await acceptedCaptures({ dirs: ['new'], readJson: async (path) => files[path] ?? null });
  assert.throws(() => newestAccepted(rejectedOnly, url), /quarantined/);
});
