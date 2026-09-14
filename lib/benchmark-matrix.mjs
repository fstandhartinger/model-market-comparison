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
  if (higherBetter == null || present.length === 0) return values.map(() => null);
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
export const IMPORTANT_TAGS = new Set(['headline', 'aa', 'arena']);

/** CR-1.6: bold cells. Direction-aware; every tied best value wins; a row with fewer than two
 *  values, or with no known direction, has no winner. */
export function rowWinners(values, higherBetter) {
  const present = values.filter(finite);
  if (higherBetter == null || present.length < 2) return values.map(() => false);
  const best = higherBetter ? Math.max(...present) : Math.min(...present);
  return values.map((v) => finite(v) && v === best);
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
      id: axis.id, benchmarkId: axis.benchmarkId, key, name: axis.name,
      cohort: axis.cohort === 'Published board' ? null : axis.cohort,
      description: taxonomy.descriptions?.[key] ?? axis.description ?? '', unit: axis.unit,
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
      description: extra.description, unit: extra.unit, higherBetter: true, group: groupOf(extra.key, null, taxonomy),
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
