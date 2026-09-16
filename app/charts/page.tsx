import { ChartsBoardLoader } from "../../components/deferred/ChartsBoardLoader";
import { pageDataVersion } from "../../lib/page-data";
import { previewMetadata } from "../../lib/seo";


export const metadata = previewMetadata({ path: "/charts", documentTitle: "Charts", title: "AI model charts — Benchmark Heaven",
  description: "Leaderboard, cheapest models, open vs closed weights and score against real cost per task, all under your filters." });

export default async function ChartsPage() {
  const version = await pageDataVersion();
  return (
    <div>
      <h1 className="text-2xl font-bold">Charts</h1>
      <p className="mt-1 mb-5 max-w-3xl text-sm text-gray-400">
        <a href="/compare" className="text-accent">Leaderboard</a>, <a href="#cheapest" className="text-accent">cheapest models</a>, <a href="#open-vs-closed" className="text-accent">open vs closed</a>, and{" "}
        <a href="/scatter" className="text-accent">score against cost</a> — all under your current filters.
      </p>
      <ChartsBoardLoader version={version} />
    </div>
  );
}
