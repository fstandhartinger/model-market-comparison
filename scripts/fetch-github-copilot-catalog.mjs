#!/usr/bin/env node
// R9.1: refresh data/raw/github-copilot.json from three server-rendered GitHub Docs pages (docs.github.com
// robots.txt allows all): the supported-models catalog, the models-and-pricing token tables and the legacy
// annual-plan multiplier table. Three unauthenticated GETs. Fails closed: on a missing table, an unreadable
// price or multiplier, an unknown tier, a missing AI-credit statement or a large loss in either array the
// previous snapshot stays untouched. Plan allowances are on other pages and keep plans_checked_at.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseGithubCopilotCatalog } from "../lib/github-copilot-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/github-copilot.json", import.meta.url));
const base = "https://docs.github.com/en/copilot";
const supportedUrl = `${base}/reference/ai-models/supported-models`;
const pricingUrl = `${base}/reference/copilot-billing/models-and-pricing`;
const multipliersUrl = `${base}/reference/copilot-billing/request-based-billing-legacy/model-multipliers-for-annual-plans`;
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const supported = await get(supportedUrl);
  const pricing = await get(pricingUrl);
  const multipliers = await get(multipliersUrl);
  const collected_at = new Date().toISOString().slice(0, 10);
  const r = parseGithubCopilotCatalog(supported, pricing, multipliers, previous, { today: collected_at });
  await captureLiveSource(supportedUrl, supported);
  await captureLiveSource(pricingUrl, pricing);
  await captureLiveSource(multipliersUrl, multipliers);
  await writeJSONAtomic(target, {
    ...previous,
    collected_at,
    method: `scripts/fetch-github-copilot-catalog.mjs (${collected_at}): current_models[] = the intersection of the supported-models catalog table (${supportedUrl}) and the per-token pricing tables (${pricingUrl}), matched by exact name after footnote markers are removed; Default and Long context tiers are folded into one row (long_context carries the threshold and higher price); promotion end dates come from the pricing footnotes. models[] = the legacy annual-plan multiplier table (${multipliersUrl}) with effective USD per request = multiplier × per_premium_request_usd; the page's "subject to change" list sets the note. Plan allowances (plans[]) are documented on separate billing pages and keep plans_checked_at. See github-copilot.method.md.`,
    legacy_auto_selection_discount_pct: r.legacy_auto_selection_discount_pct,
    plans_checked_at: r.plans_checked_at,
    retirement_history: r.retired,
    supported_without_price: r.supported_without_price,
    priced_not_supported: r.priced_not_supported,
    retirement_overlap: r.retirement_overlap,
    response_sha256: { supported: createHash("sha256").update(supported).digest("hex"), pricing: createHash("sha256").update(pricing).digest("hex"), multipliers: createHash("sha256").update(multipliers).digest("hex") },
    diff: r.diff,
    current_models: r.current_models,
    models: r.models,
  });
  const d = r.diff;
  console.log(`GitHub Copilot: ${r.current_models.length} current models (added ${d.current_added.length}, removed ${d.current_removed.length}, price changes ${d.current_price_changed.length}); ${r.models.length} legacy multipliers (added ${d.legacy_added.length}, removed ${d.legacy_removed.length}, changed ${d.legacy_multiplier_changed.length}); supported without price: ${r.supported_without_price.join(", ") || "none"}; priced but not supported: ${r.priced_not_supported.join(", ") || "none"}`);
} catch (error) {
  console.error(`GitHub Copilot refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
