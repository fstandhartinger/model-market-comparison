// Florian 25 Sep 2026 (DECISIONS.md): /jev-models leads with the Capability ranking of Jev-class systems.
// A system is Jev-class when its cost per decision is at most 2x Jev 1.13.0's AND its median latency is at most
// 2x Jev 1.13.0's. Presentation only: no score, axis or official rank changes.

import { jevbenchCapabilityRows } from './jevbench-capability.mjs';

export const JEV_CLASS_REFERENCE_KEY = 'jev-1.13.0';
export const JEV_CLASS_FACTOR = 2;
// Speed = mean of score(p50) and score(p95) with score(s) = 100 - 20 log10(s / 0.1 s). A factor f in latency moves
// Speed by 20 log10(f), so 2x latency is 6.02 Speed points.
const SPEED_POINTS_PER_FACTOR = (factor) => 20 * Math.log10(factor);

/** The latency the Speed axis uses: p50 after the published self-host/demo adjustment. */
export const medianLatency = (row) => {
  const adjusted = row?.speed?.p50_s_adjusted;
  if (Number.isFinite(adjusted)) return adjusted;
  const raw = row?.speed?.p50_s_raw;
  return Number.isFinite(raw) && /^none/i.test(String(row?.speed?.adjustment ?? 'none')) ? raw : null;
};

const finite = (value) => (Number.isFinite(value) ? value : null);

/**
 * Classify every system with published Intelligence and Calibration.
 * Rows carried over from v1.3 have no recorded median latency in the artifact; for them the Speed axis decides,
 * at the Speed-axis equivalent of 2x latency (Jev's Speed minus 6.02).
 */
export function jevClassRows(systems, { referenceKey = JEV_CLASS_REFERENCE_KEY, factor = JEV_CLASS_FACTOR } = {}) {
  const reference = systems.find((row) => row.key === referenceKey);
  const refCost = finite(reference?.cost?.usd_per_1000);
  const refLatency = reference ? medianLatency(reference) : null;
  const refSpeed = finite(reference?.axes?.speed);
  if (refCost == null || refLatency == null || refSpeed == null) throw new Error(`Jev-class reference ${referenceKey} lacks cost, latency or Speed`);
  const limits = { cost: refCost * factor, latency: refLatency * factor, speedFloor: refSpeed - SPEED_POINTS_PER_FACTOR(factor), factor };
  const rows = jevbenchCapabilityRows(systems).map(({ row, capability }) => {
    const cost = finite(row.cost?.usd_per_1000);
    const latency = medianLatency(row);
    const speed = finite(row.axes?.speed);
    const latencyBasis = latency != null ? 'p50' : speed != null ? 'speed-axis' : 'none';
    const costOk = cost != null && cost <= limits.cost;
    const latencyOk = latencyBasis === 'p50' ? latency <= limits.latency : latencyBasis === 'speed-axis' ? speed >= limits.speedFloor : false;
    const reasons = [];
    if (cost == null) reasons.push('no cost reported');
    else if (!costOk) reasons.push(`cost ${(cost / refCost).toFixed(1)}× Jev`);
    if (latencyBasis === 'none') reasons.push('no latency reported');
    else if (!latencyOk) reasons.push(latencyBasis === 'p50' ? `latency ${(latency / refLatency).toFixed(1)}× Jev` : 'Speed below the 2× latency line');
    return {
      row, capability, inClass: costOk && latencyOk, isReference: row.key === referenceKey,
      cost, latency, latencyBasis, costRatio: cost == null ? null : cost / refCost,
      latencyRatio: latency == null ? null : latency / refLatency, reasons,
    };
  });
  return { reference: { key: referenceKey, display: reference.display, cost: refCost, latency: refLatency, speed: refSpeed }, limits, rows };
}
