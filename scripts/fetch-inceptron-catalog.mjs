#!/usr/bin/env node
// R9.1: refresh data/raw/inceptron.json from Inceptron's unauthenticated OpenAI-compatible catalog
// API, the live billing meter. One GET; api.inceptron.io serves no robots.txt (404) and
// www.inceptron.io/robots.txt allows everything. Fails closed: on a shape change, an unreadable
// price, a duplicate id or a large model loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseInceptronCatalog } from "../lib/inceptron-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/inceptron.json", import.meta.url));
const url = "https://api.inceptron.io/v1/models";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Inceptron HTTP ${response.status}`);
  const text = await response.text();
  const { models, skipped, diff } = parseInceptronCatalog(JSON.parse(text), previous);
  await captureLiveSource(url, text);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Inceptron",
    collected_at,
    method: `scripts/fetch-inceptron-catalog.mjs (${collected_at}): one GET of Inceptron's unauthenticated OpenAI-compatible catalog ${url}, the live billing meter; pricing.prompt / pricing.completion / input_cache_reads are USD per token, stored per 1M tokens with four decimals. Models with text output, the chat feature and both token prices are included; curated rows kept by api_model_id, the id in their notes, or name; new ids mapping=derived; ids no longer listed are dropped. The marketing page www.inceptron.io/models is a client-rendered list that has shown different list prices; the API is canonical. HQ Sweden (SE), datacenter Finland (FI) per OpenRouter provider metadata. See inceptron.method.md.`,
    response_sha256: createHash("sha256").update(text).digest("hex"),
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
