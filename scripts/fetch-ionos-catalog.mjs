#!/usr/bin/env node
// R9.1: refresh data/raw/ionos.json from IONOS' public, server-rendered cloud price pages: the
// official localized USD table (cloud.ionos.com/prices) and the original EUR table
// (cloud.ionos.de/preise). Two unauthenticated GETs; robots.txt of both hosts allows these paths.
// Fails closed: on a layout change, an unreadable price, conflicting duplicates or a large model
// loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseIonosCatalog } from "../lib/ionos-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/ionos.json", import.meta.url));
const usdUrl = "https://cloud.ionos.com/prices";
const eurUrl = "https://cloud.ionos.de/preise";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const usd = await get(usdUrl);
  const eur = await get(eurUrl);
  const { models, eur_missing, diff } = parseIonosCatalog(usd, eur, previous);
  await captureLiveSource(usdUrl, usd);
  await captureLiveSource(eurUrl, eur);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "IONOS AI Model Hub",
    collected_at,
    method: `scripts/fetch-ionos-catalog.mjs (${collected_at}): one GET each of the server-rendered IONOS Cloud price pages ${usdUrl} (official localized USD, used for the price fields) and ${eurUrl} (original EUR, recorded as "€in/€out" at the start of each row's notes); every AI Model Hub table with an input- and an output-token price is included (Large language models, Vision-Language Models, Code Models); embedding, reranker and image tables are out of scope. Curated rows kept by catalog_name, normalized name or the page name in the notes; new rows mapping=derived; rows no longer listed are dropped. OpenAI-compatible pay-per-use, EU-sovereign (DE). See ionos.method.md.`,
    response_sha256: { usd: createHash("sha256").update(usd).digest("hex"), eur: createHash("sha256").update(eur).digest("hex") },
    eur_missing,
    diff,
    models,
  });
  console.log(`IONOS prices: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, USD price changes ${diff.usd_price_changed.length}; EUR missing ${eur_missing.length})`);
} catch (error) {
  console.error(`IONOS prices refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
