// Phase 10 — historical benchmark comparison.
//
// Two mechanisms, kept deliberately separate:
//   1. Immutable dated states. Every ingestion run projects the score snapshot to a
//      compact state and stores it write-once under data/raw/benchmarks/history/.
//      Identical content resolves to the same content hash and is a no-op; a prior
//      state is never overwritten or deleted, so vanished values stay historical.
//   2. Bridge comparison. A model measured on an older benchmark version (or an older
//      dated state) but no longer present gets a *labelled estimate* on the current
//      version, derived from models measured on both. Ratios are aggregated with a
//      median and bounded by an interquartile spread.
//
// Honesty rules enforced here: an estimate is never a measurement, fewer than three
// bridges or a wide spread yields "nicht vergleichbar" instead of a number, and
// different units / directions / benchmarks are never mixed.
import { sha256 } from './benchmark-score-evidence.mjs';

export const HISTORY_SCHEMA_VERSION = 1;
export const BRIDGE_POLICY = { minBridges: 3, maxIqrRelative: 0.25, zeroFloor: 1e-12 };
export const ESTIMATE_STATUS = ['estimated', 'not_comparable', 'recompute_required'];

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const num = (v) => { const n = typeof v === 'string' && v.trim() ? Number(v) : v; return finite(n) ? n : null; };

// A model configuration is identified by catalog model, harness and effort. Two
// results are only bridgeable when every one of these matches.
export function modelKey(o) {
  return [o.subject?.model_id ?? `source:${o.subject?.source_id}`, o.subject?.harness ?? '', o.subject?.variant ?? ''].join('|');
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b), mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function versionRank(entry) {
  const parts = String(entry.version ?? '').split(/[^0-9]+/).filter(Boolean).map(Number);
  return parts.length ? parts.reduce((a, b) => a * 1000 + b, 0) : (entry.first_seen ? Date.parse(entry.first_seen) : 0);
}

// Project validated observations to a compact, canonically ordered state.
export function buildState(observations, { state_id, source, collected_at }) {
  const rows = observations
    .filter((o) => finite(o.value) && o.benchmark_id)
    .map((o) => ({ benchmark_id: o.benchmark_id, model_key: modelKey(o), model_id: o.subject?.model_id ?? null,
      subject_name: o.subject?.name ?? null, harness: o.subject?.harness ?? null, variant: o.subject?.variant ?? null,
      value: o.value, unit: o.unit, basis: o.basis, source_url: o.source?.url ?? null, source_retrieved_at: o.source?.retrieved_at ?? null }))
    .sort((a, b) => a.benchmark_id.localeCompare(b.benchmark_id) || a.model_key.localeCompare(b.model_key) || a.value - b.value);
  const content_sha256 = sha256(JSON.stringify(rows));
  const benchmark_ids = [...new Set(rows.map((r) => r.benchmark_id))].sort();
  return { schema_version: HISTORY_SCHEMA_VERSION, state_id, source, collected_at, content_sha256, count: rows.length, benchmark_ids, rows };
}

// Aggregate bridge ratios new/old. The ratio is taken in metric space, so a
// lower-is-better board is handled by the same arithmetic; direction only affects
// ranking display, never the estimate.
export function computeBridgeComparison(pairs) {
  const bridges = [];
  for (const p of pairs) {
    const oldValue = num(p.old_value), newValue = num(p.new_value);
    if (oldValue == null || newValue == null || Math.abs(oldValue) < BRIDGE_POLICY.zeroFloor) continue;
    const ratio = newValue / oldValue;
    if (!finite(ratio) || ratio <= 0) continue;
    bridges.push({ model_key: p.model_key, subject_name: p.subject_name ?? null, old_value: oldValue, new_value: newValue, ratio });
  }
  const n = bridges.length;
  if (n < BRIDGE_POLICY.minBridges) {
    return { bridge_count: n, comparable: false, cause: 'insufficient_bridges', cause_value: n, reason: `only ${n} bridge configuration(s); at least ${BRIDGE_POLICY.minBridges} required`,
      aggregate: null, spread: null, bridges: bridges.sort((a, b) => a.ratio - b.ratio) };
  }
  const ratios = bridges.map((b) => b.ratio).sort((a, b) => a - b);
  const aggregate = median(ratios), q1 = quantile(ratios, 0.25), q3 = quantile(ratios, 0.75);
  const iqr = q3 - q1, iqr_relative = aggregate > 0 ? iqr / aggregate : null;
  const comparable = iqr_relative != null && iqr_relative <= BRIDGE_POLICY.maxIqrRelative;
  return { bridge_count: n, aggregate, spread: { min: ratios[0], q1, q3, max: ratios.at(-1), iqr, iqr_relative },
    comparable, cause: comparable ? null : 'spread_too_wide', cause_value: comparable ? null : iqr_relative,
    reason: comparable ? null : `bridge IQR is ${(100 * iqr_relative).toFixed(1)}% of the median (limit ${BRIDGE_POLICY.maxIqrRelative * 100}%)`,
    bridges: bridges.sort((a, b) => a.ratio - b.ratio) };
}

// Average rank position of a value on a descending board, in [0, 1]. Ties share
// the midpoint of their rank block so the shift is not biased by input order.
function rankIn(sorted, value) {
  const first = sorted.findIndex((r) => r.value === value);
  if (first < 0) return 1;
  let last = first;
  while (last + 1 < sorted.length && sorted[last + 1].value === value) last += 1;
  return ((first + last) / 2) / Math.max(1, sorted.length - 1);
}

// Elo / battle boards shift ranks rather than scale values. Estimate the target
// value at the historical model's rank, corrected by the median bridge rank shift.
// The spread of the bridge shifts is the uncertainty on the 0-1 rank scale, so the
// same ±25% honesty gate that guards ratio bridges guards rank shifts too.
export function computeRankShift(oldValues, newValues, pairs) {
  const oldSorted = [...oldValues].sort((a, b) => b.value - a.value), newSorted = [...newValues].sort((a, b) => b.value - a.value);
  if (oldSorted.length < BRIDGE_POLICY.minBridges || newSorted.length < BRIDGE_POLICY.minBridges) {
    return { bridge_count: 0, comparable: false, cause: 'insufficient_bridges', cause_value: 0, reason: 'not enough published values on one side for a rank shift', shift: null, spread: null };
  }
  const oldSeen = new Set(oldSorted.map((r) => r.value)), newSeen = new Set(newSorted.map((r) => r.value));
  const bridged = pairs.filter((p) => oldSeen.has(p.old_value) && newSeen.has(p.new_value));
  const shifts = bridged.map((p) => rankIn(newSorted, p.new_value) - rankIn(oldSorted, p.old_value)).sort((a, b) => a - b);
  if (shifts.length < BRIDGE_POLICY.minBridges) return { bridge_count: shifts.length, comparable: false, cause: 'insufficient_bridges', cause_value: shifts.length, reason: `only ${shifts.length} bridge configuration(s)`, shift: null, spread: null };
  const shift = median(shifts), q1 = quantile(shifts, 0.25), q3 = quantile(shifts, 0.75);
  const iqr = q3 - q1, iqr_relative = iqr;
  const comparable = iqr_relative <= BRIDGE_POLICY.maxIqrRelative;
  return { bridge_count: shifts.length, comparable, shift, cause: comparable ? null : 'spread_too_wide', cause_value: comparable ? null : iqr,
    spread: { min: shifts[0], q1, q3, max: shifts.at(-1), iqr, iqr_relative },
    reason: comparable ? null : `rank-shift IQR is ${(100 * iqr).toFixed(1)}% of the 0-1 rank scale (limit ${BRIDGE_POLICY.maxIqrRelative * 100}%)` };
}

export function estimateFromRankShift(sourceValue, oldValues, newValues, comparison) {
  const oldSorted = [...oldValues].sort((a, b) => b.value - a.value), newSorted = [...newValues].sort((a, b) => b.value - a.value);
  const pct = Math.max(0, Math.min(1, rankIn(oldSorted, sourceValue) + comparison.shift));
  const pos = pct * (newSorted.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? newSorted[lo].value : newSorted[lo].value + (newSorted[hi].value - newSorted[lo].value) * (pos - lo);
}

function byBenchmark(observations) {
  const map = new Map();
  for (const o of observations) {
    if (!finite(o.value)) continue;
    if (!map.has(o.benchmark_id)) map.set(o.benchmark_id, new Map());
    map.get(o.benchmark_id).set(modelKey(o), o);
  }
  return map;
}

function targetSource(o) {
  return o ? { url: o.source?.url ?? null, retrieved_at: o.source?.retrieved_at ?? null, published_at: o.source?.published_at ?? null, file: o.source?.file ?? null, locator: o.source?.locator ?? null } : null;
}

// Cross-version estimates: within one family, a newer active version is the target,
// each older comparable version is a source. Never bridge across families, units or
// directions. Derived/composite entries are marked recompute-required, not estimated.
export function crossVersionEstimates(observations, registry) {
  const obs = byBenchmark(observations), entries = registry.entries ?? [];
  const families = new Map();
  for (const e of entries) families.set(e.family, [...(families.get(e.family) || []), e]);
  const estimates = [];
  for (const [family, members] of families) {
    const withObs = members.filter((e) => obs.has(e.id));
    if (withObs.length < 2) continue;
    const active = withObs.filter((e) => e.status === 'active' || e.version_status === 'published');
    const target = (active.length ? active : withObs).sort((a, b) => versionRank(b) - versionRank(a))[0];
    const targetObs = obs.get(target.id);
    const sources = withObs.filter((e) => e.id !== target.id && e.scoring?.unit === target.scoring?.unit && e.scoring?.higher_better === target.scoring?.higher_better);
    for (const source of sources) {
      const sourceObs = obs.get(source.id);
      const pairs = [];
      for (const [key, s] of sourceObs) { const t = targetObs.get(key); if (t) pairs.push({ model_key: key, subject_name: s.subject?.name, old_value: s.value, new_value: t.value }); }
      const derived = target.scoring?.derived === true || target.scoring?.recompute_required === true;
      const elo = /elo/i.test(target.scoring?.metric ?? '') || target.scoring?.unit === 'Elo';
      const method = derived ? 'recompute-required' : elo ? 'bridge-rank-shift' : 'bridge-median-ratio';
      let comparison = {
        bridge_count: 0, comparable: false, cause: 'insufficient_bridges', cause_value: 0, aggregate: null, spread: null, shift: null, bridges: [],
        reason: derived ? 'derived/composite index: recompute from its inputs instead of bridging' : 'no comparable bridge configurations',
      };
      if (elo) {
        const c = computeRankShift([...sourceObs.values()], [...targetObs.values()], pairs);
        comparison = { bridge_count: c.bridge_count, comparable: c.comparable, cause: c.cause ?? null, cause_value: c.cause_value ?? null, reason: c.reason, aggregate: c.shift, spread: c.spread, shift: c.shift, bridges: [] };
      } else if (!derived) {
        comparison = computeBridgeComparison(pairs);
      }
      for (const [key, s] of sourceObs) {
        if (targetObs.has(key)) continue;
        const status = derived ? 'recompute_required' : comparison.comparable ? 'estimated' : 'not_comparable';
        let value = null, uncertainty = null;
        if (status === 'estimated') {
          value = elo ? estimateFromRankShift(s.value, [...sourceObs.values()], [...targetObs.values()], comparison) : s.value * comparison.aggregate;
          if (comparison.spread) {
            if (elo) {
              const at = (shift) => estimateFromRankShift(s.value, [...sourceObs.values()], [...targetObs.values()], { shift });
              const lower = at(comparison.spread.q1), upper = at(comparison.spread.q3), min = at(comparison.spread.min), max = at(comparison.spread.max);
              uncertainty = { lower: Math.min(lower, upper), upper: Math.max(lower, upper), min: Math.min(min, max), max: Math.max(min, max), iqr: comparison.spread.iqr, iqr_relative: comparison.spread.iqr_relative };
            } else {
              uncertainty = { lower: s.value * comparison.spread.q1, upper: s.value * comparison.spread.q3,
                min: s.value * comparison.spread.min, max: s.value * comparison.spread.max, iqr: comparison.spread.iqr, iqr_relative: comparison.spread.iqr_relative };
            }
          }
        }
        estimates.push({
          id: `hist:${source.id}->${target.id}:${key}`,
          benchmark_id: target.id, family, source_benchmark_id: source.id, source_state_id: null,
          model_id: s.subject?.model_id ?? null, subject_name: s.subject?.name ?? null, harness: s.subject?.harness ?? null,
          variant: s.subject?.variant ?? null, cohort: s.subject?.harness ?? null,
          unit: target.scoring?.unit ?? null, higher_better: target.scoring?.higher_better ?? null,
          method, status, source_value: s.value, value, uncertainty,
          comparison: { bridge_count: comparison.bridge_count, aggregate: comparison.aggregate ?? null, spread: comparison.spread ?? null, comparable: comparison.comparable, reason: comparison.reason ?? null,
            cause: status === 'not_comparable' ? (comparison.cause ?? null) : null,
            cause_value: status === 'not_comparable' ? (comparison.cause_value ?? null) : null,
            bridges: status === 'estimated' && !elo ? (comparison.bridges ?? []) : [] },
          source: targetSource(s),
          note: status === 'estimated'
            ? 'Bridge-based estimate from an older benchmark version. Not a measurement; spread and bridge count bound the uncertainty.'
            : status === 'recompute_required'
              ? 'Composite/derived index: recompute from its inputs when they receive current-state values instead of bridging.'
              : 'Not comparable under the bridge policy; no estimate is published.',
        });
      }
    }
  }
  return estimates;
}

// Same-benchmark dated-state estimates: a value that existed in an older retained
// state but is absent now. Bridges are configurations present in both states.
export function datedEstimates(observations, registry, states) {
  const current = byBenchmark(observations), entries = new Map((registry.entries ?? []).map((e) => [e.id, e]));
  const estimates = [];
  for (const state of states ?? []) {
    const stateRows = state.rows ?? [];
    const byId = new Map();
    for (const r of stateRows) byId.set(r.benchmark_id, [...(byId.get(r.benchmark_id) || []), r]);
    for (const [benchmark_id, rows] of byId) {
      const entry = entries.get(benchmark_id), live = current.get(benchmark_id);
      if (!entry || !live || entry.scoring?.derived === true) continue;
      const oldByKey = new Map(rows.map((r) => [r.model_key, r])), pairs = [];
      for (const [key, r] of oldByKey) { const t = live.get(key); if (t) pairs.push({ model_key: key, subject_name: r.subject_name, old_value: r.value, new_value: t.value }); }
      const elo = /elo/i.test(entry.scoring?.metric ?? '') || entry.scoring?.unit === 'Elo';
      const oldValues = rows.map((r) => ({ value: r.value })), newValues = [...live.values()].map((o) => ({ value: o.value }));
      const method = elo ? 'bridge-rank-shift' : 'bridge-median-ratio';
      const c = elo ? computeRankShift(oldValues, newValues, pairs) : computeBridgeComparison(pairs);
      const comparison = { bridge_count: c.bridge_count, aggregate: c.aggregate ?? c.shift ?? null, spread: c.spread ?? null, comparable: c.comparable, reason: c.reason ?? null, cause: c.cause ?? null, cause_value: c.cause_value ?? null, bridges: c.bridges ?? [] };
      for (const [key, r] of oldByKey) {
        if (live.has(key)) continue;
        const status = comparison.comparable ? 'estimated' : 'not_comparable';
        let value = null, uncertainty = null;
        if (status === 'estimated') {
          value = elo ? estimateFromRankShift(r.value, oldValues, newValues, { shift: comparison.aggregate }) : r.value * comparison.aggregate;
          if (comparison.spread) {
            if (elo) {
              const at = (shift) => estimateFromRankShift(r.value, oldValues, newValues, { shift });
              const lower = at(comparison.spread.q1), upper = at(comparison.spread.q3), min = at(comparison.spread.min), max = at(comparison.spread.max);
              uncertainty = { lower: Math.min(lower, upper), upper: Math.max(lower, upper), min: Math.min(min, max), max: Math.max(min, max), iqr: comparison.spread.iqr, iqr_relative: comparison.spread.iqr_relative };
            } else {
              uncertainty = { lower: r.value * comparison.spread.q1, upper: r.value * comparison.spread.q3, min: r.value * comparison.spread.min, max: r.value * comparison.spread.max, iqr: comparison.spread.iqr, iqr_relative: comparison.spread.iqr_relative };
            }
          }
        }
        estimates.push({ id: `hist-state:${state.state_id}:${benchmark_id}:${key}`, benchmark_id, family: entry.family, source_benchmark_id: benchmark_id, source_state_id: state.state_id,
          model_id: r.model_id, subject_name: r.subject_name, harness: r.harness, variant: r.variant, cohort: r.harness,
          unit: entry.scoring?.unit ?? null, higher_better: entry.scoring?.higher_better ?? null, method, status,
          source_value: r.value, value, uncertainty,
          comparison: { bridge_count: comparison.bridge_count, aggregate: comparison.aggregate, spread: comparison.spread, comparable: comparison.comparable, reason: comparison.reason,
            cause: status === 'not_comparable' ? (comparison.cause ?? null) : null,
            cause_value: status === 'not_comparable' ? (comparison.cause_value ?? null) : null,
            bridges: status === 'estimated' && !elo ? comparison.bridges : [] },
          source: { url: r.source_url, retrieved_at: r.source_retrieved_at, published_at: null, file: null, locator: null },
          note: status === 'estimated' ? `Estimated from retained state ${state.state_id}; the value is no longer published in the current state.` : 'Value retained historically, but not comparable under the bridge policy.' });
      }
    }
  }
  return estimates;
}

export function buildHistoricalEstimates({ observations, registry, history }) {
  const states = history?.states ?? [];
  const estimates = [...datedEstimates(observations, registry, states), ...crossVersionEstimates(observations, registry)];
  estimates.sort((a, b) => a.benchmark_id.localeCompare(b.benchmark_id) || (a.subject_name ?? '').localeCompare(b.subject_name ?? ''));
  return { schema_version: HISTORY_SCHEMA_VERSION, policy: BRIDGE_POLICY,
    states: states.map((s) => ({ state_id: s.state_id, source: s.source, collected_at: s.collected_at, content_sha256: s.content_sha256, count: s.count ?? (s.rows?.length ?? 0), benchmark_ids: s.benchmark_ids ?? [] })),
    counts: { estimated: estimates.filter((e) => e.status === 'estimated').length, not_comparable: estimates.filter((e) => e.status === 'not_comparable').length, recompute_required: estimates.filter((e) => e.status === 'recompute_required').length },
    estimates };
}
