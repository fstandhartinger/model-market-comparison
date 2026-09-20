#!/usr/bin/env node
// Refresh Epoch AI's public ECI exports. The last good snapshot is left in place
// when a download, parse, or validation fails; publication never uses a partial file.
import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ECI_URLS, parseCsv, parseBenchmarkCatalog, buildEciSnapshot, discoverBenchmarkCatalog, fetchTextWithRetry } from "../lib/epoch-eci.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "data/raw/epoch-eci.json");
const retrievedAt = new Date().toISOString();

async function fetchOnce(url) {
  let response;
  try {
    response = await fetch(url, {
      headers: { "user-agent": "BenchmarkHeaven/1.0 (public research data refresh)" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const detail = [error.cause?.code, error.cause?.message].filter(Boolean).join(": ");
    throw Object.assign(new Error(`${url}: ${error.message}${detail ? ` (${detail})` : ""}`), { cause: error });
  }
  if (!response.ok) throw Object.assign(new Error(`${url}: HTTP ${response.status}`), { status: response.status });
  return response.text();
}

// A dropped connection is not a reason to lose the day's publication; see fetchTextWithRetry.
const fetchText = (url) => fetchTextWithRetry(fetchOnce, url, {
  onRetry: ({ attempt, error }) => console.warn(`Epoch ${url}: attempt ${attempt} failed (${error.message}); retrying`),
});

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const required = (rows, name, fields) => {
  if (!rows.length || fields.some((field) => !Object.hasOwn(rows[0], field))) throw new Error(`Epoch ${name} export missing required columns`);
};

async function main() {
  const urls = { ...ECI_URLS };
  const [generalText, performanceText, difficultyText] = await Promise.all([urls.general, urls.performance, urls.difficulties].map(fetchText));
  let catalogText;
  try { catalogText = await fetchText(urls.benchmark_catalog); }
  catch (error) {
    if (error.status !== 404) throw error;
    // The pinned chunk name is a build hash; find the current one instead of failing the refresh.
    const found = await discoverBenchmarkCatalog(fetchText);
    console.log(`Epoch benchmark catalog moved: ${urls.benchmark_catalog} → ${found.url} (${found.requests} requests)`);
    urls.benchmark_catalog = found.url;
    catalogText = found.text;
  }
  const generalRows = parseCsv(generalText), performanceRows = parseCsv(performanceText), difficultyRows = parseCsv(difficultyText);
  required(generalRows, "general", ["Model", "eci", "eci_ci_low", "eci_ci_high"]);
  required(performanceRows, "performance", ["model", "benchmark", "performance"]);
  required(difficultyRows, "difficulty", ["benchmark_name", "edi", "estimated_slope_scaled"]);
  const snapshot = buildEciSnapshot({
    generalRows, performanceRows, difficultyRows, benchmarkCatalog: parseBenchmarkCatalog(catalogText),
    collectedAt: retrievedAt, urls,
    hashes: { general: sha256(generalText), performance: sha256(performanceText), difficulties: sha256(difficultyText), benchmark_catalog: sha256(catalogText) },
  });
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, output);
  console.log(`Epoch ECI: ${snapshot.counts.general_models} general, ${snapshot.counts.software_models} software models → ${output}`);
}

main().catch((error) => { console.error(`Epoch ECI refresh failed: ${error.message}`); process.exitCode = 1; });
