import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceHealth, healthMarkdown } from '../ops/daily/source-health.mjs';

// CR-38.5 (iteration 81). Synthetic run reports in the shape ops/daily/refresh-benchmarks.mjs writes.
const run = (at, checks) => ({ checked_at: at, checks });
const reports = [
  run('2026-09-11T06:00:00Z', [{ id: 'aa-benchmark-fields', status: 'updated' }, { id: 'vals-index::2', status: 'checked_unchanged' }, { id: 'score-batch-0', status: 'retained_after_failure' }]),
  run('2026-09-14T06:00:00Z', [{ id: 'aa-benchmark-fields', status: 'retained_after_failure', reason: 'AA benchmark field coverage shrank: terminalbenchV21' }, { id: 'vals-index::2', status: 'candidate' }]),
  run('2026-09-16T07:00:00Z', [{ id: 'aa-benchmark-fields', status: 'retained_after_failure', reason: 'AA benchmark field coverage shrank: terminalbenchV21' },
    { id: 'vals-index::2', status: 'retained_after_failure', reason: 'Command failed: python3 x.py plan.json out.json\nTraceback (most recent call last):\n  File "x"\nValueError: Astro row schema changed\n' },
    { id: 'deepswe::snapshot-2026-09-15', status: 'retained_manual_snapshot' }, { id: 'new-kind', status: 'something_new' }]),
  // The same run seen twice (run directory and committed checks.json) counts once.
  run('2026-09-16T07:00:00Z', [{ id: 'aa-benchmark-fields', status: 'retained_after_failure' }]),
];

test('CR-38.5: failing since, consecutive failed runs and last OK per source; bookkeeping rows are not sources', () => {
  const h = sourceHealth(reports, { plan: { entries: [{ benchmark_id: 'deepswe::snapshot-2026-09-15', refresh: 'manual' }, { benchmark_id: 'vals-index::2', cadence: 'daily' }] } });
  assert.equal(h.generated_from_runs, 3);
  const by = Object.fromEntries(h.sources.map((s) => [s.id, s]));
  assert.equal(by['score-batch-0'], undefined);
  assert.deepEqual([by['aa-benchmark-fields'].failing_since, by['aa-benchmark-fields'].consecutive_failed_runs, by['aa-benchmark-fields'].last_ok],
    ['2026-09-14T06:00:00Z', 2, '2026-09-11T06:00:00Z']);
  assert.deepEqual([by['vals-index::2'].failing_since, by['vals-index::2'].consecutive_failed_runs, by['vals-index::2'].last_ok, by['vals-index::2'].cadence],
    ['2026-09-16T07:00:00Z', 1, '2026-09-14T06:00:00Z', 'daily']);
  assert.equal(by['vals-index::2'].reason, 'ValueError: Astro row schema changed', 'the traceback line, not the command');
  assert.equal(by['deepswe::snapshot-2026-09-15'].kind, 'manual');
  assert.equal(by['deepswe::snapshot-2026-09-15'].cadence, 'manual snapshot');
  assert.equal(by['new-kind'].kind, 'unknown', 'an unrecognised status is surfaced, never counted as ok');
  assert.deepEqual(h.sources.slice(0, 2).map((s) => s.id), ['aa-benchmark-fields', 'vals-index::2'], 'longest-failing first');
  const md = healthMarkdown(h);
  assert.match(md, /\| aa-benchmark-fields \| retained_after_failure \| 2026-09-14 \| 2 \| 2026-09-11 \|/);
  assert.match(md, /new-kind/);
  assert.throws(() => sourceHealth([]), /No benchmark-step reports/);
});

test('CR-66.9: a collector failing 3 days in a row is named with its last good date; benchmark sources too', async () => {
  const { updateCollectorHealth, staleSources } = await import('../ops/daily/source-health.mjs');
  let state = { collectors: {} };
  state = updateCollectorHealth(state, [{ name: 'fetch-nebius-catalog', ok: true }, { name: 'fetch-mistral-catalog', ok: true }, { name: 'npm-test', ok: false }], '2026-09-13');
  assert.equal(state.collectors['npm-test'], undefined, 'only collector steps are tracked');
  for (const day of ['2026-09-14', '2026-09-15', '2026-09-16']) {
    state = updateCollectorHealth(state, [{ name: 'fetch-nebius-catalog', ok: false, error: 'Command failed: node x\nError: HTTP 503' }, { name: 'fetch-mistral-catalog', ok: true }], day);
    const stale = staleSources({ collectors: state.collectors, day });
    if (day < '2026-09-16') assert.deepEqual(stale, [], `${day}: not yet 3 days`);
    else assert.deepEqual(stale, [{ id: 'fetch-nebius-catalog', kind: 'collector', last_ok: '2026-09-13', failing_since: '2026-09-14', reason: 'Error: HTTP 503' }]);
  }
  state = updateCollectorHealth(state, [{ name: 'fetch-nebius-catalog', ok: true }], '2026-09-17');
  assert.deepEqual(staleSources({ collectors: state.collectors, day: '2026-09-17' }), [], 'recovery clears it');
  const benchmarks = { sources: [
    { id: 'vals-index', kind: 'failing', last_ok: '2026-09-12T05:00:00Z', failing_since: '2026-09-13T05:00:00Z', reason: 'HTTP 403' },
    { id: 'lmarena', kind: 'failing', last_ok: '2026-09-16T05:00:00Z', failing_since: '2026-09-17T05:00:00Z', reason: 'timeout' },
    { id: 'swe-bench', kind: 'ok', last_ok: '2026-09-01T05:00:00Z' },
  ] };
  assert.deepEqual(staleSources({ benchmarks, day: '2026-09-17' }).map((s) => [s.id, s.last_ok]), [['vals-index', '2026-09-12']]);
});

test('CR-66.9: daily.mjs writes stale sources into the run report and the summary', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
  assert.match(src, /report\.stale_sources = staleSources\(/);
  assert.match(src, /Veraltete Quellen \(>= 3 Tage\)/);
  assert.ok(src.indexOf('report.stale_sources = staleSources(') < src.indexOf("writeJSONAtomic(join(reports, 'run-report.json'), report)"));
});
