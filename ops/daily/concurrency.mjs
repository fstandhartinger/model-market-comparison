// CR-73.3: bounded concurrency for the daily run's independent units.
//
// The 17 Sep baseline (ops/daily/PROFILE-CR73.md) spent 85.4 % of its wall clock on
// one LLM call at a time — 46 calls, concurrency 1.00 — although the units (live
// source contracts, score batches, vendor sources, AA field chunks) are independent
// of each other. This module runs such units with a bounded number in flight and
// hands the caller back one settled result per input **in input order**, so the
// aggregation that follows stays byte-identical to the sequential one. Nothing here
// changes what is reviewed; only how many reviews wait for each other.
//
// Rules this module keeps (CR-20260917g, verbatim):
//   * bounded queue — at most `limit` units in flight, never a fan-out over the list;
//   * deterministic aggregation — results are indexed by input position, never by
//     completion order, and the caller applies them in that order;
//   * failure isolation — one unit's rejection (a timed-out, malformed or slow
//     worker exhausting its own retry budget) never cancels a sibling; every unit
//     runs and reports, and the caller decides what a rejection means;
//   * serialised side effects — `onSettled` callbacks (progress files) are chained,
//     so two units can never write the same file at once.
export const DEFAULT_DAILY_CONCURRENCY = 4;
export const MAX_DAILY_CONCURRENCY = 8;

/**
 * Concurrency for daily units, from `BH_DAILY_CONCURRENCY` (1 = today's strictly
 * sequential behaviour). Fails closed on an unusable value instead of guessing.
 */
export function dailyConcurrency(env = process.env) {
  const raw = env.BH_DAILY_CONCURRENCY;
  if (raw === undefined || raw === '') return DEFAULT_DAILY_CONCURRENCY;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_DAILY_CONCURRENCY) {
    throw new Error(`BH_DAILY_CONCURRENCY must be an integer from 1 to ${MAX_DAILY_CONCURRENCY}`);
  }
  return value;
}

/**
 * Run `worker(item, index)` over `items` with at most `limit` in flight.
 * @returns {Promise<Array<{status:'fulfilled',value:any}|{status:'rejected',reason:Error}>>}
 *          one entry per input, in input order.
 */
export async function mapWithConcurrency(items, worker, { limit = 1, onSettled = null } = {}) {
  const list = Array.isArray(items) ? [...items] : [...(items ?? [])];
  if (typeof worker !== 'function') throw new Error('mapWithConcurrency requires a worker function');
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DAILY_CONCURRENCY) {
    throw new Error(`mapWithConcurrency limit must be an integer from 1 to ${MAX_DAILY_CONCURRENCY}`);
  }
  const results = new Array(list.length);
  let next = 0;
  let notify = Promise.resolve(); // side effects of settled units never overlap
  const lane = async () => {
    for (;;) {
      const index = next++;
      if (index >= list.length) return;
      let settled;
      try { settled = { status: 'fulfilled', value: await worker(list[index], index) }; }
      catch (error) { settled = { status: 'rejected', reason: error }; }
      results[index] = settled;
      if (onSettled) {
        // Progress reporting is observability: it is serialised and never fails a unit.
        notify = notify.then(() => onSettled(index, settled)).catch(() => {});
        await notify;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, lane));
  return results;
}

/** First rejection in input order, or null — so a parallel phase fails exactly where the sequential one did. */
export function firstRejection(settled) {
  for (const result of settled) if (result?.status === 'rejected') return result.reason;
  return null;
}
