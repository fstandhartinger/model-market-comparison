#!/usr/bin/env node
// Collect Artificial Analysis Intelligence Index token-efficiency data.
// Three checked model pages carry the same broad Flight population. The
// homepage publishes only its chart-selected subset. One model page therefore
// improves coverage cheaply; unobserved measurements remain unknown.
import { mkdir, readFile, appendFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AA_EFFICIENCY_MODEL_SLUGS, aaModelPageURL, parseAaEfficiency } from "../lib/aa-efficiency.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";

const UA = "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";
const POLITE_DELAY_MS = 2500;
const HASH_TAG = /[/.:?=&]/g;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function refreshAaEfficiency({ html = undefined, fetchedAt = undefined, slugs = AA_EFFICIENCY_MODEL_SLUGS, target, evidenceDir = null, fetcher = fetch, checkRobots = true }) {
  let previous = null;
  try { previous = JSON.parse(await readFile(target, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const attempts = [];
  let response = null;
  let usedUrl = null;
  if (html === undefined) {
    if (checkRobots) {
      const robots = await fetcher("https://artificialanalysis.ai/robots.txt", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (!robots.ok) throw new Error(`AA robots HTTP ${robots.status}`);
      const policy = await robots.text();
      if (!/^User-Agent:/im.test(policy) || /^Disallow:\s*\S+/im.test(policy)) throw new Error("AA robots policy changed; review before model-page collection");
    }
    for (const slug of slugs) {
      const url = aaModelPageURL(slug);
      if (attempts.length) await sleep(POLITE_DELAY_MS);
      const fetched = new Date().toISOString();
      try {
        const result = await fetcher(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
        const body = result.ok ? await result.text() : null;
        const entry = { url, fetched_at: fetched, http_status: result.status, bytes: body?.length ?? 0, sha256: body ? createHash("sha256").update(body).digest("hex") : null };
        attempts.push(entry);
        if ([403, 429].includes(result.status)) break;
        if (evidenceDir && body) {
          const safe = url.replace(HASH_TAG, "_").slice(-120);
          await mkdir(evidenceDir, { recursive: true });
          await writeFile(`${evidenceDir}/body-${safe}.html`, body);
          await appendFile(`${evidenceDir}/collector-evidence-log.jsonl`, `${JSON.stringify({ ...entry, body_file: `body-${safe}.html` })}\n`);
        }
        if (result.ok) { response = body; usedUrl = url; break; }
      } catch (error) {
        attempts.push({ url, fetched_at: fetched, error: error.message });
      }
    }
    if (!response) throw new Error(`AA efficiency: every model-page probe failed (${attempts.map((a) => a.http_status || a.error).join(", ")})`);
    html = response;
  }
  const snapshot = parseAaEfficiency(html, { previous, attempts, sourceUrl: usedUrl || aaModelPageURL(slugs[0]), fetchedAt });
  await writeJSONAtomic(target, snapshot);
  return snapshot;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = fileURLToPath(new URL("../data/raw/aa-efficiency.json", import.meta.url));
  const evidenceDir = process.argv.find((arg) => arg.startsWith("--evidence-dir="))?.slice(15) || null;
  refreshAaEfficiency({ target, evidenceDir }).then((snapshot) => {
    console.log(`AA efficiency: ${snapshot.count} rows over ${snapshot.coverage.scored_denominator} scored models; wrote ${target}`);
  }).catch((error) => { console.error(`AA EFFICIENCY REFRESH FAILED: ${error.message}`); process.exitCode = 1; });
}
