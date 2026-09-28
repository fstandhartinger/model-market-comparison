// D249 (2026-09-28): the benchmarks step was killed 175 ms over its 8,400,000 ms timeout and threw
// away 28 completed protocol reviews and 57 approved score batches, because nothing is written until
// after the last batch. These tests pin the budget that makes the same overrun cost only the units
// that did not fit:
//
//   * the budget itself — deadline arithmetic, the one error shape, fail-closed configuration;
//   * every place in refresh-benchmarks.mjs that starts an LLM review claims it first;
//   * a budget-skipped score batch is retained, not thrown (the score loop's `throw outcome.reason`
//     is the line that would otherwise turn one skipped batch back into a lost run);
//   * the hard timeout has exactly one definition, so daily.mjs and the step cannot drift apart.
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BENCHMARK_STEP_TIMEOUT_MS, BENCHMARK_STEP_RESERVE_MS, ReviewBudgetExhausted,
  createReviewBudget, unlimitedReviewBudget, benchmarkReviewBudget, isBudgetExhausted,
} from '../ops/daily/step-budget.mjs';
import { STATUS_KIND, budgetTotals } from '../ops/daily/source-health.mjs';
import { mapWithConcurrency } from '../ops/daily/concurrency.mjs';

const refreshSrc = readFileSync(new URL('../ops/daily/refresh-benchmarks.mjs', import.meta.url), 'utf8');
const dailySrc = readFileSync(new URL('../ops/daily/daily.mjs', import.meta.url), 'utf8');
const stepSrc = readFileSync(new URL('../ops/daily/phase-step.mjs', import.meta.url), 'utf8');

test('the deadline sits exactly one reserve before the hard timeout', () => {
  let clock = 1_000;
  const budget = createReviewBudget({ startedAt: 1_000, timeoutMs: 100, reserveMs: 30, now: () => clock });
  assert.equal(budget.deadlineAt, 1_070);
  assert.equal(budget.exhausted(), false);
  assert.equal(budget.remainingMs(), 70);
  clock = 1_069;
  assert.equal(budget.exhausted(), false);
  assert.doesNotThrow(() => budget.claim('scores-0'));
  clock = 1_070;
  assert.equal(budget.exhausted(), true);
  assert.equal(budget.remainingMs(), 0);
});

test('a claim past the deadline throws the one error shape, and names what was skipped', () => {
  let clock = 0;
  const budget = createReviewBudget({ startedAt: 0, timeoutMs: 10, reserveMs: 4, now: () => clock });
  budget.claim('protocol-arc-agi::1');
  assert.deepEqual(budget.skipped, []);
  clock = 6;
  let error;
  try { budget.claim('scores-41'); } catch (thrown) { error = thrown; }
  assert.ok(error instanceof ReviewBudgetExhausted);
  assert.equal(isBudgetExhausted(error), true);
  assert.match(error.message, /scores-41/);
  assert.match(error.message, /retained unreviewed/);
  assert.throws(() => budget.claim('scores-42'), ReviewBudgetExhausted);
  assert.deepEqual(budget.skipped, ['scores-41', 'scores-42']);
  // `skipped` is a copy: a reader cannot grow the step's own record of what it dropped.
  budget.skipped.push('scores-43');
  assert.deepEqual(budget.skipped, ['scores-41', 'scores-42']);
});

test('isBudgetExhausted is false for every ordinary review failure', () => {
  for (const other of [new Error('protocol not approved'), new TypeError('x'), null, undefined, 'string']) {
    assert.equal(isBudgetExhausted(other), false);
  }
});

test('the unlimited budget never claims, and reports that no budget was applied', () => {
  const budget = unlimitedReviewBudget();
  assert.equal(budget.deadlineAt, null);
  assert.equal(budget.exhausted(), false);
  assert.equal(budget.remainingMs(), Infinity);
  assert.doesNotThrow(() => budget.claim('anything'));
});

test('an unusable budget configuration fails closed instead of guessing', () => {
  assert.throws(() => createReviewBudget({ timeoutMs: 0, reserveMs: 0 }), /positive timeoutMs/);
  assert.throws(() => createReviewBudget({ timeoutMs: 10, reserveMs: -1 }), /non-negative reserveMs/);
  assert.throws(() => createReviewBudget({ timeoutMs: 10, reserveMs: 10 }), /leave time to review/);
  assert.throws(() => createReviewBudget({ startedAt: NaN, timeoutMs: 10, reserveMs: 1 }), /numeric startedAt/);
  assert.throws(() => benchmarkReviewBudget({ env: { BH_BENCHMARK_STEP_RESERVE_MS: 'soon' } }), /non-negative integer/);
  assert.throws(() => benchmarkReviewBudget({ env: { BH_BENCHMARK_STEP_TIMEOUT_MS: '-1' } }), /non-negative integer/);
});

test('the step budget defaults to the daily timeout less the reserve, and both are overridable', () => {
  assert.equal(benchmarkReviewBudget({ startedAt: 0, env: {} }).deadlineAt,
    BENCHMARK_STEP_TIMEOUT_MS - BENCHMARK_STEP_RESERVE_MS);
  assert.equal(benchmarkReviewBudget({ startedAt: 0, env: { BH_BENCHMARK_STEP_TIMEOUT_MS: '900', BH_BENCHMARK_STEP_RESERVE_MS: '100' } }).deadlineAt, 800);
});

test('the reserve covers a worker call that was already in flight, plus the step tail', () => {
  // The runner's own per-call ceiling is 600 s (ops/rebuild-2026-09/bin/worker-runner.mjs `timeout: 600`),
  // and the work after the last review — ingest, the history state, the report — measured 6.4, 7.0 and
  // 7.0 s on the three runs before this defect. A reserve under the per-call ceiling would let a unit
  // admitted one millisecond before the deadline outlast the hard timeout, which is the state this
  // change exists to leave behind.
  assert.ok(BENCHMARK_STEP_RESERVE_MS >= 600_000, 'reserve must cover one in-flight worker call');
  assert.ok(BENCHMARK_STEP_RESERVE_MS < BENCHMARK_STEP_TIMEOUT_MS / 4, 'reserve must not eat the review window');
});

test('the hard timeout has one definition: daily.mjs imports it rather than repeating it', () => {
  assert.match(dailySrc, /import \{ BENCHMARK_STEP_TIMEOUT_MS \} from '\.\/step-budget\.mjs';/);
  const call = dailySrc.match(/await command\('refresh-benchmarks',[^\n]*\);/);
  assert.ok(call, 'refresh-benchmarks step call not found');
  assert.match(call[0], /BENCHMARK_STEP_TIMEOUT_MS\);$/);
  assert.equal(/await command\('refresh-benchmarks',[^\n]*8_?400_?000/.test(dailySrc), false,
    'the timeout must not be written out a second time beside the import');
});

test('phase-step gives the benchmarks step a real budget, timed from its own start', () => {
  assert.match(stepSrc, /import \{ benchmarkReviewBudget \} from '\.\/step-budget\.mjs';/);
  assert.match(stepSrc, /const startedAt = Date\.now\(\);/);
  assert.match(stepSrc, /refreshBenchmarks\(\{ runDir, cache: reuse, runId, budget \}\)/);
  // startedAt must be read before the step runs, not inside the call that uses it.
  assert.ok(stepSrc.indexOf('const startedAt = Date.now();') < stepSrc.indexOf('benchmarkReviewBudget({ startedAt })'));
});

test('every LLM review in refresh-benchmarks claims the budget before it starts', () => {
  for (const claim of ['budget.claim(`protocol-${entry.id}`)', 'budget.claim(`aa-fields-${index}`)',
    'budget.claim(`vendor-${url}`)', 'budget.claim(`scores-${unit.batch}`)']) {
    assert.ok(refreshSrc.includes(claim), `missing budget claim: ${claim}`);
  }
  // Each claim must precede the review/producer call it guards.
  const before = (claim, call) => {
    const a = refreshSrc.indexOf(claim), b = refreshSrc.indexOf(call, a);
    assert.ok(a !== -1 && b !== -1 && a < b, `${claim} must come before ${call}`);
  };
  before('budget.claim(`protocol-${entry.id}`)', 'artifactId: `protocol-${entry.id}`');
  before('budget.claim(`aa-fields-${index}`)', 'artifactId: `aa-fields-${index}`');
  before('budget.claim(`vendor-${url}`)', 'await runner(');
  before('budget.claim(`scores-${unit.batch}`)', 'artifactId: `scores-${unit.batch}`');
});

test('a budget-skipped score batch is retained; every other rejection still fails the run', () => {
  const loop = refreshSrc.slice(refreshSrc.indexOf('for (const unit of scoreBatches) {'));
  const skip = loop.indexOf('isBudgetExhausted(outcome.reason)');
  const rethrow = loop.indexOf('if (outcome.status === \'rejected\') throw outcome.reason;');
  assert.ok(skip !== -1, 'the score loop does not recognise a budget skip');
  assert.ok(rethrow !== -1, 'the score loop must still rethrow an ordinary rejection');
  assert.ok(skip < rethrow, 'a budget skip must be handled before the unconditional rethrow');
  assert.match(loop.slice(skip, rethrow), /fail\(`score-batch-\$\{unit\.batch\}`, outcome\.reason, checks, \{ unreviewed_rows: unit\.chunk\.length \}\); continue;/);
});

test('fail() gives a budget skip its own status and keeps the line profile-run.mjs parses', () => {
  const fail = refreshSrc.match(/const fail = \(id, error, sink = checks, extra = \{\}\) => \{[^\n]*\n?/);
  assert.ok(fail, 'fail() not found');
  assert.match(fail[0], /isBudgetExhausted\(error\) \? 'retained_budget_exhausted' : 'retained_after_failure'/);
  assert.match(fail[0], /BENCHMARK RETAINED \$\{id\}: \$\{reason\}/);
  // ops/daily/profile-run.mjs reads that console line with /^BENCHMARK RETAINED (\S+?): (.*)$/.
  assert.match('BENCHMARK RETAINED scores-3: review budget exhausted', /^BENCHMARK RETAINED (\S+?): (.*)$/);
});

test('the step reports what the clock cost, and a run with no budget says so distinctly', () => {
  assert.match(refreshSrc, /review_budget: \{ deadline_at: budget\.deadlineAt === null \? null : new Date\(budget\.deadlineAt\)\.toISOString\(\)/);
  assert.match(refreshSrc, /unreviewed_units: budget\.skipped/);
  assert.match(refreshSrc, /retained_budget_exhausted: checks\.filter\(\(c\) => c\.status === 'retained_budget_exhausted'\)\.length/);
});

test('source health calls a budget skip attention, not a failing source', () => {
  // The source answered; our clock ran out. Marking it `failing` would start a "failing since"
  // streak against a maintainer who did nothing wrong — but it must still reach the summary table,
  // which lists failing, attention and unknown alike.
  assert.equal(STATUS_KIND.retained_budget_exhausted, 'attention');
});

test('budgetTotals counts the skipped batches and rows the per-source table leaves out', () => {
  const run = { checks: [
    { id: 'score-batch-3', status: 'retained_budget_exhausted', unreviewed_rows: 15 },
    { id: 'score-batch-4', status: 'retained_budget_exhausted', unreviewed_rows: 9 },
    { id: 'score-batch-5', status: 'retained_budget_exhausted' },
    { id: 'arc-agi::1', status: 'retained_budget_exhausted' },
    { id: 'score-batch-6', status: 'retained_after_failure', quarantined_rows: 2 },
    { id: 'vals-index::2', status: 'checked_unchanged' },
  ] };
  assert.deepEqual(budgetTotals(run), {
    units: 4, batches: 3, rows: 24, unknown_batches: ['score-batch-5'], sources: ['arc-agi::1'],
  });
  assert.deepEqual(budgetTotals({ checks: [] }), { units: 0, batches: 0, rows: 0, unknown_batches: [], sources: [] });
  assert.deepEqual(budgetTotals(null), { units: 0, batches: 0, rows: 0, unknown_batches: [], sources: [] });
});

test('daily.mjs records a timeout as a timeout, at the end of the tail every reader clips', () => {
  const timedOut = dailySrc.indexOf('const timedOut = error.killed === true');
  const detail = dailySrc.indexOf('const detail = redact(', timedOut);
  assert.ok(timedOut !== -1 && detail !== -1 && timedOut < detail, 'the timeout must be detected before the detail is built');
  const line = dailySrc.slice(detail, dailySrc.indexOf('].filter(Boolean).join', detail));
  assert.match(line, /error\.stdout, error\.stderr, error\.message,\s*\n?\s*timedOut \?/, 'TIMEOUT must be appended last, so slice(-1800) keeps it');
  assert.match(line, /was killed after \$\{Date\.now\(\) - begin\} ms against its \$\{timeout\} ms limit/);
});

test('a synchronous claim inside a concurrency worker is isolated, not a thrown phase', async () => {
  // The claims are written as `(budget.claim(x), review({...}))`, so an exhausted budget throws
  // *synchronously* out of the worker rather than returning a rejected promise. mapWithConcurrency
  // awaits the worker inside its own try/catch, so that is one rejected unit and the siblings still
  // run — which is the whole point: unit 3 being too late must not cancel units 0-2.
  let clock = 0;
  const budget = createReviewBudget({ startedAt: 0, timeoutMs: 10, reserveMs: 6, now: () => clock });
  const settled = await mapWithConcurrency([0, 1, 2, 3], (unit) => (budget.claim(`scores-${unit}`), (clock += 2, Promise.resolve(`reviewed-${unit}`))), { limit: 1 });
  assert.deepEqual(settled.map((s) => s.status), ['fulfilled', 'fulfilled', 'rejected', 'rejected']);
  assert.deepEqual(settled.filter((s) => s.status === 'fulfilled').map((s) => s.value), ['reviewed-0', 'reviewed-1']);
  assert.ok(settled.slice(2).every((s) => isBudgetExhausted(s.reason)));
  assert.deepEqual(budget.skipped, ['scores-2', 'scores-3']);
});

test('a budget already spent before the first unit fails the step instead of reporting a green no-op', () => {
  // A 140-minute budget cannot expire before its first review. If it has, the deadline was wrong when
  // the step started, and the dangerous outcome is not a slow run — it is `ok: true` over a refresh
  // that reviewed nothing and republished yesterday's values as today's.
  const guard = refreshSrc.slice(refreshSrc.indexOf('if (budget.exhausted() && budget.skipped.length && !reviews.length)'));
  assert.ok(guard.startsWith('if (budget.exhausted()'), 'the guard is missing');
  assert.match(guard.slice(0, 600), /throw new Error\(/);
  assert.match(guard.slice(0, 600), /refusing to report a refresh that reviewed nothing/);
  // It must sit before the report is built, or it guards nothing.
  assert.ok(refreshSrc.indexOf('if (budget.exhausted() && budget.skipped.length && !reviews.length)')
    < refreshSrc.indexOf('const report = { ok: true, checked_at: at'));
  // A quiet day creates no units at all, so nothing is skipped and the guard stays out of the way.
  assert.match(guard.slice(0, 600), /budget\.skipped\.length/);
});
