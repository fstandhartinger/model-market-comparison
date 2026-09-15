#!/usr/bin/env node
// CR-35.5: build data/raw/epoch-hub-provenance.json from Epoch's own benchmark_metadata.csv
// (captured in the daily evidence of the last DeepSWE/ECI collection). Epoch's file naming marks
// results *not measured by Epoch* as `<name>_external.csv` ("Epoch sources them from external
// projects; external data retains its original licensing" — Epoch's benchmarks licence FAQ).
// The original project is recorded only where our own collected evidence already names it
// (registry primary_urls, CR-20260915n's source table); everything else stays `unclear` and is
// flagged in PROGRESS.md (CR-35.5) instead of being silently shown. Never invents an attribution.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { writeJSONAtomic } from "../lib/snapshot.mjs";

// 1) Locate the newest captured epoch-benchmark_metadata.csv.gz.
const dailyDir = fileURLToPath(new URL("../data/raw/benchmarks/daily-evidence/", import.meta.url));
const candidates = readdirSync(dailyDir)
  .filter((d) => existsSync(`${dailyDir}${d}/epoch-benchmark_metadata.csv.gz`))
  .sort();
if (!candidates.length) { console.error("no epoch-benchmark_metadata.csv.gz capture found"); process.exit(1); }
const day = candidates[candidates.length - 1];
const csvText = gunzipSync(readFileSync(`${dailyDir}${day}/epoch-benchmark_metadata.csv.gz`)).toString("utf8");

const header = csvText.slice(0, csvText.indexOf("\n")).split(",");
const rows = csvText.trim().split("\n").slice(1).filter(Boolean).map((line) => {
  // metadata.csv holds no quoted commas in the columns we read.
  const cells = line.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
});

// 2) Origin map: only names proven by this repo's own artifacts (never memory alone).
const ORIGINS = {
  "DeepSWE": { project: "Datacurve", url: "https://deepswe.datacurve.ai/", evidence: "registry deepswe::snapshot-2026-09-15 primary_url" },
  "FrontierCode": { project: "Cognition AI", url: "https://cognition.com/frontiercode", evidence: "registry frontiercode::1.1 primary_url" },
  "Terminal Bench": { project: "Terminal-Bench developers", url: "https://www.tbench.ai/", evidence: "registry terminal-bench::4.0 primary_url" },
  "Aider polyglot": { project: "Aider", url: "https://aider.chat/docs/leaderboards/", evidence: "registry aider-polyglot::snapshot-2026-09-10 primary_url" },
  "WeirdML": { project: "WeirdML authors", url: "https://htihle.github.io/weirdml.html", evidence: "registry weirdml::2 primary_url" },
  "METR Time Horizons": { project: "METR", url: "https://metr.org/time-horizons/", evidence: "CR-20260915n source table" },
};

// 3) The benchmarks our product actually consumes from Epoch's hub.
const CONSUMED_SOFTWARE_REFIT = new Set(["Aider polyglot", "Cybench", "DeepSWE", "ExploitBench", "FrontierCode", "METR Time Horizons", "MirrorCode", "PostTrainBench", "SWE-Bench verified", "Surface Evolver Bench", "Terminal Bench", "WeirdML"]);
const DISPLAYED_DIRECTLY = new Set(["DeepSWE"]);

const benchmarks = rows.map((r) => {
  const external = /_external/.test(r.source_file || "");
  const consumed = CONSUMED_SOFTWARE_REFIT.has(r.benchmark) || DISPLAYED_DIRECTLY.has(r.benchmark);
  return {
    benchmark: r.benchmark,
    epoch_hub_file: r.source_file || null,
    in_eci: r.in_eci === "True",
    release_date: r.release_date || null,
    rows_origin: external ? "external_project" : "epoch_run",
    original_project: ORIGINS[r.benchmark] || null,
    licence_status: external
      ? (ORIGINS[r.benchmark] ? "external_original_licensing_retained" : "unclear_flagged_in_ledger")
      : "cc-by-epoch",
    consumed_by_benchmark_heaven: consumed || undefined,
    displayed_directly: DISPLAYED_DIRECTLY.has(r.benchmark) || undefined,
  };
});

const unclear = benchmarks.filter((b) => b.consumed_by_benchmark_heaven && b.rows_origin === "external_project" && !b.original_project);
const snapshot = {
  source: "Epoch AI benchmark_metadata.csv (Epoch's hub licence note: Epoch-run data CC-BY; externally sourced rows retain their original project licensing)",
  evidence_file: `data/raw/benchmarks/daily-evidence/${day}/epoch-benchmark_metadata.csv.gz`,
  collected_at: new Date().toISOString().slice(0, 10),
  method: "scripts/build-epoch-provenance.mjs: rows_origin from Epoch's _external.csv file naming; original_project only from evidence already in this repo (registry primary_urls / CR-20260915n source table); unclear rows are flagged, never silently shown.",
  counts: {
    hub_benchmarks: benchmarks.length,
    external: benchmarks.filter((b) => b.rows_origin === "external_project").length,
    epoch_run: benchmarks.filter((b) => b.rows_origin === "epoch_run").length,
    consumed_external: benchmarks.filter((b) => b.consumed_by_benchmark_heaven && b.rows_origin === "external_project").length,
    consumed_unclear: unclear.length,
  },
  unclear_consumed: unclear.map((b) => b.benchmark),
  benchmarks,
};
await writeJSONAtomic(fileURLToPath(new URL("../data/raw/epoch-hub-provenance.json", import.meta.url)), snapshot);
console.log(`Epoch hub provenance: ${snapshot.counts.hub_benchmarks} benchmarks (${snapshot.counts.external} external / ${snapshot.counts.epoch_run} epoch-run); consumed external ${snapshot.counts.consumed_external}, unclear ${snapshot.counts.consumed_unclear} (${unclear.map((b) => b.benchmark).join(", ") || "none"})`);
