#!/usr/bin/env node
// R9.1: refresh data/raw/google-vertex.json from Google's public Vertex AI pricing page. One unauthenticated GET
// (the page redirects to the Gemini Enterprise Agent Platform pricing page; robots.txt allows both paths). The
// Gemini, partner-model and per-region Claude tables are all in the server-rendered HTML, so no browser is needed.
// Re-reads each row's `price_ref`; never adds rows. Fails closed on a layout change or a large loss of readable
// rows; the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseVertexCatalog } from "../lib/google-vertex-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/google-vertex.json", import.meta.url));
const url = "https://cloud.google.com/vertex-ai/generative-ai/pricing";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };

try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const response = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const html = await response.text();
  const collected_at = new Date().toISOString().slice(0, 10);
  const { models, confirmed, diff } = parseVertexCatalog(html, previous, { today: collected_at });
  await captureLiveSource(response.url || url, html);
  await writeJSONAtomic(target, {
    ...previous,
    collected_at,
    price_collection: `scripts/fetch-google-vertex-catalog.mjs (${collected_at}): one GET of ${response.url || url} (server-rendered); each row's price_ref (section heading, Claude region pane, model label, Gemini 3 Region column) re-read from the standard on-demand table (Priority and Flex/Batch tables ignored). ${confirmed}/${models.length} rows confirmed today; rows not listed or unreadable on the page keep their prices and price_checked_at. Rows are never added by the script.`,
    response_sha256: createHash("sha256").update(html).digest("hex"),
    diff,
    models,
  });
  console.log(`Google Vertex: ${confirmed}/${models.length} rows confirmed (price changes ${diff.price_changed.length}, unlisted ${diff.unlisted.length}, unreadable ${diff.unreadable.length}, suspicious ${diff.suspicious.length}, unreferenced page models ${diff.unreferenced.length})`);
  for (const line of [...diff.price_changed, ...diff.unlisted, ...diff.unreadable, ...diff.suspicious]) console.log(`  ${line}`);
} catch (error) {
  console.error(`Google Vertex catalog refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
