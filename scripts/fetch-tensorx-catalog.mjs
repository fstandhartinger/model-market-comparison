#!/usr/bin/env node
// R9.1: refresh data/raw/tensorx.json from TensorX's public, server-rendered pricing table.
// One unauthenticated GET; tensorx.ai/robots.txt allows all paths except /wp-admin/. Fails
// closed: on a layout change, an unreadable price or a large model loss the previous snapshot
// stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseTensorxPricing } from "../lib/tensorx-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/tensorx.json", import.meta.url));
const url = "https://tensorx.ai/pricing/";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`TensorX HTTP ${response.status}`);
  const text = await response.text();
  const { models, skipped, diff } = parseTensorxPricing(text, previous);
  await captureLiveSource(url, text);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "TensorX — tensorx.ai/pricing (first-party, public)",
    collected_at,
    method: "scripts/fetch-tensorx-catalog.mjs: one GET of the server-rendered pricing table; columns located by header (Model Name, Context, Input Price, Cache Read, Output Price), native USD per 1M tokens; rows without both token prices (embeddings) omitted; curated names kept by api_model_id or normalized slug tail; new slugs mapping=derived; rows no longer listed are dropped. EU-sovereign (Dublin HQ, EU regions, zero data retention). See tensorx.method.md.",
    response_sha256: createHash("sha256").update(text).digest("hex"),
    skipped,
    diff,
    models,
  });
  console.log(`TensorX pricing: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, price changes ${diff.price_changed.length}; skipped ${skipped.length})`);
} catch (error) {
  console.error(`TensorX pricing refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
