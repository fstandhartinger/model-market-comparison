// CR-25.6 (Florian 2026-09-15): the benchmark table's category headers double as composite scores;
// these are the same categories offered as selectable scores (Score dropdown, Simple's score picker,
// the shortlist chart). Definition and honesty rule live in data/category-score-anchors.json:
// a fixed anchor set per category, and a model scores only when it has a result on EVERY anchor —
// never an average over a different subset of benchmarks per model.
import { compatibleRow, SATURATED_WEIGHT } from './benchmark-matrix.mjs';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const asPercent = (value, unit) => (unit === 'fraction' ? value * 100 : value);

/** Sort key for a benchmark version: numbered releases ("4.0" beats "2.1") rank above dated snapshots,
 *  because a snapshot is the undated board of a benchmark that never versioned its tasks. */
export function versionRank(version) {
  const raw = String(version ?? '');
  const snapshot = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (snapshot) return [0, Number(snapshot[1]), Number(snapshot[2]), Number(snapshot[3])];
  const parts = raw.match(/\d+/g);
  return parts ? [1, ...parts.map(Number)] : [0];
}
const newer = (a, b) => {
  const x = versionRank(a), y = versionRank(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d > 0; }
  return false;
};
/** Among the rows of one benchmark (several versions/cohorts), the newest version — the current test,
 *  never a retired one that happens to cover more (retired) models. Same version ⇒ the wider row. */
export function newestRow(rows, counts) {
  return rows.reduce((best, row) => {
    if (!best) return row;
    if (newer(row.version, best.version)) return row;
    if (newer(best.version, row.version)) return best;
    return (counts.get(row.index) ?? 0) > (counts.get(best.index) ?? 0) ? row : best;
  }, null);
}

/** The anchor rows actually present in this build, per category. Categories whose anchors are not all
 *  present (or that keep fewer than `min_anchors`) are dropped, so a category score never silently
 *  changes meaning because a source disappeared. */
export function resolveAnchors(matrix, anchors) {
  const counts = new Map();
  for (const vals of Object.values(matrix.values)) for (const [index, , basis] of vals) if ((basis ?? 0) === 0) counts.set(index, (counts.get(index) ?? 0) + 1);
  const indexed = matrix.rows.map((row, index) => ({ ...row, index }));
  const out = [];
  for (const category of anchors.categories) {
    const rows = [];
    for (const anchor of category.anchors) {
      const candidates = indexed.filter((row) => row.key === anchor.key && row.group === category.group && compatibleRow(row));
      const row = newestRow(candidates, counts);
      if (row) rows.push(row);
    }
    if (rows.length >= (anchors.min_anchors ?? 2) && rows.length === category.anchors.length) out.push({ ...category, rows });
  }
  return out;
}

/** CR-38.3: an anchor must be an objective task-accuracy benchmark — a preference or judge score never
 *  enters a selectable category score. The anchor sets are fixed, so this is a build-time guard, not a
 *  silent filter: if a benchmark is reclassified as judged, the build fails instead of quietly changing
 *  a published score. */
export function assertNoJudgedAnchors(resolved) {
  const bad = resolved.flatMap((c) => c.rows.filter((r) => r.judged).map((r) => `${c.label}: ${r.name}`));
  if (bad.length) throw new Error(`category score anchors must not be judged/preference scores (CR-38.3): ${bad.join('; ')}`);
}

/** CR-38.2 / F-98: a saturated anchor still counts, at half an unsaturated anchor's weight. */
const anchorWeight = (row) => (row.saturation?.saturated ? SATURATED_WEIGHT : 1);

/** modelId → { cat_coding: 63.4, … }, on a 0–100 scale. Missing anchor ⇒ no score for that category. */
export function computeCategoryScores(matrix, anchors) {
  const resolved = resolveAnchors(matrix, anchors);
  assertNoJudgedAnchors(resolved);
  const weights = new Map(resolved.map((c) => [c.key, c.rows.reduce((sum, r) => sum + anchorWeight(r), 0)]));
  const scores = new Map();
  for (const [modelId, vals] of Object.entries(matrix.values)) {
    // CR-65.10: a category score is built from independently measured results only; a developer's own or a
    // preliminary figure stays visible in the table but never becomes a score.
    const byIndex = new Map(vals.filter(([, , basis]) => (basis ?? 0) === 0).map(([index, value]) => [index, value]));
    const row = {};
    for (const category of resolved) {
      const values = category.rows.map((r) => (byIndex.has(r.index) ? asPercent(byIndex.get(r.index), r.unit) : null));
      if (!values.every(finite)) continue;
      const total = category.rows.reduce((sum, r, i) => sum + anchorWeight(r) * values[i], 0);
      row[category.key] = Number((total / weights.get(category.key)).toFixed(1));
    }
    if (Object.keys(row).length) scores.set(modelId, row);
  }
  return { scores, resolved };
}
