#!/usr/bin/env node
// Refresh Epoch AI's public ECI exports. The last good snapshot is left in place
// when a download, parse, or validation fails; publication never uses a partial file.
import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ECI_URLS, parseCsv, parseBenchmarkCatalog, buildEciSnapshot } from "../lib/epoch-eci.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "data/raw/epoch-eci.json");
const retrievedAt = new Date().toISOString();

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "BenchmarkHeaven/1.0 (public research data refresh)" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const required = (rows, name, fields) => {
  if (!rows.length || fields.some((field) => !Object.hasOwn(rows[0], field))) throw new Error(`Epoch ${name} export missing required columns`);
};

async function main() {
  const [generalText, performanceText, difficultyText, catalogText] = await Promise.all(Object.values(ECI_URLS).map(fetchText));
  const generalRows = parseCsv(generalText), performanceRows = parseCsv(performanceText), difficultyRows = parseCsv(difficultyText);
  required(generalRows, "general", ["Model", "eci", "eci_ci_low", "eci_ci_high"]);
  required(performanceRows, "performance", ["model", "benchmark", "performance"]);
  required(difficultyRows, "difficulty", ["benchmark_name", "edi", "estimated_slope_scaled"]);
  const snapshot = buildEciSnapshot({
    generalRows, performanceRows, difficultyRows, benchmarkCatalog: parseBenchmarkCatalog(catalogText),
    collectedAt: retrievedAt,
    hashes: { general: sha256(generalText), performance: sha256(performanceText), difficulties: sha256(difficultyText), benchmark_catalog: sha256(catalogText) },
  });
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`);
  await rename(temporary, output);
  console.log(`Epoch ECI: ${snapshot.counts.general_models} general, ${snapshot.counts.software_models} software models → ${output}`);
}

main().catch((error) => { console.error(`Epoch ECI refresh failed: ${error.message}`); process.exitCode = 1; });
