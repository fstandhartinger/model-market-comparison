#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CODING_AGENT_APPROVAL_KEY, CODING_AGENT_FILE, CODING_AGENT_URL, parseCodingAgents } from "../lib/aa-coding-agents.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from '../lib/live-source.mjs';

const APPROVALS = fileURLToPath(new URL("../data/raw/source-change-approvals.json", import.meta.url));

export async function refreshCodingAgents({ html, target, fetcher = fetch, approvalsFile = APPROVALS, now = Date.now() }) {
  let previous = null, approval = null;
  try { previous = JSON.parse(await readFile(target, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  try { approval = JSON.parse(await readFile(approvalsFile, "utf8"))[CODING_AGENT_APPROVAL_KEY] ?? null; }
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
  const snapshot = parseCodingAgents(html, previous, { approval, now });
  await writeJSONAtomic(target, snapshot);
  return snapshot;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(new URL(`../data/raw/${CODING_AGENT_FILE}`, import.meta.url));
  refreshCodingAgents({ target }).then((snapshot) => {
    const removed = snapshot.reviewed_removal ? `; reviewed removal of ${snapshot.reviewed_removal.removed.join(", ")}` : "";
    console.log(`AA Coding Agent v${snapshot.version}: ${snapshot.count} complete rows${removed}; wrote ${target}`);
  }).catch((error) => { console.error(`AA CODING AGENT REFRESH FAILED: ${error.message}`); process.exitCode = 1; });
}
