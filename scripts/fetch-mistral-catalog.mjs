#!/usr/bin/env node
// R9.1: refresh data/raw/mistral.json from Mistral's public, server-rendered API pricing page.
// One unauthenticated GET; mistral.ai/robots.txt allows all paths. Fails closed: on a layout
// change, an unpriced label or a large model loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseMistralPricing } from "../lib/mistral-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/mistral.json", import.meta.url));
const url = "https://mistral.ai/pricing/api";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Mistral HTTP ${response.status}`);
  const text = await response.text();
  const { models, diff } = parseMistralPricing(text, previous);
  await captureLiveSource(url, text);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Mistral AI (La Plateforme) — mistral.ai/pricing/api (first-party, public)",
    collected_at,
    method: "scripts/fetch-mistral-catalog.mjs: one GET of the server-rendered pricing page; every <mistral-block-card-model> with both an 'Input (/M tokens)' and an 'Output (/M tokens)' USD price and an API id is a chat/text model (OCR per 1000 pages, embeddings, classifiers, TTS/transcription and unpriced Labs endpoints drop out); 'Cached input' becomes cache_read_per_1m_usd; duplicate cards must agree; curated names kept by API id or normalized name; new ids mapping=derived. Region eu (Mistral hosts in the EU unless the US endpoint is chosen). See mistral.method.md.",
    response_sha256: createHash("sha256").update(text).digest("hex"),
    diff,
    models,
  });
  console.log(`Mistral pricing: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, price changes ${diff.price_changed.length})`);
} catch (error) {
  console.error(`Mistral pricing refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
