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
export function bottomDecileTags(view, { minPeers = DECILE_MIN_PEERS, minAxes = DECILE_MIN_AXES, minFamilies = DECILE_MIN_FAMILIES } = {}, maps = null) {
  maps = maps || measuredAxisMaps(view);
  const models = new Map(view.models.map((m) => [m.id, m]));
  const perAxis = new Map();
  const perModel = new Map();
  for (const axis of view.axes) {
    const mm = maps.get(axis.id);
    if (!mm || mm.size < minPeers || axis.higherBetter == null) continue;
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
  if (rows.length >= 2) {
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

function percentileFor(axis, modelId) {
  return axisPercentiles(axis).get(modelId) ?? null;
}

/** Ordered many-axis radar data. Category groups are contiguous clockwise,
 * while missing measurements stay explicit null gaps rather than fake zeros. */
export function groupedRadarProfile(view, modelId) {
  const axes = view.axes.map((axis) => {
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
export const BENCHMAXX_MIN_SHRINK = 2;
export const BENCHMAXX_MAX_SHRINK = 50;
export const BENCHMAXX_TAG_SHARE = 0.1;

function rawBenchmaxxing(view, modelId, { minMeasured = 4, minComparisons = BENCHMAXX_MIN_COMPARISONS, minTopics = BENCHMAXX_MIN_TOPICS } = {}) {
  const profile = groupedRadarProfile(view, modelId);
  const coverage = profile.total ? profile.measured / profile.total : 0;
  const groups = new Map();
  for (const axis of profile.axes) { if (!groups.has(axis.category)) groups.set(axis.category, []); groups.get(axis.category).push(axis); }
  const jumps = []; const groupMeans = []; const topicSpread = [];
  let comparisons = 0; let weighted = 0;
  for (const [category, axes] of groups) {
    const seen = axes.filter((axis) => axis.value != null);
    if (seen.length) groupMeans.push(seen.reduce((sum, axis) => sum + axis.value, 0) / seen.length);
    for (let i = 1; i < seen.length; i += 1) jumps.push({ category, from: seen[i - 1].id, to: seen[i].id, magnitude: Math.abs(seen[i].value - seen[i - 1].value) });
    if (seen.length < 2) continue;
    // Mean absolute difference over all pairs in the topic: independent of the
    // (alphabetical) axis order, so no pair of benchmarks is privileged.
    let total = 0; let pairs = 0;
    for (let i = 0; i < seen.length; i += 1) for (let j = i + 1; j < seen.length; j += 1) { total += Math.abs(seen[i].value - seen[j].value); pairs += 1; }
    const spread = total / pairs;
    topicSpread.push({ category, measured: seen.length, spread });
    comparisons += seen.length - 1;
    weighted += (seen.length - 1) * spread;
  }
  const domainSpecialization = groupMeans.length > 1 ? Math.max(...groupMeans) - Math.min(...groupMeans) : 0;
  const eligible = profile.measured >= minMeasured && comparisons >= minComparisons && topicSpread.length >= minTopics;
  return { eligible, rawScore: comparisons ? weighted / comparisons : null, comparisons, topics: topicSpread.length, topicSpread, coverage, profile, domainSpecialization, jumps };
}

const priorCache = new WeakMap();

/** Catalog prior for shrinkage: mean raw score of eligible models, and a shrinkage
 *  strength k = sigma^2 / tau^2 estimated by regressing each model's squared deviation
 *  on 1/comparisons (E[(x - mu)^2] = tau^2 + sigma^2 / n). Clamped to >= BENCHMAXX_MIN_SHRINK. */
export function benchmaxxingPrior(view) {
  if (priorCache.has(view)) return priorCache.get(view);
  const rows = []; const raw = new Map();
  for (const model of view.models) {
    const r = rawBenchmaxxing(view, model.id);
    raw.set(model.id, r);
    if (r.eligible) rows.push({ id: model.id, raw: r.rawScore, n: r.comparisons });
  }
  let prior = { mean: null, shrink: BENCHMAXX_MIN_SHRINK, eligible: rows.length, raw };
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
  const mean = prior.mean ?? r.rawScore;
  const k = prior.shrink;
  const score = (r.comparisons * r.rawScore + k * mean) / (r.comparisons + k);
  return { status: 'scored', score, rawScore: r.rawScore, domainSpecialization: r.domainSpecialization, shrinkage: { priorMean: mean, k }, ...base };
}

/** The published Benchmaxxing tag: the highest-scoring BENCHMAXX_TAG_SHARE of scored
 *  models among `modelIds` (default: the whole catalog). One implementation for the
 *  overview table and the dedicated page, so the two can never disagree. */
export function benchmaxxingSignals(view, modelIds = null) {
  const ids = modelIds ? [...modelIds] : view.models.map((m) => m.id);
  const reports = ids.map((id) => [id, scoreBenchmaxxing(view, id)])
    .filter(([, report]) => report.status === 'scored')
    .sort((a, b) => b[1].score - a[1].score || String(a[0]).localeCompare(String(b[0])));
  const tagged = new Set(reports.slice(0, reports.length ? Math.max(1, Math.ceil(reports.length * BENCHMAXX_TAG_SHARE)) : 0).map(([id]) => id));
  return { reports, tagged };
}


