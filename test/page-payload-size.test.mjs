// CR-62.1 (Florian 2026-09-16): link-preview crawlers abort on multi-MB pages. The catalog pages must not
// hand the client dataset to a client component as a server prop again (it lands in the HTML flight
// payload); their data comes from /api/page-data/<key> through components/deferred/*.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const DEFERRED = {
  "app/page.tsx": "HomeModeLoader", "app/charts/page.tsx": "ChartsBoardLoader", "app/scatter/page.tsx": "ScatterLoader",
  "app/providers/page.tsx": "ProvidersViewLoader", "app/provider-explorer/page.tsx": "ProviderExplorerLoader", "app/eu/page.tsx": "EuSotaTableLoader",
  "app/benchmarks/page.tsx": "BenchmarkMatrixLoader", "app/compare/page.tsx": "BenchmarkCompareLoader", "app/radar/page.tsx": "BenchmarkCompareLoader",
  "app/benchmaxxing/page.tsx": "BenchmaxxingWorkbenchLoader",
};

test("catalog pages load their heavy props after the shell", () => {
  for (const [page, loader] of Object.entries(DEFERRED)) {
    const src = read(page);
    assert.match(src, new RegExp(`<${loader}\\b`), `${page} renders ${loader}`);
    assert.doesNotMatch(src, /clientData\(/, `${page} must not build the client dataset for a server prop`);
    assert.doesNotMatch(src, /getBenchmarkMatrixPage\(\)\)\.matrix[\s\S]*<HomeMode\b|<BenchmarkMatrix\b|<BenchmarkCompare\b|<ChartsBoard\b/, `${page} must not pass heavy props directly`);
  }
});

test("every loader key is served by the page-data route", () => {
  const keys = read("lib/page-data.ts").match(/PAGE_DATA_KEYS = \[([^\]]+)\]/)[1];
  for (const f of Object.values(DEFERRED)) {
    const src = read(`components/deferred/${f}.tsx`);
    const key = src.match(/dataKey="([a-z-]+)"/)[1];
    assert.ok(keys.includes(`"${key}"`), `${f} uses a served key (${key})`);
  }
  assert.ok(existsSync(new URL("../app/api/page-data/[key]/route.ts", import.meta.url)));
});

test("model pages ship only their own endpoint efficiency with the precomputed cache baseline", () => {
  const src = read("app/models/[id]/page.tsx");
  assert.match(src, /cache_hit_baseline: cacheHitBaseline\(data\.efficiency, data\.generated_at\)/);
  assert.doesNotMatch(src, /efficiency: data\.efficiency,/);
  assert.match(read("lib/cost.ts"), /efficiency\.cache_hit_baseline !== undefined\) return efficiency\.cache_hit_baseline/);
});

test("preview tags: robots, sitemap and the shared helper carry the X handle and locale", () => {
  const seo = read("lib/seo.ts");
  assert.match(seo, /X_HANDLE = "@benchmarkheaven"/);
  assert.match(seo, /locale: "en_US", url: path/);
  assert.match(read("app/robots.ts"), /sitemap: `\$\{SITE_URL\}\/sitemap\.xml`/);
  for (const page of ["app/page.tsx", "app/benchmarks/page.tsx", "app/compare/page.tsx", "app/benchmaxxing/page.tsx", "app/charts/page.tsx", "app/eu/page.tsx", "app/models/[id]/page.tsx"])
    assert.match(read(page), /previewMetadata\(/, `${page} sets its own preview`);
});

test("the layout no longer inlines the Options sheet lists; model-page evidence loads on open", () => {
  const layout = read("app/layout.tsx");
  assert.doesNotMatch(layout, /getDataset\(|families=\{|providers=\{/);
  assert.match(layout, /<GlobalFilters version=\{await pageDataVersion\(\)\} \/>/);
  assert.match(read("components/GlobalFilters.tsx"), /\/api\/page-data\/filters\?v=/);
  assert.match(read("lib/page-data.ts"), /"filters"\] as const/);
  const sheet = read("components/BenchmarkSheet.tsx");
  assert.doesNotMatch(sheet, /<SourceScore\b/, "row evidence is rendered by LazyEvidenceRow on open");
  assert.match(sheet, /<SheetRows\b/);
  assert.match(sheet, /<LazyMissingCoverage\b/);
});
