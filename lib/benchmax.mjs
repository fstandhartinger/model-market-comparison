// Benchmaxxing: cross-benchmark prediction and carefully qualified bottom-decile tags.
// Presentation layer only — it never changes the registry, source scores or Composite.
// Every prediction is a labelled estimate with an uncertainty interval, in the target
// benchmark's native unit, on one exact version and cohort; it is never a measurement,
// versions are never mixed or pooled, and sparse data is never labelled definitive.
import { latestScores } from './benchmark-view.mjs';

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

// A model's Benchmaxxing signal is deliberately about local discontinuities
// between semantically adjacent benchmarks. A smooth high Coding / low Writing
// profile is specialization, not evidence of benchmark targeting. Scores below
// are descriptive anomaly indicators, never proof of contamination or leakage.
const categoryName = (axis) => String(axis.category || axis.family || 'Other').trim() || 'Other';

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
 * while missing measurements stay explicit null gaps rather than fake zeros. */
export function groupedRadarProfile(view, modelId) {
  // CR-64 (Florian 2026-09-16): Benchmaxxing reads capability only. Cost and efficiency boards ("cost per test")
  // would sit at percentile 0 for strong, expensive models and fake a jagged shape.
  const axes = view.axes.filter(isSignalAxis).map((axis) => {
    const value = percentileFor(axis, modelId);
    const row = value == null ? null : latestScores(axis.scores).find((score) => score.modelId === modelId && !score.lowSample && finite(score.value));
    return { id: axis.id, name: axis.name, version: axis.version, category: categoryName(axis), value,
      nativeValue: row?.value ?? null, observedDate: row?.date ?? null, missing: value == null, unit: axis.unit };
  }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  return { modelId, axes, measured: axes.filter((axis) => !axis.missing).length, total: axes.length };
}

// B3 coverage rule (review 2026-09-13): a model is scored only with at least
// BENCHMAXX_MIN_COMPARISONS within-topic degrees of freedom, sum(n_topic - 1),
// spread over at least BENCHMAXX_MIN_TOPICS topics. Below that, one or two
// comparisons decide the result and the tag would publish noise about a named model.
export const BENCHMAXX_MIN_COMPARISONS = 6;
export const BENCHMAXX_MIN_TOPICS = 2;
// Shrinkage strength is estimated from the catalog (empirical Bayes) but never
// weaker than this many comparisons' worth of prior.
// CR-65.6: floor raised from 2 — at 2 a model with six comparisons was barely shrunk and the tag boundary was noise.
export const BENCHMAXX_MIN_SHRINK = 6;
// CR-65.6: a named tag (strong or weak) needs at least this many within-topic comparisons; models between
// BENCHMAXX_MIN_COMPARISONS and this keep their score but are never tagged, and do not count in the tag share.
export const BENCHMAXX_TAG_MIN_COMPARISONS = 10;
export const BENCHMAXX_MAX_SHRINK = 50;
export const BENCHMAXX_TAG_SHARE = 0.1;
// CR-42.2 (Florian 2026-09-16): a weaker tag level. Same rank rule as the strong tag, wider share:
// the families ranked inside the top BENCHMAXX_WEAK_SHARE but outside the strong top
// BENCHMAXX_TAG_SHARE carry the weak tag. Rank-based on purpose — the scores are shrunk and
// catalog-relative, so an absolute cut would silently change meaning as boards join.
export const BENCHMAXX_WEAK_SHARE = 0.2;

// CR-65.7 (data & math gauntlet B5): two boards of one topic often rank different populations — a frontier-only
// board and an all-comers board put the same model ~25 percentile points apart with no disagreement about it.
// A within-topic comparison therefore ranks the model on both boards among the models measured on BOTH (the pair's
// common cohort, mid-rank ties), so two boards with the same order give the same percentile whatever else they
// cover. A pair is compared only when that common cohort has at least BENCHMAXX_PAIR_MIN_MODELS models from
// PERCENTILE_MIN_FAMILIES families; otherwise the pair says nothing about this model. The radar keeps each board's
// own percentile (what a reader sees on the board); only the signal uses the pairwise ranks.
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

/** CR-65.7: |percentile on A − percentile on B| among the models measured on both, per model; null when the pair
 *  has no qualifying common cohort. Cached per view and pair. */
export function pairDistances(view, axisA, axisB) {
  if (!pairCache.has(view)) pairCache.set(view, { rows: new Map(), pairs: new Map() });
  const cache = pairCache.get(view);
  const key = axisA.id < axisB.id ? `${axisA.id}\0${axisB.id}` : `${axisB.id}\0${axisA.id}`;
  if (cache.pairs.has(key)) return cache.pairs.get(key);
  const rows = (axis) => { if (!cache.rows.has(axis.id)) cache.rows.set(axis.id, signalRows(axis)); return cache.rows.get(axis.id); };
  const a = rows(axisA), b = rows(axisB);
  const ids = [...a.keys()].filter((id) => b.has(id));
  let out = null;
  if (ids.length >= BENCHMAXX_PAIR_MIN_MODELS && new Set(ids.map((id) => String(id).split('::')[0])).size >= PERCENTILE_MIN_FAMILIES) {
    const pa = commonCohortRanks(a, ids, axisA.higherBetter), pb = commonCohortRanks(b, ids, axisB.higherBetter);
    out = new Map(ids.map((id) => [id, Math.abs(pa.get(id) - pb.get(id))]));
  }
  cache.pairs.set(key, out);
  return out;
}

function rawBenchmaxxing(view, modelId, { minMeasured = 4, minComparisons = BENCHMAXX_MIN_COMPARISONS, minTopics = BENCHMAXX_MIN_TOPICS } = {}) {
  const profile = groupedRadarProfile(view, modelId);
  const coverage = profile.total ? profile.measured / profile.total : 0;
  const axisById = new Map(view.axes.map((axis) => [axis.id, axis]));
  const groups = new Map();
  for (const axis of profile.axes) { if (!groups.has(axis.category)) groups.set(axis.category, []); groups.get(axis.category).push(axis); }
  const jumps = []; const groupMeans = []; const topicSpread = []; const topicPairs = [];
  let comparisons = 0; let weighted = 0;
  for (const [category, axes] of groups) {
    const seen = axes.filter((axis) => axis.value != null);
    if (seen.length) groupMeans.push(seen.reduce((sum, axis) => sum + axis.value, 0) / seen.length);
    for (let i = 1; i < seen.length; i += 1) jumps.push({ category, from: seen[i - 1].id, to: seen[i].id, magnitude: Math.abs(seen[i].value - seen[i - 1].value) });
    if (seen.length < 2) continue;
    // Mean absolute common-cohort percentile difference over all comparable pairs in the topic: independent of
    // the (alphabetical) axis order, so no pair of benchmarks is privileged.
    const d = seen.map(() => seen.map(() => null));
    const linked = new Set();
    let total = 0; let pairs = 0;
    for (let i = 0; i < seen.length; i += 1) for (let j = i + 1; j < seen.length; j += 1) {
      const gap = pairDistances(view, axisById.get(seen[i].id), axisById.get(seen[j].id))?.get(modelId);
      if (gap == null) continue;
      d[i][j] = d[j][i] = gap; linked.add(i); linked.add(j);
      total += gap; pairs += 1;
    }
    if (!pairs) continue;
    const spread = total / pairs;
    // Degrees of freedom: the boards that take part in at least one comparison, minus one (never more than the pairs).
    const df = Math.min(linked.size - 1, pairs);
    topicSpread.push({ category, measured: linked.size, spread });
    topicPairs.push({ df, d: [...linked].map((i) => [...linked].map((j) => d[i][j])) });
    comparisons += df;
    weighted += df * spread;
  }
  const domainSpecialization = groupMeans.length > 1 ? Math.max(...groupMeans) - Math.min(...groupMeans) : 0;
  const eligible = profile.measured >= minMeasured && comparisons >= minComparisons && topicSpread.length >= minTopics;
  const measuredValues = profile.axes.filter((axis) => axis.value != null).map((axis) => axis.value);
  const level = measuredValues.length ? measuredValues.reduce((a, b) => a + b, 0) / measuredValues.length : null;
  return { eligible, rawScore: comparisons ? weighted / comparisons : null, comparisons, topics: topicSpread.length, topicSpread, topicPairs, coverage, profile, domainSpecialization, jumps, level };
}

const priorCache = new WeakMap();

// CR-65.5 (data & math gauntlet B1): percentiles are bounded, so a model near the top or bottom of every board
// cannot spread much, and a mid-table model spreads most — even with no benchmaxxing at all (null simulation:
// 97 % of the "most uneven" models were mid-pack). The raw spread is therefore divided by the spread expected
// at the model's level (its mean percentile), fitted on the catalog as a quadratic in the level, and rescaled to
// the catalog mean. Below BENCHMAXX_LEVEL_MIN_MODELS eligible models the fit is not trusted and nothing is
// adjusted. The expected spread never drops below BENCHMAXX_LEVEL_FLOOR × the catalog mean, so a model at the
// very edge is not blown up by a near-zero expectation.
export const BENCHMAXX_LEVEL_MIN_MODELS = 20;
export const BENCHMAXX_LEVEL_FLOOR = 0.25;

/** Least-squares quadratic y ≈ a + b·x + c·x² (x = mean percentile 0–100). Returns null when degenerate. */
export function fitLevelCurve(points) {
  if (points.length < 3) return null;
  // Normal equations on centred/scaled x for numerical stability.
  const xs = points.map((p) => (p.x - 50) / 50), ys = points.map((p) => p.y);
  const S = (f) => xs.reduce((sum, x, i) => sum + f(x, ys[i]), 0);
  const n = xs.length, s1 = S((x) => x), s2 = S((x) => x * x), s3 = S((x) => x ** 3), s4 = S((x) => x ** 4);
  const t0 = S((x, y) => y), t1 = S((x, y) => x * y), t2 = S((x, y) => x * x * y);
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const A = [[n, s1, s2], [s1, s2, s3], [s2, s3, s4]], D = det3(A);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-9) return null;
  const col = (k, v) => A.map((row, i) => row.map((cell, j) => (j === k ? v[i] : cell)));
  const [a, b, c] = [0, 1, 2].map((k) => det3(col(k, [t0, t1, t2])) / D);
  return { a, b, c, at: (level) => { const x = (level - 50) / 50; return a + b * x + c * x * x; } };
}

/** Catalog prior for shrinkage: mean raw score of eligible models, and a shrinkage
 *  strength k = sigma^2 / tau^2 estimated by regressing each model's squared deviation
 *  on 1/comparisons (E[(x - mu)^2] = tau^2 + sigma^2 / n). Clamped to >= BENCHMAXX_MIN_SHRINK. */
export function benchmaxxingPrior(view) {
  if (priorCache.has(view)) return priorCache.get(view);
  const rows = []; const raw = new Map();
  for (const model of view.models) {
    const r = rawBenchmaxxing(view, model.id);
    raw.set(model.id, r);
    if (r.eligible) rows.push({ id: model.id, raw: r.rawScore, n: r.comparisons, level: r.level });
  }
  let level = null;
  if (rows.length >= BENCHMAXX_LEVEL_MIN_MODELS) {
    const catalogMean = rows.reduce((s, r) => s + r.raw, 0) / rows.length;
    const curve = fitLevelCurve(rows.map((r) => ({ x: r.level, y: r.raw })));
    if (curve && catalogMean > 0) {
      const floor = BENCHMAXX_LEVEL_FLOOR * catalogMean;
      const expectedAt = (lv) => Math.max(floor, curve.at(lv));
      level = { catalogMean, curve: { a: curve.a, b: curve.b, c: curve.c }, floor, expectedAt, models: rows.length };
      for (const r of rows) r.raw = r.raw * catalogMean / expectedAt(r.level);
    }
  }
  let prior = { mean: null, shrink: BENCHMAXX_MIN_SHRINK, eligible: rows.length, raw, level, adjusted: new Map(rows.map((r) => [r.id, r.raw])) };
  if (rows.length) {
    const mean = rows.reduce((s, r) => s + r.raw, 0) / rows.length;
    let shrink = BENCHMAXX_MIN_SHRINK;
    if (rows.length >= 10) {
      const xs = rows.map((r) => 1 / r.n); const ys = rows.map((r) => (r.raw - mean) ** 2);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length; const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let sxy = 0; let sxx = 0;
      xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
      const sigma2 = sxx > 0 ? Math.max(0, sxy / sxx) : 0;
      const tau2 = my - sigma2 * mx;
      // tau^2 <= 0: the spread between models is explained by coverage noise alone,
      // so shrink as strongly as the cap allows rather than trusting raw scores.
      shrink = tau2 > 0 ? Math.min(BENCHMAXX_MAX_SHRINK, Math.max(BENCHMAXX_MIN_SHRINK, sigma2 / tau2)) : BENCHMAXX_MAX_SHRINK;
    }
    prior = { ...prior, mean, shrink };
  }
  priorCache.set(view, prior);
  return prior;
}

/** One primary descriptive score per model: the within-topic percentile spread (mean
 * absolute difference over all measured pairs in a topic, weighted by the topic's
 * n - 1), shrunk toward the catalog mean by n / (n + k). Cross-topic distance is
 * reported separately as domainSpecialization and never added to the score. Models
 * below the coverage rule receive no score. */
export function scoreBenchmaxxing(view, modelId, { minMeasured = 4, minComparisons = BENCHMAXX_MIN_COMPARISONS, minTopics = BENCHMAXX_MIN_TOPICS } = {}) {
  const defaults = minMeasured === 4 && minComparisons === BENCHMAXX_MIN_COMPARISONS && minTopics === BENCHMAXX_MIN_TOPICS;
  const r = (defaults && benchmaxxingPrior(view).raw.get(modelId)) || rawBenchmaxxing(view, modelId, { minMeasured, minComparisons, minTopics });
  const rule = { minComparisons, minTopics };
  const base = { coverage: r.coverage, profile: r.profile, comparisons: r.comparisons, topics: r.topics, topicSpread: r.topicSpread, jumps: r.jumps, rule };
  if (!r.eligible) return { status: 'insufficient-coverage', score: null, rawScore: null, domainSpecialization: null, ...base };
  const prior = benchmaxxingPrior(view);
  // CR-65.5: the level-adjusted spread (see fitLevelCurve); unadjusted when the catalog is too small to fit.
  const expected = prior.level ? prior.level.expectedAt(r.level) : null;
  const adjusted = expected ? r.rawScore * prior.level.catalogMean / expected : r.rawScore;
  const mean = prior.mean ?? adjusted;
  const k = prior.shrink;
  const score = (r.comparisons * adjusted + k * mean) / (r.comparisons + k);
  return { status: 'scored', score, rawScore: r.rawScore, levelAdjustment: expected ? { level: r.level, expected, catalogMean: prior.level.catalogMean, adjusted } : null,
    domainSpecialization: r.domainSpecialization, shrinkage: { priorMean: mean, k }, ...base };
}

// CR-65.6 (data & math gauntlet B3): the strong cut sat at 27.02 and the first weak model at 26.94 — the boundary
// was noise. Each model near a tag gets a bootstrap interval of its own score: its benchmarks are resampled with
// replacement inside every topic (pairs of the same benchmark drawn twice are skipped, so resampling does not
// shrink the spread), and the level adjustment and shrinkage are applied exactly as for the published score. A
// model keeps its rank-band tag (strong: top BENCHMAXX_TAG_SHARE, weak: the next band) only when the lower end of
// its BENCHMAXX_INTERVAL interval lies above the catalog average — i.e. it is credibly more uneven than a typical
// model, not just ranked above a neighbour by noise. Iteration 91 decision: the brief's stricter reading (the lower
// end must clear the score of the first model below the band) tags no model at all on the 17 Sep catalog — the top
// 16 scores span 4.5 points while each interval is ±5–8 — which would drop the tag Florian asked for (00, "show it
// for the worst benchmaxxing models") rather than make it sound. Deterministic: the resampling is seeded by the model id.
export const BENCHMAXX_BOOTSTRAP_REPLICATES = 400;
export const BENCHMAXX_INTERVAL = 0.8;

function seededRandom(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let state = ((h >>> 0) % 2147483646) + 1;
  return () => (state = (state * 48271) % 2147483647) / 2147483647;
}

/** CR-65.6: bootstrap interval of a scored model's published score; null when the model is not scored. */
export function benchmaxxingInterval(view, modelId, { replicates = BENCHMAXX_BOOTSTRAP_REPLICATES, level = BENCHMAXX_INTERVAL } = {}) {
  const report = scoreBenchmaxxing(view, modelId);
  if (report.status !== 'scored') return null;
  const prior = benchmaxxingPrior(view);
  const r = prior.raw.get(modelId) ?? rawBenchmaxxing(view, modelId);
  const factor = report.levelAdjustment ? report.levelAdjustment.catalogMean / report.levelAdjustment.expected : 1;
  const { priorMean, k } = report.shrinkage;
  const rand = seededRandom(modelId);
  const scores = [];
  for (let b = 0; b < replicates; b += 1) {
    let weighted = 0; let weights = 0;
    for (const { df, d } of r.topicPairs) {
      const draw = d.map(() => Math.floor(rand() * d.length));
      let total = 0; let pairs = 0;
      for (let i = 0; i < draw.length; i += 1) for (let j = i + 1; j < draw.length; j += 1) {
        const gap = draw[i] === draw[j] ? null : d[draw[i]][draw[j]];
        if (gap == null) continue;
        total += gap; pairs += 1;
      }
      if (!pairs) continue;
      weighted += df * (total / pairs); weights += df;
    }
    if (!weights) continue;
    const adjusted = (weighted / weights) * factor;
    scores.push((r.comparisons * adjusted + k * priorMean) / (r.comparisons + k));
  }
  scores.sort((a, b) => a - b);
  const at = (q) => scores[Math.min(scores.length - 1, Math.max(0, Math.round(q * (scores.length - 1))))];
  const tail = (1 - level) / 2;
  return { lower: at(tail), upper: at(1 - tail), level, replicates: scores.length };
}

/** The published Benchmaxxing tag: the highest-scoring BENCHMAXX_TAG_SHARE of scored
 *  models among `modelIds` (default: the whole catalog). One implementation for the
 *  overview table and the dedicated page, so the two can never disagree. */
export function benchmaxxingSignals(view, modelIds = null) {
  const ids = modelIds ? [...modelIds] : view.models.map((m) => m.id);
  const reports = ids.map((id) => [id, scoreBenchmaxxing(view, id)])
    .filter(([, report]) => report.status === 'scored')
    .sort((a, b) => b[1].score - a[1].score || String(a[0]).localeCompare(String(b[0])));
  const pool = reports.filter(([, report]) => report.comparisons >= BENCHMAXX_TAG_MIN_COMPARISONS);
  const cut = (share) => (pool.length ? Math.max(1, Math.ceil(pool.length * share)) : 0);
  const strongN = cut(BENCHMAXX_TAG_SHARE);
  const weakN = Math.max(strongN, cut(BENCHMAXX_WEAK_SHARE));
  // CR-65.6: a rank-band model is tagged only when its interval's lower end lies above the catalog average.
  const average = pool.length ? benchmaxxingPrior(view).mean : null;
  const tagged = new Set(); const weak = new Set();
  pool.slice(0, weakN).forEach(([id, report], rank) => {
    const interval = benchmaxxingInterval(view, id);
    report.interval = interval;
    if (!interval || average == null || interval.lower <= average) return;
    (rank < strongN ? tagged : weak).add(id);
  });
  return { reports, tagged, weak, average };
}



/** CR-21.1 (Florian 2026-09-15): reasoning variants of one model share weights and training run, so the
 *  Benchmaxxing verdict belongs to the model, not to an effort setting. One representative per family —
 *  the scored variant with the most measured axes (then most comparisons, then id) — carries the family's
 *  score; the tag share is taken over representatives; a tagged family tags every variant, so the
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
  const { reports, tagged: taggedReps, weak: weakReps, average } = benchmaxxingSignals(view, [...best.values()].map(([id]) => id));
  const taggedFamilies = new Set([...taggedReps].map((id) => familyOf.get(id)));
  const weakFamilies = new Set([...weakReps].map((id) => familyOf.get(id)));
  const tagged = new Set(view.models.filter((m) => taggedFamilies.has(familyOf.get(m.id))).map((m) => m.id));
  const weak = new Set(view.models.filter((m) => weakFamilies.has(familyOf.get(m.id))).map((m) => m.id));
  const variants = new Map();
  for (const m of view.models) { const f = familyOf.get(m.id); variants.set(f, (variants.get(f) ?? 0) + 1); }
  return { reports, tagged, taggedFamilies, weak, weakFamilies, average, representatives: new Map([...best].map(([f, [id]]) => [f, id])), variantsOf: (id) => variants.get(familyOf.get(id)) ?? 1 };
}
