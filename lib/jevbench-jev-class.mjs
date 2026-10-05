// Florian 25 Sep 2026 (DECISIONS.md): /jev-models leads with the Capability ranking of Jev-class systems.
// A system is Jev-class when its cost per decision is at most 2x Jev 1.13.0's AND its median latency is at most
// 2x Jev 1.13.0's. Presentation only: no score, axis or official rank changes.

import { jevbenchCapabilityRows } from './jevbench-capability.mjs';

export const JEV_CLASS_REFERENCE_KEY = 'jev-1.13.0';
export const JEV_CLASS_FACTOR = 2;
// v1.6.0 uses a frozen reference: Jev 1.13.0 as measured in the live v1.5.7 artifact (USD 0.032297327586206896 per 1k, p50 0.6164783202111721 s); caps = 2x.
export const JEV_V16_FROZEN_LIMITS = Object.freeze({ cost: 0.06459465517241379, latency: 1.2329566404223442 });
export const JEV_V16_REFERENCE_LABEL = 'Jev (v1.5 reference)';
export const JEV_V16_CLASS_OPTIONS = Object.freeze({ limits: JEV_V16_FROZEN_LIMITS, referenceLabel: JEV_V16_REFERENCE_LABEL });
// Speed = mean of score(p50) and score(p95) with score(s) = 100 - 20 log10(s / 0.1 s). A factor f in latency moves
// Speed by 20 log10(f), so 2x latency is 6.02 Speed points.
const SPEED_POINTS_PER_FACTOR = (factor) => 20 * Math.log10(factor);

/** The latency the Jev-class rule gates on: p50 after the published self-host/demo adjustment. */
export const medianLatency = (row) => {
  const adjusted = row?.speed?.p50_s_adjusted;
  if (Number.isFinite(adjusted)) return adjusted;
  const raw = row?.speed?.p50_s_raw;
  return Number.isFinite(raw) && /^none/i.test(String(row?.speed?.adjustment ?? 'none')) ? raw : null;
};

/**
 * A latency expressed on the Speed axis: score(s) = 100 − 20 log10(s / 0.1 s), clipped to 0–100.
 * This is the *same* scale the published Speed axis uses (whose composite value is the arithmetic mean of
 * score(p50) and score(p95), i.e. the score of the geometric mean of the two latencies). The Capability-vs-speed
 * chart must plot this of the *median* latency, because the Jev-class rule gates on the median (p50), not on the
 * p50/p95 blend — otherwise a row can pass the median gate yet sit left of a line drawn on the blend (CR-176.3).
 */
export const speedFromLatency = (seconds) => Math.max(0, Math.min(100, 100 - 20 * Math.log10(seconds / 0.1)));

/** The in-class Speed of a row's median latency, or null when the row records no median (a v1.3 carryover). */
export const medianLatencySpeed = (row) => {
  const latency = medianLatency(row);
  return latency == null ? null : speedFromLatency(latency);
};

const finite = (value) => (Number.isFinite(value) ? value : null);

/** Spearman correlation with average ranks for ties; missing pairs are omitted. */
export function spearman(xs, ys) {
  if (xs.length !== ys.length) throw new Error('Spearman requires paired arrays');
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 2) return null;
  const ranks = (values) => {
    const order = values.map((value, i) => ({ value, i })).sort((a, b) => a.value - b.value);
    const result = [];
    for (let i = 0; i < order.length;) {
      let j = i + 1;
      while (j < order.length && order[j].value === order[i].value) j++;
      for (let k = i; k < j; k++) result[order[k].i] = (i + j + 1) / 2;
      i = j;
    }
    return result;
  };
  const x = ranks(pairs.map((p) => p[0])), y = ranks(pairs.map((p) => p[1]));
  const mean = (pairs.length + 1) / 2;
  let covariance = 0, vx = 0, vy = 0;
  for (let i = 0; i < x.length; i++) {
    covariance += (x[i] - mean) * (y[i] - mean);
    vx += (x[i] - mean) ** 2; vy += (y[i] - mean) ** 2;
  }
  return vx && vy ? covariance / Math.sqrt(vx * vy) : null;
}

/** Traffic-light boundaries are inclusive: reference = green, cap = amber. */
export const trafficLightZone = (ratio, factor = JEV_CLASS_FACTOR) =>
  ratio == null || !Number.isFinite(ratio) || ratio < 0 ? null : ratio <= 1 ? 'green' : ratio <= factor ? 'amber' : 'red';

/** Shared log ratio scale, clamped to 0.25× … 64×. */
export const ratioPosition = (ratio) => Math.max(0, Math.min(100, Math.log2(Math.max(0.25, ratio) / 0.25) / 8 * 100));

/**
 * Classify every system with published Intelligence and Calibration.
 * Rows carried over from v1.3 have no recorded median latency in the artifact; for them the Speed axis decides,
 * at the Speed-axis equivalent of 2x latency (Jev's Speed minus 6.02).
 */
export function jevClassRows(systems, { referenceKey = JEV_CLASS_REFERENCE_KEY, factor = JEV_CLASS_FACTOR, costFactor = factor, latencyFactor = factor, limits: absoluteLimits, referenceLabel = 'Jev' } = {}) {
  if (!Number.isFinite(factor) || factor <= 1) throw new Error('Class factor must be greater than 1');
  if (![costFactor, latencyFactor].every((v) => v === Infinity || (Number.isFinite(v) && v >= 1))) throw new Error('Cost and latency factors must be at least 1 or Infinity');
  if (absoluteLimits && (![absoluteLimits.cost, absoluteLimits.latency].every((v) => Number.isFinite(v) && v > 0))) throw new Error('Absolute cost and latency limits must be positive');
  const reference = systems.find((row) => row.key === referenceKey);
  const refCost = absoluteLimits ? absoluteLimits.cost / factor : finite(reference?.cost?.usd_per_1000);
  const refLatency = absoluteLimits ? absoluteLimits.latency / factor : reference ? medianLatency(reference) : null;
  const refSpeed = absoluteLimits ? 100 - SPEED_POINTS_PER_FACTOR(refLatency / 0.1) : finite(reference?.axes?.speed);
  if (refCost == null || refLatency == null || refSpeed == null) throw new Error(`Jev-class reference ${referenceKey} lacks cost, latency or Speed`);
  const limits = {
    cost: costFactor === Infinity ? Infinity : costFactor === factor ? absoluteLimits?.cost ?? refCost * factor : refCost * costFactor,
    latency: latencyFactor === Infinity ? Infinity : latencyFactor === factor ? absoluteLimits?.latency ?? refLatency * factor : refLatency * latencyFactor,
    speedFloor: latencyFactor === Infinity ? -Infinity : refSpeed - SPEED_POINTS_PER_FACTOR(latencyFactor), factor,
  };
  // Keep official returns byte-identical, including the frozen ImageJev absolute-limit path.
  const custom = costFactor !== factor || latencyFactor !== factor;
  if (custom) Object.assign(limits, { costFactor, latencyFactor });
  const rows = jevbenchCapabilityRows(systems).map(({ row, capability }) => {
    const cost = finite(row.cost?.usd_per_1000);
    const latency = medianLatency(row);
    const speed = finite(row.axes?.speed);
    const latencyBasis = latency != null ? 'p50' : speed != null ? 'speed-axis' : 'none';
    const costOk = cost != null && cost <= limits.cost;
    const latencyOk = latencyBasis === 'p50' ? latency <= limits.latency : latencyBasis === 'speed-axis' ? speed >= limits.speedFloor : false;
    const reasons = [];
    if (cost == null) reasons.push('no cost reported');
    else if (!costOk) reasons.push(`cost ${(cost / refCost).toFixed(1)}× ${referenceLabel}${custom ? ` (cap ${costFactor}×)` : ''}`);
    if (latencyBasis === 'none') reasons.push('no latency reported');
    else if (!latencyOk) reasons.push(latencyBasis === 'p50' ? `latency ${(latency / refLatency).toFixed(1)}× ${referenceLabel}${custom ? ` (cap ${latencyFactor}×)` : ''}` : `Speed below the ${latencyFactor}× latency line`);
    return {
      row, capability, inClass: costOk && latencyOk, isReference: !absoluteLimits && row.key === referenceKey,
      cost, latency, latencyBasis, costRatio: cost == null ? null : cost / refCost,
      latencyRatio: latency == null ? null : latency / refLatency, reasons,
    };
  });
  const paired = systems.map((row) => [finite(row.cost?.usd_per_1000), medianLatency(row)])
    .filter(([cost, latency]) => cost != null && latency != null);
  return { reference: { key: absoluteLimits ? '' : referenceKey, display: absoluteLimits ? referenceLabel : reference.display, cost: refCost, latency: refLatency, speed: refSpeed }, limits, rows,
    costLatencySpearman: spearman(paired.map((p) => p[0]), paired.map((p) => p[1])), n: paired.length };
}
