#!/usr/bin/env node
// R9.1: date the hand-curated data/raw/provider-meta.json by a mechanical cross-check against OpenRouter's
// provider table (data/raw/openrouter-data-policy.json, fetched earlier in the same daily run). No network.
// Curated values are never changed; new country disagreements are printed for a human and exit non-zero so the
// daily report carries a warning, while the dated check is still written.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { crossCheckProviderMeta } from "../lib/provider-meta-crosscheck.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";

const raw = (name) => fileURLToPath(new URL(`../data/raw/${name}`, import.meta.url));
const target = raw("provider-meta.json");

try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const policy = JSON.parse(await readFile(raw("openrouter-data-policy.json"), "utf8"));
  const next = crossCheckProviderMeta(previous, policy);
  const x = next.openrouter_crosscheck;
  await writeJSONAtomic(target, next);
  console.log(`provider-meta: ${Object.keys(next.providers).length} curated providers checked against OpenRouter (${next.collected_at}): ${x.agree} agree, ${x.explained.length} explained disputes, ${x.disagreements.length} new disagreements, ${x.no_headquarters.length} without headquarters, ${x.not_listed.length} not listed`);
  for (const d of x.disagreements) console.log(`  NEW ${d.provider}: curated ${d.curated}, OpenRouter ${d.openrouter}`);
  if (x.disagreements.length) process.exitCode = 1;
} catch (error) {
  console.error(`provider-meta cross-check failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
