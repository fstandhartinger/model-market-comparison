#!/usr/bin/env node
// R9.1: refresh data/raw/mistral.json from Mistral's public, server-rendered API pricing page.
// Unauthenticated GETs; mistral.ai/robots.txt allows all paths and docs.mistral.ai publishes none.
// Fails closed: on a layout change, an unpriced label, an unidentifiable new model or a large model
// loss the previous snapshot stays untouched.
//
// 20 Sep 2026: the pricing page no longer carries each card's copyable API id, so a model the
// curated snapshot does not already name has its id read from the Mistral docs model page the card
// itself links to (one polite GET per such card — normally none). See lib/mistral-catalog.mjs.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseMistralPricing, parseMistralDocsModel, cardsNeedingDocs, nameKey } from "../lib/mistral-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const UA = "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";
const POLITE_DELAY_MS = 2500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const target = fileURLToPath(new URL("../data/raw/mistral.json", import.meta.url));
// 7 Oct 2026: mistral.ai/pricing/api answers 301 to this docs page; fetch it directly.
const url = "https://docs.mistral.ai/inference/pricing";
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Mistral HTTP ${response.status}`);
  const text = await response.text();
  const docs = new Map();
  const docs_sources = [];
  for (const { card, reason } of cardsNeedingDocs(text, previous)) {
    // No docs link and no curated id: parseMistralPricing names that as the failure. No docs link but
    // a curated id: the row keeps the id and loses the cached price, which diff.cache_read_dropped names.
    if (!card.docs_url) continue;
    await sleep(POLITE_DELAY_MS);
    const page = await fetch(card.docs_url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
    if (!page.ok) throw new Error(`Mistral docs HTTP ${page.status} for ${card.name} (${card.docs_url})`);
    const body = await page.text();
    docs.set(nameKey(card.name), parseMistralDocsModel(body));
    await captureLiveSource(card.docs_url, body);
    docs_sources.push({ model_name: card.name, reason, url: card.docs_url, response_sha256: createHash("sha256").update(body).digest("hex") });
  }
  const { models, diff } = parseMistralPricing(text, previous, { docs });
  await captureLiveSource(url, text);
  const collected_at = new Date().toISOString().slice(0, 10);
  await writeJSONAtomic(target, {
    ...previous,
    source: "Mistral AI (La Plateforme) — docs.mistral.ai/inference/pricing (first-party, public; mistral.ai/pricing/api redirects here)",
    collected_at,
    method: "scripts/fetch-mistral-catalog.mjs: one GET of the server-rendered pricing page (Standard mode, global prices, the page's default); every row of its 'Model | Input | Cached input | Output' tables under the 'Prices /M Tokens' heading whose input and output are both bare USD amounts is a chat/text model (OCR per 1000 pages, transcription per minute, TTS per M characters, embeddings without output and free moderation drop out); a struck-through list price beside a sale price publishes the sale price and names the list price in notes; duplicate rows must agree; identity is the row's normalized model name (or the name the page last used, source_name) against the curated snapshot — a model the snapshot does not name has its id read from the docs model page the row links ('Click to copy: <id>'), recorded in docs_sources, mapping=derived, and that page must state the same input/output prices or the refresh fails closed. Region eu (Mistral hosts in the EU unless the US endpoint is chosen). See mistral.method.md.",

    response_sha256: createHash("sha256").update(text).digest("hex"),
    docs_sources,
    diff,
    models,
  });
  console.log(`Mistral pricing: ${models.length} models (added ${diff.added.length}, removed ${diff.removed.length}, price changes ${diff.price_changed.length}, docs pages read ${docs_sources.length})`);
} catch (error) {
  console.error(`Mistral pricing refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
