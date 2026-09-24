import test from "node:test";
import assert from "node:assert/strict";
import { readPriceTables, readLifecycle, readModifiers, readEnterpriseSeat, readEnterpriseTerms, parseClaudeApiCatalog } from "../lib/claude-api-catalog.mjs";

const table = (header, rows) => `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const groupedTable = (groupHeader, header, rows) => `<table><thead><tr>${groupHeader.map((h) => `<th>${h}</th>`).join("")}</tr><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
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
  assert.deepEqual(readModifiers(pricing(fullRows, fullBatch), rows), { write5m: 1.25, write1h: 2, readDefault: 0.1, readExceptions: [0.025], batchPct: 50, usOnly: 1.1 });
  assert.throws(() => readModifiers(`<html>${table(HEAD, fullRows)}</html>`, rows), /multiplier text not found/);
  assert.deepEqual(readEnterpriseSeat(enterprise), { seat_monthly_usd: 20, usage_at_api_rates: true });
  assert.deepEqual(readEnterpriseSeat(`<section><h3>Enterprise</h3><p>Seat price + usage at API rates</p><p>US$20/seat/month, billed annually. Usage cost scales with model and task.</p></section>`), {
    seat_monthly_usd: 20, usage_at_api_rates: true, seat_billing_period: "annual",
  });
  assert.equal(readEnterpriseSeat("<div>Team</div>"), null);
});

test("reads current Enterprise support terms and preserves dates on a layout change", () => {
  const terms = `<html>${table(["", "Self-serve", "Sales-assisted"], [
    ["Minimum number of seats", "20", "50"],
  ])}<p>Usage isn't included in the seat fee. Every token is billed at standard API rates.</p>
  <p>Usage-based Enterprise plans have no plan or seat-level usage limits.</p>
  <p>Seat-based Enterprise plans haven't changed. Some organizations retain Standard and Premium seats until migration.</p></html>`;
  assert.deepEqual(readEnterpriseTerms(terms), {
    self_serve_minimum_seats: 20,
    sales_assisted_minimum_seats: 50,
    usage_billing: "Usage is billed separately at standard API rates based on actual team consumption.",
    usage_limits: "Usage-based Enterprise plans have no plan or seat-level usage limits; administrators can set spend limits.",
    sales_assisted_options: "Invoicing, multi-currency billing, and HIPAA-readiness/BAA are available through sales.",
    legacy_note: "Some organizations remain on older seat-based Enterprise plans with Standard and Premium seats and per-seat limits until they migrate to usage-based billing.",
  });
  assert.equal(readEnterpriseTerms("<html>Enterprise</html>"), null);
});

test("reads Anthropic's grouped pricing tables and current status badges", () => {
  const modelCell = (name, slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), badge = "") =>
    `<a href="/docs/en/models/${slug}/overview">${name}</a>${badge ? `<button aria-label="${name} (${badge})">i</button>` : ""}`;
  const retiredCell = `<div aria-label="Claude Opus 4.1 (Retired)">Claude Opus 4.1</div>`;
  const main = groupedTable(["Model", "Base tokens", "Prompt caching"], ["Name", "Input", "Output", "5m writes", "1h writes", "Hits and refreshes"], [
    [modelCell("Claude Fable 5.1", "fable-5-1"), $(10), $(50), $(12.5), $(20), $(0.25)],
    [modelCell("Claude Opus 5.5", "opus-5-5"), $(4), $(20), $(5), $(8), $(0.2)],
    [modelCell("Claude Sonnet 5", "sonnet-5"), $(2), $(10), $(2.5), $(4), $(0.2)],
    [modelCell("Claude Mythos 5.1", "mythos-5-1", "Invite only"), $(10), $(50), $(12.5), $(20), $(0.25)],
    [retiredCell, $(15), $(75), $(18.75), $(30), $(1.5)],
  ]);
  const batch = groupedTable(["Model", "Batch tokens"], ["Name", "Input", "Output"], [
    [modelCell("Claude Fable 5.1", "fable-5-1"), $(5), $(25)],
    [modelCell("Claude Opus 5.5", "opus-5-5"), $(2), $(10)],
    [modelCell("Claude Sonnet 5", "sonnet-5"), $(1), $(5)],
    [modelCell("Claude Mythos 5.1", "mythos-5-1", "Invite only"), $(5), $(25)],
    [retiredCell, $(7.5), $(37.5)],
  ]);
  const currentText = `<p>All other models use the standard 0.1x multiplier.</p>
    <p>On Claude Fable 5.1, a cache hit costs 2.5% of the standard input price.</p>
    <p>On Claude Opus 5.5, a cache hit costs 5% of the standard input price.</p>
    <p>For Claude 4.6 and later models, using inference_geo: "us" applies a 1.1x pricing multiplier.</p>`;
  const html = `<html>${main}${batch}${currentText}</html>`;
  const rows = readPriceTables(html);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], { name: "Claude Fable 5.1", label: "", retired: false, limited: false, input: 10, write5m: 12.5, write1h: 20, read: 0.25, output: 50, batch: { input: 5, output: 25 } });
  assert.equal(rows[3].limited, true);
  assert.equal(rows[4].name, "Claude Opus 4.1");
  assert.equal(rows[4].retired, true);
  assert.deepEqual(readModifiers(html, rows), { write5m: 1.25, write1h: 2, readDefault: 0.1, readExceptions: [0.025, 0.05], batchPct: 50, usOnly: 1.1 });
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

// The cache-hit rule is a standard multiplier plus one footnote per departing family. A second footnote
// arrived with Claude Opus 5.5 on 2026-09-23 and froze the collector, because the regex required the
// exception to abut "All other models". The count of footnotes is the page's to grow; the sentences
// themselves must still be there.
test("cache-hit exceptions are a list the page may extend, and each still has to be stated", () => {
  const twoFootnotes = `<p>The Batch API allows asynchronous processing of large volumes of requests with a 50% discount on both input and output tokens.</p>
<p><sup>1</sup> Cache hits and refreshes on Claude Fable 5.1 and Claude Mythos 5.1 are priced at 0.025x the base input price.</p>
<p><sup>2</sup> Cache hits and refreshes on Claude Opus 5.5 are priced at 0.05x the base input price.</p>
<p>All other models use the standard 0.1x multiplier.</p>
<p>For Claude 4.6 and later models, specifying US-only inference through the <code>inference_geo</code> parameter incurs a 1.1x multiplier on all token pricing categories.</p>`;
  const rows2 = [...fullRows, row("Claude Opus 5.5", 4, 0.2, "2")];
  const batch2 = [...fullBatch, ["Claude Opus 5.5", $(2), $(10)]];
  const html = `<html>${table(HEAD, rows2)}${twoFootnotes}${table(["Model", "Batch input", "Batch output"], batch2)}</html>`;

  const mod = readModifiers(html, readPriceTables(html));
  assert.deepEqual(mod.readExceptions, [0.025, 0.05]);
  assert.equal(mod.readDefault, 0.1);

  // both exceptions reach the published map, keyed by the model whose own row states that ratio
  const r = parseClaudeApiCatalog(html, deprecations, previous, { enterpriseHtml: enterprise, today: "2026-09-23" });
  assert.deepEqual(r.pricing_modifiers.prompt_cache_read_multiplier_exceptions, { "claude-fable-5-1": 0.025, "claude-opus-5-5": 0.05 });
  assert.equal(r.pricing_modifiers.prompt_cache_read_multiplier, 0.1);

  // fails closed: the standard sentence, or every footnote, going missing is still a layout change
  assert.throws(() => readModifiers(html.replace("All other models use the standard 0.1x multiplier.", ""), readPriceTables(html)), /multiplier text not found/);
  assert.throws(() => readModifiers(html.replaceAll("priced at", "priced around"), readPriceTables(html)), /multiplier text not found/);
  // a model at the standard rate is not an exception, however the page words it
  assert.equal(Object.keys(parseClaudeApiCatalog(pricing(fullRows, fullBatch), deprecations, previous, { enterpriseHtml: enterprise, today: "2026-09-23" })
    .pricing_modifiers.prompt_cache_read_multiplier_exceptions).includes("claude-opus-5"), false);
});
