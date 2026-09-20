import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LARGE_DISAGREEMENT_POINTS, MIN_SHARED_COHORT, RUNNER_PAIR_TABLE, runnerDisagreements } from '../lib/runner-disagreement.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { scoreBenchmaxxing } from '../lib/benchmax.mjs';

// CR-68.5 (Florian 2026-09-17): same benchmark, two runners — a large disagreement is its own evidence
// line; versions that differ are never paired.

const view = buildBenchmarkView(JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8')));
const registry = new Map(JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'))
  .benchmark_results.registry.map((e) => [e.id, e]));

test('every reviewed runner group names boards that exist and states its version equality', () => {
  assert.ok(RUNNER_PAIR_TABLE.groups.length >= 2);
  for (const group of RUNNER_PAIR_TABLE.groups) {
    assert.ok(group.runners.length >= 2, `${group.id} needs two runners`);
    assert.ok(group.version_equality.length >= 60, `${group.id} states why the versions are equal`);
    assert.match(group.reviewed_at, /^\d{4}-\d{2}-\d{2}$/);
    const runnerNames = new Set();
    for (const r of group.runners) {
      // The board id is either an exact registry id or the family of a re-dated snapshot board; either
      // way it must resolve to exactly one benchmark version, or the pairing would mix versions.
      const matches = [...registry.keys()].filter((id) => id === r.benchmark_id || id.startsWith(`${r.benchmark_id}::`));
      assert.equal(matches.length, 1, `${r.benchmark_id} resolves to exactly one registry version (got ${matches.join(', ')})`);
      assert.ok(r.runner && r.harness, `${r.benchmark_id} names its runner and harness`);
      assert.ok(!runnerNames.has(r.runner), `${group.id} lists each runner once`);
      runnerNames.add(r.runner);
    }
  }
});

test('the refusals are recorded with a reason, and no refused board pair is also a reviewed pair', () => {
  assert.ok(RUNNER_PAIR_TABLE.not_paired.length >= 5);
  const paired = new Set();
  for (const group of RUNNER_PAIR_TABLE.groups) for (const a of group.runners) for (const b of group.runners)
    if (a !== b) paired.add([a.benchmark_id, b.benchmark_id].sort().join('|'));
  for (const entry of RUNNER_PAIR_TABLE.not_paired) {
    assert.ok(entry.reason.length >= 40, `${entry.boards.join(' vs ')} states its reason`);
    assert.ok(!paired.has([...entry.boards].sort().join('|')), `${entry.boards.join(' vs ')} is refused, so it must not also be paired`);
  }
  // The two Terminal-Bench versions are the case the change request calls out by name.
  assert.ok(RUNNER_PAIR_TABLE.not_paired.some((e) => e.boards.includes('aa-terminal-bench::2.1') && e.boards.includes('aa-terminal-bench::4.0')
    && /version/i.test(e.reason)), 'Terminal-Bench 2.1 vs 4.0 is refused as a version difference');
});

test('both ranks are taken inside the shared cohort, and the gap is their difference', () => {
  const rows = runnerDisagreements(view, 'deepseek-v4-pro-0813::max');
  assert.ok(rows.length >= 1, 'the model is on at least one reviewed pair');
  for (const d of rows) {
    assert.ok(d.sharedCohort >= MIN_SHARED_COHORT, `${d.id}: shared cohort ${d.sharedCohort}`);
    assert.ok(d.a.percentile >= 0 && d.a.percentile <= 100 && d.b.percentile >= 0 && d.b.percentile <= 100);
    assert.ok(Math.abs(d.gap - (d.a.percentile - d.b.percentile)) < 1e-9, `${d.id}: the gap is the rank difference`);
    assert.equal(d.large, Math.abs(d.gap) >= LARGE_DISAGREEMENT_POINTS);
    assert.notEqual(d.a.benchmarkId, d.b.benchmarkId, 'a pair is two different boards');
    assert.ok(d.a.runner !== d.b.runner, 'a pair is two different runners');
  }
  // Sorted worst first, so the evidence line leads with the biggest disagreement.
  for (let i = 1; i < rows.length; i += 1) assert.ok(Math.abs(rows[i - 1].gap) >= Math.abs(rows[i].gap));
});

test("the change request's own example is the one the page shows", () => {
  // Florian named Terminal-Bench 2.1, DeepSeek V4 Pro: the Vals run ranks it far below the AA run.
  const tb = runnerDisagreements(view, 'deepseek-v4-pro-0813::max').find((d) => d.id === 'terminal-bench-2.1');
  assert.ok(tb, 'the Terminal-Bench 2.1 pair is computed for this model');
  assert.equal(tb.a.runner, 'Artificial Analysis');
  assert.equal(tb.b.runner, 'Vals AI');
  assert.ok(tb.gap > 0, 'AA ranks it higher than Vals does');
  assert.ok(tb.large, `the disagreement is called large (${tb.gap.toFixed(0)} points)`);
});

test('a model measured on only one side of a pair produces no comparison', () => {
  // Percentiles are never filled in for a board the model was not run on.
  const onlyOne = view.models.map((m) => m.id).find((id) => {
    const rows = runnerDisagreements(view, id);
    return rows.length === 0;
  });
  assert.ok(onlyOne, 'the catalog has models with no reviewed pair at all');
  assert.deepEqual(runnerDisagreements(view, onlyOne), []);
  assert.deepEqual(runnerDisagreements(view, 'no-such-model::max'), []);
});

test('the report carries the disagreements, and they never change the score', () => {
  const report = scoreBenchmaxxing(view, 'deepseek-v4-pro-0813::max');
  assert.ok(Array.isArray(report.runnerDisagreements) && report.runnerDisagreements.length >= 1);
  assert.ok(Math.abs(report.score - (report.parts.gap + report.parts.jaggednessTerm)) < 1e-9,
    'the published score is still exactly the gap plus the jaggedness term');
});

test('a large disagreement is rare enough to be worth its own line', () => {
  const flagged = view.models.filter((m) => runnerDisagreements(view, m.id).some((d) => d.large));
  assert.ok(flagged.length >= 1, 'at least one model carries the evidence line');
  assert.ok(flagged.length <= view.models.length * 0.1, `${flagged.length} of ${view.models.length} models — a flag, not a default`);
});
