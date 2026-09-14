import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanLabel, lookupPriceRef, parseVertexCatalog, readVertexTables } from "../lib/google-vertex-catalog.mjs";

// A miniature of the real page: devsite tab buttons + tabpanels, headings, and tables whose first cell is only
// filled on a model's first row (the page's own layout).
const tabs = (group, labels) => `<div>${labels.map((l, i) => `<button class="x" role="tab" id="tab-${group}-t${i}" track-metadata-eventdetail="${l}">${l}</button>`).join("")}</div>`;
const panel = (group, i, body) => `<div role="tabpanel" aria-labelledby="tab-${group}-t${i}"><span><div class=""><div role="region">${body}</div></div></span></div>`;
const table = (header, rows) => `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td><p>${c}</p></td>`).join("")}</tr>`).join("")}</tbody></table>`;
const G3 = ["Model", "Type", "Region", "Price (/1M tokens) &lt;= 200K input tokens", "Price (/1M tokens) &gt; 200K input tokens", "Price (/1M tokens) &lt;= 200K cached input tokens"];
const PARTNER = ["Model", "Type", "Price (/1M tokens) =&lt; 200K input tokens", "Price (/1M tokens) &gt; 200K input tokens"];
const page = ({ flashOut = "$3.75", opusEuIn = "$5.50" } = {}) => [
  "<h3>Gemini 3</h3>",
  tabs("g3", ["Standard Model", "Priority"]),
  panel("g3", 0, table(G3, [
    ["Gemini 3.8 Flash* through December 31, 2026", "Input (text, image, video, audio)", "Global", "$0.75", "$0.75", "$0.075"],
    ["", "", "Non-global", "$0.825", "$0.825", "$0.0825"],
    ["", "Text output (response and reasoning)", "Global", flashOut, flashOut, "N/A"],
    ["", "", "Non-global", "$4.125", "$4.125", "N/A"],
    ["Gemini 3 Flash Preview", "Input (text, image, video)", "Global", "$0.50", "$0.50", "$0.05"],
    ["", "Input (audio)", "Global", "$1.00", "$1.00", "$0.10"],
  ])),
  panel("g3", 1, table(G3.map((h, i) => (i > 2 ? `${h} with Priority` : h)), [["Gemini 3.8 Flash* through December 31, 2026", "Input (text, image, video, audio)", "Global", "$1.35", "$1.35", "$0.135"]])),
  "<h3>Embedding costs</h3>",
  table(["Model", "Type", "Price"], [["Gemini Embedding", "Output", "No charge"]]),
  "<h3>Anthropic&rsquo;s Claude models</h3>",
  tabs("c", ["Global", "EU Multi-Region (EU)"]),
  panel("c", 0, table(PARTNER, [["Opus 5", "Input", "$5.00", "$5.00"], ["", "Output", "$25.00", "$25.00"], ["", "Cache Hit", "$0.50", "$0.50"]])),
  panel("c", 1, table(PARTNER, [["Opus 5", "Input", opusEuIn, opusEuIn], ["", "Output", "$27.50", "$27.50"], ["Claude Fable 5", "Input", "$11.00", "$11.00"], ["", "Input", "$11.00", "$11.00"]])),
  table(PARTNER, [["Claude Opus 4.1", "Input", "$15", "N/A"], ["", "Output", "$75", "N/A"]]),
  "<h3>GLM's models</h3>",
  table(["Model", "Type", "Price /1M (USD)"], [["GLM-5.2", "Input", "$1.40"], ["", "Output", "$4.40"], ["", "Cached Input:", "$0.14"]]),
].join("\n");

const ref = (section, label, extra = {}) => ({ section, label, ...extra });
const G3REF = (label, region) => ref("Gemini 3", label, { pane: "Standard Model", region });
const CLAUDE = "Anthropic’s Claude models";

test("readVertexTables: sections, panes from tab buttons, carried labels, Priority tables skipped, odd cells tolerated", () => {
  const tables = readVertexTables(page());
  assert.deepEqual(tables.map((t) => [t.section, t.pane]), [["Gemini 3", "Standard Model"], ["Embedding costs", null], [CLAUDE, "Global"], [CLAUDE, "EU Multi-Region (EU)"], [CLAUDE, null], ["GLM's models", null]]);
  assert.equal(cleanLabel("Gemini 3.7 Flash * through December 31, 2026"), "Gemini 3.7 Flash through December 31, 2026");
  assert.deepEqual(tables[0].rows[1], { label: "Gemini 3.8 Flash through December 31, 2026", type: "Input (text, image, video, audio)", region: "Non-global", price: 0.825, cached: 0.0825 });
  assert.ok(Number.isNaN(tables[1].rows[0].price), "unparseable cells are marked, not fatal");
  assert.throws(() => readVertexTables("<p>nothing</p>"), /no standard price tables/);
});

test("lookupPriceRef: region column, panes, cache from column or Cache Hit row, missing and unreadable rows", () => {
  const tables = readVertexTables(page());
  assert.deepEqual(lookupPriceRef(tables, G3REF("Gemini 3.8 Flash through December 31, 2026", "Non-global")), { status: "ok", input: 0.825, output: 4.125, cached: 0.0825 });
  assert.deepEqual(lookupPriceRef(tables, ref(CLAUDE, "Opus 5", { pane: "EU Multi-Region (EU)" })), { status: "ok", input: 5.5, output: 27.5, cached: null });
  assert.deepEqual(lookupPriceRef(tables, ref(CLAUDE, "Opus 5", { pane: "Global" })), { status: "ok", input: 5, output: 25, cached: 0.5 });
  assert.deepEqual(lookupPriceRef(tables, ref(CLAUDE, "Claude Opus 4.1")), { status: "ok", input: 15, output: 75, cached: null });
  assert.deepEqual(lookupPriceRef(tables, ref("GLM's models", "GLM-5.2")), { status: "ok", input: 1.4, output: 4.4, cached: 0.14 });
  assert.deepEqual(lookupPriceRef(tables, G3REF("Gemini 3 Flash Preview", "Global")), { status: "unreadable", reason: "no output price row" }, "audio input is not the text input, and a missing output row is not guessed");
  assert.deepEqual(lookupPriceRef(tables, ref(CLAUDE, "Claude Fable 5", { pane: "EU Multi-Region (EU)" })), { status: "unreadable", reason: "no output price row" }, "the page's own duplicated Input row");
  assert.deepEqual(lookupPriceRef(tables, ref(CLAUDE, "Opus 5")), { status: "missing" }, "a pane-less ref does not read a pane table");
  assert.equal(lookupPriceRef(readVertexTables(page({ flashOut: "Contact sales" })), G3REF("Gemini 3.8 Flash through December 31, 2026", "Global")).status, "unreadable");
});

test("parseVertexCatalog: re-prices by price_ref, keeps unconfirmed rows with their old check date, fails closed", () => {
  const previous = { collected_at: "2026-09-08", models: [
    { model_name: "Gemini 3.8 Flash", input_per_1m_usd: 0.75, output_per_1m_usd: 3.75, region: "global", price_ref: G3REF("Gemini 3.8 Flash through December 31, 2026", "Global") },
    { model_name: "Claude Opus 5", input_per_1m_usd: 5.5, output_per_1m_usd: 27.5, region: "eu", cache_read_per_1m_usd: 0.55, price_ref: ref(CLAUDE, "Opus 5", { pane: "EU Multi-Region (EU)" }) },
    { model_name: "Gemini 3 Flash", input_per_1m_usd: 0.5, output_per_1m_usd: 3, region: "global", price_ref: G3REF("Gemini 3 Flash Preview", "Global") },
    { model_name: "Kimi-K2-Thinking", input_per_1m_usd: 0.6, output_per_1m_usd: 2.5, region: "global", price_ref: ref("Moonshot's models", "Kimi-K2-Thinking") },
    { model_name: "Legacy", input_per_1m_usd: 1, output_per_1m_usd: 2, region: "global" },
  ] };
  const { models, confirmed, diff } = parseVertexCatalog(page({ opusEuIn: "$6.05" }), previous, { today: "2026-09-14" });
  assert.equal(confirmed, 2);
  assert.deepEqual(models.map((m) => [m.model_name, m.input_per_1m_usd, m.output_per_1m_usd, m.price_checked_at]), [
    ["Gemini 3.8 Flash", 0.75, 3.75, "2026-09-14"], ["Claude Opus 5", 6.05, 27.5, "2026-09-14"], ["Gemini 3 Flash", 0.5, 3, "2026-09-08"], ["Kimi-K2-Thinking", 0.6, 2.5, "2026-09-08"], ["Legacy", 1, 2, undefined],
  ]);
  assert.equal(models[1].cache_read_per_1m_usd, 0.55, "no readable cache price: the old one stays");
  assert.deepEqual(diff.price_changed, ["Claude Opus 5 [eu]: 5.5/27.5 -> 6.05/27.5"]);
  assert.match(diff.unreadable[0], /^Gemini 3 Flash \[global\]/);
  assert.match(diff.unlisted[0], /^Kimi-K2-Thinking \[global\] \(Moonshot's models \/ Kimi-K2-Thinking not on the page\)/);
  assert.deepEqual(diff.unmapped, ["Legacy"]);
  assert.ok(diff.unreferenced.includes("Anthropic’s Claude models / Claude Fable 5") && !diff.unreferenced.some((u) => u.startsWith("GLM")), "hints only for tracked sections");
  const swapped = parseVertexCatalog(page({ opusEuIn: "$99" }), { models: previous.models.slice(0, 2) });
  assert.match(swapped.diff.suspicious[0], /input 99 > output 27.5/);
  assert.throws(() => parseVertexCatalog(page(), { models: previous.models.slice(2, 4) }), /only 0\/2 mapped rows readable/);
  assert.throws(() => parseVertexCatalog(page(), { models: [previous.models[4]] }), /no price_ref/);
  assert.throws(() => parseVertexCatalog(page().replace(/role="tabpanel"/g, ""), { models: previous.models.slice(1, 2) }), /no region panes/);
});

test("committed snapshot: every row names its place on the pricing page", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/raw/google-vertex.json", import.meta.url)));
  for (const m of snapshot.models) {
    const r = m.price_ref;
    assert.ok(r && r.section && r.label, m.model_name);
    if (r.section === CLAUDE && m.model_name !== "Claude Opus 4.1") assert.ok(["Global", "EU Multi-Region (EU)", "europe-west 1"].includes(r.pane), `${m.model_name} ${m.region}`);
    if (r.section === "Gemini 3") assert.equal(r.region, m.region === "global" ? "Global" : "Non-global", `${m.model_name} ${m.region}`);
  }
});
