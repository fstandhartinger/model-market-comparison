// Diagnose the production model-mean-imputed percentile base and the final
// dominance-safe Composite for models whose ordering is sensitive to missing results.
import { readFileSync } from "node:fs";
import { computeCompositeScoreDetails, DEFAULT_MIN_DA_BATTLES } from "../lib/composite.mjs";

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

const { scores: composites, baseScores } = computeCompositeScoreDetails(rows);
const effectiveRows = rows.map((row) => {
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
  return { ...row, slots };
});

const distributions = Object.fromEntries(SLOTS.map((key) => [
  key,
  [...new Set(effectiveRows.map((row) => row.slots[key]).filter((value) => value != null))].sort((a, b) => a - b),
]));
const percentile = (value, values) => values.length <= 1 ? 50 : (values.indexOf(value) / (values.length - 1)) * 100;
const slotRows = effectiveRows.map((row) => {
  const observed = SLOTS.filter((key) => row.slots[key] != null);
  const observedPercentiles = observed.map((key) => percentile(row.slots[key], distributions[key]));
  const assumed = observedPercentiles.length
    ? observedPercentiles.reduce((sum, value) => sum + value, 0) / observedPercentiles.length
    : 50;
  const normalized = Object.fromEntries(SLOTS.map((key) => [
    key,
    row.slots[key] == null ? assumed : percentile(row.slots[key], distributions[key]),
  ]));
  return {
    ...row,
    observed,
    assumed,
    normalized,
    compositeBase: baseScores.get(row.id),
    composite: composites.get(row.id),
  };
});

function show(id) {
  const row = slotRows.find((candidate) => candidate.id === id);
  if (!row) return console.log(`NOT FOUND: ${id}`);
  console.log(`\n${row.name} [${row.id}]`);
  for (const key of SLOTS) {
    const value = row.slots[key];
    if (value == null) {
      console.log(`  ${key}: missing -> assumed model mean percentile ${row.assumed.toFixed(1)}`);
      continue;
    }
    if (key === "designarena_frontend") {
      console.log(`  ${key}: percentile ${row.normalized[key].toFixed(1)} (Elo ${row.scores[key]}, ${row.designarenaBattles.frontend} battles)`);
    } else if (key === "designarena_fullstack") {
      console.log(`  ${key}: percentile ${row.normalized[key].toFixed(1)} (Elo ${row.scores[key]}, ${row.designarenaBattles.fullstack} battles)`);
    } else {
      console.log(`  ${key}: percentile ${row.normalized[key].toFixed(1)} (raw ${value.toFixed(1)})`);
    }
  }
  console.log(`  coverage: ${row.observed.length}/${SLOTS.length}`);
  console.log(`  mean-imputed base: ${row.compositeBase?.toFixed(1) ?? "—"}`);
  if (row.composite != null && row.compositeBase != null && Math.abs(row.composite - row.compositeBase) >= 0.05) {
    console.log(`  dominance adjustment: ${(row.composite - row.compositeBase) >= 0 ? "+" : ""}${(row.composite - row.compositeBase).toFixed(1)}`);
  }
  console.log(`  composite: ${row.composite?.toFixed(1) ?? "—"}`);
}

show("deepseek-v4-pro::high");
show("deepseek-v4-pro::max");
show("deepseek-v4-flash::max");
show("glm-5.2::max");
show("gpt-5.6-sol::high");
show("claude-fable-5::max");
show("minimax-m3::default");
show("gpt-5.5::medium");
show("gpt-5.5::xhigh");
