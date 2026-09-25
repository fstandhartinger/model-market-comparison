// D204 (2026-09-25): the daily quarantined 72 score rows and told nobody.
//
// `source-health.mjs` deliberately keeps `score-batch-<n>` out of its per-source table, and that part is
// right: a batch is a per-run unit, so `score-batch-7` is a different set of rows in every run and a
// "failing since" date or a consecutive-run streak would be meaningless for it.
//
// What was missed is that no other report picked them up either. The batches are not a stale *source* —
// no source is failing when a row is disputed — so `staleSources` does not see them, `run-report.json`
// does not carry them, and the run summary Florian reads does not mention them. The only trace was the
// `BENCHMARK RETAINED score-batch-3: 15 rows quarantined…` line in a run log nobody opens. Measured on
// the committed evidence of 2026-09-25T08-50-35-039Z: **11 batches, 72 rows** reviewed and not
// published, invisible in every report, on the same day the ledger still described 23 retained arms.
//
// This is the failure `source-health.mjs` was written against in the first place — its own header says a
// retained failure "keeps the old values on the site, which is correct, but nobody saw it" — applied to
// the one class it excludes. So the rows are counted rather than listed, which is the reporting shape a
// per-run unit actually supports.
//
// The count is now recorded structurally by `fail()` (`quarantined_rows`), because a report should not
// have to re-read a number out of a prose sentence. Runs written before that still report, by parsing
// the reason `fail()` itself wrote; a batch whose count cannot be established either way is named in
// `unknown_batches` rather than being silently counted as zero, since a silent zero is the defect.
import test from 'node:test';
import assert from 'node:assert/strict';
import { quarantineTotals, sourceHealth, healthMarkdown } from '../ops/daily/source-health.mjs';

const run = (checked_at, checks) => ({ checked_at, checks });
const ok = (id) => ({ id, status: 'checked_unchanged' });
const batch = (n, extra) => ({ id: `score-batch-${n}`, status: 'retained_after_failure', ...extra });

test('D204: quarantined rows are counted from the structured field', () => {
  const totals = quarantineTotals(run('2026-09-25T08:50:35.039Z', [
    ok('livebench::2026-06-25'),
    batch(3, { reason: '15 rows quarantined: …', quarantined_rows: 15 }),
    batch(4, { reason: '7 rows quarantined: …', quarantined_rows: 7 }),
  ]));
  assert.deepEqual(totals, { rows: 22, batches: 2, unknown_batches: [] });
});

test('D204: a run written before the field is still counted, from the reason fail() wrote', () => {
  // The shape of every committed checks.json up to 2026-09-25: id, status and reason only.
  const totals = quarantineTotals(run('2026-09-18T12:58:20.378Z', [
    batch(0, { reason: '2 rows quarantined: round 1: revise — [major] …' }),
    batch(1, { reason: '2 rows quarantined: …' }),
    batch(3, { reason: '2 rows quarantined: …' }),
    batch(4, { reason: '3 rows quarantined: …' }),
  ]));
  assert.deepEqual(totals, { rows: 9, batches: 4, unknown_batches: [] });
});

test('D204: a batch whose count cannot be established is named, never counted as zero', () => {
  const totals = quarantineTotals(run('2026-09-25T00:00:00.000Z', [
    batch(1, { reason: '5 rows quarantined: …' }),
    batch(2, { reason: 'the review runner died before it said how many' }),
    batch(9, {}),
  ]));
  assert.equal(totals.rows, 5);
  assert.equal(totals.batches, 3);
  assert.deepEqual(totals.unknown_batches, ['score-batch-2', 'score-batch-9']);
  // The structured field wins over the prose, and a non-integer field falls back rather than throwing.
  assert.equal(quarantineTotals(run('t', [batch(1, { reason: '5 rows quarantined', quarantined_rows: 6 })])).rows, 6);
  assert.equal(quarantineTotals(run('t', [batch(1, { reason: '5 rows quarantined', quarantined_rows: null })])).rows, 5);
});

test('D204: only failing score batches count', () => {
  const totals = quarantineTotals(run('t', [
    batch(1, { reason: '4 rows quarantined: …', quarantined_rows: 4 }),
    // A batch that published is not a quarantine, whatever its reason field says.
    { id: 'score-batch-2', status: 'updated', reason: '9 rows quarantined: …', quarantined_rows: 9 },
    // Neither is the other per-run bookkeeping row, nor a real source that happens to be failing.
    { id: 'benchmark-history', status: 'retained_after_failure', reason: '3 rows quarantined: …' },
    { id: 'arc-agi::2', status: 'retained_after_failure', reason: 'protocol not approved' },
  ]));
  assert.deepEqual(totals, { rows: 4, batches: 1, unknown_batches: [] });
  assert.deepEqual(quarantineTotals(run('t', [])), { rows: 0, batches: 0, unknown_batches: [] });
  assert.deepEqual(quarantineTotals(undefined), { rows: 0, batches: 0, unknown_batches: [] });
});

test('D204: the batches stay out of the source table but their rows reach the report', () => {
  const health = sourceHealth([
    run('2026-09-25T08:50:35.039Z', [
      { id: 'arc-agi::2', status: 'retained_after_failure', reason: 'protocol not approved' },
      batch(3, { reason: '15 rows quarantined: …', quarantined_rows: 15 }),
      batch(4, { reason: '7 rows quarantined: …', quarantined_rows: 7 }),
    ]),
    run('2026-09-24T05:00:00.000Z', [{ id: 'arc-agi::2', status: 'updated' }]),
  ]);
  // Unchanged: a per-run unit is not a source and must not get a row or a failing streak.
  assert.deepEqual(health.sources.map((s) => s.id), ['arc-agi::2']);
  // New: the rows are no longer lost between the two reports.
  assert.deepEqual(health.quarantine, { rows: 22, batches: 2, unknown_batches: [] });

  const md = healthMarkdown(health);
  assert.match(md, /\*\*22 score row\(s\) quarantined\*\* across 2 batch\(es\)/);
  // The count is the newest run's, not a sum over every run held.
  assert.equal(health.quarantine.rows, 22);
});

test('D204: the quarantine line is absent when nothing was quarantined', () => {
  const health = sourceHealth([run('2026-09-25T08:50:35.039Z', [{ id: 'arc-agi::2', status: 'updated' }])]);
  assert.deepEqual(health.quarantine, { rows: 0, batches: 0, unknown_batches: [] });
  assert.equal(/quarantined/.test(healthMarkdown(health)), false);
});

test('D204: an unknown batch is named in the markdown rather than rounding the total down quietly', () => {
  const health = sourceHealth([run('2026-09-25T08:50:35.039Z', [
    { id: 'arc-agi::2', status: 'updated' },
    batch(1, { reason: '5 rows quarantined: …', quarantined_rows: 5 }),
    batch(2, { reason: 'no count recorded' }),
  ])]);
  assert.match(healthMarkdown(health), /Row count not recorded for score-batch-2\./);
});

// The report is only useful if it reaches the summary Florian reads. `daily.mjs` has no exported
// summary builder (only `runDaily`), so the contract between the two files is pinned from both ends:
// the file `daily.mjs` opens really carries the field, and `daily.mjs` really reads and prints it.
test('D204: writeSourceHealth puts the count in the json daily.mjs opens', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeSourceHealth } = await import('../ops/daily/source-health.mjs');

  const root = await mkdtemp(join(tmpdir(), 'bh-d204-'));
  try {
    await mkdir(join(root, 'data/raw/benchmarks/daily-evidence/2026-09-25T08-50-35-039Z'), { recursive: true });
    await writeFile(join(root, 'data/raw/benchmarks/collection-plan.json'), JSON.stringify({ entries: [] }));
    await writeFile(join(root, 'data/raw/benchmarks/daily-evidence/2026-09-25T08-50-35-039Z/checks.json'),
      JSON.stringify(run('2026-09-25T08:50:35.039Z', [
        { id: 'arc-agi::2', status: 'retained_after_failure', reason: 'protocol not approved' },
        batch(3, { reason: '15 rows quarantined: …', quarantined_rows: 15 }),
      ])));
    const out = join(root, 'reports');
    const health = await writeSourceHealth({ runsDir: null, outDir: out, repoRoot: root });
    assert.deepEqual(health.quarantine, { rows: 15, batches: 1, unknown_batches: [] });
    // daily.mjs reads this file, not the return value.
    const onDisk = JSON.parse(await readFile(join(out, 'source-health.json'), 'utf8'));
    assert.deepEqual(onDisk.quarantine, { rows: 15, batches: 1, unknown_batches: [] });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('D204: daily.mjs reads that field and prints it in the run summary', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
  // Read from the health file, guarded so a run with no batches adds no line.
  assert.match(src, /report\.quarantined_scores = benchmarks\?\.quarantine\?\.batches \? benchmarks\.quarantine : null/);
  // Printed in the summary array, with the row count and the batch count.
  const line = src.split('\n').find((l) => l.includes('Zurueckgehaltene Score-Zeilen'));
  assert.ok(line, 'no quarantine line in the summary');
  assert.ok(line.includes('report.quarantined_scores ?'), 'the line is not guarded');
  assert.ok(line.includes('.rows') && line.includes('.batches'), 'the line does not carry both counts');
});
