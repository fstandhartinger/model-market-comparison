#!/usr/bin/env node
// R9.1: refresh data/raw/nebius.json from the public Nebius Token Factory model catalog.
// One unauthenticated GET; robots.txt on tokenfactory.nebius.com explicitly allows
// /api/public/models_info. Fails closed: on any shape problem or a large id loss the previous
// snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseNebiusCatalog } from "../lib/nebius-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/nebius.json", import.meta.url));
const url = "https://tokenfactory.nebius.com/api/public/models_info";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Nebius HTTP ${response.status}`);
  const text = await response.text();
  const { models, skipped, diff } = parseNebiusCatalog(JSON.parse(text), previous);
  await captureLiveSource(url, text);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Nebius Token Factory — tokenfactory.nebius.com/api/public/models_info (first-party, public catalog)",
    collected_at,
    method: "scripts/fetch-nebius-catalog.mjs: one GET of the public catalog (allowed by robots.txt); prices are flavors[].input/output_price_per_million_tokens in native USD; region from flavors[].regions[].country_code (EU member state → eu, US → us, UK → uk); non-chat types and zero-output-price rows (embeddings) omitted; curated model_name/provider_org carried over by exact model_id; new ids marked mapping=derived; catalog status kept per row. See nebius.method.md.",
    response_sha256: createHash("sha256").update(text).digest("hex"),
    skipped,
    diff,
    models,
  });
  console.log(`Nebius catalog: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, price changes ${diff.price_changed.length}, region changes ${diff.region_changed.length}; skipped ${skipped.length})`);
} catch (error) {
  console.error(`Nebius catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
