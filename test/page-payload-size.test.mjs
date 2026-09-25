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

// D195 (2026-09-25): the heaviest model page had drifted to 309,464 bytes of initial HTML, over
// CR-62.1's 300 KB crawler bound. Measured on the live page, the largest single item was not rendered
// content at all: `efficiency.openrouter_endpoints[<this model>]` is 32 endpoint records, and 20 KB of
// them are `attempts` (per-endpoint collection diagnostics) and `endpoint_id`, which nothing on the
// page reads. The narrowing is payload-only — every field the price modal cites still travels, and the
// dataset and /api/dataset are untouched.
test("D195: a model page serialises only the endpoint fields its price modal reads", async () => {
  const ts = (await import("typescript")).default;
  const src = read("lib/cost.ts");
  const compiled = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } })
    .outputText.replace(/from "\.\/([a-z-]+\.mjs)"/g, (_, f) => `from "${new URL(`../lib/${f}`, import.meta.url).href}"`);
  const { pageEndpoint, PAGE_ENDPOINT_FIELDS } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

  // The list is only safe while it covers every field the lookup below it actually reads.
  const reads = new Set([...src.matchAll(/\b(?:endpoint|exactEndpoint)\??\.([a-z_]+)/g)].map((m) => m[1]));
  for (const field of reads) {
    assert.ok(PAGE_ENDPOINT_FIELDS.includes(field),
      `lib/cost.ts reads endpoint.${field}, so the page payload must keep it`);
  }
  assert.ok(reads.size >= 5, `expected the endpoint lookup to read several fields, saw ${reads.size}`);

  const efficiency = JSON.parse(read("data/dataset.json")).efficiency;
  const models = Object.entries(efficiency?.openrouter_endpoints ?? {});
  assert.ok(models.length > 0, "the dataset carries OpenRouter endpoint observations");
  const size = (v) => JSON.stringify(v).length;
  const [heaviestId, heaviest] = models.sort((a, b) => size(b[1]) - size(a[1]))[0];
  const records = Object.values(heaviest);

  // Exactly the two diagnostic fields go, and nothing else — including nothing inside the citation.
  for (const full of records) {
    const lean = pageEndpoint(full);
    const dropped = Object.keys(full).filter((k) => !Object.hasOwn(lean, k));
    assert.deepEqual(dropped.sort(), Object.keys(full).filter((k) => ["attempts", "endpoint_id"].includes(k)).sort(),
      `${heaviestId}/${full.endpoint_tag}: only the diagnostics may be dropped`);
    for (const key of Object.keys(lean)) assert.deepEqual(lean[key], full[key], `${key} travels unchanged`);
  }
  // The price modal's citation is the reason cache_hit_rate is kept whole.
  const cited = records.find((r) => r.cache_hit_rate);
  if (cited) {
    for (const field of ["value", "source", "url", "collected_at", "basis", "definition"]) {
      assert.ok(Object.hasOwn(pageEndpoint(cited).cache_hit_rate, field),
        `the cache-hit citation keeps ${field}`);
    }
  }
  // And the saving is the one D195 needs: the page was 9,464 bytes over the bound.
  const saved = size(heaviest) - size(Object.fromEntries(Object.entries(heaviest).map(([t, e]) => [t, pageEndpoint(e)])));
  assert.ok(saved > 15_000, `expected the narrowing to save well over the 9,464-byte overshoot, saved ${saved}`);
});
