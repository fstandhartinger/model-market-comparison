#!/usr/bin/env node
// R9.1: refresh data/raw/claude-code.json from Anthropic's server-rendered pricing and model-deprecations
// docs (platform.claude.com; robots.txt disallows only /api/) and the Enterprise plan line on
// claude.com/pricing (robots.txt allows all). Three unauthenticated GETs. Fails closed: on a missing
// price or batch table, an unreadable price, missing multiplier text, inconsistent cache-write ratios or
// a large model loss the previous snapshot stays untouched. The Enterprise line is optional: when it is
// not found, the seat terms keep their previous check date instead of inheriting today's.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseClaudeApiCatalog, readEnterpriseTerms } from "../lib/claude-api-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/claude-code.json", import.meta.url));
const pricingUrl = "https://platform.claude.com/docs/en/about-claude/pricing";
const deprecationsUrl = "https://platform.claude.com/docs/en/about-claude/model-deprecations";
const enterpriseUrl = "https://claude.com/pricing";
const enterpriseTermsUrl = "https://support.claude.com/en/articles/9797531-what-is-the-enterprise-plan";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)" };
const get = async (url) => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
};
try {
  const previous = JSON.parse(await readFile(target, "utf8"));
  const pricing = await get(pricingUrl);
  const deprecations = await get(deprecationsUrl);
  const enterprise = await get(enterpriseUrl).catch((error) => { console.warn(`Claude Enterprise page skipped: ${error.message}`); return null; });
  const enterpriseTerms = await get(enterpriseTermsUrl).catch((error) => { console.warn(`Claude Enterprise terms page skipped: ${error.message}`); return null; });
  const collected_at = new Date().toISOString().slice(0, 10);
  await captureLiveSource(pricingUrl, pricing);
  await captureLiveSource(deprecationsUrl, deprecations);
  if (enterprise) await captureLiveSource(enterpriseUrl, enterprise);
  if (enterpriseTerms) await captureLiveSource(enterpriseTermsUrl, enterpriseTerms);
  const result = parseClaudeApiCatalog(pricing, deprecations, previous, { enterpriseHtml: enterprise, today: collected_at });
  const currentTerms = enterpriseTerms ? readEnterpriseTerms(enterpriseTerms) : null;
  if (enterpriseTerms && !currentTerms) console.warn("Claude Enterprise terms page layout changed; prior terms and check date kept");
  const claude_code_enterprise = currentTerms
    ? { ...result.claude_code_enterprise, ...currentTerms, other_terms_checked_at: collected_at }
    : result.claude_code_enterprise;
  await writeJSONAtomic(target, {
    ...previous,
    source: "Anthropic Claude API and Claude Code Enterprise",
    collected_at,
    method: `scripts/fetch-claude-api-catalog.mjs (${collected_at}): models[] from the server-rendered model and batch price tables on ${pricingUrl}; rows labelled retired there, or Retired in the lifecycle table on ${deprecationsUrl}, are excluded; lifecycle_status and tentative retirement dates come from that table by API model id. Pricing modifiers are derived from the current tables and text. Claude Code Enterprise seat pricing comes from ${enterpriseUrl}; seat minimums, usage billing, limits, and legacy-plan terms come from ${enterpriseTermsUrl}. See claude-code.method.md.`,
    pricing_modifiers: result.pricing_modifiers,
    claude_code_enterprise,
    excluded: result.excluded,
    response_sha256: {
      pricing: createHash("sha256").update(pricing).digest("hex"),
      deprecations: createHash("sha256").update(deprecations).digest("hex"),
      enterprise: enterprise ? createHash("sha256").update(enterprise).digest("hex") : null,
      enterprise_terms: enterpriseTerms ? createHash("sha256").update(enterpriseTerms).digest("hex") : null,
    },
    diff: result.diff,
    models: result.models,
  });
  const d = result.diff;
  console.log(`Claude API prices: ${result.models.length} callable models (added ${d.added.length}, removed ${d.removed.length}, price changes ${d.price_changed.length}, lifecycle changes ${d.lifecycle_changed.length}; excluded ${result.excluded.length}); Enterprise seat ${result.enterprise_seat_found ? "re-read" : "not found, previous check date kept"}; other terms ${currentTerms ? "re-read" : "previous check date kept"}`);
} catch (error) {
  console.error(`Claude API price refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
