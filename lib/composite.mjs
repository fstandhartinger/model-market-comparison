/**
 * Compute a catalog-independent composite capability score.
 *
 * The score has five independent, equally weighted slots:
 *
 *   1. Artificial Analysis Coding Index
 *   2. Artificial Analysis Coding Agent Index (exact model variant)
 *   3. Artificial Analysis Intelligence Index
 *   4. DesignArena Frontend
 *   5. DesignArena Fullstack
 *
 * AA values already use a 0..100 scale and are clamped to that domain.
 * Each reliable DesignArena Elo is converted to the standard expected score
 * against a fixed 1000-rated opponent. Missing slots contribute the fixed
 * neutral value 50, so neither the denominator nor another slot's weight can
 * change with benchmark coverage. Rows with no observed slot remain unscored.
 *
 * A coverage-safe dominance pass may raise a leader, but never lower another
 * model: A dominates B only when A covers every slot observed for B and is at
 * least as good in all of them, with one strict improvement. This relation is
 * acyclic. Processing it from dominated models toward leaders enforces a
 * visible 0.1-point margin without catalog-wide normalization or pair weights.
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
const MAX_SCORE_TENTHS = 1000;

const finiteOrNull = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const clamp100 = (value) => Math.max(0, Math.min(100, value));

// Standard Elo expected score for the model against a fixed 1000-rated
// reference opponent, expressed on the same 0..100 scale as the AA indices.
const eloExpectedScore = (elo) => 100 / (1 + 10 ** ((1000 - elo) / 400));

function dominatesCoverageSafely(leader, dominated) {
  let strictlyBetter = false;
  for (const key of SLOT_KEYS) {
    const otherValue = dominated.slots[key];
    if (otherValue == null) continue;
    const leaderValue = leader.slots[key];
    if (leaderValue == null || leaderValue < otherValue) return false;
    if (leaderValue > otherValue) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function computeCompositeScores(rows, { minDesignArenaBattles = DEFAULT_MIN_DA_BATTLES } = {}) {
  if (!rows.length) return new Map();

  const effective = rows.map((row) => {
    const scores = row.scores || {};
    const battles = row.designarenaBattles || {};
    const aaCoding = finiteOrNull(scores.aa_coding_index);
    const aaCodingAgent = finiteOrNull(scores.aa_coding_agent);
    const aaIntelligence = finiteOrNull(scores.aa_intelligence_index);
    const frontendElo = finiteOrNull(scores.designarena_frontend);
    const fullstackElo = finiteOrNull(scores.designarena_fullstack);
    const frontendBattles = finiteOrNull(battles.frontend) ?? 0;
    const fullstackBattles = finiteOrNull(battles.fullstack) ?? 0;

    const slots = {
      aa_coding_index: aaCoding == null ? null : clamp100(aaCoding),
      aa_coding_agent: aaCodingAgent == null ? null : clamp100(aaCodingAgent),
      aa_intelligence_index: aaIntelligence == null ? null : clamp100(aaIntelligence),
      designarena_frontend: frontendElo == null || frontendBattles < minDesignArenaBattles
        ? null : eloExpectedScore(frontendElo),
      designarena_fullstack: fullstackElo == null || fullstackBattles < minDesignArenaBattles
        ? null : eloExpectedScore(fullstackElo),
    };
    const observed = SLOT_KEYS.some((key) => slots[key] != null);
    const total = SLOT_KEYS.reduce((sum, key) => sum + (slots[key] ?? NEUTRAL_SCORE), 0);

    return {
      id: row.id,
      slots,
      baseTenths: observed ? Math.round((total / SLOT_COUNT) * 10) : null,
    };
  });

  const result = new Map(effective.map((row) => [row.id, null]));
  const scored = effective.filter((row) => row.baseTenths != null);
  if (!scored.length) return result;

  // Edge direction is leader -> dominated. Coverage-safe Pareto dominance is a
  // strict partial order, so this graph is acyclic without SCC tie collapsing.
  const edges = scored.map(() => []);
  const indegree = scored.map(() => 0);
  for (let i = 0; i < scored.length; i += 1) {
    for (let j = 0; j < scored.length; j += 1) {
      if (i === j || !dominatesCoverageSafely(scored[i], scored[j])) continue;
      edges[i].push(j);
      indegree[j] += 1;
    }
  }

  const queue = [];
  for (let i = 0; i < scored.length; i += 1) if (indegree[i] === 0) queue.push(i);
  const topological = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    topological.push(id);
    for (const child of edges[id]) {
      indegree[child] -= 1;
      if (indegree[child] === 0) queue.push(child);
    }
  }

  // The relation above is mathematically acyclic. Keep an explicit guard so a
  // future change to its definition cannot silently make results order-based.
  if (topological.length !== scored.length) {
    throw new Error("coverage-safe composite dominance graph contains a cycle");
  }

  const adjustedTenths = scored.map((row) => row.baseTenths);
  for (let cursor = topological.length - 1; cursor >= 0; cursor -= 1) {
    const leader = topological[cursor];
    for (const dominated of edges[leader]) {
      adjustedTenths[leader] = Math.max(adjustedTenths[leader], adjustedTenths[dominated] + 1);
    }
    adjustedTenths[leader] = Math.min(MAX_SCORE_TENTHS, adjustedTenths[leader]);
  }

  scored.forEach((row, index) => result.set(row.id, adjustedTenths[index] / 10));
  return result;
}
