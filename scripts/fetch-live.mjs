#!/usr/bin/env node
// Fetch live data from OpenRouter, ArtificialAnalysis, and DesignArena.
// Writes raw JSON snapshots into data/raw/. These snapshots are committed so the
// app has a deterministic seed even when the upstream APIs are unreachable.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, "..", "data", "raw");

const AA_KEY = process.env.ARTIFICIAL_ANALYSIS_API_KEY || "";
const UA = "model-market-comparison/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, opts = {}, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
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
  const models = data.data || [];
  console.log(`  ${models.length} models`);
  await writeFile(join(RAW, "artificialanalysis.json"), JSON.stringify({
    source: "ArtificialAnalysis API v2",
    endpoint: "https://artificialanalysis.ai/api/v2/data/llms/models",
    collected_at: new Date().toISOString().slice(0, 10),
    count: models.length,
    models,
  }, null, 2));
}

async function fetchDesignArena() {
  console.log("→ DesignArena leaderboards …");
  const queries = [
    { key: "frontend", body: { arenaType: "agents", category: "agon_webapps", variationName: "public", inputModality: "text" } },
    { key: "fullstack", body: { arenaType: "agents", category: "fullstack", variationName: "public" } },
  ];
  const out = {};
  for (const q of queries) {
    const data = await getJSON("https://www.designarena.ai/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q.body),
    });
    out[q.key] = { request: q.body, data: data.data || [] };
    console.log(`  ${q.key}: ${out[q.key].data.length} models`);
  }
  await writeFile(join(RAW, "designarena.json"), JSON.stringify({
    source: "DesignArena leaderboard API",
    endpoint: "POST https://www.designarena.ai/api/leaderboard",
    collected_at: new Date().toISOString().slice(0, 10),
    leaderboards: out,
  }, null, 2));
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
      name: m.name,
      created: m.created,
      context_length: m.context_length,
      pricing: m.pricing, // blended default endpoint price
      endpoints: endpoints.map((e) => ({
        provider_name: e.provider_name,
        tag: e.tag,
        context_length: e.context_length,
        pricing: e.pricing,
        status: e.status,
        uptime_last_30m: e.uptime_last_30m,
      })),
    };
  });

  await writeFile(join(RAW, "openrouter.json"), JSON.stringify({
    source: "OpenRouter public API",
    endpoints: {
      catalog: "https://openrouter.ai/api/v1/models",
      perModel: "https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints",
    },
    collected_at: new Date().toISOString().slice(0, 10),
    count: enriched.length,
    models: enriched,
  }, null, 2));
  console.log(`  wrote ${enriched.length} OpenRouter models with provider endpoints`);
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
