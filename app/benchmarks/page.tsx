import Link from 'next/link';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { selectBenchmarkView } from '../../lib/benchmark-view.mjs';
import { getBenchmarkMatrixPage } from '../../lib/benchmark-matrix-data';
import { BenchmarkRanking } from '../../components/BenchmarkRanking';
import { BenchmarkMatrix } from '../../components/BenchmarkMatrix';

// CR-1.1: the tab opens on the release-style comparison. The single-benchmark ranking stays one
// click away and keeps its `?benchmark=` deep links. F-27: one sentence under the heading.
export default async function BenchmarksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const single = typeof params.benchmark === 'string';
  const view = await getBenchmarkView();
  const first = view.axes.find((a) => a.family === 'aa_intelligence_index') || view.axes[0];
  const tab = (active: boolean) => `inline-flex h-9 items-center rounded-md px-3 text-sm ${active ? 'bg-accent text-ink' : 'text-gray-300 hover:bg-accent/10'}`;
  const tabs = <nav aria-label="Benchmark views" className="mb-5 inline-flex gap-1 rounded-lg border border-line p-0.5">
    <Link href="/benchmarks" aria-current={single ? undefined : 'page'} className={tab(!single)}>Compare models</Link>
    <Link href={`/benchmarks?benchmark=${encodeURIComponent(first.benchmarkId)}`} aria-current={single ? 'page' : undefined} className={tab(single)}>One benchmark</Link>
  </nav>;
  if (single) {
    return <div><header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">One benchmark. Every result.</h1><p className="bh-muted mt-3 max-w-2xl">Rankings, coverage and original sources across {view.registryCount} registered benchmark versions.</p></header>{tabs}<BenchmarkRanking initialView={selectBenchmarkView(view, [], first.id)} axisList={view.axes.map((a) => ({ ...a, scores: [], estimates: [] }))} /></div>;
  }
  const { matrix, filterData } = await getBenchmarkMatrixPage();
  return <div>
    <header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">Every benchmark, side by side.</h1><p className="bh-muted mt-3 max-w-2xl">The strongest models under your filters, side by side on every benchmark with a published result — each value with its source.</p></header>
    {tabs}
    {/* CR-1.11: the shared-URL selection is part of the first render, so the table does not re-layout after hydration. */}
    <BenchmarkMatrix matrix={matrix} filterData={filterData} initial={{ models: typeof params.models === 'string' ? params.models : null, set: typeof params.set === 'string' ? params.set : null, rows: typeof params.rows === 'string' ? params.rows : null }} />
  </div>;
}
