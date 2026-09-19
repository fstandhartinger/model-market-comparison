// CR-92: the JevBench Score rules of jevbench/composite_v12.py, dependency-free so the browser (custom weights) and the
// server-side validator (lib/jevbench-v12.mjs) share one implementation.
export const TIERS = ['easy', 'standard', 'judge', 'hard'];
export const AXES = ['intelligence', 'calibration', 'speed', 'cost'];
export const TIER_WEIGHTS = { easy: 0.14, standard: 0.28, judge: 0.28, hard: 0.30 };
const clamp = (x) => Math.max(0, Math.min(100, x));

// The scoring rules of jevbench/composite_v12.py, line for line.
export function intelligence(tiers) {
  let s = 0, tw = 0;
  for (const t of TIERS) if (typeof tiers?.[t] === 'number') { s += TIER_WEIGHTS[t] * tiers[t]; tw += TIER_WEIGHTS[t]; }
  return tw ? (100 * s) / tw : null;
}
export const adjustedLatency = (s, kind) => (kind === 'api' ? s : s * 2 + (kind === 'gpu' || kind === 'cpu' ? 0.15 : 0));
export const speedPoint = (s) => clamp(100 - 20 * Math.log10(s / 0.1));
export const speedScore = (p50, p95, kind) => (speedPoint(adjustedLatency(p50, kind)) + speedPoint(adjustedLatency(p95, kind))) / 2;
export const costScore = (usd) => clamp(100 - 30 * Math.log10(usd / 0.001));
/** Weighted geometric mean over the axes with a positive weight; a missing axis (label-only Calibration) counts as 0 → floor 1. */
export function geometric(axes, w) {
  const tot = AXES.reduce((a, k) => a + (w[k] ?? 0), 0);
  if (!(tot > 0)) return null;
  let l = 0;
  for (const k of AXES) if (w[k] > 0) l += (w[k] / tot) * Math.log(Math.max(axes[k] ?? 0, 1));
  return Math.exp(l);
}

