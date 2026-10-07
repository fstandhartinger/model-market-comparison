#!/usr/bin/env node
// R9.1: refresh data/raw/inceptron.json. Two GETs: Inceptron's unauthenticated OpenAI-compatible
// catalog API (which models are served) and the server-rendered list page www.inceptron.io/models
// (the direct price — CR-329.1; the API prices are the feed OpenRouter ingests). api.inceptron.io
// serves no robots.txt (404) and www.inceptron.io/robots.txt allows everything. Fails closed: on a
// shape change, an unreadable price, a duplicate id or a large model loss the previous snapshot
// stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseInceptronCatalog, parseInceptronModelsPage, INCEPTRON_LIST_URL } from "../lib/inceptron-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/inceptron.json", import.meta.url));
const url = "https://api.inceptron.io/v1/models";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const get = async (u) => {
    const response = await fetch(u, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Inceptron HTTP ${response.status} for ${u}`);
    return response.text();
  };
  const text = await get(url);
  const html = await get(INCEPTRON_LIST_URL);
  const collected_at = new Date().toISOString().slice(0, 10);
  const listPrices = parseInceptronModelsPage(html);
  const { models, skipped, diff } = parseInceptronCatalog(JSON.parse(text), previous, { listPrices, collectedAt: collected_at });
  await captureLiveSource(url, text);
  await captureLiveSource(INCEPTRON_LIST_URL, html);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Inceptron",
    collected_at,
    listing_url: INCEPTRON_LIST_URL,
    method: `scripts/fetch-inceptron-catalog.mjs (${collected_at}): the served model list comes from Inceptron's unauthenticated OpenAI-compatible catalog ${url} (text output, chat feature, both token prices); the DIRECT price of each model comes from Inceptron's published list ${INCEPTRON_LIST_URL} (server-rendered; input / output / cache read in USD per 1M tokens; the pricing page www.inceptron.io/pricing says "Serverless inference: see models page"). CR-329.1 (7 Oct 2026): the API catalog prices carry an openrouter.slug and equal the OpenRouter Inceptron route, so they are the OpenRouter feed, not the direct price; they are kept per model as api_catalog_price for reference only. A served model missing from the list page gets price_status "n/a" and no direct price. Curated rows kept by api_model_id, the id in their notes, or name; new ids mapping=derived; ids no longer listed are dropped. HQ Sweden (SE), datacenter Finland (FI) per OpenRouter provider metadata. See inceptron.method.md.`,
    response_sha256: createHash("sha256").update(text).digest("hex"),
    listing_sha256: createHash("sha256").update(html).digest("hex"),
    skipped,
    diff,
    models,
  });
  console.log(`Inceptron catalog: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, price changes ${diff.price_changed.length}; skipped ${skipped.length})`);
  for (const change of diff.price_changed) console.log(`  ${change}`);
} catch (error) {
  console.error(`Inceptron catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
