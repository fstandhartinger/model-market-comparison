#!/usr/bin/env node
// Print the current top-N model families by the app's default Composite score
// (featured, non-deprecated, best variant per family — i.e. the default view).
// Used by the Sandy daily cron to detect when a new family enters the top 5.
// Usage: node scripts/top5.mjs [N]  → JSON array [{family_key, name, composite}]
import { readFileSync } from "node:fs";
import { computeCompositeScores } from "../lib/composite.mjs";

const N = Number(process.argv[2] || 5);
const ds = JSON.parse(readFileSync(new URL("../data/dataset.json", import.meta.url)));
const rows = ds.models.map((m) => ({
  id: m.id,
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
const best = new Map();
for (const m of ds.models) {
  if (!m.featured || m.deprecated) continue;
  const c = composites.get(m.id);
  if (c == null || !Number.isFinite(c)) continue;
  const cur = best.get(m.family_key);
  if (!cur || c > cur.composite) best.set(m.family_key, { family_key: m.family_key, name: m.family_name || m.display_name, composite: Math.round(c * 10) / 10 });
}
const top = [...best.values()].sort((a, b) => b.composite - a.composite).slice(0, N);
console.log(JSON.stringify(top, null, 2));
