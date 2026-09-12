#!/usr/bin/env node
/** Snapshot the public OpenRouter provider data-policy table (requirement R4.10).
 *
 * Source: https://openrouter.ai/providers — a server-rendered table, allowed by that
 * site's robots.txt (`Allow: /`, only `/seo/` is disallowed). No login, no API key, no
 * bot-protection circumvention; one request per run.
 *
 * The two columns we need mirror OpenRouter's own filter checkboxes: "Does not train"
 * (Trains = No) and "Zero retention". A provider that satisfies both is the one that
 * remains in that filtered list.
 */
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";
import { parseProviderPolicyPage, applyOverrides, keepsDataPrivate, POLICY_OVERRIDES } from "../lib/openrouter-data-policy.mjs";

const PAGE = "https://openrouter.ai/providers";
const target = new URL("../data/raw/openrouter-data-policy.json", import.meta.url);
const ua = "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";
const evidenceDir = process.argv.slice(2).find((a) => a.startsWith("--evidence-dir="))?.slice(15) || process.env.BH_EVIDENCE_DIR;
const fixture = process.argv.slice(2).find((a) => a.startsWith("--fixture="))?.slice(10);

/** The page facets print their own totals. Parsing that is the cheapest possible
 *  guard against a silent layout change turning into wrong policy data. */
function facet(html, label) {
  const m = html.match(new RegExp(`<span class="truncate">${label}</span><span[^>]*>(\\d+)</span>`));
  return m ? Number(m[1]) : null;
}

async function get(url) {
  const { stdout } = await promisify(execFile)("curl",
    ["--silent", "--show-error", "--max-time", "60", "--user-agent", ua, "--write-out", "\n%{http_code}", url],
    { timeout: 65000, maxBuffer: 24000000 });
  const split = stdout.lastIndexOf("\n");
  const status = Number(stdout.slice(split + 1));
  if (status !== 200) throw new Error(`HTTP ${status}: ${url}`);
  const body = stdout.slice(0, split);
  if (/<title>just a moment|cf-chl-|g-recaptcha|hcaptcha/i.test(body.slice(0, 100000))) {
    throw new Error(`Bot challenge served for ${url} — not circumvented, run aborted`);
  }
  await captureLiveSource(url, body, { directory: evidenceDir });
  return body;
}

try {
  const html = fixture ? await readFile(fixture, "utf8") : await get(PAGE);
  const parsed = parseProviderPolicyPage(html);
  const providers = applyOverrides(parsed);

  // Cross-check the parse against the counts the page prints for its own filters.
  const expectRetention = facet(html, "Zero retention");
  const expectTrain = facet(html, "Does not train");
  const gotRetention = parsed.filter((p) => p.zero_retention === true).length;
  const gotTrain = parsed.filter((p) => p.does_not_train === true).length;
  const checks = [];
  if (expectRetention != null && expectRetention !== gotRetention) checks.push(`zero-retention ${gotRetention} ≠ page facet ${expectRetention}`);
  if (expectTrain != null && expectTrain !== gotTrain) checks.push(`does-not-train ${gotTrain} ≠ page facet ${expectTrain}`);
  if (checks.length) throw new Error(`OpenRouter provider table parse disagrees with the page's own counts: ${checks.join("; ")}`);

  const snapshot = {
    schema_version: 1,
    source: { url: PAGE, retrieved_at: new Date().toISOString(), sha256: createHash("sha256").update(html).digest("hex") },
    basis: "OpenRouter's published provider table. 'private' = the provider survives OpenRouter's own 'Does not train' + 'Zero retention' filter.",
    facet_crosscheck: { zero_retention: { page: expectRetention, parsed: gotRetention }, does_not_train: { page: expectTrain, parsed: gotTrain } },
    overrides: POLICY_OVERRIDES,
    counts: {
      providers: providers.length,
      private: providers.filter((p) => keepsDataPrivate(p) === true).length,
      not_private: providers.filter((p) => keepsDataPrivate(p) === false).length,
      unknown: providers.filter((p) => keepsDataPrivate(p) === null).length,
    },
    providers: providers.map((p) => ({ ...p, private: keepsDataPrivate(p) })),
  };
  await writeJSONAtomic(fileURLToPath(target), snapshot);
  console.log(`openrouter-data-policy: ${snapshot.counts.providers} providers · ${snapshot.counts.private} private · ${snapshot.counts.not_private} not · ${snapshot.counts.unknown} unknown`);
} catch (error) {
  console.error(`fetch-openrouter-data-policy failed: ${error.message}`);
  process.exit(1);
}
