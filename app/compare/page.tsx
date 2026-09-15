import { ComparePricePanel } from '../../components/ComparePricePanel';
import { getBenchmarkView } from '../../lib/benchmark-data';
import { selectFamilyBenchmarkView } from '../../lib/benchmark-view.mjs';
import { defaultComparePicks } from '../../lib/radar.mjs';
import { BenchmarkCompare } from '../../components/BenchmarkCompare';


export default async function ComparePage() {
  const view = await getBenchmarkView();
  // CR-14.1: the two most capable current model families, from the data (not a fixed pair).
  const initial = selectFamilyBenchmarkView(view, defaultComparePicks(view));
  return (
    <div>
      <header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">Compare</h1><p className="bh-muted mt-3 max-w-2xl">Up to four models, every benchmark, the evidence beside each score.</p></header>
      <BenchmarkCompare initialView={initial} initialPicks={initial.picks ?? []} />
      <ComparePricePanel />
    </div>
  );
}
