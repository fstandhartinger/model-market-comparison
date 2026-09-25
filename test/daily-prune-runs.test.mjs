import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { planRunPruning, pruneStaleRuns, RETAIN_STAGING_DAYS, RETAIN_STAGING_RUNS } from '../ops/daily/prune-runs.mjs';

const NOW = new Date('2026-09-25T00:00:00Z');
const daysAgo = (days) => new Date(NOW.getTime() - days * 86_400_000);
const hoursAgo = (hours) => new Date(NOW.getTime() - hours * 3_600_000);
const run = (name, overrides = {}) => ({ name, started: null, finished: true, activity: daysAgo(30),
  staging: ['work', 'before'], ...overrides });
const reasons = (plan) => Object.fromEntries(plan.keep.map((k) => [k.name, k.reason]));

test('the staging bulk of an old finished run is pruned; its evidence is not part of the decision', () => {
  // retainStagingRuns: 0 isolates the age rule; the investigation window has its own test below.
  const plan = planRunPruning({ now: NOW, retainStagingRuns: 0, runs: [run('old', { started: daysAgo(10), activity: daysAgo(10) })] });
  assert.deepEqual(plan.prune, [{ name: 'old', staging: ['work', 'before'] }]);
  assert.deepEqual(plan.keep, []);
});

test('a run that may still be executing is never touched, however it is dated', () => {
  // No run report yet and written minutes ago: this is what a live run looks like from outside.
  const live = run('live', { finished: false, started: daysAgo(40), activity: hoursAgo(0.1) });
  assert.equal(reasons(planRunPruning({ now: NOW, runs: [live] })).live, 'possibly-running');
  // The same directory once it has settled past the window is an abandoned run, and prunable.
  const abandoned = { ...live, activity: hoursAgo(12) };
  assert.deepEqual(planRunPruning({ now: NOW, retainStagingRuns: 0, runs: [abandoned] }).prune.map((p) => p.name), ['live']);
});

test('recency is read from the run report, and from file activity only when there is none', () => {
  // retainStagingRuns: 1, so the investigation window cannot stand in for the recency rule here.
  const plan = planRunPruning({ now: NOW, retainStagingRuns: 1, runs: [
    run('reported-recent', { started: hoursAgo(20), activity: daysAgo(40) }),
    run('reported-old', { started: daysAgo(9), activity: hoursAgo(1), finished: true }),
    run('unreported-recent', { finished: false, activity: hoursAgo(20) }),
  ] });
  const kept = reasons(plan);
  assert.equal(kept['reported-recent'], 'recent');
  assert.equal(kept['unreported-recent'], 'recent');
  // A finished run's own start time decides, not the mtime a later reader left on the directory.
  assert.deepEqual(plan.prune.map((p) => p.name), ['reported-old']);
});

test('the newest staging trees survive any age, so a quiet pipeline still leaves one to investigate', () => {
  const runs = Array.from({ length: 6 }, (_, index) =>
    run(`run-${index}`, { started: daysAgo(30 + index), activity: daysAgo(30 + index) }));
  const plan = planRunPruning({ now: NOW, runs });
  assert.deepEqual(plan.keep.map((k) => k.name), ['run-0', 'run-1', 'run-2']);
  assert.ok(plan.keep.every((k) => k.reason === 'investigation-window'));
  assert.deepEqual(plan.prune.map((p) => p.name), ['run-3', 'run-4', 'run-5']);
  assert.equal(plan.keep.length, RETAIN_STAGING_RUNS);
});

test('an already compacted run is not counted against the investigation window', () => {
  // Published runs are compacted on the spot, so they hold no staging tree. If they still filled
  // the window, three published days in a row would expose every failed run to deletion.
  const runs = [
    run('published-newest', { started: daysAgo(1), staging: [] }),
    run('published-newer', { started: daysAgo(2), staging: [] }),
    run('published-new', { started: daysAgo(3), staging: [] }),
    run('failed-old', { started: daysAgo(20), activity: daysAgo(20) }),
  ];
  const plan = planRunPruning({ now: NOW, runs });
  assert.equal(reasons(plan)['failed-old'], 'investigation-window');
  assert.deepEqual(plan.prune, []);
});

test('the boundary is the documented one: RETAIN_STAGING_DAYS is kept, a minute past it is not', () => {
  const inside = run('inside', { started: new Date(NOW.getTime() - RETAIN_STAGING_DAYS * 86_400_000 + 60_000) });
  const outside = run('outside', { started: new Date(NOW.getTime() - RETAIN_STAGING_DAYS * 86_400_000 - 60_000) });
  // Four more staging trees keep the investigation window from rescuing `outside`.
  const filler = Array.from({ length: 4 }, (_, i) => run(`filler-${i}`, { started: daysAgo(0.1 * (i + 1)) }));
  const plan = planRunPruning({ now: NOW, runs: [inside, outside, ...filler] });
  assert.equal(reasons(plan).inside, 'recent');
  assert.deepEqual(plan.prune.map((p) => p.name), ['outside']);
});

test('pruneStaleRuns removes only the staging bulk and only from the runs the plan names', async () => {
  const home = await mkdtemp(join(tmpdir(), 'bh-prune-runs-'));
  const before = Buffer.from('{"synthetic":"old"}\n');
  try {
    const make = async (name, startedAt) => {
      const dir = join(home, 'runs', name);
      for (const part of ['reports', 'work', 'before', 'benchmark-candidates', 'sources', 'gauntlet', 'review', 'workers']) {
        await mkdir(join(dir, part), { recursive: true }); await writeFile(join(dir, part, 'sentinel'), part);
      }
      await writeFile(join(dir, 'reports/dataset-before.json'), before);
      await writeFile(join(dir, 'reports/run-report.json'), JSON.stringify({ started_at: startedAt, published: false }));
      return dir;
    };
    const stale = await make('2026-09-01T05-17-00-000Z-1', '2026-09-01T05:17:00.000Z');
    const fresh = await make('2026-09-24T05-17-00-000Z-2', '2026-09-24T05:17:00.000Z');
    // Three more fresh runs, so the investigation window is filled by runs newer than `stale`.
    for (const day of ['22', '23', '24']) await make(`2026-09-${day}T19-17-00-000Z-9`, `2026-09-${day}T19:17:00.000Z`);

    const planned = await pruneStaleRuns({ home, now: NOW, dryRun: true });
    assert.deepEqual(planned.pruned.map((p) => p.name), ['2026-09-01T05-17-00-000Z-1']);
    assert.equal(planned.applied, false);
    await access(join(stale, 'work/sentinel'));

    const receipt = await pruneStaleRuns({ home, now: NOW });
    assert.equal(receipt.applied, true);
    assert.deepEqual(receipt.pruned.map((p) => p.name), ['2026-09-01T05-17-00-000Z-1']);
    for (const name of ['work', 'before', 'benchmark-candidates']) {
      await assert.rejects(access(join(stale, name)), { code: 'ENOENT' });
    }
    for (const name of ['sources', 'gauntlet', 'review', 'workers']) {
      assert.equal(await readFile(join(stale, name, 'sentinel'), 'utf8'), name);
    }
    // The audit dataset is kept, compressed and byte-exact; the fresh run is untouched entirely.
    assert.deepEqual(gunzipSync(await readFile(join(stale, 'reports/dataset-before.json.gz'))), before);
    assert.equal(await readFile(join(fresh, 'work/sentinel'), 'utf8'), 'work');
    assert.equal(await readFile(join(fresh, 'reports/dataset-before.json'), 'utf8'), before.toString());

    // Idempotent: a second sweep finds nothing left to remove in that directory.
    const again = await pruneStaleRuns({ home, now: NOW });
    assert.deepEqual(again.pruned, []);
  } finally { await rm(home, { recursive: true, force: true }); }
});

test('a missing runs directory is reported, not thrown', async () => {
  const home = await mkdtemp(join(tmpdir(), 'bh-prune-empty-'));
  try { assert.deepEqual(await pruneStaleRuns({ home }), { applied: false, reason: 'no-runs-directory' }); }
  finally { await rm(home, { recursive: true, force: true }); }
});
