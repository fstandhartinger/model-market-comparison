import test from "node:test";
import assert from "node:assert/strict";
import { readSupported, readPricing, readMultipliers, parseGithubCopilotCatalog } from "../lib/github-copilot-catalog.mjs";

const fn = (id, n) => `<sup><a href="#user-content-fn-${id}" id="user-content-fnref-${id}" data-footnote-ref="" aria-describedby="footnote-label">${n}</a></sup>`;
const table = (head, rows, th = false) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (th && i === 0 ? `<th scope="row">${c}</th>` : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody></table>`;
const supportedPage = (names, retired = []) => `<html>${table(["Model name", "Provider", "Release status"], names.map(([n, p]) => [n, p, "GA"]), true)}${table(["Model name", "Retirement date", "Suggested alternative"], retired, true)}</html>`;
const TIERED = ["Model", "Release status", "Category", "Tier", "Threshold (input tokens)", "Input", "Cached input", "Cache write", "Output"];
const PLAIN = ["Model", "Release status", "Category", "Input", "Cached input", "Output"];
const pricingPage = (tables, credit = true) => `<html><p>${credit ? "the total is converted into AI credits, where 1 AI credit = $0.01 USD." : ""}</p>${tables.join("")}<ol><li id="user-content-fn-gemini-flash-promo"><p>Gemini 3.6 Flash is available at the promotional pricing of $0.75 per 1M input tokens through December 31, 2026. <a href="#user-content-fnref-gemini-flash-promo">↩</a></p></li></ol></html>`;
const multipliersPage = (rows, change = ["Claude Sonnet 4.6"]) => `<html><p>Note</p><p>The multiplier for these models are subject to change.</p><ul>${change.map((c) => `<li>${c}</li>`).join("")}</ul><p>If you use auto model selection in Copilot Chat, you qualify for a 10% discount.</p>${table(["Model", "Multiplier"], rows)}</html>`;

const openai = table(TIERED, [
  ["GPT-5.4", "GA", "Versatile", "Default", "≤ 272K", "$2.50", "$0.25", "Not applicable", "$15.00"],
  ["GPT-5.4", "GA", "Versatile", "Long context", "&gt; 272K", "$5.00", "$0.50", "Not applicable", "$22.50"],
  ["GPT-5.6 Luna", "GA", "Lightweight", "Default", "≤ 200K", "$0.20", "$0.02", "$0.25", "$1.20"],
]);
const plain = table(PLAIN, [
  [`Gemini 3.6 Flash${fn("gemini-flash-promo", 1)}`, "GA", "Versatile", "$0.75", "$0.075", "$3.75"],
  ["Claude Sonnet 4", "GA", "Versatile", "$3.00", "$0.30", "$15.00"],
  ["MAI-Code-1.1-Flash", "GA", "Lightweight", "$0.20", "$0.02", "$1.20"],
]);
const previous = {
  collected_at: "2026-09-08",
  per_premium_request_usd: 0.04,
  current_models: [
    { model_name: "GPT-5.4", provider_org: "OpenAI", release_status: "GA", category: "Versatile", input_per_1m_usd: 2.5, cached_input_per_1m_usd: 0.25, output_per_1m_usd: 15, notes: "curated" },
    { model_name: "Gemini 3.6 Flash", provider_org: "Google", release_status: "GA", category: "Versatile", input_per_1m_usd: 0.75, cached_input_per_1m_usd: 0.075, output_per_1m_usd: 3.75, promotion_ends_at: "2026-12-31" },
    { model_name: "MAI-Code-1-Flash", provider_org: "Microsoft", release_status: "GA", category: "Lightweight", input_per_1m_usd: 0.75, cached_input_per_1m_usd: 0.075, output_per_1m_usd: 4.5 },
  ],
  models: [
    { model_name: "Claude Sonnet 4.6", provider_org: "Anthropic", premium_request_multiplier: 9, effective_usd_per_request: 0.36, notes: "GitHub marks this multiplier as subject to change." },
    { model_name: "GPT-5.4", provider_org: "OpenAI", premium_request_multiplier: 6, effective_usd_per_request: 0.24, notes: "Legacy annual-plan multiplier." },
    { model_name: "MAI-Code-1-Flash", provider_org: "Microsoft", premium_request_multiplier: 0.33, effective_usd_per_request: 0.0132, notes: "promotional" },
  ],
};

test("reads the catalog without footnote markers, tiers, cache writes, thresholds and promotions", () => {
  const { models, retired } = readSupported(supportedPage([[`GPT-5.4 nano${fn("gpt54nano", 1)}`, "OpenAI"], ["Claude Opus 5", "Anthropic"]], [["MAI-Code-1-Flash", "2026-09-10", "MAI-Code-1.1-Flash"]]));
  assert.deepEqual(models.map((m) => m.name), ["GPT-5.4 nano", "Claude Opus 5"]);
  assert.deepEqual(retired, [{ name: "MAI-Code-1-Flash", retirement_date: "2026-09-10", alternative: "MAI-Code-1.1-Flash" }]);
  const p = readPricing(pricingPage([openai, plain]));
  assert.deepEqual(p.get("GPT-5.4").prices, { input_per_1m_usd: 2.5, cached_input_per_1m_usd: 0.25, cache_write_per_1m_usd: null, output_per_1m_usd: 15 });
  assert.deepEqual(p.get("GPT-5.4").long_context, { input_per_1m_usd: 5, cached_input_per_1m_usd: 0.5, cache_write_per_1m_usd: null, output_per_1m_usd: 22.5, threshold_input_tokens_gt: 272000 });
  assert.equal(p.get("GPT-5.6 Luna").prices.cache_write_per_1m_usd, 0.25);
  assert.match(p.get("Gemini 3.6 Flash").footnotes[0], /through December 31, 2026\.$/);
  assert.throws(() => readPricing(pricingPage([openai], false)), /AI credit/);
  assert.throws(() => readPricing(pricingPage([table(PLAIN, [["X", "GA", "Versatile", "free", "$1", "$1"]])])), /unreadable price/);
});

test("reads legacy multipliers with the subject-to-change list and the auto discount", () => {
  const r = readMultipliers(multipliersPage([["Claude Sonnet 4.6", "9"], ["GPT-5.4", "6"]], ["Claude Sonnet 4.6", "GPT-5.4 mini"]));
  assert.deepEqual(r, { rows: [{ name: "Claude Sonnet 4.6", multiplier: 9 }, { name: "GPT-5.4", multiplier: 6 }], subjectToChange: ["Claude Sonnet 4.6", "GPT-5.4 mini"], autoDiscountPct: 10 });
  assert.throws(() => readMultipliers(multipliersPage([["X", "lots"]])), /unreadable multiplier/);
});

test("intersects catalog and prices, drops retired rows, keeps curated fields, reports both gaps", () => {
  const r = parseGithubCopilotCatalog(
    supportedPage([["GPT-5.4", "OpenAI"], ["GPT-5.6 Luna", "OpenAI"], [`Gemini 3.6 Flash`, "Google"], ["MAI-Code-1.1-Flash", "Microsoft"], ["Kimi K3", "Moonshot AI"]], [["MAI-Code-1-Flash", "2026-09-10", "MAI-Code-1.1-Flash"]]),
    pricingPage([openai, plain]),
    multipliersPage([["Claude Sonnet 4.6", "9"], ["GPT-5.4", "6"], ["MAI-Code-1.1-Flash", "0.25"]]),
    previous, { today: "2026-09-14" });
  assert.deepEqual(r.current_models.map((m) => m.model_name), ["GPT-5.4", "GPT-5.6 Luna", "Gemini 3.6 Flash", "MAI-Code-1.1-Flash"]);
  assert.equal(r.current_models[0].notes, "curated");
  assert.equal(r.current_models[0].long_context.threshold_input_tokens_gt, 272000);
  assert.equal(r.current_models[0].cache_write_per_1m_usd, undefined);
  assert.equal(r.current_models[1].cache_write_per_1m_usd, 0.25);
  assert.equal(r.current_models[1].mapping, "derived");
  assert.equal(r.current_models[2].promotion_ends_at, "2026-12-31");
  assert.deepEqual(r.supported_without_price, ["Kimi K3"]);
  assert.deepEqual(r.priced_not_supported, ["Claude Sonnet 4"]);
  assert.deepEqual(r.diff.current_removed, ["MAI-Code-1-Flash"]);
  assert.deepEqual(r.models.map((m) => [m.model_name, m.effective_usd_per_request, m.notes]), [
    ["Claude Sonnet 4.6", 0.36, "GitHub marks this multiplier as subject to change."],
    ["GPT-5.4", 0.24, "Legacy annual-plan multiplier."],
    ["MAI-Code-1.1-Flash", 0.01, "Legacy annual-plan multiplier."],
  ]);
  assert.deepEqual(r.diff.legacy_removed, ["MAI-Code-1-Flash"]);
  assert.equal(r.plans_checked_at, "2026-09-08");
  assert.equal(r.legacy_auto_selection_discount_pct, 10);
});

test("fails closed when most previous rows disappear", () => {
  assert.throws(() => parseGithubCopilotCatalog(supportedPage([["Brand New", "OpenAI"]]), pricingPage([table(PLAIN, [["Brand New", "GA", "Versatile", "$1.00", "$0.10", "$2.00"]])]), multipliersPage([["Claude Sonnet 4.6", "9"], ["GPT-5.4", "6"]]), previous), /refusing/);
});
