#!/usr/bin/env node
// R9.1: refresh data/raw/azure-foundry.json from the Azure Retail Prices API (public, unauthenticated,
// native USD; prices.azure.com serves no robots.txt). One filtered query per EU billing region, following
// NextPageLink with a one-second pause between pages. Re-reads the exact meters each curated row names in
// `retail_meters`; never adds rows (lifecycle and region availability stay a documented human check).
// Fails closed: on an empty response, an unreadable price or a large loss of mapped meters the previous
// snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseAzureRetail } from "../lib/azure-foundry-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/azure-foundry.json", import.meta.url));
const REGIONS = ["swedencentral", "westeurope", "francecentral", "germanywestcentral", "polandcentral", "spaincentral"];
const filter = (region) => `armRegionName eq '${region}' and (contains(productName,'OpenAI') or contains(productName,'Models') or productName eq 'Azure Kimi')`;
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const items = [], hash = createHash("sha256");
  let pages = 0;
  for (const region of REGIONS) {
    let url = `https://prices.azure.com/api/retail/prices?currencyCode=USD&$filter=${encodeURIComponent(filter(region))}`;
    for (let page = 0; url; page++) {
      if (page >= 40) throw new Error(`Azure Retail: more than 40 pages for ${region}`);
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(90000) });
      if (!response.ok) throw new Error(`Azure Retail HTTP ${response.status} (${region}, page ${page})`);
      const text = await response.text();
      const body = JSON.parse(text);
      if (!Array.isArray(body.Items)) throw new Error("Azure Retail: response without Items");
      await captureLiveSource(url, text);
      hash.update(text);
      items.push(...body.Items);
      pages++;
      url = body.NextPageLink || null;
      await pause(1000);
    }
  }
  const collected_at = new Date().toISOString().slice(0, 10);
  const { models, diff } = parseAzureRetail(items, previous, { today: collected_at });
  await writeJSONAtomic(target, {
    ...previous,
    collected_at,
    meters_checked_at: collected_at,
    retail_collection: `scripts/fetch-azure-foundry-catalog.mjs (${collected_at}): ${pages} pages, ${items.length} Retail items across ${REGIONS.join(", ")}; each row's named Standard input/output and explicitly mapped cache-read meters re-read (1K meters x 1000), first billing region by that order. Rows are never added by the script; lifecycle and Europe Data Zone availability keep lifecycle_checked_at.`,
    response_sha256: hash.digest("hex"),
    diff,
    models,
  });
  console.log(`Azure Foundry: ${models.length} rows (removed ${diff.removed.length}, price changes ${diff.price_changed.length}, suspicious ${diff.suspicious.length}, unmetered ${diff.unmetered.length}, cache-read meters missing ${diff.cache_read_missing.length}, uncovered meters effective in the last 90 days: ${diff.new_meters.length})`);
  for (const line of [...diff.price_changed, ...diff.removed, ...diff.suspicious, ...diff.cache_read_missing, ...diff.new_meters]) console.log(`  ${line}`);
} catch (error) {
  console.error(`Azure Foundry catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
