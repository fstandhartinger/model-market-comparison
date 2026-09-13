import { getBenchmarkView } from '../../lib/benchmark-data';
import { selectBenchmarkView } from '../../lib/benchmark-view.mjs';
import { BenchmarkRanking } from '../../components/BenchmarkRanking';
// F-27: no eyebrow, a one-sentence intro, and no Composite definition disclosure (F-21 rule).
export default async function BenchmarksPage() {
  const view = await getBenchmarkView();
  const first = view.axes.find((a) => a.family === 'aa_intelligence_index') || view.axes[0];
  return <div><header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">One benchmark. Every result.</h1><p className="bh-muted mt-3 max-w-2xl">Rankings, coverage and original sources across {view.registryCount} registered benchmark versions.</p></header><BenchmarkRanking initialView={selectBenchmarkView(view, [], first.id)} axisList={view.axes.map((a) => ({ ...a, scores: [], estimates: [] }))} /></div>;
}
