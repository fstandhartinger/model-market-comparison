import { getBenchmarkView } from '../../lib/benchmark-data';
import { selectBenchmarkView } from '../../lib/benchmark-view.mjs';
import { BenchmarkRanking } from '../../components/BenchmarkRanking';
import { CompositeNote } from '../../components/CompositeNote';
export default async function BenchmarksPage() {
  const view = await getBenchmarkView();
  const first = view.axes.find((a) => a.family === 'aa_intelligence_index') || view.axes[0];
  return <div><header className="bh-page-head"><p className="bh-eyebrow">BENCHMARK EXPLORER</p><h1 className="text-3xl font-bold tracking-tight">One benchmark. Every result.</h1><p className="bh-muted mt-3 max-w-2xl">Explore rankings, coverage and original sources across {view.registryCount} registered versions and four existing index snapshots.</p></header><BenchmarkRanking initialView={selectBenchmarkView(view, [], first.id)} axisList={view.axes.map((a) => ({ ...a, scores: [] }))} /><CompositeNote date={view.legacyDate} /></div>;
}
