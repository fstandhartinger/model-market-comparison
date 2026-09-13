import { ComparePricePanel } from '../../components/ComparePricePanel';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { selectBenchmarkView } from '../../lib/benchmark-view.mjs';
import { BenchmarkCompare } from '../../components/BenchmarkCompare';


export default async function ComparePage() {
  const view = await getBenchmarkView();
  const picks = ['gpt-5.6-sol::high', 'claude-sonnet-5::high'].filter((id) => view.models.some((m) => m.id === id));
  return (
    <div>
      <header className="bh-page-head"><p className="bh-eyebrow">MODEL COMPARISON</p><h1 className="text-3xl font-bold tracking-tight">Find strengths. Understand tradeoffs.</h1><p className="bh-muted mt-3 max-w-2xl">Compare up to four exact model configurations across the full benchmark collection, with the evidence beside every score.</p></header>
      <BenchmarkCompare initialView={selectBenchmarkView(view, picks)} initialPicks={picks} />
      <ComparePricePanel />
    </div>
  );
}
