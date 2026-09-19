// CR-92 (Florian 2026-09-19): the JevBench Score with reader-chosen weights. The official score is the published
// 25 : 25 : 25 : 25 (Intelligence : Calibration : Speed : Cost), geometric mean. The earlier views (Balanced 33:33:33 and the
// three "Emphasis on" weightings, JevBench v1.1.2) stay as presets, recomputed the same way; they and custom weights are
// computed in the browser from the published axis scores — nothing here changes the published numbers.
import { AXES, geometric } from './jevbench-v12-score.mjs';

export const SCORE_NAME = 'JevBench Score';
export { AXES };
export const AXIS_LABEL = { intelligence: 'Intelligence', calibration: 'Calibration', speed: 'Speed', cost: 'Cost' };

const W = (i, c, s, k) => ({ intelligence: i, calibration: c, speed: s, cost: k });
export const PRESETS = [
  { id: 'score', name: 'JevBench Score', ratio: '25:25:25:25', title: 'JevBench Score (Intelligence, Calibration, Speed, Cost — 25 % each)', artifactKey: 'JevBench Score (25:25:25:25)', w: W(0.25, 0.25, 0.25, 0.25) },
  { id: 'balanced', name: 'Balanced, no calibration', ratio: '33:0:33:33', title: 'Balanced 33:33:33 (Intelligence, Speed, Cost; no calibration)', artifactKey: 'Balanced 33:33:33 (no calibration)', w: W(1 / 3, 0, 1 / 3, 1 / 3) },
  { id: 'accuracy', name: 'Emphasis on Accuracy', ratio: '60:0:20:20', title: 'Emphasis on Accuracy (60:20:20, no calibration)', artifactKey: 'Emphasis on Accuracy 60:20:20', w: W(0.6, 0, 0.2, 0.2) },
  { id: 'speed', name: 'Emphasis on Speed', ratio: '20:0:60:20', title: 'Emphasis on Speed (20:60:20, no calibration)', artifactKey: 'Emphasis on Speed 20:60:20', w: W(0.2, 0, 0.6, 0.2) },
  { id: 'cost', name: 'Emphasis on Cost', ratio: '20:0:20:60', title: 'Emphasis on Cost (20:20:60, no calibration)', artifactKey: 'Emphasis on Cost 20:20:60', w: W(0.2, 0, 0.2, 0.6) },
];
export const DEFAULT_PRESET = PRESETS[0];
export const DEFAULT_WEIGHTS = DEFAULT_PRESET.w;
const EPS = 0.0051;

export function normalise(parts) {
  const v = AXES.map((k) => Number(parts?.[k]));
  if (v.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const sum = v.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return null;
  return Object.fromEntries(AXES.map((k, i) => [k, v[i] / sum]));
}
export const sameWeights = (a, b) => AXES.every((k) => Math.abs(a[k] - b[k]) < EPS);
export const presetFor = (w) => PRESETS.find((p) => sameWeights(p.w, w)) ?? null;
export const isDefault = (w) => sameWeights(w, DEFAULT_WEIGHTS);

/** Whole percentages that add up to 100 (largest remainder). */
export function percents(w) {
  const raw = AXES.map((k) => w[k] * 100);
  const out = raw.map(Math.floor);
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  const missing = 100 - out.reduce((a, b) => a + b, 0);
  for (let i = 0; i < missing; i++) out[order[i % AXES.length][1]]++;
  return Object.fromEntries(AXES.map((k, i) => [k, out[i]]));
}
export function ratioText(w) {
  const p = presetFor(w);
  if (p) return p.ratio;
  const q = percents(w);
  return AXES.map((k) => q[k]).join(':');
}
export function describe(w) {
  const p = presetFor(w);
  if (p) return { preset: p.id, official: p === DEFAULT_PRESET, title: p.title, short: p.name, ratio: p.ratio };
  const r = ratioText(w);
  return { preset: null, official: false, title: `Custom weights (${r}) — not the official ${SCORE_NAME}`, short: 'Custom', ratio: r };
}

/** URL value `60-0-20-20` (Intelligence-Calibration-Speed-Cost). Default → null. */
export function toParam(w) {
  if (isDefault(w)) return null;
  const p = presetFor(w);
  if (p) return p.ratio.replace(/:/g, '-');
  const q = percents(w);
  return AXES.map((k) => q[k]).join('-');
}
/** Reads `?w=60-0-20-20` (also `:` or `,`) or `?preset=cost`. Invalid or missing → the default weights. */
export function parseParams(search) {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const preset = PRESETS.find((p) => p.id === (sp?.get('preset') ?? '').trim().toLowerCase());
  const raw = (sp?.get('w') ?? '').trim();
  if (raw && /^\d+(\.\d+)?([-:,]\d+(\.\d+)?){3}$/.test(raw)) {
    const [intelligence, calibration, speed, cost] = raw.split(/[-:,]/).map((x) => Math.min(100, Number(x)));
    const w = normalise({ intelligence, calibration, speed, cost });
    if (w) return presetFor(w)?.w ?? w;
  }
  return preset ? preset.w : DEFAULT_WEIGHTS;
}

export const scoreUnder = (row, w) => geometric(row.axes, w);

/** Ranked rows re-scored and re-ranked under w (ties: official order); partial rows re-scored, never ranked.
 *  `delta` = official rank − new rank (positive = moved up). */
export function rerank(ranked, partial, w) {
  const official = new Map(ranked.map((r, i) => [r.key, i + 1]));
  const scored = ranked.map((r) => ({ ...r, score: scoreUnder(r, w), official: r.main }));
  scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || official.get(a.key) - official.get(b.key));
  const out = scored.map((r, i) => ({ ...r, rank: i + 1, delta: official.get(r.key) - (i + 1) }));
  const part = partial.map((r) => ({ ...r, score: scoreUnder(r, w), official: r.main, rank: null, delta: 0 })).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return { ranked: out, partial: part };
}
