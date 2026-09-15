// CR-1: the release-style comparison table — models as columns, benchmarks as rows.
// Pure presentation over the benchmark view: it never estimates, bridges or rescales a score.
// A cell is the latest published value for that exact catalog configuration (measured preferred
// over self-reported, as everywhere else); a missing value stays missing.
import { latestScores } from './benchmark-view.mjs';

const finite = (n) => typeof n === 'number' && Number.isFinite(n);
export const baseKey = (id) => String(id).split('::')[0];

// Units whose zero is meaningful, so a bar can be proportional to the value itself.
const RATIO_UNITS = new Set(['fraction', 'percent', 'points', 'USD']);
const BASIS_CODE = { measured: 0, self_reported: 1 };
const TIER_RANK = { headline: 0, niche: 1, community: 2 };

/** CR-1.5: bar length per cell, 0–1, normalised over the values visible in one row.
 *  Ratio units: proportional to the value (lower-is-better: best ÷ value). Elo, TrueSkill and
 *  unknown scales have no meaningful zero: min–max with a short floor so the weakest result
 *  still shows a sliver. Unknown direction or missing value: no bar. */
export function rowBars(values, higherBetter, unit) {
  const present = values.filter(finite);
  // F-84: a row with a single value has nothing to compare; a lone full-width bar would read as
  // "best of the row", so it gets no bar (the same threshold as rowWinners).
  if (higherBetter == null || present.length < 2) return values.map(() => null);
  const min = Math.min(...present), max = Math.max(...present);
  const proportional = RATIO_UNITS.has(unit) && min >= 0;
  return values.map((v) => {
    if (!finite(v)) return null;
    if (proportional) {
      if (higherBetter) return max > 0 ? v / max : 1;
      return v > 0 ? min / v : 1;
    }
    if (max === min) return 1;
    const p = (v - min) / (max - min);
    return 0.12 + 0.88 * (higherBetter ? p : 1 - p);
  });
}

const niceCeil = (x) => {
  const k = 10 ** Math.floor(Math.log10(x));
  return [1, 2, 2.5, 5, 10].map((s) => s * k).find((s) => s >= x - 1e-12) ?? 10 * k;
};

/** CR-1.9: how one benchmark's small multiple draws its values, positions 0–1.
 *  'bar'  — ratio units spanning ≤ 20×: bars from zero (fractions and percents on a fixed 0–100 % axis).
 *  'log'  — ratio units whose positive values span > 20×: a dot at the log position, zeros pinned left.
 *  'position' — Elo, TrueSkill and scales without a meaningful zero: a dot between the padded row
 *  minimum and maximum, never a bar from an arbitrary zero. */
export function chartScale(values, unit) {
  const present = values.filter(finite);
  if (present.length === 0) return null;
  const min = Math.min(...present), max = Math.max(...present);
  if (RATIO_UNITS.has(unit) && min >= 0) {
    const positive = present.filter((v) => v > 0);
    const pmin = positive.length ? Math.min(...positive) : 0;
    if (positive.length >= 2 && max / pmin > 20) {
      const lo = 10 ** Math.floor(Math.log10(pmin)), hi = 10 ** Math.ceil(Math.log10(max));
      return { kind: 'log', domain: [lo, hi], positions: values.map((v) => !finite(v) ? null : v <= 0 ? 0 : Math.min(1, Math.max(0, Math.log(v / lo) / Math.log(hi / lo)))) };
    }
    const hi = unit === 'fraction' ? 1 : unit === 'percent' ? 100 : max > 0 ? niceCeil(max) : 1;
    return { kind: 'bar', domain: [0, hi], positions: values.map((v) => finite(v) ? Math.min(1, v / hi) : null) };
  }
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const lo = min - span * 0.15, hi = max + span * 0.15;
  return { kind: 'position', domain: [lo, hi], positions: values.map((v) => finite(v) ? (v - lo) / (hi - lo) : null) };
}

/** CR-1.9: the chart's benchmarks — the "Important" rows (indices, headline, AA, Arena) with at least two values. */
export function chartRows(rows, columns) {
  return rows.map((row, i) => ({ row, vals: columns.map((m) => m.get(i) ?? null) }))
    .filter(({ row, vals }) => (row.group === 'indices' || row.tags.some((t) => IMPORTANT_TAGS.has(t))) && vals.filter(finite).length >= 2);
}
export const IMPORTANT_TAGS = new Set(['headline', 'aa', 'arena', 'aa_input']);
const isImportant = (row) => row.group === 'indices' || row.tags.some((t) => IMPORTANT_TAGS.has(t));

/** CR-7.1: the home page's simple comparison only needs the "Important" rows. Rows are re-indexed and
 *  values kept only for those rows (and, when given, those models), so "/" does not carry the full matrix. */
export function importantMatrix(matrix, modelIds = null) {
  const keep = new Map();
  const rows = [];
  matrix.rows.forEach((row, i) => { if (isImportant(row)) { keep.set(i, rows.length); rows.push(row); } });
  const values = {};
  const allowed = modelIds ? new Set(modelIds) : null;
  for (const [modelId, list] of Object.entries(matrix.values)) {
    if (allowed && !allowed.has(modelId)) continue;
    const out = list.filter(([i]) => keep.has(i)).map(([i, v, b]) => [keep.get(i), v, b]);
    if (out.length) values[modelId] = out;
  }
  const used = new Set(rows.map((r) => r.group));
  return { ...matrix, groups: matrix.groups.filter((g) => used.has(g.id)), rows, values };
}

/** CR-1.6: bold cells. Direction-aware; every tied best value wins; a row with fewer than two
 *  values, or with no known direction, has no winner. */
export function rowWinners(values, higherBetter) {
  const present = values.filter(finite);
  if (higherBetter == null || present.length < 2) return values.map(() => false);
  const best = higherBetter ? Math.max(...present) : Math.min(...present);
  return values.map((v) => finite(v) && v === best);
}

/** 2026-09-15: a category header's composite. A row counts only when it is on a 0–100 %-style scale
 *  (fraction, percent, or points registered with range [0, 100]) with higher = better, so Elo,
 *  native index scales, costs and lower-is-better rows never enter an average. Only rows that have a
 *  result for EVERY compared model count, so each column averages the same benchmarks and a missing
 *  result is never filled in. With fewer than COMPOSITE_MIN_ROWS such rows there is no composite. */
export const COMPOSITE_MIN_ROWS = 2;

/** The Benchmark Heaven Score row's second line: only the Composite is ever called a composite. */
export function scoreRowSubtitle(score, shortLabel) {
  return score === 'composite' ? 'Main Composite Score' : `Selected score: ${shortLabel}`;
}
export function compatibleRow(row) {
  if (row.higherBetter !== true) return false;
  if (row.unit === 'fraction' || row.unit === 'percent') return true;
  return row.unit === 'points' && Array.isArray(row.range) && row.range[0] === 0 && row.range[1] === 100;
}
const asPercent = (v, unit) => unit === 'fraction' ? v * 100 : v;
/** `entries`: the category's shown rows as { row, vals } (one value or null per compared model). */
export function categoryComposite(entries, columns) {
  const used = entries.filter(({ row, vals }) => columns > 0 && compatibleRow(row) && vals.length === columns && vals.every(finite));
  if (used.length < COMPOSITE_MIN_ROWS) return { values: Array.from({ length: columns }, () => null), rows: used.map(({ row }) => row), excluded: entries.length - used.length };
  const values = Array.from({ length: columns }, (_, j) => used.reduce((sum, { row, vals }) => sum + asPercent(vals[j], row.unit), 0) / used.length);
  return { values, rows: used.map(({ row }) => row), excluded: entries.length - used.length };
}

/** Display only: fractions read as percentages, Elo as integers, USD with a dollar sign. */
export function formatValue(v, unit) {
  if (!finite(v)) return '—';
  if (unit === 'fraction') return `${(v * 100).toFixed(1)}%`;
  if (unit === 'percent') return `${v.toFixed(1)}%`;
  if (unit === 'USD') return v >= 100 ? `$${Math.round(v).toLocaleString('en-US')}` : v >= 1 ? `$${v.toFixed(2)}` : `$${Number(v.toPrecision(2))}`;
  if (/elo|trueskill/i.test(unit ?? '')) return Math.round(v).toLocaleString('en-US');
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return String(Number(v.toPrecision(3)));
}

/** CR-1.8: deep link to one cell's detail page; `pinned` tells the page to restore a custom selection. */
export function resultHref(axisId, modelId, models, pinned) {
  const q = new URLSearchParams({ axis: axisId, model: modelId, models: models.join(',') });
  if (pinned) q.set('pinned', '1');
  return `/benchmarks/result?${q}`;
}

/** CR-1.8: every valued cell opens its detail page — registry rows and model-field indices (Epoch ECI) alike. */
export function cellHref(row, modelId, models, pinned) {
  return resultHref(row.id, modelId, models, pinned);
}

/** CR-1.3: exactly one display group per benchmark, from taxonomy data. */
export function groupOf(key, category, taxonomy) {
  if (taxonomy.group_overrides?.[key]) return taxonomy.group_overrides[key];
  const hit = taxonomy.groups.find((g) => g.categories.includes(category));
  return hit ? hit.id : 'other';
}

/** CR-1.7: tags, in display order — source tags (AA, Arena) first, then the editorial tier. */
export function rowTags(key, maintainer, taxonomy) {
  const tags = [];
  if (maintainer === 'Artificial Analysis' || taxonomy.aa_keys?.includes(key)) tags.push('aa');
  if (taxonomy.arena_keys?.includes(key)) tags.push('arena');
  if (taxonomy.aa_input_keys?.includes(key)) tags.push('aa_input');
  const tier = taxonomy.tiers?.[key];
  if (tier && taxonomy.tags[tier]) tags.push(tier);
  return tags;
}

export function buildBenchmarkMatrix(view, ds, taxonomy) {
  const registry = new Map(ds.benchmark_results.registry.map((b) => [b.id, b]));
  const catalog = new Set(ds.models.map((m) => m.id));
  const groupRank = new Map(taxonomy.groups.map((g, i) => [g.id, i]));
  const candidates = [];
  for (const axis of view.axes) {
    if (axis.historical) continue; // bridged estimates never enter this table (CR-9.3)
    const byModel = new Map();
    for (const r of latestScores(axis.scores, 'all')) {
      if (!r.modelId || !catalog.has(r.modelId) || !finite(r.value)) continue;
      byModel.set(r.modelId, [r.value, BASIS_CODE[r.basis] ?? 2]);
    }
    if (!byModel.size) continue;
    const key = baseKey(axis.benchmarkId), b = registry.get(axis.benchmarkId);
    candidates.push({ byModel, row: {
      // F-80: row labels use the site's short vendor prefix ("AA …" like AA Intelligence Index); the registry keeps the full name.
      id: axis.id, benchmarkId: axis.benchmarkId, key, name: axis.name.replace(/^Artificial Analysis /, 'AA '),
      cohort: axis.cohort === 'Published board' ? null : axis.cohort,
      // Unregistered snapshot axes (AA indices) take their documented scale from the taxonomy; presentation only.
      description: taxonomy.descriptions?.[key] ?? axis.description ?? '', unit: axis.unit, range: b?.scoring?.range ?? taxonomy.score_ranges?.[key] ?? null,
      higherBetter: axis.higherBetter ?? null, group: groupOf(key, axis.category, taxonomy),
      tags: rowTags(key, b?.maintainer ?? null, taxonomy), url: axis.url ?? '', version: axis.version ?? '', ranking: axis.benchmarkId,
    } });
  }
  // Index values the benchmark view keeps on the model row rather than as an axis (Epoch ECI).
  for (const extra of taxonomy.model_field_rows ?? []) {
    const date = String(ds.sources?.[extra.source] ?? '').slice(0, 10);
    const byModel = new Map();
    for (const m of ds.models) if (finite(m.benchmarks?.[extra.field])) byModel.set(m.id, [m.benchmarks[extra.field], 0]);
    if (!byModel.size) continue;
    candidates.push({ byModel, row: {
      id: `${extra.key}::snapshot-${date}`, benchmarkId: null, key: extra.key, name: extra.name, cohort: null,
      description: extra.description, unit: extra.unit, range: null, higherBetter: true, group: groupOf(extra.key, null, taxonomy),
      tags: rowTags(extra.key, extra.maintainer, taxonomy), url: extra.url, version: `snapshot-${date}`, ranking: null,
    } });
  }
  const tierRank = (row) => Math.min(...row.tags.map((t) => TIER_RANK[t] ?? 3), 3);
  candidates.sort((a, b) => (groupRank.get(a.row.group) ?? 99) - (groupRank.get(b.row.group) ?? 99)
    || tierRank(a.row) - tierRank(b.row)
    || b.byModel.size - a.byModel.size
    || a.row.name.localeCompare(b.row.name) || a.row.id.localeCompare(b.row.id));
  const rows = [], values = {};
  candidates.forEach(({ row, byModel }, i) => {
    rows.push(row);
    for (const [modelId, [value, basis]] of byModel) (values[modelId] ||= []).push([i, value, basis]);
  });
  const used = new Set(rows.map((r) => r.group));
  return {
    version: taxonomy.version,
    groups: taxonomy.groups.filter((g) => used.has(g.id)).map(({ id, label }) => ({ id, label })),
    tags: taxonomy.tags, rows, values, generatedAt: ds.generated_at,
  };
}

/** CR-29.3: 'top' / 'low' tags for results that stand out from the other models in one row.
 *  Transparent rule: a row needs at least OUTLIER_MIN_VALUES results and a known direction. The core is
 *  every result except the single best and the single worst. The best is 'top' when its lead over the
 *  runner-up is at least OUTLIER_CORE_MULTIPLE times the core's spread; the worst is 'low' when its gap to
 *  the next result is too. Either gap must also be at least OUTLIER_MIN_SHARE of the whole row's spread.
 *  Ties, flat rows and short rows get no tag, so a tag means a clear gap, not merely the max or min. */
export const OUTLIER_MIN_VALUES = 4;
export const OUTLIER_CORE_MULTIPLE = 2;
export const OUTLIER_MIN_SHARE = 0.1;
export function rowOutliers(values, higherBetter) {
  const out = values.map(() => null);
  if (higherBetter == null) return out;
  const present = values.filter(finite);
  if (present.length < OUTLIER_MIN_VALUES) return out;
  const sorted = [...present].sort((a, b) => higherBetter ? b - a : a - b); // best first
  const n = sorted.length, spread = Math.abs(sorted[0] - sorted[n - 1]);
  if (!(spread > 0)) return out;
  const core = sorted.slice(1, n - 1), coreSpread = Math.abs(core[0] - core[core.length - 1]);
  const clear = (gap) => gap >= OUTLIER_CORE_MULTIPLE * coreSpread && gap >= OUTLIER_MIN_SHARE * spread && gap > 0;
  const lead = Math.abs(sorted[0] - sorted[1]), trail = Math.abs(sorted[n - 2] - sorted[n - 1]);
  const unique = (v) => values.filter((x) => x === v).length === 1;
  values.forEach((v, j) => {
    if (!finite(v)) return;
    if (v === sorted[0] && unique(v) && clear(lead)) out[j] = 'top';
    else if (v === sorted[n - 1] && unique(v) && clear(trail)) out[j] = 'low';
  });
  return out;
}

/** CR-31.2: one plain sentence on what kind of number a benchmark row delivers. */
export function scoreTypeText(row) {
  const lower = row.higherBetter === false ? ' Lower is better.' : row.higherBetter === true ? ' Higher is better.' : '';
  if (row.unit === 'fraction' || row.unit === 'percent') return `Score: share of tasks solved, shown as a percentage.${lower}`;
  if (row.unit === 'Elo') return `Score: an Elo rating from head-to-head votes — relative, only comparable within this board.${lower}`;
  if (row.unit === 'USD') return `Score: US dollars.${lower}`;
  if (row.unit === 'points' && Array.isArray(row.range) && row.range[0] === 0 && row.range[1] === 100) return `Score: an index on a 0–100 scale.${lower}`;
  if (row.unit === 'points' || !row.unit) return `Score: points on the benchmark's own scale.${lower}`;
  return `Score: ${row.unit}.${lower}`;
}
