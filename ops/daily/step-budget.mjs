// D249 (2026-09-28): a review budget for the benchmarks step, so its hard timeout stops
// discarding the work it already finished.
//
// What happened. On 2026-09-28 `refresh-benchmarks` ran 8,400,175 ms against the 8,400,000 ms
// timeout in daily.mjs and was killed 175 ms over. It had completed and approved 28 protocol
// reviews and 57 score batches; every one of them was thrown away, because the step writes
// `public-observations.json`, `score-approvals.json` and the history state only after the last
// batch. A step killed in minute 139 therefore publishes exactly as much as one that dies in
// minute 1 — nothing — and the day goes unpublished.
//
// Why it overran is not something we control. The call count was ordinary (172, against 103 on
// the run that published the day before); the worker hours went 2.36 → 7.50 because
// `provider: { sort: 'price' }` routed 86 of 94 critic calls to a provider that ignored
// `reasoning: { effort: 'low' }` and answered with 11,900 median completion tokens at 191.9 s,
// where the previous day's provider answered 561 tokens in 8.3 s. All 33 OpenRouter endpoints for
// that model advertise `reasoning` support, so `require_parameters` had nothing to filter on, and
// the slow route was gone again by 08:14. Pinning a model does not pin a provider, and no amount
// of worker policy makes a third party's latency predictable.
//
// So the budget is not a fix for slowness — it is the rule that slowness must cost only the
// reviews that did not fit. Units are admitted while the soft deadline is ahead; after it, a unit
// is not reviewed at all and is recorded `retained_budget_exhausted`, which is the same outcome
// the step already gives an arm whose source is unreachable: named, retained at its previous
// value, and not a reason to publish nothing.
//
// The reserve is what the step still needs after the last admitted unit: one worker call that was
// already in flight when the deadline passed (the runner's own per-call ceiling is 600 s), plus
// the ingest, the history state and the report — measured at 6.4–7.0 s on the three runs before
// this one. A straggler that outlasts the reserve leaves us exactly where we are today, so the
// budget is a strict improvement at every reserve; 600 s buys the common case without spending
// review time a normal 58-minute run would ever miss.

/** The benchmarks step's hard timeout — the parent kills the child at this age (daily.mjs). */
export const BENCHMARK_STEP_TIMEOUT_MS = 8_400_000;

/** Time the step keeps for an in-flight call plus ingest, history and its report. */
export const BENCHMARK_STEP_RESERVE_MS = 600_000;

/**
 * Thrown by `budget.claim()` in place of starting a review. Carries `budgetExhausted` so a caller
 * can tell "we ran out of clock" from "the reviewer said no" without an `instanceof` across module
 * instances.
 */
export class ReviewBudgetExhausted extends Error {
  constructor(label) {
    super(`review budget exhausted before ${label}: retained unreviewed`);
    this.name = 'ReviewBudgetExhausted';
    this.budgetExhausted = true;
  }
}

/** True for the error `claim()` throws, whichever copy of this module created it. */
export const isBudgetExhausted = (error) => error?.budgetExhausted === true;

/**
 * A budget whose deadline sits `reserveMs` before the step's hard timeout.
 * `claim(label)` throws once the deadline has passed and otherwise returns; it never blocks and
 * never cancels work that has already started.
 */
export function createReviewBudget({ startedAt = Date.now(), timeoutMs, reserveMs, now = Date.now } = {}) {
  if (!Number.isFinite(startedAt)) throw new Error('review budget needs a numeric startedAt');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('review budget needs a positive timeoutMs');
  if (!Number.isFinite(reserveMs) || reserveMs < 0) throw new Error('review budget needs a non-negative reserveMs');
  if (reserveMs >= timeoutMs) throw new Error('review budget reserve must leave time to review');
  const deadlineAt = startedAt + timeoutMs - reserveMs;
  const skipped = [];
  return {
    deadlineAt,
    get skipped() { return [...skipped]; },
    remainingMs: () => deadlineAt - now(),
    exhausted: () => now() >= deadlineAt,
    claim(label) {
      if (now() < deadlineAt) return;
      skipped.push(label);
      throw new ReviewBudgetExhausted(label);
    },
  };
}

/** The no-op budget: every caller that does not pass one behaves exactly as before. */
export function unlimitedReviewBudget() {
  return { deadlineAt: null, skipped: [], remainingMs: () => Infinity, exhausted: () => false, claim() {} };
}

/**
 * The benchmarks step's budget, with the two numbers overridable for fixtures and for a caller
 * that runs the step under a different timeout. Fails closed on an unusable value rather than
 * guessing, the same way `dailyConcurrency()` does.
 */
export function benchmarkReviewBudget({ startedAt = Date.now(), env = process.env, now = Date.now } = {}) {
  const read = (name, fallback) => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer of milliseconds`);
    return value;
  };
  return createReviewBudget({
    startedAt,
    timeoutMs: read('BH_BENCHMARK_STEP_TIMEOUT_MS', BENCHMARK_STEP_TIMEOUT_MS),
    reserveMs: read('BH_BENCHMARK_STEP_RESERVE_MS', BENCHMARK_STEP_RESERVE_MS),
    now,
  });
}
