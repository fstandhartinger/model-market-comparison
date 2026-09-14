import taxonomy from "../data/benchmark-taxonomy.json";
import { getDataset } from "./data";
import { getBenchmarkView } from "./benchmark-data";
import { buildBenchmarkMatrix, type BenchmarkMatrix } from "./benchmark-matrix.mjs";
import { clientData } from "./client-model";
import { isEuOffer } from "./cost";
import { selectableModels } from "./variants";
import type { Dataset } from "./types";
import type { MatrixFilterData, MatrixOffer } from "./top-models";

let cached: { dataset: Dataset; value: { matrix: BenchmarkMatrix; filterData: MatrixFilterData } } | undefined;

/** Server-side: the comparison matrix plus the slim filter payload for its models. */
export async function getBenchmarkMatrixPage() {
  const dataset = await getDataset();
  if (cached?.dataset === dataset) return cached.value;
  const matrix = buildBenchmarkMatrix(await getBenchmarkView(), dataset, taxonomy);
  const cd = clientData(dataset);
  const alive = new Set(selectableModels(cd.models, true).map((m) => m.family_key));
  const withValues = new Set(Object.keys(matrix.values));
  const models = cd.models.filter((m) => withValues.has(m.id)).map((m) => ({
    id: m.id, family_key: m.family_key, family_name: m.family_name, display_name: m.display_name, org: m.org, variant: m.variant,
    open_weights: m.open_weights, featured: m.featured, deprecated: m.deprecated, scores: m.scores,
    composite_coverage: m.composite_coverage, benchmark_count: m.benchmark_count, family_alive: alive.has(m.family_key),
  }));
  const offers: Record<string, MatrixOffer[]> = {};
  for (const m of models) {
    const seen = new Set<string>();
    offers[m.id] = (cd.offersByModel[m.id] ?? []).map((o) => ({ key: o.key, tee: !!o.tee, eu_hosted: isEuOffer(o), data_private: o.data_private }))
      .filter((o) => { const k = JSON.stringify(o); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const providers = cd.providers.map((p) => ({ key: p.key, provider: p.provider, country: p.country ?? null, non_us: p.non_us }));
  const value = { matrix, filterData: { models, offers, providers } };
  cached = { dataset, value };
  return value;
}
