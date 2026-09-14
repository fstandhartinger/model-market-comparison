#!/usr/bin/env node
// R9.1: refresh data/raw/chutes.json from the public first-party Chutes model catalog.
// One unauthenticated GET (no robots.txt on llm.chutes.ai; the catalog is public). Fails closed:
// on any shape problem or a large id loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseChutesCatalog } from "../lib/chutes-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/chutes.json", import.meta.url));
const url = "https://llm.chutes.ai/v1/models";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Chutes HTTP ${response.status}`);
  const text = await response.text();
  const { models, diff } = parseChutesCatalog(JSON.parse(text), previous);
  await captureLiveSource(url, text);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Chutes — llm.chutes.ai/v1/models (first-party, public catalog)",
    collected_at,
    method: "scripts/fetch-chutes-catalog.mjs: one GET of the public catalog; prices are price.{input,output,input_cache_read}.usd per 1M tokens; curated model_name/provider_org carried over by exact tee_model_id; new ids marked mapping=derived. See chutes.method.md.",
    response_sha256: createHash("sha256").update(text).digest("hex"),
    diff,
    models,
  });
  console.log(`Chutes catalog: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, price changes ${diff.price_changed.length})`);
} catch (error) {
  console.error(`Chutes catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
