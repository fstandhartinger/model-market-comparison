// H3 — comparison values for the "better than model X" filter.
// This is a presentation projection only: it never changes source observations.
import { latestScores, normalize } from './benchmark-view.mjs';

const finite = (value) => typeof value === 'number' && Number.isFinite(value);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// Retained state ids start with their collection day (YYYYMMDD-hash).
function stateDay(stateId) {
  const m = String(stateId ?? '').match(/^(\d{4})(\d{2})(\d{2})-/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * How a bridged value was reached, for disclosure next to the H3 reference: the
 * retained state (or older benchmark version) it came from, anchor models, hops and
 * relative spread. Rank-shift (Elo) bridges have no relative spread, so it stays null.
 */
export function bridgeSummary(estimate) {
  const spread = finite(estimate.chainIqrRelative) ? estimate.chainIqrRelative : estimate.spread?.iqr_relative;
  return {
    fromDate: stateDay(estimate.sourceStateId),
    fromBenchmark: estimate.sourceStateId ? null : estimate.sourceBenchmarkId ?? null,
    anchors: finite(estimate.bridgeCount) ? estimate.bridgeCount : null,
    hops: finite(estimate.hops) ? estimate.hops : null,
    spreadRelative: estimate.method === 'bridge-rank-shift' || !finite(spread) ? null : spread,
  };
}

/** Plain-language disclosure for an approximate H3 reference value. */
export function bridgeDisclosure(value) {
  if (!value?.approximate) return 'measured';
  if (finite(value.coverage)) {
    const k = value.approximateCount ?? 1;
    return `approximated: ${k} of ${value.coverage} benchmark${value.coverage === 1 ? '' : 's'} in this median ${k === 1 ? 'is a bridged estimate' : 'are bridged estimates'} from retained results`;
  }
  const b = value.bridge;
  if (!b) return 'approximated from a retained bridge';
  const version = b.fromBenchmark ? String(b.fromBenchmark).split('::')[1] : null;
  const parts = [b.fromDate ? `approximated from the ${b.fromDate} snapshot` : version ? `approximated from version ${version} of this benchmark` : 'approximated from retained results'];
  if (b.anchors != null) parts.push(`bridged through ${b.anchors} anchor model${b.anchors === 1 ? '' : 's'}${b.hops > 1 ? ` over ${b.hops} hops` : ''}`);
  parts.push(b.spreadRelative != null ? `anchor spread ±${Math.round(100 * b.spreadRelative)}%` : 'rank-based bridge, no relative spread');
  return parts.join(', ');
}

/**
 * Build a compact, client-safe comparison catalog.
 *
 * Current measured observations win over historical bridge estimates. Estimates are
 * included only when their bridge is comparable and remain explicitly approximate.
 * Missing values are omitted rather than represented by zero. Category values are the
 * median of the model's available, percentile-normalized benchmark values; coverage is
 * retained so the UI can disclose sparse comparisons.
 */
export function buildBenchmarkComparison(view) {
  const axes = [];
  for (const axis of view.axes) {
    if (axis.higherBetter == null || axis.stats?.n < 2 || axis.stats?.min == null || axis.stats?.max == null || axis.stats.min === axis.stats.max) continue;
    const values = {};
    for (const row of latestScores(axis.scores, 'measured')) {
      if (!row.modelId || row.lowSample || !finite(row.value)) continue;
      values[row.modelId] = { value: row.value, approximate: false };
    }
    for (const estimate of axis.estimates || []) {
      if (estimate.status !== 'estimated' || !estimate.modelId || !finite(estimate.value) || values[estimate.modelId]) continue;
      values[estimate.modelId] = { value: estimate.value, approximate: true, bridge: bridgeSummary(estimate) };
    }
    if (Object.keys(values).length) axes.push({
      id: axis.id,
      name: axis.name,
      category: axis.category || 'Other',
      unit: axis.unit,
      values,
      higherBetter: axis.higherBetter,
      stats: { n: axis.stats.n, min: axis.stats.min, max: axis.stats.max },
    });
  }

  const categories = [];
  for (const category of [...new Set(axes.map((axis) => axis.category))].sort()) {
    const categoryAxes = axes.filter((axis) => axis.category === category);
    const values = {};
    const modelIds = new Set(categoryAxes.flatMap((axis) => Object.keys(axis.values)));
    for (const modelId of modelIds) {
      const normalized = categoryAxes.flatMap((axis) => {
        const value = axis.values[modelId];
        if (!value) return [];
        const position = normalize(value.value, { n: axis.stats.n, families: 0, mean: null, sd: null, min: axis.stats.min, max: axis.stats.max }, axis.higherBetter);
        return position == null ? [] : [{ position, approximate: value.approximate }];
      });
      if (!normalized.length) continue;
      const approximateCount = normalized.filter((entry) => entry.approximate).length;
      values[modelId] = {
        value: median(normalized.map((entry) => entry.position)),
        coverage: normalized.length,
        approximate: approximateCount > 0,
        approximateCount,
      };
    }
    if (Object.keys(values).length) categories.push({ id: category, label: `${category} median`, benchmarkCount: categoryAxes.length, values });
  }
  return { axes, categories };
}
