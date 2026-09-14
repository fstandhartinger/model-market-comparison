// CR-2.2: the "pick from chart" model for the Benchmarks tab — score against cheapest in-scope
// adjusted cost for the candidates that pass the global filters. Pure, so the layout rules are tested.
import { paretoFrontier } from './pareto.mjs';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

/** Round log ticks (1 and 3 × 10^n) inside the domain — the same rule as the Simple value map. */
export function logTicks(min, max) {
  const ticks = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) for (const m of [1, 3]) {
    const v = m * 10 ** e;
    if (v >= min && v <= max) ticks.push(Number(v.toPrecision(6)));
  }
  return ticks.length ? ticks : [min, max];
}

/** Round score ticks: steps of 10 over wide spans, 5 over narrow ones; Elo-sized scales step by 50/100. */
export function scoreTicks(min, max) {
  const span = max - min;
  const step = span > 400 ? 100 : span > 120 ? 50 : span > 25 ? 10 : 5;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return { domain: [lo, hi === lo ? lo + step : hi], ticks };
}

/** 0–1 position of a cost on the log axis. */
export const logPosition = (x, [lo, hi]) => Math.min(1, Math.max(0, Math.log(x / lo) / Math.log(hi / lo)));

/** Log slider ↔ cost: position 0…1000 over [lo, hi]; 1000 means "no limit" (null). */
export const SLIDER_MAX = 1000;
export function sliderToCost(pos, [lo, hi]) {
  if (pos >= SLIDER_MAX) return null;
  return Number((lo * (hi / lo) ** (pos / SLIDER_MAX)).toPrecision(3));
}
export function costToSlider(cost, [lo, hi]) {
  if (cost == null || !(hi > lo)) return SLIDER_MAX;
  return Math.round(Math.min(SLIDER_MAX, Math.max(0, SLIDER_MAX * Math.log(cost / lo) / Math.log(hi / lo))));
}

/** candidates: { id, scores, cost }[]. A model without a score is not a candidate here; one without a
 *  price cannot be placed on a cost axis and is counted, never plotted at an invented cost. */
export function pickChart(candidates, score, { minScore = null, maxCost = null } = {}) {
  const scored = candidates.filter((m) => finite(m.scores?.[score]));
  const priced = scored.filter((m) => finite(m.cost) && m.cost >= 0);
  const positive = priced.map((m) => m.cost).filter((c) => c > 0);
  if (!priced.length) return { points: [], frontier: [], unpriced: scored.length, xDomain: [0.01, 1], yDomain: [0, 100], xTicks: [], yTicks: [], scoreRange: [0, 100], costRange: [0.01, 1] };
  const minPos = positive.length ? Math.min(...positive) : 0.01, maxCostAll = positive.length ? Math.max(...positive) : 0.01;
  const xLo = minPos * 0.8, xHi = Math.max(maxCostAll * 1.25, xLo * 10);
  const ys = priced.map((m) => m.scores[score]);
  const { domain: yDomain, ticks: yTicks } = scoreTicks(Math.min(...ys), Math.max(...ys));
  const points = priced.map((m) => {
    const y = m.scores[score];
    const pass = (minScore == null || y >= minScore) && (maxCost == null || m.cost <= maxCost);
    // F-39 rule: a genuinely free route keeps its place, pinned at the left edge of the log axis.
    return { id: m.id, cost: m.cost, x: m.cost > 0 ? m.cost : xLo, free: m.cost === 0, y, pass };
  });
  const frontier = paretoFrontier(points.filter((p) => p.pass)).map((p) => p.id);
  return { points, frontier, unpriced: scored.length - priced.length, xDomain: [xLo, xHi], yDomain, xTicks: logTicks(xLo, xHi), yTicks,
    scoreRange: [Math.min(...ys), Math.max(...ys)], costRange: [minPos, maxCostAll] };
}

/** Toggle a model in the compared columns, respecting the column cap. Returns null when full. */
export function toggleColumn(ids, id, max) {
  if (ids.includes(id)) return ids.length > 1 ? ids.filter((x) => x !== id) : ids;
  return ids.length >= max ? null : [...ids, id];
}
