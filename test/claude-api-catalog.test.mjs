import test from "node:test";
import assert from "node:assert/strict";
import { readPriceTables, readLifecycle, readModifiers, readEnterpriseSeat, parseClaudeApiCatalog } from "../lib/claude-api-catalog.mjs";

const table = (header, rows) => `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const $ = (v, foot = "") => `$${v} / MTok${foot ? ` <sup>${foot}</sup>` : ""}`;
const HEAD = ["Model", "Base input tokens", "5m cache writes", "1h cache writes", "Cache hits and refreshes", "Output tokens"];
const row = (name, input, read, foot = "") => [name, $(input), $(input * 1.25), $(input * 2), $(read, foot), $(input * 5)];
const prose = `<p>The Batch API allows asynchronous processing of large volumes of requests with a 50% discount on both input and output tokens.</p>
<p><sup>1</sup> Cache hits and refreshes on Claude Fable 5.1 are priced at 0.025x the base input price. All other models use the standard 0.1x multiplier.</p>
<p>For Claude 4.6 and later models, specifying US-only inference through the <code>inference_geo</code> parameter incurs a 1.1x multiplier on all token pricing categories.</p>`;
const pricing = (rows, batchRows) => `<html>${table(HEAD, rows)}${prose}${table(["Model", "Batch input", "Batch output"], batchRows)}</html>`;
const deprecations = table(["API model name", "Current state", "Deprecated", "Tentative retirement date"], [
  ["claude-fable-5-1", "Active", "N/A", "Not sooner than September 1, 2027"],
  ["claude-opus-5", "Active", "N/A", "Not sooner than July 24, 2027"],
  ["claude-opus-4-1-20250805", "Retired", "June 5, 2026", "August 5, 2026"],
]);
const enterprise = `<div><h3>Enterprise</h3><p>For large businesses</p><p>Seat price + usage at API rates</p><span>$20</span><span>/seat. Usage cost scales with model and task.</span></div>`;
const previous = {
  collected_at: "2026-09-08",
  pricing_modifiers: { us_only_inference_applies_to: "Claude Opus 4.6 and later" },
  claude_code_enterprise: { seat_monthly_usd: 20, self_serve_minimum_seats: 20 },
  models: [
    { model_name: "Claude Fable 5.1", model_id: "claude-fable-5-1", provider_org: "Anthropic", lifecycle_status: "active", availability: "generally_available", input_per_1m_usd: 10, output_per_1m_usd: 50, notes: "curated" },
    { model_name: "Claude Opus 5", model_id: "claude-opus-5", provider_org: "Anthropic", lifecycle_status: "active", input_per_1m_usd: 5, output_per_1m_usd: 25 },
  ],
};
const fullRows = [row("Claude Fable 5.1", 10, 0.25, "1"), row("Claude Opus 5", 5, 0.5), row("Claude Opus 4.1 ( retired, except on Bedrock and Google Cloud )", 15, 1.5), row("Claude Mythos 5.2 ( limited availability )", 10, 1)];
const fullBatch = [["Claude Fable 5.1", $(5), $(25)], ["Claude Opus 5", $(2.5), $(12.5)], ["Claude Opus 4.1 ( retired, except on Bedrock and Google Cloud )", $(7.5), $(37.5)], ["Claude Mythos 5.2 ( limited availability )", $(5), $(25)]];

test("reads price tables with footnote markers and availability labels", () => {
  const rows = readPriceTables(pricing(fullRows, fullBatch));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { name: "Claude Fable 5.1", label: "", retired: false, limited: false, input: 10, write5m: 12.5, write1h: 20, read: 0.25, output: 50, batch: { input: 5, output: 25 } });
  assert.equal(rows[2].retired, true);
  assert.equal(rows[3].limited, true);
  assert.throws(() => readPriceTables("<html></html>"), /no model price table/);
  assert.throws(() => readPriceTables(pricing([["Claude X", "free", $(1), $(1), $(1), $(1)]], fullBatch)), /unreadable price/);
});

test("reads lifecycle, stated multipliers and the Enterprise seat line", () => {
  assert.deepEqual(readLifecycle(deprecations).get("claude-opus-4-1-20250805"), { state: "retired", retirement: "August 5, 2026", retirement_date: "2026-08-05" });
  const rows = readPriceTables(pricing(fullRows, fullBatch));
  assert.deepEqual(readModifiers(pricing(fullRows, fullBatch), rows), { write5m: 1.25, write1h: 2, readDefault: 0.1, readException: 0.025, batchPct: 50, usOnly: 1.1 });
  assert.throws(() => readModifiers(`<html>${table(HEAD, fullRows)}</html>`, rows), /multiplier text not found/);
  assert.deepEqual(readEnterpriseSeat(enterprise), { seat_monthly_usd: 20, usage_at_api_rates: true });
  assert.equal(readEnterpriseSeat("<div>Team</div>"), null);
});

test("keeps curated rows, excludes retired ones, derives new models and dates the Enterprise check honestly", () => {
  const r = parseClaudeApiCatalog(pricing(fullRows, fullBatch), deprecations, previous, { enterpriseHtml: enterprise, today: "2026-09-14" });
  assert.deepEqual(r.models.map((m) => m.model_name), ["Claude Fable 5.1", "Claude Opus 5", "Claude Mythos 5.2"]);
  assert.equal(r.models[0].notes, "curated");
  assert.equal(r.models[0].cache_read_per_1m_usd, 0.25);
  assert.equal(r.models[0].batch_output_per_1m_usd, 25);
  assert.equal(r.models[0].tentative_retirement, "Not sooner than September 1, 2027");
  assert.equal(r.models[2].mapping, "derived");
  assert.equal(r.models[2].model_id, "claude-mythos-5-2");
  assert.equal(r.models[2].availability, "limited_availability");
  assert.deepEqual(r.excluded, ["Claude Opus 4.1 (retired, except on Bedrock and Google Cloud)"]);
  assert.deepEqual(r.pricing_modifiers.prompt_cache_read_multiplier_exceptions, { "claude-fable-5-1": 0.025 });
  assert.equal(r.pricing_modifiers.us_only_inference_applies_to, "Claude Opus 4.6 and later");
  assert.deepEqual(r.claude_code_enterprise, { seat_monthly_usd: 20, self_serve_minimum_seats: 20, seat_and_usage_checked_at: "2026-09-14", other_terms_checked_at: "2026-09-08" });
  assert.deepEqual(r.diff, { added: ["Claude Mythos 5.2"], removed: [], price_changed: ["Claude Fable 5.1", "Claude Opus 5"], lifecycle_changed: [], enterprise_seat_changed: false });
  const noSeat = parseClaudeApiCatalog(pricing(fullRows, fullBatch), deprecations, previous, { enterpriseHtml: "<div></div>", today: "2026-09-14" });
  assert.equal(noSeat.claude_code_enterprise.seat_and_usage_checked_at, "2026-09-08");
});

test("fails closed on a missing batch price, inconsistent write ratios and large loss", () => {
  assert.throws(() => parseClaudeApiCatalog(pricing(fullRows, fullBatch.slice(1)), deprecations, previous), /no batch price/);
  const odd = [row("Claude Fable 5.1", 10, 0.25, "1"), ["Claude Opus 5", $(5), $(7), $(10), $(0.5), $(25)]];
  assert.throws(() => parseClaudeApiCatalog(pricing(odd, fullBatch), deprecations, previous), /inconsistent cache-write/);
  assert.throws(() => parseClaudeApiCatalog(pricing([row("Claude New 9", 1, 0.1)], [["Claude New 9", $(0.5), $(2.5)]]), deprecations, previous), /refusing/);
});
