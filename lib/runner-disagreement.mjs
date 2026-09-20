// CR-68.5 (Florian, 2026-09-17): "Same benchmark measured by two runners (e.g. Terminal-Bench 2.1 by
// Vals vs by AA): once harness/version equality is verified, show a large disagreement as its own
// 'runner disagreement' evidence line; if the versions differ, don't pair them at all."
//
// The reviewed pairing lives in data/benchmark-runner-pairs.json, not here: a group is listed there only
// when every board in it measures the same task set at the same stated version, quoted from the committed
// registry entries. This module never infers a pairing from a name.
//
// How a disagreement is measured. The two boards have different populations (AA's Terminal-Bench 2.1
// carries 236 models, Vals' 32), so their published percentiles are not comparable — a model can sit at
// p79 among one crowd and p13 among another without the runners disagreeing at all. The honest comparison
// is the one the Benchmaxxing gap already uses: rank the model on both boards **among the models measured
// on both**, and report the difference. What is left after that is the runners disagreeing about this
// model, not the two boards testing different fields.
import runnerPairs from '../data/benchmark-runner-pairs.json' with { type: 'json' };

/** A rank difference of this many percentile points or more is called out. Catalog-wide the median
 *  disagreement of the reviewed pairs is 4–13 points and the 90th percentile 17–23, so this is the top
 *  tenth of disagreement, not an everyday difference. */
export const LARGE_DISAGREEMENT_POINTS = 20;
/** Below this many models measured on both boards a rank difference says more about the cohort than
 *  about the runners. */
export const MIN_SHARED_COHORT = 10;

export const RUNNER_PAIR_TABLE = runnerPairs;

const cache = new WeakMap();

/** Every axis of one reviewed board id: an exact benchmark id, or the family when the board is re-dated
 *  daily (`aa-gpqa-diamond` → `aa-gpqa-diamond::snapshot-…`). More than one benchmark version behind one
 *  entry is ambiguous and is refused — that is the "if the versions differ, don't pair them" rule. */
function resolveBoard(view, benchmarkId) {
  const axes = view.axes.filter((a) => a.benchmarkId === benchmarkId || String(a.benchmarkId).startsWith(`${benchmarkId}::`));
  const versions = new Set(axes.map((a) => a.benchmarkId));
  if (versions.size !== 1) return null;
  const scored = axes.map((a) => ({ axis: a, values: valuesOf(a) })).filter((x) => x.values.size >= MIN_SHARED_COHORT);
  if (scored.length !== 1) return null;
  return scored[0];
}

function valuesOf(axis) {
  const values = new Map();
  for (const s of axis.scores ?? []) if (s.modelId && Number.isFinite(s.value)) values.set(s.modelId, s.value);
  return values;
}

/** Percentile of `id` within `values` only — the shared cohort, never the board's full population. */
function percentileWithin(values, id, higherBetter) {
  const v = values.get(id);
  if (!Number.isFinite(v)) return null;
  const all = [...values.values()];
  const below = all.filter((x) => (higherBetter ? x < v : x > v)).length;
  const equal = all.filter((x) => x === v).length;
  return ((below + equal / 2) / all.length) * 100;
}

/** The reviewed pairs this catalog can actually compare, built once per view. */
function pairIndex(view) {
  if (cache.has(view)) return cache.get(view);
  const pairs = [];
  for (const group of runnerPairs.groups) {
    const resolved = group.runners.map((r) => ({ runner: r, board: resolveBoard(view, r.benchmark_id) })).filter((x) => x.board);
    for (let i = 0; i < resolved.length; i += 1) for (let j = i + 1; j < resolved.length; j += 1) {
      const a = resolved[i], b = resolved[j];
      const shared = [...a.board.values.keys()].filter((id) => b.board.values.has(id));
      if (shared.length < MIN_SHARED_COHORT) continue;
      pairs.push({ group, a, b,
        sharedA: new Map(shared.map((id) => [id, a.board.values.get(id)])),
        sharedB: new Map(shared.map((id) => [id, b.board.values.get(id)])),
        sharedCohort: shared.length });
    }
  }
  cache.set(view, pairs);
  return pairs;
}

const side = (entry, values, modelId, percentile) => ({
  benchmarkId: entry.board.axis.benchmarkId, axisId: entry.board.axis.id, runner: entry.runner.runner,
  harness: entry.runner.harness, name: entry.board.axis.name, unit: entry.board.axis.unit,
  value: values.get(modelId) ?? null, percentile,
});

/** CR-68.5: every reviewed runner pair this model is measured on, worst disagreement first. `large` marks
 *  the ones worth their own evidence line. Never a judgement about a runner — only that they disagree. */
export function runnerDisagreements(view, modelId) {
  const out = [];
  for (const pair of pairIndex(view)) {
    const higherA = pair.a.board.axis.higherBetter !== false, higherB = pair.b.board.axis.higherBetter !== false;
    const pa = percentileWithin(pair.sharedA, modelId, higherA);
    const pb = percentileWithin(pair.sharedB, modelId, higherB);
    if (pa == null || pb == null) continue;
    const gap = pa - pb;
    out.push({ id: pair.group.id, benchmark: pair.group.benchmark, category: pair.group.category,
      versionEquality: pair.group.version_equality, sharedCohort: pair.sharedCohort,
      a: side(pair.a, pair.sharedA, modelId, pa), b: side(pair.b, pair.sharedB, modelId, pb),
      gap, large: Math.abs(gap) >= LARGE_DISAGREEMENT_POINTS });
  }
  return out.sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap) || x.id.localeCompare(y.id));
}
