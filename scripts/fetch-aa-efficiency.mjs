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
import { captureLiveSource } from '../lib/live-source.mjs';

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
  const liveProbe = html === undefined;
  if (liveProbe) {
    if (checkRobots) {
      const robots = await fetcher("https://artificialanalysis.ai/robots.txt", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (!robots.ok) throw new Error(`AA robots HTTP ${robots.status}`);
      const policy = await robots.text();
      if (!/^User-Agent:/im.test(policy) || /^Disallow:\s*\S+/im.test(policy)) throw new Error("AA robots policy changed; review before model-page collection");
    }
    for (const [index, slug] of slugs.entries()) {
      const url = aaModelPageURL(slug);
      if (attempts.length) await sleep(POLITE_DELAY_MS);
      const fetched = new Date().toISOString();
      try {
        const result = await fetcher(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
        const body = typeof result.text === "function" ? await result.text().catch(() => null) : null;
        const entry = { url, fetched_at: fetched, http_status: result.status, bytes: body?.length ?? 0, sha256: body !== null ? createHash("sha256").update(body).digest("hex") : null };
        attempts.push(entry);
        if (evidenceDir && body !== null) {
          const captured = await captureLiveSource(url, body, { directory: evidenceDir, status: result.status });
          if (result.ok && fetchedAt === undefined) fetchedAt = captured.fetched_at;
        }
        if ([403, 429].includes(result.status)) break;
        if (evidenceDir && body) {
          const safe = url.replace(HASH_TAG, "_").slice(-120);
          await mkdir(evidenceDir, { recursive: true });
          await writeFile(`${evidenceDir}/body-${safe}.html`, body);
          await appendFile(`${evidenceDir}/collector-evidence-log.jsonl`, `${JSON.stringify({ ...entry, body_file: `body-${safe}.html` })}\n`);
        }
        if (!result.ok || body === null) continue;

        let candidate;
        try {
          // Parse without the previous-count guard first. A source can retire
          // models; whether that is a real source-wide shrink is decided below
          // by an independent model page, not by weakening the parser.
          candidate = parseAaEfficiency(body, {
            previous: null,
            attempts,
            sourceUrl: url,
            fetchedAt,
          });
        } catch (error) {
          attempts.at(-1).parse_error = error.message;
          continue;
        }

        const priorCount = previous?.count || 0;
        if (candidate.count >= priorCount) {
          response = body;
          usedUrl = url;
          break;
        }

        // A shrink is only accepted when another public AA model page carries
        // the exact same parsed rows. This distinguishes a real retirement or
        // reclassification from a partially rendered first page.
        const confirmations = [candidate];
        for (const confirmingSlug of slugs.slice(index + 1)) {
          await sleep(POLITE_DELAY_MS);
          const confirmingUrl = aaModelPageURL(confirmingSlug);
          const confirmingFetched = new Date().toISOString();
          let confirmingResult;
          try {
            confirmingResult = await fetcher(confirmingUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
            const confirmingBody = typeof confirmingResult.text === "function" ? await confirmingResult.text().catch(() => null) : null;
            const confirmingEntry = { url: confirmingUrl, fetched_at: confirmingFetched, http_status: confirmingResult.status, bytes: confirmingBody?.length ?? 0, sha256: confirmingBody !== null ? createHash("sha256").update(confirmingBody).digest("hex") : null };
            attempts.push(confirmingEntry);
            if (evidenceDir && confirmingBody !== null) {
              await captureLiveSource(confirmingUrl, confirmingBody, { directory: evidenceDir, status: confirmingResult.status });
              const safe = confirmingUrl.replace(HASH_TAG, "_").slice(-120);
              await mkdir(evidenceDir, { recursive: true });
              await writeFile(`${evidenceDir}/body-${safe}.html`, confirmingBody);
              await appendFile(evidenceDir + "/collector-evidence-log.jsonl", `${JSON.stringify({ ...confirmingEntry, body_file: `body-${safe}.html` })}\n`);
            }
            if (!confirmingResult.ok || confirmingBody === null) continue;
            let confirming;
            try {
              confirming = parseAaEfficiency(confirmingBody, { previous: null, attempts, sourceUrl: confirmingUrl, fetchedAt });
            } catch (error) {
              confirmingEntry.parse_error = error.message;
              continue;
            }
            if (JSON.stringify(confirming.rows) !== JSON.stringify(candidate.rows)) {
              throw new Error(`AA efficiency shrink disagrees across model pages: ${url} has ${candidate.count}, ${confirmingUrl} has ${confirming.count}`);
            }
            confirmations.push(confirming);
            if (confirmations.length >= 2) break;
          } catch (error) {
            if (error.message.startsWith("AA efficiency shrink disagrees")) throw error;
          }
        }
        if (confirmations.length < 2) {
          throw new Error(`AA efficiency shrink not independently confirmed: ${candidate.count} rows (previous ${priorCount})`);
        }
        // Review gate 20260920T055002Z: write the page whose rows were confirmed. This wrote the first page that
        // ever parsed, which is a different page as soon as an earlier slug was rejected — its rows were never
        // compared with anything.
        response = body;
        usedUrl = url;
        break;
      } catch (error) {
        // Review gate 20260920T055002Z: an unconfirmed shrink is a decision about the source, not a failed probe.
        // Falling through re-fetched the pages the confirmation loop had just read and ended in "every model-page
        // probe failed", which names the wrong cause for a run that has to be diagnosed from its receipt.
        if (error.message.startsWith("AA efficiency shrink")) throw error;
        attempts.push({ url, fetched_at: fetched, error: error.message });
      }
    }
    if (!response) throw new Error(`AA efficiency: every model-page probe failed (${attempts.map((a) => a.http_status || a.error).join(", ")})`);
    html = response;
  }
  // Live probes have already applied the previous-count guard, including the
  // independent confirmation required for a real source-wide shrink. Applying
  // it again would reject the confirmed 145-row AA payload. Explicit fixture
  // input keeps the original previous-snapshot guard for callers/tests.
  const snapshot = parseAaEfficiency(html, { previous: liveProbe ? null : previous, attempts, sourceUrl: usedUrl || aaModelPageURL(slugs[0]), fetchedAt });
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
