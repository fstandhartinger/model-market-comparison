// CR-634 (2026-10-31, Florian card #19017 / reply #19020): Benchmark Heaven shows the Artificial Analysis Intelligence
// Index v5.0. AA rescored 89 models on v5 (85 of them also had a v4.x value); the other ~620 models only have their
// frozen v4.x value. So that every model can still be ordered, a v4-only model gets a labelled ESTIMATE of its v5 value
// from a monotone (isotonic) fit over the models measured on both versions (lib/benchmark-history.mjs
// computeIsotonicBridge). Rules:
//   * an estimate is never a measurement: it carries status 'estimated', its v4 source value, method, bridge count,
//     out-of-sample error and an 80 % interval, and it is never written into a raw file or a benchmark-results row;
//   * the fit is recomputed on every build from the two raw snapshots, so a model AA rescores on v5 becomes measured
//     and the overlap grows by itself;
//   * no estimates at all unless the fit passes the gate (≥ 30 bridges, leave-one-out MAE ≤ 5 points);
//   * Coding and Math Index have no v5 counterpart: they stay frozen v4.x measurements and are never estimated.
import { computeIsotonicBridge } from './benchmark-history.mjs';

export const AA_V5_FIELD = 'artificial_analysis_intelligence_index';
export const AA_FROZEN_V4_FIELDS = Object.freeze({ aa_coding_index: 'artificial_analysis_coding_index', aa_math_index: 'artificial_analysis_math_index' });
export const AA_ESTIMATE_LABEL = 'estimated from v4';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n) => Math.max(0, Math.min(100, n));
// All effort settings of one model are one group for the leave-one-group-out check ("GPT-6 Astra (High)" → "GPT-6 Astra").
export const aaBaseModel = (name) => String(name ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();

/**
 * @param {{ current: object, frozenV4: object }} snapshots  data/raw/artificialanalysis.json (v5) and artificialanalysis-v4.json
 * @returns {{ fit: object, byId: Map<string, object> }} byId: AA model UUID → intelligence record (measured or estimated)
 */
export function aaIntelligenceRecords({ current, frozenV4 }) {
  const version = current?.index_version;
  if (!version || String(version).split('.')[0] !== '5') throw new Error(`AA snapshot index_version ${version ?? 'missing'}; the v4→v5 estimates are defined for v5 only`);
  if (frozenV4?.index_version != null) throw new Error('artificialanalysis-v4.json must be the frozen legacy v4.x snapshot (no index_version)');
  const v4 = new Map((frozenV4?.models ?? []).map((m) => [m.id, m]));
  const pairs = [];
  for (const m of current.models ?? []) {
    const newValue = m.evaluations?.[AA_V5_FIELD], oldValue = v4.get(m.id)?.evaluations?.[AA_V5_FIELD];
    if (finite(newValue) && finite(oldValue)) pairs.push({ model_key: m.id, subject_name: m.name, group: aaBaseModel(m.name), old_value: oldValue, new_value: newValue });
  }
  const bridge = computeIsotonicBridge(pairs);
  const fit = {
    from_version: '4.x', to_version: version, method: bridge.method, bridge_count: bridge.bridge_count, comparable: bridge.comparable,
    cause: bridge.cause ?? null, reason: bridge.reason ?? null, policy: bridge.policy,
    v4_collected_at: frozenV4?.collected_at ?? null, v5_collected_at: current.collected_at ?? null,
    old_range: bridge.old_range ?? null,
    loo: bridge.loo, leave_one_model_out: bridge.logo,
    blocks: (bridge.blocks ?? []).map((b) => ({ v4_from: b.lo, v4_to: b.hi, v5: round1(b.y), n: b.n })),
  };
  const byId = new Map();
  for (const m of current.models ?? []) {
    const measured = m.evaluations?.[AA_V5_FIELD];
    if (finite(measured)) { byId.set(m.id, { version, status: 'measured', value: measured }); continue; }
    const oldValue = v4.get(m.id)?.evaluations?.[AA_V5_FIELD];
    if (!finite(oldValue) || !bridge.comparable) continue;
    const p = bridge.predict(oldValue);
    byId.set(m.id, { version, status: 'estimated', label: AA_ESTIMATE_LABEL, value: round1(clamp(p.value)),
      interval: [round1(clamp(p.lower)), round1(clamp(p.upper))], v4_value: oldValue, v4_collected_at: fit.v4_collected_at,
      method: bridge.method, bridge_count: bridge.bridge_count, loo_mae: round1(bridge.loo.mae) });
  }
  return { fit, byId };
}

/** Frozen v4.x Coding/Math Index values (measured 2026-10-27 or earlier; AA withdrew both indexes with v5.0). */
export function frozenV4IndexValues(frozenV4) {
  const byId = new Map();
  for (const m of frozenV4?.models ?? []) {
    const values = Object.fromEntries(Object.entries(AA_FROZEN_V4_FIELDS).map(([key, field]) => [key, finite(m.evaluations?.[field]) ? m.evaluations[field] : null]));
    byId.set(m.id, values);
  }
  return byId;
}
