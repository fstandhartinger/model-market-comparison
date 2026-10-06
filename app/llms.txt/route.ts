import { readJevbenchComparisonLinks } from '../../lib/jevbench-seo.mjs';
import { SITE_URL, BRAND_CLAIM, BRAND_LINE } from "../../lib/seo";

// CR-171 (seo-router-sites, 26 Sep 2026): an llms.txt index (llmstxt.org) so an agent finds the pages and the
// public API without crawling the app. Links only; it states no number, so it cannot drift from the data.
export const dynamic = "force-static";
export const revalidate = 300;

async function llmsTxt(): Promise<string> {
  const comparisons = await readJevbenchComparisonLinks();
  const u = (path: string) => `${SITE_URL}${path}`;
  return [
    "# Benchmark Heaven",
    "",
    `> ${BRAND_CLAIM} ${BRAND_LINE} Benchmark results for large language models, each with its source and date, and a modeled cost per task that accounts for provider prices, caching and the model's own token use. Home of JevBench, the benchmark for Jev-class decision models.`,
    "",
    "## Pages",
    `- [Home](${u("/")}): recommended models by capability and cost`,
    `- [Benchmarks](${u("/benchmarks")}): every benchmark board with sources`,
    `- [Compare models](${u("/compare")}): side-by-side benchmark results and costs`,
    `- [Providers](${u("/providers")}): per-provider prices, caching and speed`,
    `- [Sources and methodology](${u("/about")}): where the data comes from and how cost is modeled`,
    "",
    "## JevBench (Jev-class decision models)",
    `- [JevBench leaderboard](${u("/jev-models")}): open-weights Jev-class models by intelligence, calibration, speed and cost, with Jev as the reference row`,
    `- [JevBench API leaderboard](${u("/jev-models/api")}): hosted decision APIs (Jev, wity, Sage, Fastino and more) ranked on the same scores`,
    `- [Jev alternatives](${u("/jev-models/alternatives")})`,
    `- [Jev-Alternativen im Vergleich (Deutsch)](${u("/de/jev-models/alternativen")})`,
    `- [Is Jev open source? Open-source Jev-class models](${u("/jev-models/open-source-jev")})`,
    `- [How to choose a Jev-class model](${u("/jev-models/how-to-choose")})`,
    "",
    ...comparisons.map((p) => `- [Jev vs ${p.label}](${u(`/jev-models/${p.slug}`)})`),
    `- Model pages: ${u("/jev-models/{system}")} (replace {system} with the public model slug)`,
    `- [Full JevBench data and method](${u("/llms-full.txt")})`,
    "",
    "## Data and API",
    `- [Public API reference](https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md)`,
    `- [Full dataset, JSON](${u("/api/dataset")}): models, prices and benchmark observations with provenance`,
    `- [Current JevBench leaderboard, JSON](${u("/api/jevbench/latest")}): revision, weights, systems with keys, sources, axes, Capability eligibility/rank, Composite score/rank, listing flags and price basis`,
    `- [Models, JSON](${u("/api/models")})`,
    "",
    "## For agents",
    "- Start with the current JevBench JSON feed. Capability is the mean of Intelligence and Calibration; use capability.eligible and capability.rank for the official cost and median-latency caps.",
    "- Pick by an axis when that priority dominates. For custom weights, use the published axes and the documented gated harmonic Composite formula; custom scores are exploratory, not official ranks. Higher axis scores are better; lower actual price and latency are better.",
    `- Compare two ranked model keys: ${u("/jev-models")}?compare=a,b#compare (replace a,b with feed keys).`,
    `- [Submit a model](${u("/submit")}): free queue or fast lane`,
    "- See the Public API reference above for schema, units, pricing basis and missing-value rules.",
    "",
    "## Optional",
    `- [Source code (MIT; third-party data keeps its own terms)](https://github.com/fstandhartinger/model-market-comparison)`,
    "",
  ].join("\n");
}

export async function GET() {
  return new Response(await llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
