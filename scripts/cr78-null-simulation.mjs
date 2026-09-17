#!/usr/bin/env node
// CR-78.1 — null simulation of the blended Benchmaxxing score.
//
// The question the simulation has to answer before the jaggedness term is published: in a catalog where NOBODY
// targets benchmarks, how often does `signal + 0.3 × (jaggedness − catalog mean)` still reach a tag level, and
// does it reach it more often for models at a particular capability level? The second half matters because
// percentiles are bounded (CR-65.5): a model near the top or the bottom of every board cannot spread much, while
// a mid-table model can — so an uncentred spread measure tags the middle of the field for free.
//
// The null keeps the real structure — the same boards, topics, tiers, cohorts and coverage pattern, and each
// model's own capability level — and replaces only the thing under test: every board score becomes the model's
// latent ability plus independent noise, so no model is systematically better on headline boards than on held-out
// ones and no model has a real within-topic shape. The noise is calibrated (bisection) so the simulated catalog
// reproduces the OBSERVED mean jaggedness: the null is given the benefit of the doubt that all of today's
// unevenness is noise. Whatever still crosses a threshold is a false positive of the published rule.
//
//   node scripts/cr78-null-simulation.mjs [--replicates 40] [--out DIR]
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBenchmarkView, latestScores } from '../lib/benchmark-view.mjs';
import { benchmaxxingPrior, benchmaxxingLevelFor, groupedRadarProfile, isSignalAxis, percentileFor,
  scoreBenchmaxxing, topicJaggedness, BENCHMAXX_JAGGEDNESS_WEIGHT } from '../lib/benchmax.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const REPLICATES = Number(arg('--replicates', 40));
const OUT = arg('--out', '/opt/benchmarkheaven/state/ux-evidence/cr78/null-simulation');

const rng = (seed) => { let s = seed >>> 0 || 1; return () => (s = (s * 48271) % 2147483647) / 2147483647; };
const normal = (rand) => { // Box–Muller
  const u = Math.max(rand(), 1e-12), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
// Φ⁻¹, Acklam's rational approximation — only needs to be good enough to place a level on a latent scale.
function probit(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) return -probit(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const dataset = JSON.parse(readFileSync('data/dataset.json', 'utf8'));
const view = buildBenchmarkView(dataset);
const signalAxes = view.axes.filter(isSignalAxis);

// Who is measured where, and each model's observed capability level (mean percentile over its signal boards).
const measured = new Map(); // axis id -> [model ids]
for (const axis of signalAxes) {
  const ids = [...new Set(latestScores(axis.scores).filter((r) => r.modelId && !r.lowSample && Number.isFinite(r.value)).map((r) => r.modelId))];
  measured.set(axis.id, ids);
}
const level = new Map();
for (const model of view.models) {
  const values = groupedRadarProfile(view, model.id).axes.map((a) => a.value).filter((v) => v != null);
  if (values.length) level.set(model.id, values.reduce((a, b) => a + b, 0) / values.length);
}
const latent = new Map([...level].map(([id, p]) => [id, probit(Math.min(99.5, Math.max(0.5, p)) / 100)]));

/** One null catalog: the real boards and cohorts, scores = latent ability + sigma × noise. */
function nullView(sigma, seed) {
  const rand = rng(seed);
  const axes = signalAxes.map((axis) => ({
    ...axis,
    scores: (measured.get(axis.id) ?? []).map((modelId) => ({ modelId, value: (latent.get(modelId) ?? 0) + sigma * normal(rand),
      basis: 'measured', lowSample: false, date: '2026-09-17' })),
    higherBetter: true, // the null works on the latent scale, where more is always better
  }));
  return { models: view.models, axes };
}

function catalogStats(v) {
  const prior = benchmaxxingPrior(v);
  const rows = [];
  for (const model of v.models) {
    const report = scoreBenchmaxxing(v, model.id);
    if (report.status !== 'scored') continue;
    rows.push({ id: model.id, level: level.get(model.id) ?? null, gap: report.parts.gap, jaggedness: report.parts.jaggedness,
      blended: report.score });
  }
  return { prior, rows, meanJaggedness: prior.jaggednessMean };
}

const observed = catalogStats(view);
console.log(`observed catalog: ${observed.rows.length} scored models, mean jaggedness ${observed.meanJaggedness.toFixed(2)}`);

// Calibrate sigma so the null reproduces the observed mean jaggedness.
let lo = 0.05, hi = 3.0, sigma = 0.5;
for (let step = 0; step < 18; step += 1) {
  sigma = (lo + hi) / 2;
  const m = catalogStats(nullView(sigma, 12345)).meanJaggedness;
  if (m < observed.meanJaggedness) lo = sigma; else hi = sigma;
}
const calibration = catalogStats(nullView(sigma, 12345));
console.log(`calibrated sigma ${sigma.toFixed(4)} → null mean jaggedness ${calibration.meanJaggedness.toFixed(2)}`);

const quintile = (l) => (l == null ? null : Math.min(4, Math.floor(l / 20)));
const empty = () => ({ models: 0, light: 0, medium: 0, strong: 0, tagged: 0 });
const tally = { gapOnly: empty(), blended: empty() };
const byQuintile = { gapOnly: [0, 1, 2, 3, 4].map(empty), blended: [0, 1, 2, 3, 4].map(empty) };
const add = (bucket, score) => {
  bucket.models += 1;
  const band = benchmaxxingLevelFor(score);
  if (band) { bucket[band] += 1; bucket.tagged += 1; }
};
const worst = [];
for (let r = 0; r < REPLICATES; r += 1) {
  const stats = catalogStats(nullView(sigma, 1000 + r * 7919));
  for (const row of stats.rows) {
    const q = quintile(row.level);
    add(tally.gapOnly, row.gap);
    add(tally.blended, row.blended);
    if (q != null) { add(byQuintile.gapOnly[q], row.gap); add(byQuintile.blended[q], row.blended); }
    worst.push(row.blended);
  }
  if ((r + 1) % 10 === 0) console.log(`  replicate ${r + 1}/${REPLICATES}`);
}
worst.sort((a, b) => b - a);
const pct = (bucket) => ({ ...bucket, tagged_rate: bucket.models ? bucket.tagged / bucket.models : null });

const result = {
  generated_at: new Date().toISOString(),
  dataset_generated_at: dataset.generated_at ?? null,
  weight: BENCHMAXX_JAGGEDNESS_WEIGHT,
  observed: { scored: observed.rows.length, mean_jaggedness: observed.meanJaggedness,
    sd_jaggedness: Math.sqrt(observed.rows.reduce((s, r) => s + (r.jaggedness - observed.meanJaggedness) ** 2, 0) / observed.rows.length),
    tagged_gap_only: observed.rows.filter((r) => benchmaxxingLevelFor(r.gap)).length,
    tagged_blended: observed.rows.filter((r) => benchmaxxingLevelFor(r.blended)).length },
  null_model: { replicates: REPLICATES, sigma, mean_jaggedness: calibration.meanJaggedness,
    note: 'latent ability + independent noise on every board; noise calibrated to reproduce the observed mean jaggedness' },
  false_positives: { gap_only: pct(tally.gapOnly), blended: pct(tally.blended) },
  by_level_quintile: { gap_only: byQuintile.gapOnly.map(pct), blended: byQuintile.blended.map(pct) },
  null_score_quantiles: { p50: worst[Math.floor(worst.length * 0.5)], p90: worst[Math.floor(worst.length * 0.1)],
    p99: worst[Math.floor(worst.length * 0.01)], max: worst[0] },
};
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'null-simulation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ false_positives: result.false_positives, by_level_quintile_tag_rate: {
  gap_only: result.by_level_quintile.gap_only.map((q) => q.tagged_rate),
  blended: result.by_level_quintile.blended.map((q) => q.tagged_rate) }, quantiles: result.null_score_quantiles }, null, 2));
console.log(`written: ${join(OUT, 'null-simulation.json')}`);
