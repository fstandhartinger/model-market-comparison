#!/usr/bin/env node
// CR-34.1: refresh data/raw/openrouter-benchmarks.json from OpenRouter's documented public
// Benchmarks API (GET /api/v1/benchmarks, Bearer key from the environment, never printed).
// robots.txt allows / except /seo/; this is the API's own documented access contract
// (30 req/min, 500 req/day), not site scraping. Republishing question answered at collection
// time by the payload itself: meta.citation is documented as "Required attribution when
// republishing this data" (per-source). Two requests: source=openrouter (OpenRouter's own
// runs — the only items not already covered by our primary sources) and an unfiltered capture
// (cross-check context; every item carries its source discriminator). Fails closed: a missing
// key, an HTTP error, a shape change or a suspicious row count leaves the previous snapshot
// untouched.
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";
import { parseBenchmarksResponse, validateBenchmarksRows } from "../lib/openrouter-benchmarks.mjs";

const target = fileURLToPath(new URL("../data/raw/openrouter-benchmarks.json", import.meta.url));
const api = "https://openrouter.ai/api/v1/benchmarks";
const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
try {
  if (!key) throw new Error("OPEN_ROUTER_API_KEY is not set in the environment");
  const get = async (url) => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
    if (response.status === 401 || response.status === 403) throw new Error(`OpenRouter benchmarks HTTP ${response.status} (key rejected — do not retry blindly)`);
    if (response.status === 429) throw new Error("OpenRouter benchmarks HTTP 429 (rate limited; 30/min, 500/day — the daily runs once)");
    if (!response.ok) throw new Error(`OpenRouter benchmarks HTTP ${response.status}`);
    return response.text();
  };
  const ownText = await get(`${api}?source=openrouter`, "own");
  const own = parseBenchmarksResponse(ownText, "own");
  const allText = await get(api, "all");
  const all = parseBenchmarksResponse(allText, "all");
  const { ownRows, aaRows, daRows } = validateBenchmarksRows(all.data);

  const collected_at = new Date().toISOString().slice(0, 10);
  await captureLiveSource(`${api}?source=openrouter`, ownText);
  await captureLiveSource(api, allText);
  await writeJSONAtomic(target, {
    source: "OpenRouter Benchmarks — openrouter.ai/benchmarks (documented public API, api key from the environment)",
    collected_at,
    method: `scripts/fetch-openrouter-benchmarks.mjs (${collected_at}): two authenticated GETs of /api/v1/benchmarks (source=openrouter and unfiltered). Terms evaluated 2026-09-15 — see openrouter-benchmarks.method.md: the payload's meta.citation is documented as "Required attribution when republishing this data" (per-source). Display attribution: "OpenRouter Benchmarks" linked to openrouter.ai/benchmarks.`,
    terms: own.meta.citation || "source=openrouter rows: attribute to OpenRouter (openrouter.ai/benchmarks); attribution format documented per source in the API's meta.citation",
    as_of: all.meta.as_of,
    own_as_of: own.meta.as_of,
    own_citation: own.meta.citation,
    counts: {
      total_rows: all.data.length, own_rows: ownRows,
      aa_rows: aaRows, design_arena_rows: daRows,
      models: all.meta.model_count,
    },
    response_sha256: createHash("sha256").update(allText).digest("hex"),
    data: all.data,
  });
  console.log(`OpenRouter Benchmarks: ${all.data.length} rows for ${all.meta.model_count} models (own ${ownRows}, AA ${aaRows}, DesignArena ${daRows}), as_of ${all.meta.as_of}`);
} catch (error) {
  console.error(`OpenRouter Benchmarks refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
