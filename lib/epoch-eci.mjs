// Epoch AI ECI collection and the domain-specific one-dimensional refit used by
// Epoch's public ECI explorer. Keep this logic separate from the network script so
// the parser and fit can be tested without touching the live source.

export const ECI_URLS = Object.freeze({
  general: "https://epoch.ai/data/eci_scores.csv",
  performance: "https://epoch.ai/data/processed_data_for_eci.csv",
  difficulties: "https://epoch.ai/data/edi_scores.csv",
  benchmark_catalog: "https://epoch.ai/_astro/benchmarks.DGKf4Lsg.js",
});

export const ECI_DEFINITION_VERSION = "epoch-eci-2026-09-12";

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).filter((values) => values.some((value) => value !== "")).map((values) =>
    Object.fromEntries(header.map((key, i) => [key, values[i] ?? ""])));
}

function finite(value) { return typeof value === "number" && Number.isFinite(value); }

const sigmoid = (value) => value > 500 ? 1 : value < -500 ? 0 : 1 / (1 + Math.exp(-value));

function lossAt(points, x) {
  let loss = 0, gradient = 0, curvature = 0;
  for (const point of points) {
    const predicted = sigmoid(point.slope * (x - point.edi));
    const residual = point.perf - predicted;
    const derivative = point.slope * predicted * (1 - predicted);
    loss += residual * residual;
    gradient += -2 * residual * derivative;
    curvature += 2 * derivative * derivative;
  }
  return { loss, gradient, curvature };
}

function weightedLogitStart(points, low, high) {
  let weight = 0, weighted = 0;
  for (const { perf, edi, slope } of points) {
    if (perf <= 0 || perf >= 1 || slope <= 0) return null;
    const w = slope * slope;
    weight += w;
    weighted += w * (edi + Math.log(perf / (1 - perf)) / slope);
  }
  const candidate = weight > 0 && finite(weighted) ? weighted / weight : (low + high) / 2;
  return Math.max(low, Math.min(high, candidate));
}

function newton(points, start, low, high) {
  let x = start, evaluation = lossAt(points, x);
  const minimumCurvature = 1e-15, tolerance = 1e-9, maxStep = 4 / Math.min(...points.map((p) => p.slope));
  for (let iteration = 0; iteration < 200 && finite(evaluation.loss) && evaluation.curvature >= minimumCurvature; iteration += 1) {
    let step = evaluation.gradient / evaluation.curvature;
    step = Math.max(-maxStep, Math.min(maxStep, step));
    let nextX = Math.max(low, Math.min(high, x - step));
    let next = lossAt(points, nextX);
    for (let backtrack = 0; backtrack < 5 && next.loss > evaluation.loss * 1.000000000001; backtrack += 1) {
      step /= 2;
      const previous = nextX;
      nextX = Math.max(low, Math.min(high, x - step));
      if (nextX === previous) break;
      next = lossAt(points, nextX);
    }
    if (next.loss > evaluation.loss * 1.000000000001) break;
    const change = Math.abs(x - nextX);
    x = nextX; evaluation = next;
    if (change < tolerance) return { x, converged: true };
  }
  return { x, converged: false };
}

function goldenSection(points, low, high) {
  const ratio = 0.3819660112501051;
  let a = low, b = high, x = a + ratio * (b - a), fx = lossAt(points, x).loss;
  let w = x, v = x, fw = fx, fv = fx, previousStep = 0, previousPreviousStep = 0;
  for (let iteration = 0; iteration < 10000; iteration += 1) {
    const middle = (a + b) / 2, tolerance = 1e-8 * Math.abs(x) + 1e-10;
    if (Math.abs(x - middle) <= 2 * tolerance - 0.5 * (b - a)) return x;
    let step;
    if (Math.abs(previousStep) > tolerance) {
      const p = (x - w) * (fx - fv), q = (x - v) * (fx - fw);
      let denominator = (x - v) * q - (x - w) * p;
      let numerator = 2 * (q - p);
      if (numerator > 0) denominator = -denominator; else numerator = -numerator;
      if (Math.abs(denominator) < Math.abs(0.5 * numerator * previousStep)
          && denominator > numerator * (a - x) && denominator < numerator * (b - x)) {
        previousPreviousStep = previousStep; previousStep = denominator / numerator; step = x + previousStep;
        if (step - a < 2 * tolerance || b - step < 2 * tolerance) previousStep = x < middle ? tolerance : -tolerance;
      } else { previousStep = (x < middle ? b : a) - x; previousPreviousStep = previousStep; step = ratio * previousStep; }
    } else { previousStep = (x < middle ? b : a) - x; previousPreviousStep = previousStep; step = ratio * previousStep; }
    const candidate = Math.abs(step) >= tolerance ? x + step : x + (step > 0 ? tolerance : -tolerance);
    const fc = lossAt(points, candidate).loss;
    if (fc <= fx) {
      if (candidate < x) b = x; else a = x;
      v = w; fv = fw; w = x; fw = fx; x = candidate; fx = fc;
    } else {
      if (candidate < x) a = candidate; else b = candidate;
      if (fc <= fw || w === x) { v = w; fv = fw; w = candidate; fw = fc; }
      else if (fc <= fv || v === x || v === w) { v = candidate; fv = fc; }
    }
  }
  return x;
}

/** Fit the one-dimensional ECI capability parameter exactly on Epoch's [-100, 300] scale. */
export function fitEci(points, { low = -100, high = 300 } = {}) {
  if (!points.length || points.some((p) => !finite(p.perf) || !finite(p.edi) || !finite(p.slope) || p.perf <= 0 || p.perf >= 1 || p.slope <= 0)) return null;
  const start = weightedLogitStart(points, low, high) ?? (low + high) / 2;
  let best = lossAt(points, start), x = start;
  const fallback = Math.max(low, Math.min(high, (low + high) / 2));
  const midpoint = lossAt(points, fallback);
  if (midpoint.loss < best.loss) { x = fallback; best = midpoint; }
  const fitted = newton(points, x, low, high);
  if (fitted.converged && finite(fitted.x)) return fitted.x;
  const golden = goldenSection(points, low, high);
  return finite(golden) ? golden : null;
}

export function parseBenchmarkCatalog(source) {
  const executable = source.replace(/export\{e as t\};?\s*$/, "");
  const catalog = new Function(`${executable}\nreturn e;`)();
  return Object.values(catalog).filter((entry) => entry && typeof entry === "object" && entry.id && entry.title)
    .map((entry) => ({ id: entry.id, title: entry.title, domains: Array.isArray(entry.domains) ? entry.domains : [] }));
}

export function buildEciSnapshot({ generalRows, performanceRows, difficultyRows, benchmarkCatalog, collectedAt, hashes, minSoftwareModels = 20 }) {
  // The explorer joins benchmark IDs and titles after lower-casing and removing
  // punctuation (for example `SWE-Bench verified` → `swebenchverified`). Mirror
  // that public join so aliases in the processed export are not silently lost.
  const benchmarkKey = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const softwareNames = new Set();
  for (const entry of benchmarkCatalog) {
    if (!entry.domains.includes("Software engineering")) continue;
    for (const difficulty of difficultyRows) {
      const name = String(difficulty.benchmark_name || "").trim();
      if (benchmarkKey(name) === benchmarkKey(entry.id) || benchmarkKey(name) === benchmarkKey(entry.title)) softwareNames.add(name);
    }
  }
  const difficulties = new Map(difficultyRows.map((row) => [String(row.benchmark_name || "").trim(), {
    edi: Number(row.edi), slope: Number(row.estimated_slope_scaled),
  }]));
  const performance = new Map();
  for (const row of performanceRows) {
    const model = String(row.model || row.Model || "").trim();
    const benchmark = String(row.benchmark || "").trim();
    const value = Number(row.performance);
    if (!model || !benchmark || !finite(value)) continue;
    if (!performance.has(model)) performance.set(model, new Map());
    const current = performance.get(model).get(benchmark);
    if (current == null || value > current) performance.get(model).set(benchmark, value);
  }
  const models = generalRows.map((row) => {
    const name = String(row.Model || "").trim();
    const perf = performance.get(name) || new Map();
    const points = [...perf.entries()].filter(([benchmark]) => softwareNames.has(benchmark)).map(([benchmark, value]) => {
      const difficulty = difficulties.get(benchmark);
      return difficulty ? { benchmark, perf: Math.max(0.001, Math.min(0.999, value)), ...difficulty } : null;
    }).filter(Boolean);
    return {
      source_model_name: name,
      display_name: String(row["Display name"] || name),
      organization: String(row.Organization || "") || null,
      general: Number(row.eci),
      general_ci_low: Number(row.eci_ci_low),
      general_ci_high: Number(row.eci_ci_high),
      date: String(row.date || "") || null,
      software: points.length >= 2 ? fitEci(points) : null,
      software_benchmark_count: points.length,
      software_benchmarks: points.map((point) => point.benchmark).sort(),
    };
  });
  if (!models.length || models.some((model) => !finite(model.general))) throw new Error("Epoch ECI general snapshot is empty or malformed");
  const softwareCount = models.filter((model) => model.software != null).length;
  if (softwareCount < minSoftwareModels) throw new Error(`Epoch ECI software snapshot unexpectedly small: ${softwareCount}`);
  return {
    schema_version: 1,
    definition_version: ECI_DEFINITION_VERSION,
    collected_at: collectedAt,
    source: {
      provider: "Epoch AI",
      license: "CC-BY",
      urls: ECI_URLS,
      sha256: hashes,
      note: "General ECI is copied from eci_scores.csv. Software engineering ECI is refit from the official processed performance export and EDI parameters using Epoch's public sigmoid least-squares method; at least two software benchmarks are required.",
    },
    counts: { general_models: models.length, software_models: softwareCount },
    models,
  };
}
