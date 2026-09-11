#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CODING_AGENT_URL, parseCodingAgents } from "../lib/aa-coding-agents.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from '../lib/live-source.mjs';

export async function refreshCodingAgents({ html, target, fetcher = fetch }) {
  let previous = null;
  try { previous = JSON.parse(await readFile(target, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (html === undefined) {
    const response = await fetcher(CODING_AGENT_URL, {
      headers: { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`AA Coding Agent HTTP ${response.status}`);
    html = await response.text();
    await captureLiveSource(CODING_AGENT_URL, html);
  }
  const snapshot = parseCodingAgents(html, previous);
  await writeJSONAtomic(target, snapshot);
  return snapshot;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(new URL("../data/raw/aa-coding-agents-v1.5.json", import.meta.url));
  refreshCodingAgents({ target }).then((snapshot) => {
    console.log(`AA Coding Agent v${snapshot.version}: ${snapshot.count} complete rows; wrote ${target}`);
  }).catch((error) => { console.error(`AA CODING AGENT REFRESH FAILED: ${error.message}`); process.exitCode = 1; });
}
