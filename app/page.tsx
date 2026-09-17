import { getDataset } from "../lib/data";
import { getBenchmarkMatrixPage } from "../lib/benchmark-matrix-data";
import { HomeModeLoader } from "../components/deferred/HomeModeLoader";
import { pageDataVersion } from "../lib/page-data";
import { BRAND_CLAIM, BRAND_LINE, previewMetadata } from "../lib/seo";
import { noWidow } from "../lib/typography";


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
        {/* CR-72.1: one block per sentence instead of a manual line break, each balanced and widow-free, so neither
            sentence strands its last word on a line in mobile portrait. Copy comes from the same
            constants as the link previews. */}
        <h1 className="bh-display">
          <span className="bh-display-line">{noWidow(BRAND_CLAIM)}</span>
          <span className="bh-display-line bh-display-accent">{noWidow(BRAND_LINE)}</span>
        </h1>
        <p className="bh-hero-line mt-2 text-sm text-gray-400">
          <span className="tabular">{results.toLocaleString()}</span> results · <span className="tabular">{benchmarks}</span> benchmarks · <span className="tabular">{ds.counts.models.toLocaleString()}</span> models · <span className="whitespace-nowrap">updated {updated}</span>
        </p>
      </section>

      {/* CR-62.1: the model and benchmark data arrive as JSON after this shell (the inlined 8 MB page broke link previews). */}
      <HomeModeLoader version={await pageDataVersion()} />
    </div>
  );
}
