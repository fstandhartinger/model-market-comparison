import { ComparePricePanel } from '../../components/ComparePricePanel';
import { BenchmarkCompareLoader } from '../../components/deferred/BenchmarkCompareLoader';
import { pageDataVersion } from '../../lib/page-data';
import { previewMetadata } from "../../lib/seo";


export const metadata = previewMetadata({ path: "/compare", documentTitle: "Compare", title: "Compare AI models — Benchmark Heaven",
  description: "Up to four models, every benchmark, the evidence beside each score — plus what each model actually costs per task." });

export default async function ComparePage() {
  // CR-14.1's data-derived default pair is chosen in lib/page-data.ts (CR-62.1: fetched after the shell).
  return (
    <div>
      <header className="bh-page-head"><h1 className="text-3xl font-bold tracking-tight">Compare</h1><p className="bh-muted mt-3 max-w-2xl">Up to four models, every benchmark, the evidence beside each score.</p></header>
      <BenchmarkCompareLoader version={await pageDataVersion()} />
      <ComparePricePanel />
    </div>
  );
}
