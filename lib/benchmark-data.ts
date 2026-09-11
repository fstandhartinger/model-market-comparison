import { getDataset } from './data';
import { buildBenchmarkView, type BenchmarkView } from './benchmark-view.mjs';
import type { Dataset } from './types';
let cached: { dataset: Dataset; view: BenchmarkView } | undefined;
export async function getBenchmarkView() {
  const dataset = await getDataset();
  if (cached?.dataset === dataset) return cached.view;
  const view = buildBenchmarkView(dataset);
  cached = { dataset, view };
  return view;
}
