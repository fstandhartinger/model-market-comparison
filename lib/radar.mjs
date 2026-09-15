// CR-14 (Florian 2026-09-15): the compare radar's scale, default axes and default models.
// Pure functions over the benchmark view, so scaling and defaults are testable without React.
import { latestScores, normalize } from './benchmark-view.mjs';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
// Positions are rounded to 1e-9 so 0.55 on a 0–1 scale is exactly 55, not 55.00000000000001.
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v * 1e9) / 1e9));

/** Scores whose publisher uses a fixed 0–100 scale but that carry no registry range
 *  (the dated AA index snapshots). Kept here, not on the shared axes, so Benchmaxxing is unchanged. */
export const FIXED_RANGES = Object.freeze({ aa_intelligence_index: [0, 100], aa_coding_index: [0, 100] });

/** The metric's own scale, or null for open-ended metrics (Elo, ECI, native index points). */
export function axisRange(axis) {
  const r = axis.publishedRange;
  if (Array.isArray(r) && finite(r[0]) && finite(r[1]) && r[1] > r[0]) return r;
  if (FIXED_RANGES[axis.family]) return FIXED_RANGES[axis.family];
  if (axis.unit === 'fraction') return [0, 1];
  if (axis.unit === 'percent') return [0, 100];
  return null;
}

/** Radar position 0–100. A metric with a fixed scale is drawn on that scale, so 55 on a 0–100
 *  index sits a little past half. Open-ended metrics fall back to the measured peer range and
 *  are marked `scale: 'peer'`. Unknown direction or missing value: null, never a zero. */
export function radarScale(value, axis) {
  if (!finite(value) || axis.higherBetter == null) return null;
  const range = axisRange(axis);
  if (range) {
    const p = (value - range[0]) / (range[1] - range[0]);
    return { value: clamp(100 * (axis.higherBetter ? p : 1 - p)), scale: 'fixed', range };
  }
  const v = axis.stats ? normalize(value, axis.stats, axis.higherBetter) : null;
  return v == null ? null : { value: v, scale: 'peer', range: [axis.stats.min, axis.stats.max] };
}

/** Exact native value for tooltips and tables: fractions as percentages, Elo as integers. */
export function formatRadarValue(value, unit) {
  if (!finite(value)) return '—';
  if (unit === 'fraction') return `${Number((value * 100).toFixed(1))}%`;
  if (unit === 'percent') return `${Number(value.toFixed(1))}%`;
  if (unit === 'Elo') return `${Math.round(value)} Elo`;
  const n = Number(value.toFixed(Math.abs(value) >= 1000 ? 0 : 1));
  return unit && unit !== 'points' ? `${n} ${unit}` : String(n);
}

/** One sentence on where a point sits and on which scale. */
export function scaleNote(scaled, unit) {
  if (!scaled) return 'not plotted';
  const [lo, hi] = scaled.range;
  return scaled.scale === 'fixed'
    ? `${Math.round(scaled.value)} on its ${formatRadarValue(lo, unit)}–${formatRadarValue(hi, unit)} scale`
    : `${Math.round(scaled.value)} / 100 within the measured range ${formatRadarValue(lo, unit)}–${formatRadarValue(hi, unit)} (no fixed scale)`;
}

/** CR-14.4 default axes: the headline indices (AA, Epoch ECI), DesignArena Full-Stack (CR-19.3: Frontend
 *  dropped — Fable 5.1 has no Frontend result, and one DesignArena axis is enough) and two
 *  unsaturated hard benchmarks. GPQA Diamond and other near-saturated boards are left out. */
export const DEFAULT_RADAR_FAMILIES = Object.freeze([
  'aa_intelligence_index', 'aa_coding_index', 'epoch_eci', 'epoch_eci_software',
  'fullstack', 'aa-hle', 'aa-terminal-bench',
]);

const versionKey = (v) => (String(v).match(/\d+(?:\.\d+)*/)?.[0] ?? '').split('.').filter(Boolean).map(Number);
function newer(a, b) {
  const x = versionKey(a.version), y = versionKey(b.version);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d > 0; }
  return (a.stats?.n ?? 0) > (b.stats?.n ?? 0);
}

/** One axis per default family: the newest version with at least two measured peers. */
export function defaultRadarAxes(axes, families = DEFAULT_RADAR_FAMILIES) {
  const out = [];
  for (const family of families) {
    let best = null;
    for (const a of axes) if (a.family === family && !a.historical && (a.stats?.n ?? 0) >= 2 && (!best || newer(a, best))) best = a;
    if (best) out.push(best.id);
  }
  return out;
}

const measuredRow = (axis, id) => latestScores(axis.scores).find((r) => r.modelId === id && !r.lowSample && finite(r.value));

/** CR-14.5 detailed radar: every current axis on which a compared model has a plottable result,
 *  topics contiguous clockwise (the Benchmaxxing ordering). */
export function detailedRadarAxes(axes, picks) {
  return axes.filter((a) => !a.historical && picks.some((id) => { const row = measuredRow(a, id); return row && radarScale(row.value, a) != null; }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name) || String(a.version).localeCompare(String(b.version)) || String(a.cohort).localeCompare(String(b.cohort)));
}

/** CR-14.1: the two (n) most capable current model families by AA Intelligence Index, each shown
 *  through the configuration with the broadest coverage of the default radar axes (family-scope
 *  results such as ECI and DesignArena are attached to one representative configuration), then the
 *  higher AA score. Follows the data; nothing is hard-coded. */
export function defaultComparePicks(view, n = 2) {
  const axes = [...view.axes, ...(view.indexAxes ?? [])];
  const aa = axes.find((a) => a.family === 'aa_intelligence_index' && !a.historical);
  if (!aa) return [];
  const models = new Map(view.models.map((m) => [m.id, m]));
  const current = (m) => !!m && !m.historical && !m.deprecated;
  const best = new Map(), aaOf = new Map();
  for (const row of latestScores(aa.scores)) {
    const m = models.get(row.modelId);
    if (!current(m) || !finite(row.value)) continue;
    aaOf.set(m.id, row.value);
    if (!(best.get(m.family) >= row.value)) best.set(m.family, row.value);
  }
  const families = [...best].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, Math.max(0, n)).map(([f]) => f);
  const radar = defaultRadarAxes(axes).map((id) => axes.find((a) => a.id === id));
  const coverage = (id) => radar.filter((a) => measuredRow(a, id)).length;
  return families.map((f) => view.models.filter((m) => m.family === f && current(m))
    .sort((a, b) => coverage(b.id) - coverage(a.id) || (aaOf.get(b.id) ?? -Infinity) - (aaOf.get(a.id) ?? -Infinity) || a.id.localeCompare(b.id))[0].id);
}
