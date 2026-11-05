#!/usr/bin/env node
// Print top-N families using the public default Composite and family selection.
// Usage: node scripts/top5.mjs [N] -> JSON [{family_key, name, composite}]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileTsModule } from "./lib/load-ts-module.mjs";
import { buildBenchmarkView } from "../lib/benchmark-view.mjs";
import { benchmaxxingFamilySignals } from "../lib/benchmax.mjs";
import { topCandidates, SIMPLE_LIMIT } from "../lib/value-map.mjs";

// Reuse the application mapping (including all seven slots and family attachments),
// rather than maintain another raw-score mapper that drifts as the app changes.
const clientUrl = await compileTsModule(new URL("../lib/client-model.ts", import.meta.url));
const { clientData, hasScoreEvidence } = await import(clientUrl);
const variantsUrl = await compileTsModule(new URL("../lib/variants.ts", import.meta.url), {
  "./client-model": clientUrl,
});
const { selectableModels, preferredVariantIds, collapseModels } = await import(variantsUrl);
const { createScope, scopedCatalogOffers } = await import(await compileTsModule(
  new URL("../lib/cost.ts", import.meta.url)));

export function topFamilies(ds, n = 5) {
  // Same family-level penalty used by compositeBenchmaxxingSignals in page-data.
  const view = buildBenchmarkView(ds);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
  const byFamily = new Map(benchmaxxingFamilySignals(view).reports.map(([id, report]) =>
    [familyOf.get(id) ?? id, report.score ?? null]));
  const signals = new Map(ds.models.map((m) => [m.id, byFamily.get(m.family_key) ?? null]));
  const data = clientData(ds, {}, signals);
  const models = data.models;
  // Default provider scope allows all regions and excludes training-enabled routes.
  // Charts therefore requires an eligible paid offer even for an excellent score.
  const scope = createScope(null, data.providers, {}, true);
  const candidates = selectableModels(models, true, "composite");
  const preferred = preferredVariantIds(candidates, "composite");
  const rows = topCandidates(collapseModels(candidates, preferred)
    .filter((m) => scopedCatalogOffers(data.offersByModel[m.id], scope).length > 0),
    (m) => m, SIMPLE_LIMIT)
    .filter((m) => hasScoreEvidence(m, "composite") && Number.isFinite(m.scores.composite));
  return rows.sort((a, b) => b.scores.composite - a.scores.composite || a.family_key.localeCompare(b.family_key))
    .slice(0, n)
    .map((m) => ({ family_key: m.family_key, name: m.family_name || m.display_name,
      composite: Math.round(m.scores.composite * 10) / 10 }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const n = Number(process.argv[2] || 5);
  if (!Number.isInteger(n) || n < 1) throw new Error("N must be a positive integer");
  const ds = JSON.parse(readFileSync(new URL("../data/dataset.json", import.meta.url)));
  console.log(JSON.stringify(topFamilies(ds, n), null, 2));
}
