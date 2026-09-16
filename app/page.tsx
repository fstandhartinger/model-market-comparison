import { getDataset } from "../lib/data";
import { clientData, type ClientBenchmaxxing } from "../lib/client-model";
import { HomeMode } from "../components/HomeMode";
import { getBenchmarkView } from "../lib/benchmark-data";
import { benchmaxxingFamilySignals } from "../lib/benchmax.mjs";
import { buildBenchmarkComparison } from "../lib/benchmark-comparison.mjs";
import { getBenchmarkMatrixPage } from "../lib/benchmark-matrix-data";
import { importantMatrix } from "../lib/benchmark-matrix.mjs";


export default async function Home() {
  const ds = await getDataset();
  // Overview carries the same tag as the dedicated Benchmaxxing page (one shared
  // implementation over the whole catalog). Server-side, so the client table receives
  // only display data and never recomputes benchmark scores.
  const view = await getBenchmarkView();
  // CR-21.1: the verdict belongs to the model (family), so every reasoning variant shows its family's score and tag.
  const { reports, tagged } = benchmaxxingFamilySignals(view);
  const familyScore = new Map(reports.map(([id, report]) => [view.models.find((m) => m.id === id)?.family ?? id, report.score ?? null]));
  const benchmaxxing: Record<string, ClientBenchmaxxing> = Object.fromEntries(view.models.filter((m) => familyScore.has(m.family ?? m.id))
    .map((m) => [m.id, { score: familyScore.get(m.family ?? m.id) ?? null, signal: tagged.has(m.id) }]));
  const data = { ...clientData(ds, benchmaxxing), comparison: buildBenchmarkComparison(view) };
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
  // CR-7.1: the simple Benchmarks section gets only the "Important" rows, not the full matrix.
  const benchMatrix = importantMatrix(fullMatrix);

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

      <HomeMode data={data} matrix={benchMatrix} />
    </div>
  );
}
