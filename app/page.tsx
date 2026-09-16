import { getDataset } from "../lib/data";
import { getBenchmarkMatrixPage } from "../lib/benchmark-matrix-data";
import { HomeModeLoader } from "../components/deferred/HomeModeLoader";
import { pageDataVersion } from "../lib/page-data";
import { previewMetadata } from "../lib/seo";


export const metadata = previewMetadata({ path: "/", title: "Benchmark Heaven",
  description: "The most detailed cost–capability analysis in AI. Every model. Every Benchmark. Actual Costs." });

export default async function Home() {
  const ds = await getDataset();
  // R3.1: the claim is quantified from the dataset it describes, so it cannot drift
  // away from what the page actually shows.
  const fullMatrix = (await getBenchmarkMatrixPage()).matrix;
  // F-102: one counting rule — a benchmark is a board (one family at one version) with at least one
  // result; harness cohorts and cost twins are rows of a board. The same number is the denominator
  // of Simple's section 2 and of the Benchmarks page, so the site never counts its own collection
  // three different ways.
  const benchmarks = fullMatrix.catalogBoards;
  const results = ds.benchmark_results?.observations?.length ?? 0;
  const updated = String(ds.generated_at ?? "").slice(0, 10) || "n/a";

  return (
    <div>
      {/* F-01 (Fable 5.1 design pass, 2026-09-13): compact hero — the recommendation list
          must be visible on the first screen. R3.1 claim decided in DESIGN-DIRECTIVES.md. */}
      <section className="bh-hero mb-4">
        {/* CR-10.1 (Florian 2026-09-15): verbatim, with his capitalisation ("Every Benchmark. Actual Costs."). */}
        <h1 className="bh-display">The most detailed cost–capability analysis in AI.<br /><span>Every model. Every Benchmark. Actual Costs.</span></h1>
        <p className="bh-hero-line mt-2 text-sm text-gray-400">
          <span className="tabular">{results.toLocaleString()}</span> results · <span className="tabular">{benchmarks}</span> benchmarks · <span className="tabular">{ds.counts.models.toLocaleString()}</span> models · updated {updated}
        </p>
      </section>

      {/* CR-62.1: the model and benchmark data arrive as JSON after this shell (the inlined 8 MB page broke link previews). */}
      <HomeModeLoader version={await pageDataVersion()} />
    </div>
  );
}
