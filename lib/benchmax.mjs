// Benchmaxxing: cross-benchmark prediction and carefully qualified bottom-decile tags.
// Presentation layer only — it never changes the registry, source scores or Composite.
// Every prediction is a labelled estimate with an uncertainty interval, in the target
// benchmark's native unit, on one exact version and cohort; it is never a measurement,
// versions are never mixed or pooled, and sparse data is never labelled definitive.
import { latestScores } from './benchmark-view.mjs';
import { benchmaxxingLevelFor } from './benchmaxxing-levels.mjs';

export const MIN_OVERLAP = 12;
export const MIN_ABS_R = 0.5;
export const DECILE_MIN_PEERS = 20;
export const DECILE_MIN_AXES = 4;
export const DECILE_MIN_FAMILIES = 2;
/** CR-22.1: a percentile needs a cohort of at least this many model families. Two variants of one model
 *  (e.g. Muse Spark 1.3 max 0.68 / xhigh 0.64 on one harness) would otherwise be ranked 100 and 0. */
export const PERCENTILE_MIN_FAMILIES = 3;

const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// A documented finite score range is part of an axis's semantics. Do not clamp an
// OLS result into it: a point outside the documented range must remain unknown.
// Axes without finite documented bounds (including Elo) intentionally stay eligible.
const publishablePoint = (axis, point) => {
  if (!finite(point)) return false;
  const range = axis?.publishedRange;
  if (!Array.isArray(range) || range.length !== 2 || !finite(range[0]) || !finite(range[1])) return true;
  return point >= range[0] && point <= range[1];
};

/** Measured, catalog-matched values per axis: Map(axisId -> Map(modelId -> native value)).
 *  Measured results only, low-sample rows excluded, unmatched source identities excluded. */
export function measuredAxisMaps(view) {
  const out = new Map();
  for (const axis of view.axes) {
    const m = new Map();
    for (const r of latestScores(axis.scores)) {
      if (!r.modelId || r.lowSample || !finite(r.value)) continue;
      m.set(r.modelId, r.value);
    }
    out.set(axis.id, m);
  }
  return out;
}

/** Any-kind evidence per axis (measured, self-reported or derived), for gap detection.
 *  A model with any result on an axis already has a result; we never predict over it. */
export function evidencedAxisMaps(view) {
  const out = new Map();
  for (const axis of view.axes) {
    const m = new Map();
    for (const r of latestScores(axis.scores, 'all')) {
      if (!r.modelId || !finite(r.value) || m.has(r.modelId)) continue;
      m.set(r.modelId, r.value);
    }
    out.set(axis.id, m);
  }
  return out;
}

/** Ordinary least squares of y on x. Null unless n>=3 with genuine variance. */
export function fitPair(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length) return null;
  const n = xs.length;
  if (n < 3) return null;
  let mx = 0;
  let my = 0;
  for (let k = 0; k < n; k++) {
    if (!finite(xs[k]) || !finite(ys[k])) return null;
    mx += xs[k];
    my += ys[k];
  }
  mx /= n;
  my /= n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let k = 0; k < n; k++) {
    const dx = xs[k] - mx;
    const dy = ys[k] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (!(sxx > 0) || !(syy > 0)) return null;
  const r = sxy / Math.sqrt(sxx * syy);
  const slope = sxy / sxx;
  const rss = Math.max(0, syy - (sxy * sxy) / sxx);
  return {
    n,
    r,
    r2: r * r,
    slope: sxy / sxx,
    intercept: my - (sxy / sxx) * mx,
    meanX: mx,
    meanY: my,
    sxx,
    rss,
    residSd: Math.sqrt(rss / (n - 2)),
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
  };
}

/** Rough ~95% prediction interval under usual linear-model assumptions:
 *  point +- 2 x residual SD x sqrt(1 + 1/n + (x - meanX)^2 / sxx). */
export function predictionInterval(x, st) {
  const point = st.intercept + st.slope * x;
  const half = 2 * st.residSd * Math.sqrt(1 + 1 / st.n + ((x - st.meanX) ** 2) / st.sxx);
  return { point, half, low: point - half, high: point + half };
}

/** Linear fit statistics per ordered axis pair (predictor -> target), keyed
 *  `${predictor}|${target}`. Keeps pairs with >= minOverlap shared measured catalog
 *  models and |Pearson r| >= minAbsR. Both directions are stored; units stay native. */
export function computePairStats(maps, { minOverlap = MIN_OVERLAP, minAbsR = MIN_ABS_R } = {}) {
  const ids = [...maps.keys()];
  const out = new Map();
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      const A = maps.get(a);
      const B = maps.get(b);
      if (!A || !B || Math.min(A.size, B.size) < minOverlap) continue;
      const xs = [];
      const ys = [];
      for (const [k, v] of A) {
        if (B.has(k)) {
          xs.push(v);
          ys.push(B.get(k));
        }
      }
      if (xs.length < minOverlap) continue;
      const st = fitPair(xs, ys);
      if (st && st.n >= minOverlap && Math.abs(st.r) >= minAbsR) out.set(`${a}|${b}`, st);
    }
  }
  return out;
}

export function observedRange(map) {
  if (!map || !map.size) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of map.values()) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo === Infinity ? null : [lo, hi];
}

function shortMeta(axis) {
  return { axisId: axis.id, benchmarkId: axis.benchmarkId, name: axis.name, version: axis.version, cohort: axis.cohort, unit: axis.unit };
}

function fullTargetMeta(axis, maps) {
  return {
    axisId: axis.id,
    benchmarkId: axis.benchmarkId,
    name: axis.name,
    version: axis.version,
    cohort: axis.cohort,
    unit: axis.unit,
    higherBetter: axis.higherBetter ?? null,
    category: axis.category,
    publishedRange: Array.isArray(axis.publishedRange) ? axis.publishedRange : null,
    observedRange: observedRange(maps.get(axis.id)),
  };
}

const pickBest = (subjectAxes, stats, targetId) => {
  let best = null;
  let bestP = null;
  for (const p of subjectAxes) {
    const st = stats.get(`${p}|${targetId}`);
    if (!st) continue;
    if (!best || Math.abs(st.r) > Math.abs(best.r) || (Math.abs(st.r) === Math.abs(best.r) && st.n > best.n)) {
      best = st;
      bestP = p;
    }
  }
  return best ? { st: best, predictorId: bestP } : null;
};

const subjectAxesByModel = (maps) => {
  const out = new Map();
  for (const [id, mm] of maps) {
    for (const k of mm.keys()) {
      if (!out.has(k)) out.set(k, []);
      out.get(k).push(id);
    }
  }
  return out;
};

/** Predict one catalog model's missing axis values. A target is predicted only where
 *  the model has no result of any kind on that exact axis; predictor values are
 *  measured results on one exact predictor axis. Qualified pairs need >= minOverlap
 *  shared measured catalog models and |r| >= minAbsR. Estimated values arrive in the
 *  target's native unit with a ~95% interval; they are never measurements. */
export function predictForModel(view, maps, evid, stats, modelId, { limit = 25 } = {}) {
  const model = view.models.find((m) => m.id === modelId) ?? null;
  if (!model) return null;
  const axesById = new Map(view.axes.map((a) => [a.id, a]));
  const modelAxes = [];
  for (const [id, mm] of maps) if (mm.has(modelId)) modelAxes.push(id);
  const predictions = [];
  for (const t of view.axes) {
    if (!modelAxes.length) break;
    if (evid.get(t.id)?.has(modelId)) continue;
    let best = null;
    let bestP = null;
    for (const p of modelAxes) {
      const st = stats.get(`${p}|${t.id}`);
      if (!st) continue;
      if (!best || Math.abs(st.r) > Math.abs(best.r) || (Math.abs(st.r) === Math.abs(best.r) && st.n > best.n)) {
        best = st;
        bestP = p;
      }
    }
    if (!best) continue;
    const paxis = axesById.get(bestP);
    const x = maps.get(bestP)?.get(modelId);
    if (!paxis || !finite(x)) continue;
    const iv = predictionInterval(x, best);
    if (!publishablePoint(t, iv.point)) continue;
    predictions.push({
      target: fullTargetMeta(t, maps),
      point: iv.point,
      low: iv.low,
      high: iv.high,
      half: iv.half,
      predictor: shortMeta(paxis),
      predictorValue: x,
      outsideFitRange: x < best.minX || x > best.maxX,
      n: best.n,
      r: best.r,
      r2: best.r2,
    });
  }
  predictions.sort((a, b) => Math.abs(b.r) - Math.abs(a.r) || b.n - a.n);
  return { model: { id: model.id, name: model.name, org: model.org }, predictions: predictions.slice(0, limit) };
}

/** Predicted scores for catalog models with no result on the given exact axis. */
export function predictForAxis(view, maps, evid, stats, axisId, { limit = 50 } = {}) {
  const axis = view.axes.find((a) => a.id === axisId);
  if (!axis) return null;
  const models = new Map(view.models.map((m) => [m.id, m]));
  const meta = new Map(view.axes.map((a) => [a.id, a]));
  const covered = evid.get(axisId);
  const subjects = new Map();
  for (const [id, mm] of maps) {
    for (const k of mm.keys()) {
      if (!subjects.has(k)) subjects.set(k, []);
      subjects.get(k).push(id);
    }
  }
  const predictions = [];
  for (const [modelId, modelAxes] of subjects) {
    if (covered?.has(modelId)) continue;
    let best = null;
    let bestP = null;
    for (const p of modelAxes) {
      const st = stats.get(`${p}|${axisId}`);
      if (!st) continue;
      if (!best || Math.abs(st.r) > Math.abs(best.r) || (Math.abs(st.r) === Math.abs(best.r) && st.n > best.n)) {
        best = st;
        bestP = p;
      }
    }
    if (!best) continue;
    const paxis = meta.get(bestP);
    const x = maps.get(bestP)?.get(modelId);
    if (!paxis || !finite(x)) continue;
    const iv = predictionInterval(x, best);
    if (!publishablePoint(axis, iv.point)) continue;
    const m = models.get(modelId);
    predictions.push({
      model: { id: modelId, name: m?.name ?? modelId, org: m?.org ?? '' },
      point: iv.point,
      low: iv.low,
      high: iv.high,
      half: iv.half,
      predictor: shortMeta(paxis),
      predictorValue: x,
      outsideFitRange: x < best.minX || x > best.maxX,
      n: best.n,
      r: best.r,
      r2: best.r2,
    });
  }
  predictions.sort((a, b) => Math.abs(b.r) - Math.abs(a.r) || b.n - a.n);
  return {
    axis: {
      axisId: axis.id,
      benchmarkId: axis.benchmarkId,
      name: axis.name,
      version: axis.version,
      cohort: axis.cohort,
      unit: axis.unit,
      higherBetter: axis.higherBetter ?? null,
      category: axis.category,
      publishedRange: Array.isArray(axis.publishedRange) ? axis.publishedRange : null,
      observedRange: observedRange(maps.get(axis.id)),
    },
    predictions: predictions.slice(0, limit),
  };
}

/** Strongest qualified cross-benchmark signals (predictor -> target), for discovery. */
export function topPairs(view, stats, { limit = 25, minN = 20 } = {}) {
  const meta = new Map(view.axes.map((a) => [a.id, a]));
  const out = [];
  for (const [key, st] of stats) {
    if (st.n < minN) continue;
    const sep = key.indexOf('|');
    const pa = meta.get(key.slice(0, sep));
    const ta = meta.get(key.slice(sep + 1));
    if (!pa || !ta) continue;
    out.push({ predictor: shortMeta(pa), target: shortMeta(ta), n: st.n, r: st.r, r2: st.r2 });
  }
  out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r) || b.n - a.n);
  return out.slice(0, limit);
}

/** Strongest predicted gap-fillers across every missing catalog-model cell.
 *  Targets and predictors are always exact axis ids; versions are never mixed. */
export function topPredictions(view, maps, evid, stats, { limit = 25 } = {}) {
  const subjectAxes = subjectAxesByModel(maps);
  const meta = new Map(view.axes.map((a) => [a.id, a]));
  const models = new Map(view.models.map((m) => [m.id, m]));
  const out = [];
  for (const t of view.axes) {
    const covered = evid.get(t.id);
    for (const [modelId, modelAxes] of subjectAxes) {
      if (covered?.has(modelId)) continue;
      const best = pickBest(modelAxes, stats, t.id);
      if (!best) continue;
      const paxis = meta.get(best.predictorId);
      const x = maps.get(best.predictorId)?.get(modelId);
      if (!paxis || !finite(x)) continue;
      const iv = predictionInterval(x, best.st);
      if (!publishablePoint(t, iv.point)) continue;
      const m = models.get(modelId);
      out.push({
        model: { id: modelId, name: m?.name ?? modelId, org: m?.org ?? '' },
        target: fullTargetMeta(t, maps),
        point: iv.point,
        low: iv.low,
        high: iv.high,
        half: iv.half,
        predictor: shortMeta(paxis),
        predictorValue: x,
        outsideFitRange: x < best.st.minX || x > best.st.maxX,
        n: best.st.n,
        r: best.st.r,
        r2: best.st.r2,
      });
    }
  }
  out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r) || b.n - a.n);
  return out.slice(0, limit);
}

/** Carefully qualified bottom-decile tags. Per axis: the worst decile of the measured
 *  catalog cohort on one exact benchmark version and cohort — requires >= minPeers
 *  measured catalog models, direction-adjusted, measured results only, low-sample
 *  rows excluded. Aggregate model tag: bottom decile on >= minAxes distinct axes
 *  across >= minFamilies benchmark families. Measured results only; missing
 *  benchmarks never count against a model; versions are never pooled. */
/** CR-64: true for a benchmark that measures a task result (not cost, tokens, latency or speed). */
export function isCapabilityAxis(axis) {
  return (axis.kind ?? (axis.category === 'Efficiency' ? 'efficiency' : 'capability')) === 'capability';
}

/** CR-65.7: the axes the Benchmaxxing signal and its radar read — capability boards with a verifiable score.
 *  Judged boards (a vote or a judge model's opinion, data/benchmark-caveats.json) measure taste, and Uncensored
 *  measures willingness; a jump there is not a sign of benchmark targeting. */
export const SIGNAL_EXCLUDED_CATEGORIES = new Set(['Uncensored']);
export function isSignalAxis(axis) {
  return isCapabilityAxis(axis) && axis.judged !== true && !SIGNAL_EXCLUDED_CATEGORIES.has(axis.category);
}

export function bottomDecileTags(view, { minPeers = DECILE_MIN_PEERS, minAxes = DECILE_MIN_AXES, minFamilies = DECILE_MIN_FAMILIES } = {}, maps = null) {
  maps = maps || measuredAxisMaps(view);
  const models = new Map(view.models.map((m) => [m.id, m]));
  const perAxis = new Map();
  const perModel = new Map();
  for (const axis of view.axes) {
    const mm = maps.get(axis.id);
    if (!isCapabilityAxis(axis) || !mm || mm.size < minPeers || axis.higherBetter == null) continue;
    const n = mm.size;
    const entries = [...mm.entries()].sort(
      (a, b) => (axis.higherBetter ? a[1] - b[1] : b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])),
    );
    const k = Math.max(1, Math.floor(n * 0.1));
    const tagged = entries.slice(0, k);
    perAxis.set(axis.id, {
      axisId: axis.id,
      benchmarkId: axis.benchmarkId,
      name: axis.name,
      version: axis.version,
      cohort: axis.cohort,
      unit: axis.unit,
      higherBetter: axis.higherBetter,
      family: axis.family,
      category: axis.category,
      n,
      k,
      models: tagged.map(([mid, value]) => ({ modelId: mid, name: models.get(mid)?.name ?? mid, org: models.get(mid)?.org ?? '', value })),
    });
    for (const [mid, value] of tagged) {
      if (!perModel.has(mid)) perModel.set(mid, []);
      perModel.get(mid).push({
        axisId: axis.id,
        name: axis.name,
        version: axis.version,
        cohort: axis.cohort,
        unit: axis.unit,
        family: axis.family,
        category: axis.category,
        value,
        n,
        higherBetter: axis.higherBetter,
      });
    }
  }
  const aggregate = [];
  for (const [mid, records] of perModel) {
    const axisIds = new Set(records.map((r) => r.axisId));
    const families = [...new Set(records.map((r) => r.family))];
    if (records.length >= minAxes && families.length >= minFamilies) {
      const m = models.get(mid);
      aggregate.push({ modelId: mid, name: m?.name ?? mid, org: m?.org ?? '', count: records.length, families, detail: records });
    }
  }
  aggregate.sort((a, b) => b.count - a.count || b.families.length - a.families.length || String(a.modelId).localeCompare(String(b.modelId)));
  return { perAxis, perModel, aggregate };
}

// CR-69 (Florian 2026-09-17, calibration job bh-benchmaxxing-calibration-20260917): the Benchmaxxing signal is a
// signed direction, not unevenness. Unevenness cannot tell benchmaxxing from specialisation; a model that ranks
// higher on public "headline" boards (questions labs quote and can tune toward) than on "held-out" boards of the same
// topic (private, brand-new or newer than the models) is what the screen looks for. Tiers come from
// data/benchmaxxing-tiers.json, keyed by benchmark family, with one-line reasons; only benchmark facts decide a tier.
// Scores are descriptive screening indicators, never proof of contamination or leakage.
import tierTable from '../data/benchmaxxing-tiers.json' with { type: 'json' };

const categoryName = (axis) => String(axis.category || axis.family || 'Other').trim() || 'Other';

export const BENCHMAXX_TIERS = Object.freeze(['headline', 'heldout', 'domain', 'secondary', 'aggregate', 'judged']);
export const BENCHMAXX_TIER_TABLE = tierTable;

/** CR-69.1: the tier of a board. A `family@version` entry overrides the family (Terminal-Bench 4.0 is held-out, 2.1
 *  headline); an axis may carry `benchmaxxingTier` itself (synthetic fixtures). A board without an entry is
 *  `secondary` and never enters a pair. */
export function benchmaxxingTier(axis) {
  if (axis?.benchmaxxingTier) return { tier: axis.benchmaxxingTier, reason: 'Set on the axis.' };
  const t = tierTable.tiers[`${axis?.family}@${axis?.version}`] ?? tierTable.tiers[axis?.family];
  return t ? { tier: t.tier, reason: t.reason, domain: t.domain ?? null } : { tier: 'secondary', reason: 'No tier assigned yet: not used.', untiered: true };
}

/** The side a board takes in the signal: 'headline', 'heldout', or null (not used). */
export function benchmaxxingSide(axis) {
  if (!isSignalAxis(axis)) return null;
  const { tier } = benchmaxxingTier(axis);
  return tier === 'headline' || tier === 'heldout' ? tier : null;
}

const percentileCache = new WeakMap();

// All percentiles of one axis at once (mid-rank for ties), cached per axis object:
// scoring the whole catalog would otherwise re-sort every axis once per model.
function axisPercentiles(axis) {
  if (percentileCache.has(axis)) return percentileCache.get(axis);
  const rows = latestScores(axis.scores).filter((r) => r.modelId && !r.lowSample && finite(r.value));
  const out = new Map();
  const families = new Set(rows.map((r) => String(r.modelId).split('::')[0]));
  if (rows.length >= 2 && families.size >= PERCENTILE_MIN_FAMILIES) {
    const values = rows.map((r) => r.value).sort((a, b) => a - b);
    const firstIndex = new Map(); const count = new Map();
    values.forEach((v, i) => { if (!firstIndex.has(v)) firstIndex.set(v, i); count.set(v, (count.get(v) ?? 0) + 1); });
    for (const r of rows) {
      if (out.has(r.modelId)) continue;
      let p = ((firstIndex.get(r.value) + (count.get(r.value) - 1) / 2) / (values.length - 1)) * 100;
      if (axis.higherBetter === false) p = 100 - p;
      out.set(r.modelId, p);
    }
  }
  percentileCache.set(axis, out);
  return out;
}

export function percentileFor(axis, modelId) {
  return axisPercentiles(axis).get(modelId) ?? null;
}

/** F-107: how many models the axis' percentiles are taken over (0 when the cohort is too small to rank). */
export function percentileCohortSize(axis) {
  return axisPercentiles(axis).size;
}

/** Ordered many-axis radar data. Category groups are contiguous clockwise,
 * while missing measurements stay explicit null gaps rather than fake zeros.
 * CR-69.4: each axis carries its tier and whether it takes part in the signal (headline or held-out). */
export function groupedRadarProfile(view, modelId) {
  // CR-64 (Florian 2026-09-16): Benchmaxxing reads capability only. Cost and efficiency boards ("cost per test")
  // would sit at percentile 0 for strong, expensive models and fake a jagged shape.
  const axes = view.axes.filter(isSignalAxis).map((axis) => {
    const value = percentileFor(axis, modelId);
    const row = value == null ? null : latestScores(axis.scores).find((score) => score.modelId === modelId && !score.lowSample && finite(score.value));
    return { id: axis.id, name: axis.name, version: axis.version, category: categoryName(axis), value,
      nativeValue: row?.value ?? null, observedDate: row?.date ?? null, missing: value == null, unit: axis.unit,
      tier: benchmaxxingTier(axis).tier, side: benchmaxxingSide(axis) };
  }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return { modelId, axes, measured: axes.filter((axis) => !axis.missing).length, total: axes.length };
}

// CR-69.2 coverage rule: n = distinct headline boards + distinct held-out boards in the model's pairs − 1. A model is
// scored with n ≥ BENCHMAXX_MIN_COMPARISONS and pairs from at least BENCHMAXX_MIN_TOPICS topics.
export const BENCHMAXX_MIN_COMPARISONS = 6;
export const BENCHMAXX_MIN_TOPICS = 2;
// Shrinkage toward zero ("no sign") with strength k estimated from the catalog (empirical Bayes), clamped to this range.
export const BENCHMAXX_MIN_SHRINK = 6;
export const BENCHMAXX_MAX_SHRINK = 50;
// CR-65.6: a named tag (any level) needs n ≥ this; models between BENCHMAXX_MIN_COMPARISONS and this keep their
// score but are never tagged.
export const BENCHMAXX_TAG_MIN_COMPARISONS = 10;
// CR-74.1: the three tag levels (light ≥ +3, medium ≥ +6, very strong ≥ +12) live in a client-safe module.
export { BENCHMAXX_LIGHT_THRESHOLD, BENCHMAXX_MEDIUM_THRESHOLD, BENCHMAXX_STRONG_THRESHOLD, BENCHMAXX_LEVELS, benchmaxxingLevelFor } from './benchmaxxing-levels.mjs';

// CR-65.7: two boards often rank different populations, so a pair ranks the model on both boards among the models
// measured on BOTH (common cohort, mid-rank ties). A pair counts only when that cohort has at least
// BENCHMAXX_PAIR_MIN_MODELS models from PERCENTILE_MIN_FAMILIES families.
export const BENCHMAXX_PAIR_MIN_MODELS = 10;

const pairCache = new WeakMap();

function signalRows(axis) {
  const out = new Map();
  for (const r of latestScores(axis.scores)) if (r.modelId && !r.lowSample && finite(r.value) && !out.has(r.modelId)) out.set(r.modelId, r.value);
  return out;
}

function commonCohortRanks(values, ids, higherBetter) {
  const sorted = ids.map((id) => values.get(id)).sort((a, b) => a - b);
  const firstIndex = new Map(); const count = new Map();
  sorted.forEach((v, i) => { if (!firstIndex.has(v)) firstIndex.set(v, i); count.set(v, (count.get(v) ?? 0) + 1); });
  const out = new Map();
  for (const id of ids) {
    const v = values.get(id);
    let p = ((firstIndex.get(v) + (count.get(v) - 1) / 2) / (sorted.length - 1)) * 100;
    if (higherBetter === false) p = 100 - p;
    out.set(id, p);
  }
  return out;
}

/** Common-cohort percentiles of every model measured on both boards: Map(id -> [pA, pB]), or null when the pair
 *  has no qualifying common cohort. Cached per view and ordered pair. */
export function pairPercentiles(view, axisA, axisB) {
  if (!pairCache.has(view)) pairCache.set(view, { rows: new Map(), pairs: new Map() });
  const cache = pairCache.get(view);
  const key = `${axisA.id}\0${axisB.id}`;
  if (cache.pairs.has(key)) return cache.pairs.get(key);
  const rows = (axis) => { if (!cache.rows.has(axis.id)) cache.rows.set(axis.id, signalRows(axis)); return cache.rows.get(axis.id); };
  const a = rows(axisA), b = rows(axisB);
  const ids = [...a.keys()].filter((id) => b.has(id));
  let out = null;
  if (ids.length >= BENCHMAXX_PAIR_MIN_MODELS && new Set(ids.map((id) => String(id).split('::')[0])).size >= PERCENTILE_MIN_FAMILIES) {
    const pa = commonCohortRanks(a, ids, axisA.higherBetter), pb = commonCohortRanks(b, ids, axisB.higherBetter);
    out = new Map(ids.map((id) => [id, [pa.get(id), pb.get(id)]]));
  }
  cache.pairs.set(key, out);
  return out;
}

/** CR-65.7: |percentile on A − percentile on B| in the pair's common cohort, per model; null without a cohort. */
export function pairDistances(view, axisA, axisB) {
  const p = pairPercentiles(view, axisA, axisB);
  return p ? new Map([...p].map(([id, [a, b]]) => [id, Math.abs(a - b)])) : null;
}

const axisMeta = (axis) => ({ id: axis.id, name: axis.name, version: axis.version });

function rawBenchmaxxing(view, modelId, { minComparisons = BENCHMAXX_MIN_COMPARISONS, minTopics = BENCHMAXX_MIN_TOPICS } = {}) {
  const profile = groupedRadarProfile(view, modelId);
  const coverage = profile.total ? profile.measured / profile.total : 0;
  const measured = new Set(profile.axes.filter((a) => !a.missing).map((a) => a.id));
  const boards = view.axes.filter((axis) => measured.has(axis.id) && benchmaxxingSide(axis));
  const headline = boards.filter((a) => benchmaxxingSide(a) === 'headline'), heldout = boards.filter((a) => benchmaxxingSide(a) === 'heldout');
  const pairs = [];
  for (const h of headline) for (const x of heldout) {
    if (categoryName(h) !== categoryName(x)) continue;
    const p = pairPercentiles(view, h, x)?.get(modelId);
    if (!p) continue;
    pairs.push({ category: categoryName(h), headline: axisMeta(h), heldout: axisMeta(x), headlinePercentile: p[0], heldoutPercentile: p[1], gap: p[0] - p[1], cohort: pairPercentiles(view, h, x).size });
  }
  const hs = new Set(pairs.map((u) => u.headline.id)), xs = new Set(pairs.map((u) => u.heldout.id));
  const comparisons = pairs.length ? hs.size + xs.size - 1 : 0;
  const byTopic = new Map();
  for (const u of pairs) { if (!byTopic.has(u.category)) byTopic.set(u.category, []); byTopic.get(u.category).push(u.gap); }
  const topicGaps = [...byTopic].map(([category, gaps]) => ({ category, pairs: gaps.length, gap: gaps.reduce((a, b) => a + b, 0) / gaps.length }));
  // Between-topic distance stays disclosed as specialisation and never enters the score.
  const groupMeans = [];
  const groups = new Map();
  for (const axis of profile.axes) if (axis.value != null) { if (!groups.has(axis.category)) groups.set(axis.category, []); groups.get(axis.category).push(axis.value); }
  for (const vals of groups.values()) groupMeans.push(vals.reduce((a, b) => a + b, 0) / vals.length);
  const domainSpecialization = groupMeans.length > 1 ? Math.max(...groupMeans) - Math.min(...groupMeans) : 0;
  const eligible = comparisons >= minComparisons && byTopic.size >= minTopics;
  return { eligible, rawScore: pairs.length ? pairs.reduce((s, u) => s + u.gap, 0) / pairs.length : null, comparisons, topics: byTopic.size,
    headlineBoards: hs.size, heldoutBoards: xs.size, pairs, topicGaps, coverage, profile, domainSpecialization };
}

const priorCache = new WeakMap();

/** CR-69.2: shrinkage toward zero. k = sigma^2 / tau^2 from regressing each eligible model's squared deviation from the
 *  eligible mean on 1/n (E[(x - mu)^2] = tau^2 + sigma^2 / n), clamped to BENCHMAXX_MIN_SHRINK…BENCHMAXX_MAX_SHRINK. */
export function benchmaxxingPrior(view) {
  if (priorCache.has(view)) return priorCache.get(view);
  const rows = []; const raw = new Map();
  for (const model of view.models) {
    const r = rawBenchmaxxing(view, model.id);
    raw.set(model.id, r);
    if (r.eligible) rows.push({ raw: r.rawScore, n: r.comparisons });
  }
  let shrink = BENCHMAXX_MIN_SHRINK;
  const catalogMean = rows.length ? rows.reduce((s, r) => s + r.raw, 0) / rows.length : null;
  if (rows.length >= 10) {
    const xs = rows.map((r) => 1 / r.n); const ys = rows.map((r) => (r.raw - catalogMean) ** 2);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    let sxy = 0; let sxx = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    const sigma2 = sxx > 0 ? Math.max(0, sxy / sxx) : 0;
    const tau2 = my - sigma2 * mx;
    // tau^2 <= 0: the spread between models is explained by coverage noise alone — shrink as hard as allowed.
    shrink = tau2 > 0 ? Math.min(BENCHMAXX_MAX_SHRINK, Math.max(BENCHMAXX_MIN_SHRINK, sigma2 / tau2)) : BENCHMAXX_MAX_SHRINK;
  }
  const prior = { mean: 0, catalogMean, shrink, eligible: rows.length, raw };
  priorCache.set(view, prior);
  return prior;
}

// CR-69.3: bootstrap interval. Each replicate resamples the model's headline boards and its held-out boards separately
// with replacement; every pair is weighted by (draws of its headline board × draws of its held-out board); the same
// shrinkage applies. Deterministic: seeded by the model id.
export const BENCHMAXX_BOOTSTRAP_REPLICATES = 400;
export const BENCHMAXX_INTERVAL = 0.8;

function seededRandom(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let state = ((h >>> 0) % 2147483646) + 1;
  return () => (state = (state * 48271) % 2147483647) / 2147483647;
}

function bootstrapInterval(modelId, r, k, { replicates = BENCHMAXX_BOOTSTRAP_REPLICATES, level = BENCHMAXX_INTERVAL } = {}) {
  const H = [...new Set(r.pairs.map((u) => u.headline.id))].sort(), X = [...new Set(r.pairs.map((u) => u.heldout.id))].sort();
  const rand = seededRandom(modelId);
  const scores = [];
  for (let b = 0; b < replicates; b += 1) {
    const ch = new Map(), cx = new Map();
    for (let i = 0; i < H.length; i += 1) { const id = H[Math.floor(rand() * H.length)]; ch.set(id, (ch.get(id) ?? 0) + 1); }
    for (let i = 0; i < X.length; i += 1) { const id = X[Math.floor(rand() * X.length)]; cx.set(id, (cx.get(id) ?? 0) + 1); }
    let total = 0; let weights = 0;
    for (const u of r.pairs) { const w = (ch.get(u.headline.id) ?? 0) * (cx.get(u.heldout.id) ?? 0); total += w * u.gap; weights += w; }
    if (!weights) continue;
    scores.push((r.comparisons * (total / weights)) / (r.comparisons + k));
  }
  if (!scores.length) return null;
  scores.sort((a, b) => a - b);
  const at = (q) => scores[Math.min(scores.length - 1, Math.max(0, Math.round(q * (scores.length - 1))))];
  const tail = (1 - level) / 2;
  return { lower: at(tail), upper: at(1 - tail), level, replicates: scores.length };
}

/** One descriptive score per model (CR-69.2): the mean signed common-cohort percentile gap, headline − held-out, over
 *  every same-topic pair, shrunk toward zero by n / (n + k). Plus = better on famous public tests than on tests nobody
 *  can train for; zero = no sign. The report names the drivers: the three largest positive and negative pairs. */
export function scoreBenchmaxxing(view, modelId, { minComparisons = BENCHMAXX_MIN_COMPARISONS, minTopics = BENCHMAXX_MIN_TOPICS } = {}) {
  const defaults = minComparisons === BENCHMAXX_MIN_COMPARISONS && minTopics === BENCHMAXX_MIN_TOPICS;
  const r = (defaults && benchmaxxingPrior(view).raw.get(modelId)) || rawBenchmaxxing(view, modelId, { minComparisons, minTopics });
  const rule = { minComparisons, minTopics };
  const byGap = [...r.pairs].sort((a, b) => b.gap - a.gap || a.headline.id.localeCompare(b.headline.id) || a.heldout.id.localeCompare(b.heldout.id));
  const drivers = { positive: byGap.filter((u) => u.gap > 0).slice(0, 3), negative: byGap.filter((u) => u.gap < 0).reverse().slice(0, 3) };
  const base = { coverage: r.coverage, profile: r.profile, comparisons: r.comparisons, topics: r.topics, headlineBoards: r.headlineBoards, heldoutBoards: r.heldoutBoards,
    pairCount: r.pairs.length, topicGaps: r.topicGaps, drivers, rule };
  if (!r.eligible) return { status: 'insufficient-coverage', score: null, rawScore: r.rawScore, domainSpecialization: null, ...base };
  const k = benchmaxxingPrior(view).shrink;
  const score = (r.comparisons * r.rawScore) / (r.comparisons + k);
  return { status: 'scored', score, rawScore: r.rawScore, domainSpecialization: r.domainSpecialization, shrinkage: { priorMean: 0, k },
    interval: bootstrapInterval(modelId, r, k), ...base };
}

/** CR-69.3: bootstrap interval of a scored model's published score; null when the model is not scored. */
export function benchmaxxingInterval(view, modelId, opts = {}) {
  const r = benchmaxxingPrior(view).raw.get(modelId) ?? rawBenchmaxxing(view, modelId);
  if (!r.eligible) return null;
  return bootstrapInterval(modelId, r, benchmaxxingPrior(view).shrink, opts);
}

/** The published Benchmaxxing tag (CR-74.1) among `modelIds` (default: the whole catalog). Pool = scored models with
 *  n ≥ BENCHMAXX_TAG_MIN_COMPARISONS; the level is benchmaxxingLevelFor(score) (light ≥ +3, medium ≥ +6, strong ≥ +12,
 *  absolute percentile points after shrinkage); a model reaching a level is tagged only when its interval's lower end
 *  is above zero. `levels`: id → level of every tagged model; `tagged`: their ids. `average` is the threshold the
 *  lower end must clear (0). One implementation for every page, so they can never disagree. */
export function benchmaxxingSignals(view, modelIds = null) {
  const ids = modelIds ? [...modelIds] : view.models.map((m) => m.id);
  const reports = ids.map((id) => [id, scoreBenchmaxxing(view, id)])
    .filter(([, report]) => report.status === 'scored')
    .sort((a, b) => b[1].score - a[1].score || String(a[0]).localeCompare(String(b[0])));
  const pool = reports.filter(([, report]) => report.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS);
  const average = pool.length ? 0 : null;
  const levels = new Map(); const banded = [];
  pool.forEach(([id, report]) => {
    const band = benchmaxxingLevelFor(report.score);
    if (!band) return;
    const passes = Boolean(report.interval && report.interval.lower > 0);
    banded.push({ id, band, passes });
    if (passes) levels.set(id, band);
  });
  return { reports, levels, tagged: new Set(levels.keys()), average, banded };
}

/** CR-21.1 (Florian 2026-09-15): reasoning variants of one model share weights and training run, so the
 *  Benchmaxxing verdict belongs to the model, not to an effort setting. One representative per family —
 *  the scored variant with the most measured axes (then most comparisons, then id) — carries the family's
 *  score; the tag level is judged on representatives; a tagged family tags every variant, so the
 *  Overview tag and the Benchmaxxing table can never disagree between siblings. */
export function benchmaxxingFamilySignals(view) {
  const familyOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
  const best = new Map();
  for (const m of view.models) {
    const report = scoreBenchmaxxing(view, m.id);
    if (report.status !== 'scored') continue;
    const fam = familyOf.get(m.id), prev = best.get(fam);
    const better = !prev || report.profile.measured > prev[1].profile.measured
      || (report.profile.measured === prev[1].profile.measured && (report.comparisons > prev[1].comparisons
        || (report.comparisons === prev[1].comparisons && String(m.id).localeCompare(String(prev[0])) < 0)));
    if (better) best.set(fam, [m.id, report]);
  }
  const { reports, levels: repLevels, average, banded } = benchmaxxingSignals(view, [...best.values()].map(([id]) => id));
  const familyLevels = new Map([...repLevels].map(([id, level]) => [familyOf.get(id), level]));
  const levels = new Map(view.models.filter((m) => familyLevels.has(familyOf.get(m.id))).map((m) => [m.id, familyLevels.get(familyOf.get(m.id))]));
  const variants = new Map();
  for (const m of view.models) { const f = familyOf.get(m.id); variants.set(f, (variants.get(f) ?? 0) + 1); }
  return { reports, levels, familyLevels, tagged: new Set(levels.keys()), taggedFamilies: new Set(familyLevels.keys()), average, banded, representatives: new Map([...best].map(([f, [id]]) => [f, id])), variantsOf: (id) => variants.get(familyOf.get(id)) ?? 1 };
}
