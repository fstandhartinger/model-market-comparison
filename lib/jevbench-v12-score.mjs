// CR-92: the JevBench Score rules of jevbench/composite_v12.py, dependency-free so the browser (custom weights) and the
// server-side validator (lib/jevbench-v12.mjs) share one implementation.
export const TIERS = ['easy', 'standard', 'judge', 'hard'];
export const AXES = ['intelligence', 'calibration', 'speed', 'cost'];
export const TIER_WEIGHTS = { easy: 0.14, standard: 0.28, judge: 0.28, hard: 0.30 };
// v1.3.0: exact histograms of option/level counts over all 534 frozen items.
export const TIER_OPTION_COUNTS = {
  easy: { 2: 18, 4: 13, 5: 41 },
  standard: { 2: 32, 4: 40, 5: 12, 6: 12 },
  judge: { 2: 68, 9: 78 },
  hard: { 2: 77, 3: 26, 4: 73, 5: 38, 6: 6 },
};
export const chanceFromOptionCounts = (counts) => {
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts).reduce((sum, [options, count]) => sum + count / Number(options), 0) / n;
};
export const TIER_CHANCES = Object.fromEntries(TIERS.map((tier) => [tier, chanceFromOptionCounts(TIER_OPTION_COUNTS[tier])]));
const clamp = (x) => Math.max(0, Math.min(100, x));

// The scoring rules of jevbench/composite_v12.py, line for line.
export function intelligence(tiers) {
  let s = 0, tw = 0;
  for (const t of TIERS) if (typeof tiers?.[t] === 'number') {
    const corrected = clamp(100 * (tiers[t] - TIER_CHANCES[t]) / (1 - TIER_CHANCES[t]));
    s += TIER_WEIGHTS[t] * corrected;
    tw += TIER_WEIGHTS[t];
  }
  return tw ? s / tw : null;
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
  const base = Math.exp(l);
  const intelligenceScore = axes.intelligence ?? 0;
  return base * (intelligenceScore < 50 ? (Math.max(intelligenceScore, 0) / 50) ** 2 : 1);
}
