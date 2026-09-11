import { getBenchmarkView } from '../../lib/benchmark-data';
import { selectBenchmarkView } from '../../lib/benchmark-view.mjs';
import { BenchmarkCompare } from '../../components/BenchmarkCompare';
import { CompositeNote } from '../../components/CompositeNote';
export default async function RadarPage() {
  const view = await getBenchmarkView();
  const picks = ['gpt-5.6-sol::high', 'claude-sonnet-5::high'].filter((id) => view.models.some((m) => m.id === id));
  return <div><header className="bh-page-head"><p className="bh-eyebrow">BENCHMARK EXPLORER</p><h1 className="text-3xl font-bold tracking-tight">See the shape of a model.</h1><p className="bh-muted mt-3 max-w-2xl">Compare strengths across benchmark versions. Choose your axes, inspect every number, and see where evidence is still missing.</p><div className="mt-4 flex gap-3 text-sm"><a className="text-accent underline" href="#benchmark-radar">View radar ↓</a><a className="text-accent underline" href="#full-comparison">Full benchmark table ↓</a></div></header><CompositeNote date={view.legacyDate} /><BenchmarkCompare initialView={selectBenchmarkView(view, picks)} initialPicks={picks} standalone /></div>;
}
