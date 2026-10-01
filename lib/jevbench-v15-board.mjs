// CR-205: the v1.5 board restores the full v1.4.2.2 page structure on /jev-models — the capability ranking,
// the capability-vs-cost/speed bubble charts, the interactive composite chart with weight sliders, the
// two-system compare view and the complete tables — fed by the aggregate-only v1.5 release artifact.
// No Node imports: the client-side score chart re-scores rows with jevV15BoardScore.

export const JEV_V15_AXES = ['intelligence', 'calibration', 'speed', 'cost'];
const GATE_FLOOR = 50;

/** The v1.5 composite on arbitrary axis weights, as the artifact's published `views` compute it: an axis at
 *  weight 0 drops out of the harmonic mean entirely (a zero or missing axis there does not zero the score),
 *  while the Intelligence / Speed / Cost low-axis gates still apply even at weight 0 — which is why the
 *  "Intelligence only" view is not just the Intelligence column. With the official all-positive weights this
 *  is identical to the scorer's jevV15Composite at floor 50 (options A and B). */
export function jevV15BoardScore(axes, weights) {
  const used = JEV_V15_AXES.filter((axis) => (weights?.[axis] ?? 0) > 0);
  if (!used.length) return null;
  const values = used.map((axis) => axes?.[axis]);
  if (values.some((v) => !Number.isFinite(v))) return null;
  if (values.some((v) => v <= 0)) return 0;
  const total = used.reduce((sum, axis) => sum + weights[axis], 0);
  let score = total / used.reduce((sum, axis, i) => sum + weights[axis] / values[i], 0);
  for (const axis of ['intelligence', 'speed', 'cost']) if (axes[axis] < GATE_FLOOR) score *= (axes[axis] / GATE_FLOOR) ** 2;
  return score;
}

/** Alternative pricing changes only Cost, uses the active scorer/weights, and replaces this row
 * in the current score ordering. Ties share a rank; unranked disclosures cannot outrank a model. */
export function jevBoardAlternative(row, rows, weights, rescore = jevV15BoardScore) {
  if (!row.alt || !Number.isFinite(row.alt.axes?.cost)) return null;
  const score = rescore({ ...row.axes, cost: row.alt.axes.cost }, weights);
  if (score == null) return null;
  const rank = 1 + rows.filter((other) => other.key !== row.key && other.ranked && Number.isFinite(other.jevbench_score) && other.jevbench_score > score).length;
  return { score, rank, label: row.alt.label, note: row.alt.note };
}

/** "Accuracy 60:20:20" style view names encode Intelligence : Speed : Cost with Calibration at 0. */
function viewNameToWeights(name) {
  if (/^intelligence only$/i.test(name)) return { intelligence: 100, calibration: 0, speed: 0, cost: 0 };
  const m = String(name).match(/(\d+)\s*:\s*(\d+)\s*:\s*(\d+)\s*$/);
  if (!m) return null;
  return { intelligence: Number(m[1]), calibration: 0, speed: Number(m[2]), cost: Number(m[3]) };
}

const sameWeights = (a, b) => {
  const ta = JEV_V15_AXES.reduce((t, k) => t + (a[k] ?? 0), 0), tb = JEV_V15_AXES.reduce((t, k) => t + (b[k] ?? 0), 0);
  return ta > 0 && tb > 0 && JEV_V15_AXES.every((k) => Math.abs(a[k] / ta - b[k] / tb) < 1e-9);
};

/** Slider presets for the v1.5 explorer: the official equal weights first (the reset state), the secondary
 *  option B, then every published `views` entry that parses, then Capability only — the measure the
 *  headline capability ranking uses. Views equal to the official weights are not repeated. */
export function jevV15SliderPresets(artifact) {
  const presets = [{ name: 'Official 25:25:25:25', weights: { intelligence: 25, calibration: 25, speed: 25, cost: 25 } }];
  const optionB = artifact?.options?.B?.weights;
  if (optionB) presets.push({ name: `Option B ${JEV_V15_AXES.map((axis) => Math.round(optionB[axis] ?? 0)).join(':')}`, weights: JEV_V15_AXES.reduce((acc, axis) => ({ ...acc, [axis]: Math.round(optionB[axis] ?? 0) }), {}) });
  for (const name of artifact?.views ?? []) {
    const weights = viewNameToWeights(name);
    if (!weights || presets.some((p) => sameWeights(p.weights, weights))) continue;
    presets.push({ name: name.replace(/^Emphasis on /, ''), weights });
  }
  const capability = { intelligence: 50, calibration: 50, speed: 0, cost: 0 };
  if (!presets.some((p) => sameWeights(p.weights, capability))) presets.push({ name: 'Capability only', weights: capability });
  return presets;
}

/** The fields the shared chart rows and the capability/bubble views read, mapped from a v1.5 system row.
 *  v1.5 publishes per-type competence instead of single public/sealed accuracies, so those columns stay null
 *  rather than showing an I-score as if it were an accuracy. */
export function jevV15BoardSystem(row) {
  return {
    ...row,
    public_accuracy: null,
    sealed_accuracy: null,
    public_minus_sealed_gap_pp: null,
    endpoint_kind: row.endpoint_kind ?? undefined,
    endpoint_condition: row.endpoint_condition ?? undefined,
    speed: row.speed ? { ...row.speed, adjustment: row.speed.adjustment ?? undefined } : row.speed,
  };
}

/** The artifact's `open` field is not filled consistently, so a row without it counts as open unless its
 *  licence says proprietary or closed weights — the same heuristic the v1.4 board uses. */
export function jevV15OpenSource(row) {
  const open = row.open;
  if (open === 'no' || open === false) return false;
  if (open === 'yes' || open === true || open === 'weights') return true;
  return !/proprietary|closed weights|weights not published|hosted service/i.test(row.licence ?? '');
}

/** Row shape for the interactive composite chart (JevScoreChart): official score is the headline option's,
 *  the note carries the row's own disclosure, openSource follows the same licence heuristic as the v1.4 board.
 *  F-223 (Fable pass 42): with `headline` the row also carries that option's paired-bootstrap 95% interval, so the
 *  one figure everyone reads draws the uncertainty the folded official order used to be the only place to see. */
export function jevV15BoardRow(row, { isNew = false, headline = null } = {}) {
  const openSource = jevV15OpenSource(row);
  const ci = headline ? row.composite_ci95?.[headline] ?? null : null;
  return {
    ci: Array.isArray(ci) && ci.length === 2 && Number.isFinite(ci[0]) && Number.isFinite(ci[1])
      ? [Math.min(ci[0], ci[1]), Math.max(ci[0], ci[1])] : null,
    key: row.key, display: row.display, author: row.author,
    repo: row.repo ?? null, class: row.class,
    rank: row.rank ?? null, ranked: !!row.ranked, listing: row.listing,
    not_ranked_because: row.not_ranked_because ?? null,
    api_flag: !!row.api_flag, api_exposure_note: row.api_exposure_note ?? null,
    jevbench_score: row.jevbench_score ?? null,
    axes: row.axes ?? { intelligence: null, calibration: null, speed: null, cost: null },
    public_accuracy: null, sealed_accuracy: null, public_minus_sealed_gap_pp: null,
    cost: row.cost ?? { kind: 'unpriced', usd_per_1000: null, basis: '' },
    speed: { p50_s_raw: row.speed?.p50_s_raw ?? null, adjustment: row.speed?.adjustment ?? undefined },
    endpoint_kind: row.endpoint_kind ?? undefined, endpoint_condition: row.endpoint_condition ?? undefined,
    note: row.not_ranked_because ?? row.not_scored_reason ?? null,
    openSource, isNew,
    ...(row.alt ? { alt: row.alt } : {}),
  };
}

const V15_TYPES = ['choice', 'noul', 'score'];
const V15_TIERS = ['easy', 'standard', 'judge', 'hard'];
const shortDisplay = (d) => String(d ?? '').split(' (')[0].split(', formerly')[0];

/** Chance-corrected competence pooled across the request types a cell covers, weighted by each cell's
 *  published decision count. Cells with no decisions stay out; an empty pool is null. */
function pooledCc(split, tier) {
  let sum = 0, n = 0;
  for (const cell of split) {
    const cc = cell?.tiers?.[tier], c = cell?.n?.[tier];
    if (!Number.isFinite(cc) || !Number.isFinite(c) || c <= 0) continue;
    sum += cc * c; n += c;
  }
  return n ? sum / n : null;
}

/** The two-system compare view for v1.5: four score axes, competence per request type (open and sealed),
 *  and competence per tier on the open and sealed sets. Every spoke is a published system-level aggregate;
 *  per-tier values pool the per-type cells by their published decision counts. */
export function jevV15CompareRow(row) {
  const split = row.intelligence?.per_type_split ?? {};
  const typeCc = Object.fromEntries(V15_TYPES.map((t) => [t, {
    open: split[`open|${t}`]?.cc ?? null,
    sealed: split[`sealed|${t}`]?.cc ?? null,
  }]));
  const tierCc = {
    open: Object.fromEntries(V15_TIERS.map((t) => [t, pooledCc(V15_TYPES.map((ty) => split[`open|${ty}`]), t)])),
    sealed: Object.fromEntries(V15_TIERS.map((t) => [t, pooledCc(V15_TYPES.map((ty) => split[`sealed|${ty}`]), t)])),
  };
  return { key: row.key, name: shortDisplay(row.display), cls: row.class, rank: row.rank ?? null, listing: row.listing, score: row.jevbench_score ?? null, repo: row.repo ?? null, axes: row.axes ?? null, typeCc, tierCc };
}
