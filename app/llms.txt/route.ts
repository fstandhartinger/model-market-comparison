import { SITE_URL, BRAND_CLAIM, BRAND_LINE } from "../../lib/seo";

// CR-171 (seo-router-sites, 26 Sep 2026): an llms.txt index (llmstxt.org) so an agent finds the pages and the
// public API without crawling the app. Links only; it states no number, so it cannot drift from the data.
export const dynamic = "force-static";

function llmsTxt(): string {
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
    `- [JevBench leaderboard](${u("/jev-models")}): Jev-class models by intelligence, calibration, speed and cost`,
    `- [Jev alternatives](${u("/jev-models/alternatives")})`,
    `- [Is Jev open source? Open-source Jev-class models](${u("/jev-models/open-source-jev")})`,
    `- [How to choose a Jev-class model](${u("/jev-models/how-to-choose")})`,
    "",
    "## Data and API",
    `- [Public API reference](https://github.com/fstandhartinger/model-market-comparison/blob/main/API.md)`,
    `- [Full dataset, JSON](${u("/api/dataset")}): models, prices and benchmark observations with provenance`,
    `- [Models, JSON](${u("/api/models")})`,
    "",
    "## Optional",
    `- [Source code (MIT; third-party data keeps its own terms)](https://github.com/fstandhartinger/model-market-comparison)`,
    "",
  ].join("\n");
}

export function GET() {
  return new Response(llmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
