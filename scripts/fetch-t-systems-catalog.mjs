#!/usr/bin/env node
// R9.1: refresh data/raw/t-systems-llm-hub.json from the official LLM Hub model tables
// (docs.llmhub.t-systems.net/models/llms/ and /models/coding/) and the ECB daily EUR/USD rate.
// Three unauthenticated GETs; robots.txt on the docs host is "Allow: /". Fails closed: on a layout
// change, an unreadable price, conflicting duplicate rows, an unknown hosting cloud for a new model
// or a large model loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseTSystemsCatalog } from "../lib/t-systems-catalog.mjs";
import { parseEcbUsdRate } from "../lib/scaleway-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/t-systems-llm-hub.json", import.meta.url));
const urls = { llms: "https://docs.llmhub.t-systems.net/models/llms/", coding: "https://docs.llmhub.t-systems.net/models/coding/" };
const ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const pages = { llms: await get(urls.llms), coding: await get(urls.coding) };
  const ecb = await get(ecbUrl);
  const fx = parseEcbUsdRate(ecb);
  const collected_at = new Date().toISOString().slice(0, 10);
  const { models, diff } = parseTSystemsCatalog(pages, previous, fx, { day: collected_at });
  for (const [label, body] of Object.entries(pages)) await captureLiveSource(urls[label], body);
  await captureLiveSource(ecbUrl, ecb);
  await writeJSONAtomic(target, {
    ...previous,
    collected_at,
    method: `scripts/fetch-t-systems-catalog.mjs (${collected_at}): official /models/llms/ and /models/coding/ tables, columns located by header; native EUR In/Out/Cached €/M ('—'/'n/a' = no price; plan 'Test' = preview); both tables merged by model name and must agree; audited hosting fields kept for known models, new models derive them from the Cloud column; USD = EUR × ECB daily reference rate, rounded to cents; rows no longer listed are dropped. See t-systems-llm-hub.method.md.`,
    currency_note: `EUR converted at ECB ${fx.date}: 1 EUR = ${fx.rate} USD; rounded to nearest cent.`,
    usd_normalization: { status: "applied", eur_to_usd: fx.rate, fx_rate_date: fx.date, source: ecbUrl, rounding: "nearest USD cent" },
    response_sha256: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, createHash("sha256").update(v).digest("hex")])),
    diff,
    models,
  });
  console.log(`T-Systems LLM Hub: ${models.length} models at EUR/USD ${fx.rate} (${fx.date}) (added ${diff.added.length}, removed ${diff.removed.length}, EUR price changes ${diff.eur_price_changed.length})`);
} catch (error) {
  console.error(`T-Systems LLM Hub refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
