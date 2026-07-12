// Diagnose the production composite implementation and print normalized evidence
// coverage for models whose ordering is sensitive to missing benchmark results.
import { readFileSync } from "node:fs";
import { computeCompositeScores, DEFAULT_MIN_DA_BATTLES } from "../lib/composite.mjs";

const ds = JSON.parse(readFileSync(new URL("../data/dataset.json", import.meta.url)));
const ATOMIC = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "designarena_frontend", "designarena_fullstack"];
const SLOTS = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "da"];

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
const effective = rows.map((r) => ({
  ...r,
  values: {
    ...r.scores,
    designarena_frontend: (r.designarenaBattles.frontend ?? 0) >= DEFAULT_MIN_DA_BATTLES ? r.scores.designarena_frontend : null,
    designarena_fullstack: (r.designarenaBattles.fullstack ?? 0) >= DEFAULT_MIN_DA_BATTLES ? r.scores.designarena_fullstack : null,
  },
}));

const ranges = {};
for (const key of ATOMIC) {
  const values = effective.map((r) => r.values[key]).filter((v) => v != null);
  ranges[key] = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
}
const norm = (key, value) => {
  const range = ranges[key];
  if (value == null || !range) return null;
  return range.max === range.min ? 50 : ((value - range.min) / (range.max - range.min)) * 100;
};
const slotRows = effective.map((r) => {
  const da = [norm("designarena_frontend", r.values.designarena_frontend), norm("designarena_fullstack", r.values.designarena_fullstack)]
    .filter((v) => v != null);
  return {
    ...r,
    slots: {
      aa_coding_index: norm("aa_coding_index", r.values.aa_coding_index),
      aa_coding_agent: norm("aa_coding_agent", r.values.aa_coding_agent),
      aa_intelligence_index: norm("aa_intelligence_index", r.values.aa_intelligence_index),
      da: da.length ? da.reduce((a, b) => a + b, 0) / da.length : null,
    },
    composite: composites.get(r.id),
  };
});

function show(id) {
  const r = slotRows.find((x) => x.id === id);
  if (!r) return console.log(`NOT FOUND: ${id}`);
  console.log(`\n${r.name} [${r.id}]`);
  for (const key of SLOTS) {
    const v = r.slots[key];
    console.log(`  ${key}: ${v == null ? "missing (neutral)" : v.toFixed(1)}`);
  }
  console.log(`  coverage: ${SLOTS.filter((key) => r.slots[key] != null).length}/${SLOTS.length}`);
  console.log(`  composite: ${r.composite?.toFixed(1) ?? "—"}`);
}

show("deepseek-v4-pro::high");
show("deepseek-v4-pro::max");
show("deepseek-v4-flash::max");
show("gpt-5.5::medium");
show("gpt-5.5::xhigh");

const shared = (a, b) => SLOTS.filter((key) => a.slots[key] != null && b.slots[key] != null);
const dominatesShared = (a, b) => {
  const keys = shared(a, b);
  return keys.length >= 2 && keys.every((key) => a.slots[key] >= b.slots[key]) && keys.some((key) => a.slots[key] > b.slots[key]);
};
const featured = slotRows.filter((r) => r.featured && r.composite != null);
const violations = [];
for (const a of featured) for (const b of featured) {
  if (a !== b && dominatesShared(a, b) && a.composite < b.composite) violations.push({ a, b });
}
console.log(`\nFeatured shared-dominance violations: ${violations.length}`);
for (const { a, b } of violations.slice(0, 10)) {
  console.log(`  ${a.name} (${a.composite.toFixed(1)}) < ${b.name} (${b.composite.toFixed(1)})`);
}
