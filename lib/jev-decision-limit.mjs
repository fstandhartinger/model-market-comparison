// JevBench v1.7.0 (10 s rule): display helpers shared by the board, model pages, comparison pages and the machine surfaces.
// This module only reads and formats published row fields; it never computes a score.
// A v1.6 number is never returned as a v1.7 number: pending rows keep their v1.6 values under the label "v1.6".

export const JEV_METHOD_LABEL = 'method v1.7 (10 s rule)';
export const JEV_LIMIT_S = 10;
export const JEV_REMEASURE_PENDING = 'remeasure-pending';
export const JEV_REMEASURE_PENDING_LABEL = 're-measure pending under the 10 s rule';
export const JEV_REMEASURE_PENDING_NOTE = 'Re-measure pending under the 10 s rule: this row\'s per-decision times were recorded on a loaded CPU host, so they cannot be scored under the time limit. Shown with its v1.6 values until it is measured again.';
export const JEV_NOT_RESCORED = 'not yet re-scored under the 10 s rule';
export const JEV_CARRY_LABEL = 'measured before the 10 s rule (v1.5 method), not re-scored';
// Share treatment: calibration is multiplied by the share answered in time (never "worst calibration").
export const JEV_LIMIT_RULE_EN = 'A decision that takes longer than 10 seconds (measured time) counts as a wrong answer and as zero calibration for that item: each type\'s calibration is multiplied by the share of its decisions answered within 10 s.';
export const JEV_LIMIT_RAW_NOTE = 'The limit uses the measured time (raw). The displayed adjusted time for self-hosted rows (2 × + 0.15 s) is an assumption and is not used for the limit.';

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const fixed = (v, d = 2) => (isNumber(v) ? v.toFixed(d) : '—');
const count = (v) => (isNumber(v) ? v.toLocaleString('en-US') : '—');

export const isRemeasurePending = (row) => row?.listing === JEV_REMEASURE_PENDING;

/**
 * Method chip for a row. kind: 'v1.7' (re-scored), 'v1.6-pending' (v1.6 values, re-measure pending), 'v1.5-carry', or null
 * when the row carries no method information (an archive board that predates v1.7).
 */
export function jevMethodView(row, { carry = false, carryLabel = JEV_CARRY_LABEL } = {}) {
  if (carry) return { kind: 'v1.5-carry', text: 'v1.5', title: carryLabel };
  if (isRemeasurePending(row) || row?.method === 'v1.6') {
    return { kind: 'v1.6-pending', text: 'v1.6 · re-measure pending', title: JEV_REMEASURE_PENDING_NOTE };
  }
  if (row?.method === 'v1.7') {
    if (row.new_in) return { kind: 'v1.7', text: 'v1.7 · 10 s rule', title: `${JEV_LIMIT_RULE_EN} New in ${row.new_in}: measured under the rule, so there is no v1.6 value.` };
    if (row.remeasured_in) return { kind: 'v1.7', text: 'v1.7 · 10 s rule', title: `${JEV_LIMIT_RULE_EN} Re-measured in ${row.remeasured_in} on the same items on a GPU; this row replaces the earlier CPU row in full (scores and times).` };
    return { kind: 'v1.7', text: 'v1.7 · 10 s rule', title: `${JEV_LIMIT_RULE_EN} Re-scored in ${row.rescored_in ?? 'v1.7.0'} from the recorded per-decision times; measured in ${row.measured_in ?? 'an earlier release'}.` };
  }
  return null;
}

/** Latency + limit view of a v1.7 row: raw p50/p95, the over-limit count of n decisions. Null for rows without a limit. */
export function jevDecisionLimitView(row) {
  const lim = row?.decision_limit;
  if (!lim || typeof lim !== 'object') return null;
  const sp = row.speed ?? {};
  const n = isNumber(lim.speed_n) ? lim.speed_n : isNumber(sp.n) ? sp.n : null;
  const nOver = isNumber(lim.n_over_limit) ? lim.n_over_limit : null;
  const p95Raw = isNumber(sp.p95_s_raw) ? sp.p95_s_raw : null;
  const p95Adj = isNumber(sp.p95_s_adjusted) ? sp.p95_s_adjusted : null;
  const p50Raw = isNumber(sp.p50_s_raw) ? sp.p50_s_raw : null;
  const limit = isNumber(lim.limit_s) ? lim.limit_s : JEV_LIMIT_S;
  const adjustedOver = p95Adj != null && p95Adj > limit && nOver === 0;
  return {
    limit, n, nOver, nOverOk: isNumber(lim.n_over_limit_answered_ok) ? lim.n_over_limit_answered_ok : null,
    p50Raw, p95Raw, p95Adjusted: p95Adj, adjustedOver,
    countText: nOver == null ? '—' : n == null ? `${count(nOver)} over ${limit} s` : `${count(nOver)} of ${count(n)} over ${limit} s`,
    p95Text: p95Raw == null ? '—' : `p95 ${fixed(p95Raw, 3)} s`,
    text: `${p95Raw == null ? 'p95 —' : `p95 ${fixed(p95Raw, 3)} s (measured)`} · ${nOver == null ? '—' : n == null ? `${count(nOver)} over ${limit} s` : `${count(nOver)} of ${count(n)} over ${limit} s`}`,
    note: adjustedOver ? `${JEV_LIMIT_RAW_NOTE} Adjusted p95 ${fixed(p95Adj, 2)} s, 0 decisions over the limit.` : JEV_LIMIT_RAW_NOTE,
  };
}

/** The v1.6.x values a row was published with before the 10 s rule, labelled as v1.6. Null when the row has no `previous`. */
export function jevPreviousView(row) {
  const p = row?.previous;
  if (!p || typeof p !== 'object') return null;
  const release = p.board_release ?? 'v1.6';
  const sp = p.speed ?? {};
  return {
    release, method: p.method ?? 'v1.6', measuredIn: p.measured_in ?? null,
    composite: isNumber(p.jevbench_score) ? p.jevbench_score : isNumber(p.scores?.A) ? p.scores.A : null,
    capability: isNumber(p.capability) ? p.capability : null,
    axes: p.axes ?? null, rank: p.rank ?? null, openBoardRank: p.open_board_rank ?? null, apiBoardRank: p.api_board_rank ?? null,
    capabilityRank: p.capability_rank ?? null, p50: isNumber(sp.p50_s_raw) ? sp.p50_s_raw : null, p95: isNumber(sp.p95_s_raw) ? sp.p95_s_raw : null,
    label: `${release} (method v1.6, before the 10 s rule)`,
    short: `${release}: A ${fixed(isNumber(p.jevbench_score) ? p.jevbench_score : p.scores?.A)}${p.rank != null ? ` · #${p.rank}` : ''}`,
  };
}

/** Tooltip text "v1.6.37: A 73.73 · #12" or null. */
export const jevPreviousTitle = (row) => jevPreviousView(row)?.short ?? null;

const delta = (a, b) => (isNumber(a) && isNumber(b) ? b - a : null);
const signed = (v, d = 2) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}`);

/**
 * Rows of the release-page `<details data-bh-jev-v170-old-new>` table. Sorted by new rank (ranked first), then pending, then carry.
 * Pending rows show only their v1.6 values in the "old" columns and "re-measure pending" in the "new" columns: a v1.6 number is
 * never placed in a v1.7 column.
 */
export function jevOldNewRows(systems, carryRows = []) {
  const rows = (systems ?? []).map((row) => {
    const prev = jevPreviousView(row);
    const lim = jevDecisionLimitView(row);
    const pending = isRemeasurePending(row) || row.method === 'v1.6';
    const status = pending ? 'remeasure-pending' : row.new_in ? 'new' : row.remeasured_in ? 'remeasured' : 're-scored';
    const speed = row.speed ?? {};
    return {
      key: row.key, name: row.display, status, method: jevMethodView(row)?.kind ?? null, ranked: !!row.ranked && !pending,
      oldA: prev?.composite ?? null, newA: pending ? null : isNumber(row.jevbench_score) ? row.jevbench_score : row.scores?.A ?? null,
      oldCapability: prev?.capability ?? null, newCapability: pending ? null : isNumber(row.capability) ? row.capability : null,
      oldRank: prev?.rank ?? null, newRank: pending ? null : row.rank ?? null,
      oldSpeed: prev?.axes?.speed ?? null, newSpeed: pending ? null : row.axes?.speed ?? null,
      p50Raw: pending ? null : isNumber(speed.p50_s_raw) ? speed.p50_s_raw : null, p95Raw: pending ? null : isNumber(speed.p95_s_raw) ? speed.p95_s_raw : null,
      nOver: pending ? null : lim?.nOver ?? null, n: pending ? null : lim?.n ?? null,
    };
  }).map((r) => ({ ...r, dA: delta(r.oldA, r.newA), dCapability: delta(r.oldCapability, r.newCapability) }));
  const order = (r) => (r.status === 'remeasure-pending' ? 1 : 0);
  rows.sort((x, y) => order(x) - order(y) || (x.newRank ?? Infinity) - (y.newRank ?? Infinity) || x.name.localeCompare(y.name));
  for (const c of carryRows ?? []) {
    rows.push({ key: c.key, name: c.display, status: 'carry', method: 'v1.5-carry', ranked: false,
      oldA: isNumber(c.composite_v15) ? c.composite_v15 : null, newA: null, oldCapability: isNumber(c.capability) ? c.capability : null, newCapability: null,
      oldRank: null, newRank: null, oldSpeed: null, newSpeed: null, p50Raw: null, p95Raw: null, nOver: null, n: null, dA: null, dCapability: null });
  }
  return rows;
}

export { fixed as jevFixed, signed as jevSigned };

/** Plain-text line for tables that cannot render components (llms-full, exports): "p95 3.210 s · 4 of 1500 over 10 s". */
export function jevDecisionLimitText(row) {
  const v = jevDecisionLimitView(row);
  if (!v) return isRemeasurePending(row) ? JEV_REMEASURE_PENDING_LABEL : '';
  return v.text;
}

/** Flat JSON fields for exports and the agent feed. Pending rows carry no v1.7 values: their `previous` is v1.6. */
export function jevMethodJsonFields(row) {
  const view = jevMethodView(row);
  const lim = jevDecisionLimitView(row);
  const prev = jevPreviousView(row);
  return {
    method: row?.method ?? null,
    rescored_in: row?.rescored_in ?? null,
    ...(row?.new_in ? { new_in: row.new_in } : {}),
    ...(row?.remeasured_in ? { remeasured_in: row.remeasured_in } : {}),
    method_status: view?.kind ?? null,
    p95_s_raw: lim?.p95Raw ?? null,
    p95_s_adjusted: lim?.p95Adjusted ?? null,
    decisions_over_10s: lim?.nOver ?? null,
    decisions_over_10s_answered_ok: lim?.nOverOk ?? null,
    decisions: lim?.n ?? null,
    previous: prev ? {
      board_release: prev.release, method: prev.method, composite_score: prev.composite, capability: prev.capability, axes: prev.axes,
      rank: prev.rank, open_board_rank: prev.openBoardRank, api_board_rank: prev.apiBoardRank,
    } : null,
  };
}

/** Per-system agent-feed fields (v1.7 feed only): method, the decision-limit object verbatim and the v1.6 values under `previous`. */
export function jevFeedMethodFields(row) {
  const { method, rescored_in, method_status, previous, new_in, remeasured_in } = jevMethodJsonFields(row);
  return { method, rescored_in, ...(new_in ? { new_in } : {}), ...(remeasured_in ? { remeasured_in } : {}), method_status, decision_limit: row?.decision_limit ? { ...row.decision_limit } : null, previous };
}
