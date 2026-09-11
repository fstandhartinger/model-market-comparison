#!/usr/bin/env node
// Fetch live data from OpenRouter, ArtificialAnalysis, and DesignArena.
// Writes raw JSON snapshots into data/raw/. These snapshots are committed so the
// app has a deterministic seed even when the upstream APIs are unreachable.
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichArtificialAnalysis } from "../lib/aa-metadata.mjs";
import { parseArtificialAnalysisMetadata } from "../lib/aa-rsc.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { refreshAaEfficiency } from "./fetch-aa-efficiency.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, "..", "data", "raw");

const AA_KEY = process.env.ARTIFICIAL_ANALYSIS_API_KEY || process.env.ARTIF_ANALYSIS_API_KEY || "";
const UA = "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

async function getText(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

async function fetchArtificialAnalysis() {
  console.log("→ ArtificialAnalysis models …");
  if (!AA_KEY) throw new Error("Set ARTIFICIAL_ANALYSIS_API_KEY to fetch ArtificialAnalysis data");
  const data = await getJSON("https://artificialanalysis.ai/api/v2/data/llms/models", {
    headers: { "x-api-key": AA_KEY },
  });
  const leaderboardHtml = await getText("https://artificialanalysis.ai/leaderboards/models");
  const metadata = parseArtificialAnalysisMetadata(leaderboardHtml);
  const apiModels = data.data || [];
  let previous = {};
  try { previous = JSON.parse(await readFile(join(RAW, "artificialanalysis.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const { models, missing, extraCount } = enrichArtificialAnalysis(apiModels, metadata, previous);
  if (missing.length) {
    console.log(`  warn: ${missing.length} API model(s) lack leaderboard metadata (mid-rollout), shipping with null metadata: ${missing.map((m) => m.name).join(", ")}`);
  }
  if (extraCount) console.log(`  note: leaderboard carries ${extraCount} extra metadata row(s) not in the v2 API yet`);
  console.log(`  ${models.length} models`);
  const target = join(RAW, "artificialanalysis.json");
  const snapshot = {
    source: "ArtificialAnalysis API v2",
    endpoint: "https://artificialanalysis.ai/api/v2/data/llms/models",
    metadata_endpoint: "https://artificialanalysis.ai/leaderboards/models",
    collected_at: new Date().toISOString().slice(0, 10),
    count: models.length,
    models,
  };
  await writeJSONAtomic(target, snapshot);
  const efficiency = await refreshAaEfficiency({ target: join(RAW, "aa-efficiency.json") });
  console.log(`  ${efficiency.count} AA token-efficiency benchmark rows`);
}

async function fetchDesignArena() {
  console.log("→ DesignArena leaderboards …");
  // 2026-07: the leaderboard API moved back from intelligence.ai (now a plain
  // marketing site returning 404s for /api/*) to www.designarena.ai.
  const baseUrl = "https://www.designarena.ai";
  const queries = [
    { key: "frontend", body: { arenaType: "agents", category: "agon_webapps", variationName: "public", inputModality: "text" } },
    { key: "fullstack", body: { arenaType: "agents", category: "fullstack", variationName: "public" } },
  ];
  const out = {};
  for (const q of queries) {
    const data = await getJSON(`${baseUrl}/api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q.body),
    });
    out[q.key] = { request: q.body, data: data.data || [] };
    console.log(`  ${q.key}: ${out[q.key].data.length} models`);
  }
  // Leaderboard ids are serving identifiers, not always public product names
  // (for example `yoda` is displayed as Grok 4.5). Snapshot the source-owned
  // registry metadata used by the leaderboard UI so dataset joins do not depend
  // on a growing local alias list. Fail closed if the registry and boards drift.
  const registry = await getJSON(`${baseUrl}/api/registry`);
  const modelIds = [...new Set(Object.values(out).flatMap((board) => board.data.map((row) => row.modelId)))].sort();
  const missingRegistryIds = modelIds.filter((id) => !registry.models?.[id]);
  if (missingRegistryIds.length) {
    throw new Error(`Intelligence.ai registry missing ${missingRegistryIds.length} leaderboard ids: ${missingRegistryIds.join(", ")}`);
  }
  const modelRegistry = Object.fromEntries(modelIds.map((id) => {
    const model = registry.models[id];
    return [id, {
      display_name: model.displayName || id,
      provider: model.provider || null,
      open_source: typeof model.openSource === "boolean" ? model.openSource : null,
    }];
  }));
  await writeJSONAtomic(join(RAW, "designarena.json"), {
    source: "Intelligence.ai leaderboard API (formerly DesignArena)",
    endpoint: `POST ${baseUrl}/api/leaderboard`,
    registry_endpoint: `GET ${baseUrl}/api/registry`,
    collected_at: new Date().toISOString().slice(0, 10),
    model_registry: modelRegistry,
    leaderboards: out,
  });
}

// Concurrency-limited map.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { out[i] = await fn(items[i], i); } catch (e) { out[i] = null; }
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchOpenRouter() {
  console.log("→ OpenRouter model catalog …");
  const catalog = await getJSON("https://openrouter.ai/api/v1/models");
  const models = catalog.data || [];
  console.log(`  ${models.length} models in catalog`);

  // Fetch per-provider endpoints for every model (concurrency limited) so we can
  // compute the cheapest providers per model. Some models return [] (no public
  // provider list); that's fine.
  console.log("  fetching per-provider endpoints …");
  let done = 0;
  const enriched = await mapLimit(models, 10, async (m) => {
    const id = m.id; // e.g. "moonshotai/kimi-k2"
    let endpoints = [];
    try {
      const ep = await getJSON(`https://openrouter.ai/api/v1/models/${id}/endpoints`);
      endpoints = (ep.data && ep.data.endpoints) || [];
    } catch { /* ignore */ }
    done++;
    if (done % 50 === 0) console.log(`    ${done}/${models.length}`);
    return {
      id: m.id,
      canonical_slug: m.canonical_slug,
      hugging_face_id: m.hugging_face_id ?? null,
      name: m.name,
      created: m.created,
      expiration_date: m.expiration_date ?? null,
      context_length: m.context_length,
      architecture: m.architecture ?? null,
      reasoning: m.reasoning ?? null,
      benchmarks: m.benchmarks ?? null,
      supported_parameters: m.supported_parameters ?? [],
      pricing: m.pricing, // blended default endpoint price
      endpoints: endpoints.map((e) => ({
        provider_name: e.provider_name,
        tag: e.tag,
        quantization: e.quantization ?? null,
        context_length: e.context_length,
        max_completion_tokens: e.max_completion_tokens ?? null,
        supported_parameters: e.supported_parameters ?? [],
        pricing: e.pricing,
        status: e.status,
        uptime_last_30m: e.uptime_last_30m,
      })),
    };
  });

  await writeJSONAtomic(join(RAW, "openrouter.json"), {
    source: "OpenRouter public API",
    endpoints: {
      catalog: "https://openrouter.ai/api/v1/models",
      perModel: "https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints",
    },
    collected_at: new Date().toISOString().slice(0, 10),
    count: enriched.length,
    models: enriched,
  });
  console.log(`  wrote ${enriched.length} OpenRouter models with provider endpoints`);
  // Four model pages in rotation, then the global fallback. New observations
  // retain their own dates and never imply a fresh full-population scrape.
  for (const script of ["fetch-openrouter-efficiency.mjs", "fetch-chutes-efficiency.mjs"]) {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [join(__dirname, script)], { timeout: 600000, maxBuffer: 2000000 });
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }
}

async function main() {
  await mkdir(RAW, { recursive: true });
  const which = process.argv[2];
  if (!which || which === "aa") await fetchArtificialAnalysis();
  if (!which || which === "da") await fetchDesignArena();
  if (!which || which === "or") await fetchOpenRouter();
  console.log("✓ live fetch complete");
}

main().catch((e) => { console.error(e); process.exit(1); });
