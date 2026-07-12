// Diagnose the production fixed-slot composite and its coverage-safe dominance
// constraints for models whose ordering is sensitive to missing results.
import { readFileSync } from "node:fs";
import { computeCompositeScores, DEFAULT_MIN_DA_BATTLES } from "../lib/composite.mjs";

const ds = JSON.parse(readFileSync(new URL("../data/dataset.json", import.meta.url)));
const SLOTS = [
  "aa_coding_index",
  "aa_coding_agent",
  "aa_intelligence_index",
  "designarena_frontend",
  "designarena_fullstack",
];
const clamp100 = (value) => Math.max(0, Math.min(100, value));
const finiteOrNull = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
const eloExpectedScore = (elo) => 100 / (1 + 10 ** ((1000 - elo) / 400));

const rows = ds.models.map((m) => ({
  id: m.id,
  name: m.display_name,
  featured: m.featured,
  scores: {
    aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
    aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
    aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
    designarena_frontend: m.designarena?.frontend?.elo ?? null,
    designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
  },
  designarenaBattles: {
    frontend: m.designarena?.frontend?.battles ?? null,
    fullstack: m.designarena?.fullstack?.battles ?? null,
  },
}));

const composites = computeCompositeScores(rows);
const slotRows = rows.map((row) => {
  const aaCoding = finiteOrNull(row.scores.aa_coding_index);
  const aaCodingAgent = finiteOrNull(row.scores.aa_coding_agent);
  const aaIntelligence = finiteOrNull(row.scores.aa_intelligence_index);
  const frontend = finiteOrNull(row.scores.designarena_frontend);
  const fullstack = finiteOrNull(row.scores.designarena_fullstack);
  const slots = {
    aa_coding_index: aaCoding == null ? null : clamp100(aaCoding),
    aa_coding_agent: aaCodingAgent == null ? null : clamp100(aaCodingAgent),
    aa_intelligence_index: aaIntelligence == null ? null : clamp100(aaIntelligence),
    designarena_frontend: frontend == null || (row.designarenaBattles.frontend ?? 0) < DEFAULT_MIN_DA_BATTLES
      ? null : eloExpectedScore(frontend),
    designarena_fullstack: fullstack == null || (row.designarenaBattles.fullstack ?? 0) < DEFAULT_MIN_DA_BATTLES
      ? null : eloExpectedScore(fullstack),
  };
  const observed = SLOTS.filter((key) => slots[key] != null);
  const base = observed.length
    ? Math.round((SLOTS.reduce((sum, key) => sum + (slots[key] ?? 50), 0) / SLOTS.length) * 10) / 10
    : null;
  return { ...row, slots, observed, base, composite: composites.get(row.id) };
});

function show(id) {
  const row = slotRows.find((candidate) => candidate.id === id);
  if (!row) return console.log(`NOT FOUND: ${id}`);
  console.log(`\n${row.name} [${row.id}]`);
  for (const key of SLOTS) {
    const value = row.slots[key];
    if (value == null) {
      console.log(`  ${key}: missing -> 50.0 neutral`);
      continue;
    }
    if (key === "designarena_frontend") {
      console.log(`  ${key}: ${value.toFixed(1)} (Elo ${row.scores[key]}, ${row.designarenaBattles.frontend} battles)`);
    } else if (key === "designarena_fullstack") {
      console.log(`  ${key}: ${value.toFixed(1)} (Elo ${row.scores[key]}, ${row.designarenaBattles.fullstack} battles)`);
    } else {
      console.log(`  ${key}: ${value.toFixed(1)}`);
    }
  }
  console.log(`  coverage: ${row.observed.length}/${SLOTS.length}`);
  console.log(`  fixed-slot base: ${row.base?.toFixed(1) ?? "—"}`);
  console.log(`  composite: ${row.composite?.toFixed(1) ?? "—"}`);
}

show("deepseek-v4-pro::high");
show("deepseek-v4-pro::max");
show("deepseek-v4-flash::max");
show("gpt-5.5::medium");
show("gpt-5.5::xhigh");

const dominatesCoverageSafely = (leader, dominated) => {
  let strictlyBetter = false;
  for (const key of SLOTS) {
    const otherValue = dominated.slots[key];
    if (otherValue == null) continue;
    const leaderValue = leader.slots[key];
    if (leaderValue == null || leaderValue < otherValue) return false;
    if (leaderValue > otherValue) strictlyBetter = true;
  }
  return strictlyBetter;
};

const checkDominance = (candidates) => {
  const violations = [];
  for (const leader of candidates) {
    for (const dominated of candidates) {
      if (leader === dominated || !dominatesCoverageSafely(leader, dominated)) continue;
      if (leader.composite + 1e-9 < dominated.composite + 0.1) violations.push({ leader, dominated });
    }
  }
  return violations;
};

const scored = slotRows.filter((row) => row.composite != null);
const featured = scored.filter((row) => row.featured);
const allViolations = checkDominance(scored);
const featuredViolations = checkDominance(featured);
console.log(`\nCoverage-safe dominance violations: ${allViolations.length} all / ${featuredViolations.length} featured`);
for (const { leader, dominated } of allViolations.slice(0, 10)) {
  console.log(`  ${leader.name} (${leader.composite.toFixed(1)}) !> ${dominated.name} (${dominated.composite.toFixed(1)})`);
}
