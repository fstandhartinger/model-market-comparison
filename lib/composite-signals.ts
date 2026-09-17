import { getDataset } from "./data";
import { getBenchmarkView } from "./benchmark-data";
import { benchmaxxingFamilySignals } from "./benchmax.mjs";

/** CR-74.4: each catalog model's Benchmaxxing signal for the Main Composite penalty — its family's score, the same
 *  number the model's Benchmaxxing tag and report show (CR-21.1: the verdict belongs to the family); null = unscored.
 *  Built once per dataset. */
let cached: { dataset: unknown; value: Map<string, number | null> } | undefined;
export async function compositeBenchmaxxingSignals(): Promise<Map<string, number | null>> {
  const dataset = await getDataset();
  if (cached?.dataset === dataset) return cached.value;
  const view = await getBenchmarkView();
  const familyOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
  const byFamily = new Map(benchmaxxingFamilySignals(view).reports.map(([id, report]) => [familyOf.get(id) ?? id, report.score ?? null]));
  const value = new Map(dataset.models.map((m) => [m.id, byFamily.get(m.family_key) ?? null]));
  cached = { dataset, value };
  return value;
}
