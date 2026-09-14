#!/usr/bin/env node
// R9.1: refresh data/raw/scaleway.json from Scaleway's public pricing page (its own structured
// __NEXT_DATA__ catalog) and the ECB daily EUR/USD reference rate. Two unauthenticated GETs;
// neither path is disallowed by robots.txt. Fails closed: on a layout change, a non-EUR price,
// an implausible FX rate or a large model loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { extractNextData, parseEcbUsdRate, parseScalewayCatalog } from "../lib/scaleway-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/scaleway.json", import.meta.url));
const pageUrl = "https://www.scaleway.com/en/pricing/model-as-a-service/";
const ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const [page, ecb] = [await get(pageUrl), await get(ecbUrl)];
  const fx = parseEcbUsdRate(ecb);
  const { models, skipped, diff } = parseScalewayCatalog(extractNextData(page), previous, fx);
  await captureLiveSource(pageUrl, page);
  await captureLiveSource(ecbUrl, ecb);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Scaleway Generative APIs — scaleway.com/en/pricing/model-as-a-service (first-party, public)",
    collected_at,
    currency_note: `Source prices are EUR/1M; converted to USD using the ECB reference rate EUR/USD = ${fx.rate} published ${fx.date} (latest available on ${collected_at}).`,
    fx_eur_usd: fx.rate,
    method: "scripts/fetch-scaleway-catalog.mjs: one GET of the pricing page, reading the page's own structured catalog (__NEXT_DATA__ … catalogProducts.generativeApis.models); fr-par perMillionTokens input/output (and cached input) EUR prices from {units,nanos}; models without the chat task or without both token prices (embeddings, audio transcription) omitted; USD = EUR × ECB daily reference rate, rounded to cents; curated names kept by API slug; new slugs mapping=derived. EU-sovereign Paris region, ZDR by default. See scaleway.method.md.",
    response_sha256: createHash("sha256").update(page).digest("hex"),
    skipped,
    diff,
    models,
  });
  console.log(`Scaleway pricing: ${models.length} models at EUR/USD ${fx.rate} (${fx.date}) (added ${diff.added.length}, removed ${diff.removed.length}, EUR price changes ${diff.eur_price_changed.length}; skipped ${skipped.length})`);
} catch (error) {
  console.error(`Scaleway pricing refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
