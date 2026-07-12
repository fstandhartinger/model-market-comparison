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
 * percentiles: missing fields cannot move it up or down. A row with no reliable
 * observed slot receives the neutral fallback 50.
 */

export const DEFAULT_MIN_DA_BATTLES = 500;

const SLOT_KEYS = [
  "aa_coding_index",
  "aa_coding_agent",
  "aa_intelligence_index",
  "designarena_frontend",
  "designarena_fullstack",
];

const SLOT_COUNT = SLOT_KEYS.length;
const NEUTRAL_SCORE = 50;

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

export function computeCompositeScores(rows, { minDesignArenaBattles = DEFAULT_MIN_DA_BATTLES } = {}) {
  if (!rows.length) return new Map();

  const effective = rows.map((row) => ({
    id: row.id,
    slots: effectiveSlots(row, minDesignArenaBattles),
  }));

  const distributions = Object.fromEntries(SLOT_KEYS.map((key) => [
    key,
    [...new Set(effective.map((row) => row.slots[key]).filter((value) => value != null))].sort((a, b) => a - b),
  ]));

  return new Map(effective.map((row) => {
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
}
