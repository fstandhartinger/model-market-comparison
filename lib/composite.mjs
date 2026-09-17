/**
 * Compute a model-mean-imputed composite capability score for the current catalog.
 *
 * The score has seven independent, equally weighted slots:
 *
 *   1. Artificial Analysis Coding Index
 *   2. Artificial Analysis Coding Agent Index (exact model variant)
 *   3. Artificial Analysis Intelligence Index
 *   4. Epoch AI general Capabilities Index (ECI)
 *   5. Epoch AI Software Engineering ECI
 *   6. DesignArena Frontend
 *   7. DesignArena Fullstack
 *
 * Raw benchmark scales have very different distributions: a value of 50 is
 * near the top of AA Intelligence but below the middle of Coding Agent and
 * DesignArena. Each observed slot is therefore converted to its percentile
 * among the current catalog's unique observed values and (CR-65.2) linked onto the
 * AA Intelligence percentile scale through the models measured on both. For each model, every
 * missing slot is assigned that model's mean observed percentile. Algebraically
 * the seven-slot result is therefore exactly the mean of the available
 * percentiles: missing fields cannot move its base score up or down. A row with
 * no reliable observed slot receives the neutral fallback 50.
 *
 * The final pass enforces one coverage-neutral ordering invariant. If model A
 * has reliable values for every slot observed for model B, and A is no worse in
 * any of those slots (strictly better in at least one), B's missing slots must
 * not make B rank above A. B (the less-covered row) is lowered just below A;
 * A is never raised (CR-65.3). Coverage strictly increases along every
 * constraint, so the relationship graph is acyclic.
 */

export const DEFAULT_MIN_DA_BATTLES = 200;
export const COMPOSITE_DEFINITION = Object.freeze({
  version: "composite-v2-epoch-eci",
  slotCount: 7,
  slots: ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "epoch_eci", "epoch_eci_software", "designarena_frontend", "designarena_fullstack"],
});

const SLOT_KEYS = [
  "aa_coding_index",
  "aa_coding_agent",
  "aa_intelligence_index",
  "epoch_eci",
  "epoch_eci_software",
  "designarena_frontend",
  "designarena_fullstack",
];

const SLOT_COUNT = SLOT_KEYS.length;
const NEUTRAL_SCORE = 50;
const DOMINANCE_MARGIN = 0.1;
const PROJECTION_TOLERANCE = 1e-9;

const finiteOrNull = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp100 = (value) => Math.max(0, Math.min(100, value));

// Standard Elo expected score for the model against a fixed 1000-rated
// reference opponent, expressed on the same 0..100 scale as the AA indices.
const eloExpectedScore = (elo) => 100 / (1 + 10 ** ((1000 - elo) / 400));

// Empirical percentile over unique values. Using unique values prevents duplicate
// source aliases or cloned catalog rows from changing everybody else's score.
// A one-value source has no relative information, so its sole value is neutral.
function percentile(value, sortedUniqueValues) {
  if (sortedUniqueValues.length <= 1) return NEUTRAL_SCORE;
  const index = sortedUniqueValues.indexOf(value);
  if (index < 0) throw new Error(`composite percentile value missing from distribution: ${value}`);
  return (index / (sortedUniqueValues.length - 1)) * 100;
}

// CR-65.2 (data & math gauntlet C2/C3): the slots cover different populations. AA Intelligence measures
// hundreds of models including many small ones; DesignArena and the Coding Agent Index mostly frontier models.
// A plain within-slot percentile therefore puts the same model 20–28 points lower on a selective board, and
// a model *without* such a result was effectively credited those points (deleting a DesignArena result raised a
// composite by +7.7 on average). Every other slot is therefore linked onto the anchor slot's percentile scale
// by equipercentile linking inside its common cohort (rows measured on both): a value's mid-rank position among
// the cohort's values on that slot is mapped to the same position among the cohort's anchor percentiles. A slot
// whose common cohort has fewer than MIN_LINK_COHORT distinct pairs keeps its own percentile (small fixtures,
// a new board). Linking also removes C3's hidden weights: a rank step on a sparse board is worth the anchor
// distance between neighbouring cohort models, not 100 / (unique values − 1).
export const ANCHOR_SLOT = "aa_intelligence_index";
export const MIN_LINK_COHORT = 10;

/** Mid-rank position (0 … n−1, fractional between values) of `value` in the ascending array `sorted`. */
function rankPosition(value, sorted) {
  const n = sorted.length;
  let lo = 0; while (lo < n && sorted[lo] < value) lo += 1;
  let hi = lo; while (hi < n && sorted[hi] === value) hi += 1;
  if (hi > lo) return lo + (hi - lo - 1) / 2;
  if (lo === 0) return 0;
  if (lo === n) return n - 1;
  return lo - 1 + (value - sorted[lo - 1]) / (sorted[lo] - sorted[lo - 1]);
}
/** Linear-interpolated order statistic of the ascending array `sorted` at fractional position `position`. */
function atPosition(sorted, position) {
  const i = Math.floor(position), f = position - i;
  return i + 1 < sorted.length ? sorted[i] + f * (sorted[i + 1] - sorted[i]) : sorted[sorted.length - 1];
}

function effectiveSlots(row, minDesignArenaBattles) {
  const scores = row.scores || {};
  const battles = row.designarenaBattles || {};
  const aaCoding = finiteOrNull(scores.aa_coding_index);
  const aaCodingAgent = finiteOrNull(scores.aa_coding_agent);
  const aaIntelligence = finiteOrNull(scores.aa_intelligence_index);
  const epochEci = finiteOrNull(scores.epoch_eci);
  const epochEciSoftware = finiteOrNull(scores.epoch_eci_software);
  const frontendElo = finiteOrNull(scores.designarena_frontend);
  const fullstackElo = finiteOrNull(scores.designarena_fullstack);
  const frontendBattles = finiteOrNull(battles.frontend) ?? 0;
  const fullstackBattles = finiteOrNull(battles.fullstack) ?? 0;

  return {
    aa_coding_index: aaCoding == null ? null : clamp100(aaCoding),
    aa_coding_agent: aaCodingAgent == null ? null : clamp100(aaCodingAgent),
    aa_intelligence_index: aaIntelligence == null ? null : clamp100(aaIntelligence),
    epoch_eci: epochEci,
    epoch_eci_software: epochEciSoftware,
    designarena_frontend: frontendElo == null || frontendBattles < minDesignArenaBattles
      ? null : eloExpectedScore(frontendElo),
    designarena_fullstack: fullstackElo == null || fullstackBattles < minDesignArenaBattles
      ? null : eloExpectedScore(fullstackElo),
  };
}

/** Number of reliable source slots behind a Composite value. The count keeps
 * the neutral 50 fallback distinct from an actually measured model. */
export function compositeEvidenceCount(row, { minDesignArenaBattles = DEFAULT_MIN_DA_BATTLES } = {}) {
  const slots = effectiveSlots(row, minDesignArenaBattles);
  return SLOT_KEYS.filter((key) => slots[key] != null).length;
}

export function computeCompositeScoreDetails(rows, { minDesignArenaBattles = DEFAULT_MIN_DA_BATTLES } = {}) {
  if (!rows.length) return { scores: new Map(), baseScores: new Map() };

  const effective = rows.map((row) => ({
    id: row.id,
    slots: effectiveSlots(row, minDesignArenaBattles),
  }));

  const distributions = Object.fromEntries(SLOT_KEYS.map((key) => [
    key,
    [...new Set(effective.map((row) => row.slots[key]).filter((value) => value != null))].sort((a, b) => a - b),
  ]));

  // CR-65.2: one linking table per non-anchor slot, from the distinct (slot value, anchor percentile) pairs of rows
  // measured on both (distinct pairs, so an exact clone of a row changes nothing).
  const links = {};
  for (const key of SLOT_KEYS) {
    if (key === ANCHOR_SLOT) continue;
    const pairs = new Map();
    for (const row of effective) {
      if (row.slots[key] == null || row.slots[ANCHOR_SLOT] == null) continue;
      const anchor = percentile(row.slots[ANCHOR_SLOT], distributions[ANCHOR_SLOT]);
      pairs.set(`${row.slots[key]}|${anchor}`, [row.slots[key], anchor]);
    }
    if (pairs.size < MIN_LINK_COHORT) continue;
    links[key] = {
      values: [...pairs.values()].map(([value]) => value).sort((a, b) => a - b),
      anchors: [...pairs.values()].map(([, anchor]) => anchor).sort((a, b) => a - b),
    };
  }
  const slotScore = (key, value) => {
    const link = links[key];
    if (!link) return percentile(value, distributions[key]);
    return atPosition(link.anchors, rankPosition(value, link.values));
  };

  const baseScores = new Map(effective.map((row) => {
    const observedPercentiles = SLOT_KEYS
      .filter((key) => row.slots[key] != null)
      .map((key) => slotScore(key, row.slots[key]));
    if (!observedPercentiles.length) return [row.id, NEUTRAL_SCORE];

    const modelMean = observedPercentiles.reduce((sum, value) => sum + value, 0)
      / observedPercentiles.length;
    const total = SLOT_KEYS.reduce((sum, key) => {
      const value = row.slots[key];
      return sum + (value == null ? modelMean : slotScore(key, value));
    }, 0);
    // Keep full precision for sorting and threshold filters; presentation layers
    // round to one decimal without creating artificial ranking ties here.
    return [row.id, total / SLOT_COUNT];
  }));

  const evidenceCount = (row) => SLOT_KEYS.filter((key) => row.slots[key] != null).length;
  const dominatesAllObservedEvidence = (dominator, candidate) => {
    const observed = SLOT_KEYS.filter((key) => candidate.slots[key] != null);
    if (!observed.length || evidenceCount(dominator) <= observed.length) return false;
    if (observed.some((key) => dominator.slots[key] == null || dominator.slots[key] < candidate.slots[key])) {
      return false;
    }
    return observed.some((key) => dominator.slots[key] > candidate.slots[key]);
  };

  // Collapse exact evidence clones before projecting. Besides reducing work,
  // this keeps a duplicated catalog alias from changing any existing score.
  const groupsBySignature = new Map();
  for (const row of effective) {
    const signature = JSON.stringify(SLOT_KEYS.map((key) => row.slots[key]));
    if (!groupsBySignature.has(signature)) {
      groupsBySignature.set(signature, {
        signature,
        slots: row.slots,
        ids: [],
        base: baseScores.get(row.id) ?? NEUTRAL_SCORE,
      });
    }
    groupsBySignature.get(signature).ids.push(row.id);
  }
  const groups = [...groupsBySignature.values()].sort((a, b) => a.signature.localeCompare(b.signature));
  const constraints = [];
  for (let dominatorIndex = 0; dominatorIndex < groups.length; dominatorIndex += 1) {
    for (let candidateIndex = 0; candidateIndex < groups.length; candidateIndex += 1) {
      if (dominatesAllObservedEvidence(groups[dominatorIndex], groups[candidateIndex])) {
        constraints.push([dominatorIndex, candidateIndex]);
      }
    }
  }

  // CR-65.3 (data & math gauntlet C4): the projection is one-sided. Only the less-covered row of a violated
  // pair is lowered; the dominator keeps its own score. A symmetric least-squares projection also raised the
  // better-measured row, so adding one thin dominated row moved a well-measured model (`gpt-5.2-codex::openrouter`
  // 26.4 → 52.7, `claude-opus-5::low` 86.0 → 90.15). Coverage strictly increases along every constraint, so rows
  // are settled from the most to the least covered: each row ends at min(own base, every dominator's final score
  // − margin). That is the largest score set that satisfies every constraint without raising anybody, and it is
  // independent of input order. A row can never be pushed below 0; at the floor the margin is waived.
  const values = groups.map((group) => group.base);
  const dominatorsOf = groups.map(() => []);
  for (const [dominatorIndex, candidateIndex] of constraints) dominatorsOf[candidateIndex].push(dominatorIndex);
  const order = groups.map((_, index) => index)
    .sort((a, b) => evidenceCount(groups[b]) - evidenceCount(groups[a]) || a - b);
  for (const index of order) {
    for (const dominatorIndex of dominatorsOf[index]) {
      values[index] = Math.min(values[index], values[dominatorIndex] - DOMINANCE_MARGIN);
    }
    values[index] = Math.max(0, values[index]);
  }
  const remainingViolation = constraints.some(([dominatorIndex, candidateIndex]) =>
    values[candidateIndex] > 0 && values[dominatorIndex] + PROJECTION_TOLERANCE < values[candidateIndex] + DOMINANCE_MARGIN);
  if (remainingViolation) throw new Error("Composite dominance projection left an inverted constraint");

  const adjusted = new Map();
  groups.forEach((group, index) => {
    const score = clamp100(values[index]);
    group.ids.forEach((id) => adjusted.set(id, score));
  });
  return { scores: adjusted, baseScores };
}

export function computeCompositeScores(rows, options = {}) {
  return computeCompositeScoreDetails(rows, options).scores;
}
