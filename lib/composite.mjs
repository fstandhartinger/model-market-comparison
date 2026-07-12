/**
 * Compute a model-mean-imputed composite capability score for the current catalog.
 *
 * The score has five independent, equally weighted slots:
 *
 *   1. Artificial Analysis Coding Index
 *   2. Artificial Analysis Coding Agent Index (exact model variant)
 *   3. Artificial Analysis Intelligence Index
 *   4. DesignArena Frontend
 *   5. DesignArena Fullstack
 *
 * Raw benchmark scales have very different distributions: a value of 50 is
 * near the top of AA Intelligence but below the middle of Coding Agent and
 * DesignArena. Each observed slot is therefore converted to its percentile
 * among the current catalog's unique observed values. For each model, every
 * missing slot is assigned that model's mean observed percentile. Algebraically
 * the five-slot result is therefore exactly the mean of the available
 * percentiles: missing fields cannot move its base score up or down. A row with
 * no reliable observed slot receives the neutral fallback 50.
 *
 * The final pass enforces one coverage-neutral ordering invariant. If model A
 * has reliable values for every slot observed for model B, and A is no worse in
 * any of those slots (strictly better in at least one), B's missing slots must
 * not make B rank above A. A deterministic isotonic projection makes the
 * smallest symmetric adjustment to the catalog's base scores that restores
 * those orderings. Coverage strictly increases along every constraint, so the
 * relationship graph is acyclic.
 */

export const DEFAULT_MIN_DA_BATTLES = 200;

const SLOT_KEYS = [
  "aa_coding_index",
  "aa_coding_agent",
  "aa_intelligence_index",
  "designarena_frontend",
  "designarena_fullstack",
];

const SLOT_COUNT = SLOT_KEYS.length;
const NEUTRAL_SCORE = 50;
const DOMINANCE_MARGIN = 0.1;
const PROJECTION_TOLERANCE = 1e-9;
const MAX_PROJECTION_PASSES = 10_000;

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

function effectiveSlots(row, minDesignArenaBattles) {
  const scores = row.scores || {};
  const battles = row.designarenaBattles || {};
  const aaCoding = finiteOrNull(scores.aa_coding_index);
  const aaCodingAgent = finiteOrNull(scores.aa_coding_agent);
  const aaIntelligence = finiteOrNull(scores.aa_intelligence_index);
  const frontendElo = finiteOrNull(scores.designarena_frontend);
  const fullstackElo = finiteOrNull(scores.designarena_fullstack);
  const frontendBattles = finiteOrNull(battles.frontend) ?? 0;
  const fullstackBattles = finiteOrNull(battles.fullstack) ?? 0;

  return {
    aa_coding_index: aaCoding == null ? null : clamp100(aaCoding),
    aa_coding_agent: aaCodingAgent == null ? null : clamp100(aaCodingAgent),
    aa_intelligence_index: aaIntelligence == null ? null : clamp100(aaIntelligence),
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

  const baseScores = new Map(effective.map((row) => {
    const observedPercentiles = SLOT_KEYS
      .filter((key) => row.slots[key] != null)
      .map((key) => percentile(row.slots[key], distributions[key]));
    if (!observedPercentiles.length) return [row.id, NEUTRAL_SCORE];

    const modelMean = observedPercentiles.reduce((sum, value) => sum + value, 0)
      / observedPercentiles.length;
    const total = SLOT_KEYS.reduce((sum, key) => {
      const value = row.slots[key];
      return sum + (value == null ? modelMean : percentile(value, distributions[key]));
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

  // Dykstra's cyclic projections find the unique least-squares projection onto
  // the intersection of x_dominator >= x_candidate + margin half-spaces. Each
  // correction vector has only the two coordinates stored below.
  const values = groups.map((group) => group.base);
  const dominatorCorrections = new Float64Array(constraints.length);
  const candidateCorrections = new Float64Array(constraints.length);
  let converged = constraints.length === 0;
  for (let pass = 0; pass < MAX_PROJECTION_PASSES && !converged; pass += 1) {
    let maxChange = 0;
    for (let index = 0; index < constraints.length; index += 1) {
      const [dominatorIndex, candidateIndex] = constraints[index];
      const previousDominator = values[dominatorIndex];
      const previousCandidate = values[candidateIndex];
      const correctedDominator = previousDominator + dominatorCorrections[index];
      const correctedCandidate = previousCandidate + candidateCorrections[index];
      const violation = correctedCandidate + DOMINANCE_MARGIN - correctedDominator;
      const adjustment = violation > 0 ? violation / 2 : 0;
      const nextDominator = correctedDominator + adjustment;
      const nextCandidate = correctedCandidate - adjustment;
      dominatorCorrections[index] = correctedDominator - nextDominator;
      candidateCorrections[index] = correctedCandidate - nextCandidate;
      values[dominatorIndex] = nextDominator;
      values[candidateIndex] = nextCandidate;
      maxChange = Math.max(
        maxChange,
        Math.abs(nextDominator - previousDominator),
        Math.abs(nextCandidate - previousCandidate),
      );
    }
    if (maxChange <= PROJECTION_TOLERANCE) {
      const maxViolation = constraints.reduce((maximum, [dominatorIndex, candidateIndex]) => Math.max(
        maximum,
        values[candidateIndex] + DOMINANCE_MARGIN - values[dominatorIndex],
      ), 0);
      converged = maxViolation <= PROJECTION_TOLERANCE;
    }
  }
  if (!converged) throw new Error("Composite dominance projection did not converge");
  if (values.some((value) => value < -PROJECTION_TOLERANCE || value > 100 + PROJECTION_TOLERANCE)) {
    throw new Error("Composite dominance projection left the 0..100 score range");
  }
  const remainingViolation = constraints.some(([dominatorIndex, candidateIndex]) =>
    values[dominatorIndex] + PROJECTION_TOLERANCE < values[candidateIndex] + DOMINANCE_MARGIN);
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
