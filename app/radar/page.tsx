import { BenchmarkCompareLoader } from '../../components/deferred/BenchmarkCompareLoader';
import { pageDataVersion } from '../../lib/page-data';
export const metadata = { title: 'Benchmark radar' };

export default async function RadarPage() {
  const version = await pageDataVersion();
  return <div><header className="bh-page-head"><p className="bh-eyebrow">BENCHMARK EXPLORER</p><h1 className="text-3xl font-bold tracking-tight">See the shape of a model.</h1><p className="bh-muted mt-3 max-w-2xl">Compare strengths across benchmark versions. Choose your axes, inspect every number, and see where evidence is still missing.</p><div className="mt-4 flex gap-3 text-sm"><a className="text-accent underline" href="#benchmark-radar">View radar ↓</a><a className="text-accent underline" href="#full-comparison">Full benchmark table ↓</a></div></header><BenchmarkCompareLoader version={version} standalone /></div>;
}
