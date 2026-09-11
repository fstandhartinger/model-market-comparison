#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseChutesUsage, completedWeek } from "../lib/chutes-efficiency.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from '../lib/live-source.mjs';

const target = new URL("../data/raw/chutes-efficiency.json", import.meta.url);
const collected_at = new Date().toISOString();
const window = completedWeek(new Date(collected_at));
const url = `https://api.chutes.ai/invocations/stats/llm?${new URLSearchParams(window)}`;
try {
  const response = await fetch(url, { headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Chutes HTTP ${response.status}`);
  const text = await response.text();
  const parsed = parseChutesUsage(JSON.parse(text), window);
  await captureLiveSource(url, text);
  const provenance = { source: "Chutes LLM usage statistics", url, collected_at, basis: "self_reported" };
  await mkdir(new URL("../data/raw/", import.meta.url), { recursive: true });
  await writeJSONAtomic(fileURLToPath(target), {
    collected_at, window, ...parsed, provenance,
    ratio_provenance: { ...provenance, basis: "derived", formula: "sum(total_input_tokens) / sum(total_output_tokens)", scope: "Global Chutes token-positive chute/day usage, not a coding-agent-only cohort." },
    response_sha256: createHash("sha256").update(text).digest("hex"),
    attempts: [{ source: provenance.source, url, collected_at, status: "available", http_status: response.status }],
  });
  console.log(`Chutes: ${parsed.coverage.included_rows}/${parsed.coverage.returned_rows} chute/day rows, ${parsed.coverage.days} days, I/O ${parsed.input_output_ratio.toFixed(4)}:1`);
} catch (error) {
  console.error(`Chutes efficiency refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
