#!/usr/bin/env node
// R9.1: refresh data/raw/stackit.json from STACKIT's first-party "Available Shared Models" docs page
// (model list, billing category, status), the STACKIT AI Model Serving product page (EU01 SKU token
// prices per category, EUR) and the ECB daily EUR/USD reference rate. Three unauthenticated GETs;
// robots.txt of docs.stackit.cloud and stackit.com allows these paths. Fails closed: on a layout
// change, an unknown billing category, a missing tier price, an implausible FX rate or a large model
// loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseStackitCatalog } from "../lib/stackit-catalog.mjs";
import { parseEcbUsdRate } from "../lib/scaleway-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/stackit.json", import.meta.url));
const docsUrl = "https://docs.stackit.cloud/products/data-and-ai/ai-model-serving/basics/available-shared-models/";
const productUrl = "https://stackit.com/en/products/data-ai/stackit-ai-model-serving";
const ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const docs = await get(docsUrl);
  const product = await get(productUrl);
  const ecb = await get(ecbUrl);
  const fx = parseEcbUsdRate(ecb);
  const { models, tiers, docs_updated, diff } = parseStackitCatalog(docs, product, previous, fx);
  await captureLiveSource(docsUrl, docs);
  await captureLiveSource(productUrl, product);
  await captureLiveSource(ecbUrl, ecb);
  const collected_at = new Date().toISOString().slice(0, 10);
  const tierText = Object.entries(tiers).map(([k, v]) => `${k} ${v.input}/${v.output} EUR`).join(", ");
  await writeJSONAtomic(target, {
    ...previous,
    source: "STACKIT AI Model Serving",
    collected_at,
    listing_url: docsUrl,
    pricing_url: productUrl,
    method: `scripts/fetch-stackit-catalog.mjs (${collected_at}): model list from the first-party Available Shared Models documentation (page last updated ${docs_updated ?? "unknown"}; Type Chat rows under Text Models, embedding models excluded), each model's billing category and status from its Facts table. Token prices from the EU01 (Germany South) SKU table on the STACKIT AI Model Serving product page: ${tierText} per 1M input/output tokens, mapped via each model's billing category. USD = EUR x ${fx.rate} (ECB euro reference rate of ${fx.date}, latest available on ${collected_at}), four decimal places. See stackit.method.md.`,
    fx_eur_usd: fx.rate,
    usd_normalization: { status: "applied", eur_to_usd: fx.rate, fx_rate_date: fx.date, source: ecbUrl, rounding: "4 decimal places" },
    docs_last_updated: docs_updated,
    response_sha256: { docs: createHash("sha256").update(docs).digest("hex"), product: createHash("sha256").update(product).digest("hex") },
    diff,
    models,
  });
  console.log(`STACKIT catalog: ${models.length} chat models at EUR/USD ${fx.rate} (${fx.date}); docs updated ${docs_updated} (added ${diff.added.length}, removed ${diff.removed.length}, category/status changes ${diff.category_or_status_changed.length}, EUR price changes ${diff.eur_price_changed.length})`);
} catch (error) {
  console.error(`STACKIT catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
