#!/usr/bin/env node
// R9.1: refresh data/raw/ovhcloud.json from OVHcloud's public, server-rendered AI Endpoints catalog
// and the ECB daily EUR/USD reference rate. Two unauthenticated GETs; neither path is disallowed by
// robots.txt. Fails closed: on a layout change, an unreadable price, conflicting duplicate cards,
// an implausible FX rate or a large model loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseOvhcloudCatalog } from "../lib/ovhcloud-catalog.mjs";
import { parseEcbUsdRate } from "../lib/scaleway-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/ovhcloud.json", import.meta.url));
const pageUrl = "https://www.ovhcloud.com/en/public-cloud/ai-endpoints/catalog/";
const ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const page = await get(pageUrl);
  const ecb = await get(ecbUrl);
  const fx = parseEcbUsdRate(ecb);
  const { models, skipped, diff } = parseOvhcloudCatalog(page, previous, fx);
  await captureLiveSource(pageUrl, page);
  await captureLiveSource(ecbUrl, ecb);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    collected_at,
    method: `scripts/fetch-ovhcloud-catalog.mjs (${collected_at}): one GET of the server-rendered AI Endpoints catalog; every card with both a '/Mtoken(input)' and a '/Mtoken(output)' EUR price is a text-generating LLM/VLM (embeddings, guards, speech, TTS and image generation have other units and are listed in skipped); curated rows kept by model_id or normalized name, new cards mapping=derived; USD = EUR × ECB daily reference rate, rounded to cents. EU-hosted, zero data retention apart from billing. See ovhcloud.method.md.`,
    currency_note: `Original prices are EUR per 1 million tokens. USD = EUR * ${fx.rate}, rounded to the nearest USD cent consistently across all rows. The official ECB reference-rate date is ${fx.date}, the latest rate published at collection time on ${collected_at}.`,
    usd_normalization: { status: "applied", eur_to_usd: fx.rate, fx_rate_date: fx.date, source: ecbUrl, rounding: "nearest USD cent" },
    response_sha256: createHash("sha256").update(page).digest("hex"),
    skipped,
    diff,
    models,
  });
  console.log(`OVHcloud catalog: ${models.length} models at EUR/USD ${fx.rate} (${fx.date}) (added ${diff.added.length}, removed ${diff.removed.length}, EUR price changes ${diff.eur_price_changed.length}; skipped ${skipped.length})`);
} catch (error) {
  console.error(`OVHcloud catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
