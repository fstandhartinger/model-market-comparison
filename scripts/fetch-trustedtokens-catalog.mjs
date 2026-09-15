#!/usr/bin/env node
// CR-27.1: refresh data/raw/trustedtokens.json from TrustedTokens' public catalog endpoint (the
// same unauthenticated GET the ModelsIsland at trustedtokens.eu/models performs, kept as its own
// daily capture) plus the ECB daily EUR/USD rate. trustedtokens.eu/robots.txt allows all paths.
// Fails closed: on a non-JSON answer, an unexpected payload shape, too few models, an unreadable
// price, a duplicate or a large model loss the previous snapshot stays untouched.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseTrustedTokensCatalog } from "../lib/trustedtokens-catalog.mjs";
import { parseEcbUsdRate } from "../lib/scaleway-catalog.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from "../lib/live-source.mjs";

const target = fileURLToPath(new URL("../data/raw/trustedtokens.json", import.meta.url));
const url = "https://trustedtokens.eu/api/service/models";
const ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
const headers = { "User-Agent": "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)", Accept: "application/json" };
const get = async (u) => {
  const response = await fetch(u, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${u}`);
  return response.text();
};
try {
  let previous = { models: [] };
  try {
    previous = JSON.parse(await readFile(target, "utf8"));
  } catch { /* first collection */ }
  const [body, ecb] = await Promise.all([get(url), get(ecbUrl)]);
  const fx = parseEcbUsdRate(ecb);
  const collected_at = new Date().toISOString().slice(0, 10);
  const { models, skipped, diff } = parseTrustedTokensCatalog(body, previous, fx, { day: collected_at });
  await captureLiveSource(url, body);
  await captureLiveSource(ecbUrl, ecb);
  await writeJSONAtomic(target, {
    ...previous,
    source: "TrustedTokens — trustedtokens.eu/api/service/models (first-party, public; the endpoint the /models page itself loads)",
    collected_at,
    method: `scripts/fetch-trustedtokens-catalog.mjs (${collected_at}): one unauthenticated GET of /api/service/models plus the ECB daily EUR/USD rate; EUR per-token prices normalized to EUR per 1M tokens (USD = EUR × ECB rate, nearest cent); rows without both token prices skipped; lifecycle from the catalog's attributes (deprecated kept); hosting audited sovereign Germany (see trustedtokens.method.md).`,
    currency: "EUR",
    currency_note: `Native prices are EUR per token without VAT, shown here per 1M tokens; USD = EUR × ECB ${fx.date}: 1 EUR = ${fx.rate} USD, rounded to the nearest cent. Access is B2B: plans include monthly usage credit (Starter €50 / Pro €200 / Enterprise €2,000, all without VAT, marked indicative) against which these per-token prices are billed.`,
    usd_normalization: { status: "applied", eur_to_usd: fx.rate, fx_rate_date: fx.date, source: ecbUrl, rounding: "nearest USD cent" },
    response_sha256: createHash("sha256").update(body).digest("hex"),
    skipped,
    diff,
    models,
  });
  console.log(`TrustedTokens: ${models.length} models at EUR/USD ${fx.rate} (${fx.date}) (added ${diff.added.length}, removed ${diff.removed.length}, EUR price changes ${diff.eur_price_changed.length}; skipped ${skipped.length})`);
} catch (error) {
  console.error(`TrustedTokens refresh failed; previous snapshot preserved: ${error.message}`);
  process.exitCode = 1;
}
