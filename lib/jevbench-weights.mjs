// CR-87 (Florian 2026-09-19): the JevBench Main Composite Score with reader-chosen weights. The official score is the
// published Balanced 33 : 33 : 33 (Capability : Speed : Cost; JevBench v1.1.2 — 60 : 20 : 20 until v1.1.1, kept as a preset); the four named presets and custom weights are recomputed in the
// browser from the published per-system sub-scores — nothing here changes the published numbers.

export const SCORE_NAME = 'JevBench Main Composite Score';

/** Florian's four presets, verbatim titles (addendum 3, 19 Sep ~09:20 UTC: Balanced becomes the Main Score); the first is the default and the official score. */
export const PRESETS = [
  { id: 'balanced', label: 'Main Composite Score', name: 'Balanced', ratio: '33:33:33', title: 'JevBench Main Composite Score – (Balanced 33:33:33)', w: { capability: 1 / 3, speed: 1 / 3, cost: 1 / 3 } },
  { id: 'accuracy', label: 'Composite Score', name: 'Emphasis on Accuracy', ratio: '60:20:20', title: 'JevBench Composite Score – Emphasis on Accuracy (60:20:20)', w: { capability: 0.6, speed: 0.2, cost: 0.2 } },
  { id: 'speed', label: 'Composite Score', name: 'Emphasis on Speed', ratio: '20:60:20', title: 'JevBench Composite Score – Emphasis on Speed (20:60:20)', w: { capability: 0.2, speed: 0.6, cost: 0.2 } },
  { id: 'cost', label: 'Composite Score', name: 'Emphasis on Cost', ratio: '20:20:60', title: 'JevBench Composite Score – Emphasis on Cost (20:20:60)', w: { capability: 0.2, speed: 0.2, cost: 0.6 } },
];
export const DEFAULT_PRESET = PRESETS[0];
export const DEFAULT_WEIGHTS = DEFAULT_PRESET.w;
const KEYS = ['capability', 'speed', 'cost'];
const EPS = 0.0051;

/** Normalise three non-negative parts to sum 1; null when they cannot be (negative, non-finite, all zero). */
export function normalise(parts) {
  const v = KEYS.map((k) => Number(parts?.[k]));
  if (v.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const sum = v.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return null;
  return Object.fromEntries(KEYS.map((k, i) => [k, v[i] / sum]));
}

export const sameWeights = (a, b) => KEYS.every((k) => Math.abs(a[k] - b[k]) < EPS);
export const presetFor = (w) => PRESETS.find((p) => sameWeights(p.w, w)) ?? null;
export const isDefault = (w) => sameWeights(w, DEFAULT_WEIGHTS);

/** Whole percentages that add up to 100 (largest remainder); a preset keeps its own ratio text (33:33:33). */
export function percents(w) {
  const raw = KEYS.map((k) => w[k] * 100);
  const out = raw.map(Math.floor);
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]);
  const missing = 100 - out.reduce((a, b) => a + b, 0);
  for (let i = 0; i < missing; i++) out[order[i % 3][1]]++;
  return Object.fromEntries(KEYS.map((k, i) => [k, out[i]]));
}
export function ratioText(w) {
  const p = presetFor(w);
  if (p) return p.ratio;
  const q = percents(w);
  return KEYS.map((k) => q[k]).join(':');
}

/** "JevBench Composite Score – Emphasis on Cost (20:20:60)" or the custom label; `official` marks the default. */
export function describe(w) {
  const p = presetFor(w);
  if (p) return { preset: p.id, official: p === DEFAULT_PRESET, title: p.title, short: p.name, ratio: p.ratio };
  const r = ratioText(w);
  return { preset: null, official: false, title: `Custom weights (${r}) — not the official ${SCORE_NAME}`, short: 'Custom', ratio: r };
}

/** URL value: `20-20-60` (Capability-Speed-Cost, any non-negative numbers, normalised). Absent/default → null. */
export function toParam(w) {
  if (isDefault(w)) return null;
  const p = presetFor(w);
  if (p) return p.ratio.replace(/:/g, '-');
  const q = percents(w);
  return KEYS.map((k) => q[k]).join('-');
}

/** Reads `?w=20-20-60` (also `20:20:60`, `20,20,60`) or `?preset=cost`. Invalid or missing → the default weights. */
export function parseParams(search) {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const preset = PRESETS.find((p) => p.id === (sp?.get('preset') ?? '').trim().toLowerCase());
  const raw = (sp?.get('w') ?? '').trim();
  if (raw) {
    // Exactly three unsigned numbers joined by - : or , (so "-10-20-20" is rejected, not read as 10-20-20).
    if (/^\d+(\.\d+)?([-:,]\d+(\.\d+)?){2}$/.test(raw)) {
      const parts = raw.split(/[-:,]/);
      const [capability, speed, cost] = parts.map((x) => Math.min(100, Number(x)));
      const w = normalise({ capability, speed, cost });
      if (w) return presetFor(w)?.w ?? w;
    }
  }
  return preset ? preset.w : DEFAULT_WEIGHTS;
}

/** Score under weights w; null when a sub-score is missing (such a system cannot be scored, only shown). */
export function scoreUnder(row, w) {
  if ([row.capability, row.speed, row.cost].some((v) => typeof v !== 'number')) return null;
  return w.capability * row.capability + w.speed * row.speed + w.cost * row.cost;
}

/** Ranked rows re-scored and re-ranked under w (ties: official order); partial rows re-scored, never ranked.
 *  `delta` = official rank − new rank (positive = moved up). */
export function rerank(ranked, partial, w) {
  const official = new Map(ranked.map((r, i) => [r.key, i + 1]));
  const scored = ranked.map((r) => ({ ...r, score: scoreUnder(r, w), official: r.main }));
  scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || official.get(a.key) - official.get(b.key));
  const out = scored.map((r, i) => ({ ...r, rank: i + 1, delta: official.get(r.key) - (i + 1) }));
  const part = partial.map((r) => ({ ...r, score: scoreUnder(r, w), official: r.main, rank: null, delta: 0 }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return { ranked: out, partial: part };
}
