import test from "node:test";
import assert from "node:assert/strict";
import { parseTSystemsCatalog, readHubTable, parseEur, nameKey, hostingFor } from "../lib/t-systems-catalog.mjs";

const HEAD = "<tr><th>Model</th><th>Provider</th><th>Cloud</th><th>Input</th><th>Output</th><th>Streaming output <span>tip</span></th><th>Tool calling</th><th>Context</th><th>In €/M</th><th>Out €/M</th><th>Cached €/M <span>Price per million prompt tokens</span></th><th>Plans</th></tr>";
const TELEKOM = "<b>Telekom</b> Hosted on T-Cloud Public — Telekom&#39;s sovereign infrastructure in Germany.";
const row = (model, provider, cloud, ctx, i, o, c, plans = "Essential Professional Agentic") => `<tr><td>${model}</td><td>${provider}</td><td>${cloud}</td><td>Text</td><td>Text</td><td>✓</td><td>✓</td><td>${ctx}</td><td>${i}</td><td>${o}</td><td>${c}</td><td>${plans}</td></tr>`;
const page = (...rows) => `<html><table>${HEAD}${rows.join("")}<tr><td colspan="13">No models match the current filters.</td></tr></table></html>`;
const fx = { rate: 1.1592, date: "2026-09-11" };
const previous = { models: [
  { model_name: "GPT OSS 120B", provider_org: "OpenAI", input_per_1m_eur: 0.2, output_per_1m_eur: 0.65, hosting_class: "sovereign_germany", region: "eu", server_location: "Germany", eu_hosted: true, is_externally_hosted: false, status: "active", notes: "old" },
  { model_name: "Gemini 3 Pro (≤200k)", provider_org: "Google", input_per_1m_eur: 1.8, output_per_1m_eur: 10.8, hosting_class: "routed_gcp_eu", region: "eu", status: "active" },
  { model_name: "Gemini 3 Pro (>200k)", provider_org: "Google", input_per_1m_eur: 3.6, output_per_1m_eur: 16.2, hosting_class: "routed_gcp_eu", region: "eu", status: "active" },
  { model_name: "Claude Opus 5", provider_org: "Anthropic", input_per_1m_eur: 4.95, output_per_1m_eur: 24.75, hosting_class: "routed_gcp_eu", server_location: "GCP EU regions", region: "eu", status: "active" },
] };

test("reads the table by header, skips chrome rows, parses EUR and keeps price tiers apart", () => {
  const rows = readHubTable(page(row("GPT-OSS 120B", "OpenAI", TELEKOM, "128K", "€0.20", "€0.65", "€0.03")));
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].model, rows[0].in, rows[0].out, rows[0].cached, rows[0].context], ["GPT-OSS 120B", 0.2, 0.65, 0.03, "128K"]);
  assert.equal(parseEur("—"), null);
  assert.equal(parseEur("n/a"), null);
  assert.throws(() => parseEur("$1.00"), /unreadable/);
  assert.notEqual(nameKey("Gemini 3 Pro (≤200k)"), nameKey("Gemini 3 Pro (>200k)"));
  assert.equal(nameKey("GPT-OSS 120B"), nameKey("GPT OSS 120B"));
  assert.equal(hostingFor("GCP / Azure Google Cloud Platform & Microsoft Azure").hosting_class, "routed_gcp_eu");
  assert.equal(hostingFor("Somewhere else"), null);
  assert.throws(() => readHubTable("<table><tr><th>Model</th></tr></table>"), /header columns missing/);
});

test("merges both tables, keeps audited hosting, converts with ECB, derives new and preview rows", () => {
  const llms = page(
    row("GPT-OSS 120B", "OpenAI", TELEKOM, "128K", "€0.20", "€0.65", "€0.03"),
    row("Gemini 3 Pro (≤200k)", "Google", "GCP Hosted on Google Cloud Platform (EU regions).", "200K", "€1.80", "€10.80", "n/a"),
    row("Gemini 3 Pro (>200k)", "Google", "GCP Hosted on Google Cloud Platform (EU regions).", "1M", "€3.60", "€16.20", "n/a"),
    row("Claude Opus 5", "Anthropic", "GCP / Azure Google Cloud Platform &amp; Microsoft Azure", "1M", "€4.95", "€24.75", "n/a", "Professional Agentic"),
    row("GLM 5.3 Flash", "Zhipu AI", TELEKOM, "1M", "—", "—", "—", "Test"),
  );
  const coding = page(row("GPT-5 Codex", "OpenAI", "Azure Hosted on Microsoft Azure (EU regions).", "400K", "€1.10", "€8.70", "n/a"), row("Claude Opus 5", "Anthropic", "GCP / Azure Google Cloud Platform &amp; Microsoft Azure", "1M", "€4.95", "€24.75", "n/a", "Professional Agentic"));
  const { models, diff } = parseTSystemsCatalog({ llms, coding }, previous, fx, { day: "2026-09-14" });
  const by = Object.fromEntries(models.map((m) => [m.model_name, m]));
  assert.equal(models.length, 6);
  assert.equal(by["GPT OSS 120B"].hosting_class, "sovereign_germany");
  assert.equal(by["GPT OSS 120B"].cache_read_per_1m_eur, 0.03);
  assert.equal(by["GPT OSS 120B"].cache_read_per_1m_usd, 0.03);
  assert.equal(by["GPT OSS 120B"].output_per_1m_usd, 0.75);
  assert.match(by["GPT OSS 120B"].notes, /checked 2026-09-14\. Telekom Hosted/);
  assert.equal(by["Gemini 3 Pro (>200k)"].input_per_1m_usd, 4.17);
  assert.equal(by["Claude Opus 5"].server_location, "GCP EU regions");
  assert.equal(by["GLM 5.3 Flash"].status, "preview");
  assert.equal(by["GLM 5.3 Flash"].input_per_1m_usd, null);
  assert.equal(by["GLM 5.3 Flash"].hosting_class, "sovereign_germany");
  assert.equal(by["GLM 5.3 Flash"].provider_org, "Z.ai");
  assert.equal(by["GPT-5 Codex"].hosting_class, "routed_azure_eu");
  assert.equal(by["GPT-5 Codex"].mapping, "derived");
  assert.deepEqual(diff, { added: ["GLM 5.3 Flash", "GPT-5 Codex"], removed: [], eur_price_changed: [] });
});

test("fails closed on conflicting duplicates, unknown cloud for new models, missing FX and large loss", () => {
  const a = page(row("Claude Opus 5", "Anthropic", "GCP / Azure x", "1M", "€4.95", "€24.75", "n/a"));
  const b = page(row("Claude Opus 5", "Anthropic", "GCP / Azure x", "1M", "€5.95", "€24.75", "n/a"));
  assert.throws(() => parseTSystemsCatalog({ llms: a, coding: b }, previous, fx, { day: "d" }), /differs between tables/);
  assert.throws(() => parseTSystemsCatalog({ llms: page(row("Mystery", "X", "Moon Hosted", "1M", "€1", "€1", "n/a"), row("Claude Opus 5", "Anthropic", "GCP / Azure x", "1M", "€4.95", "€24.75", "n/a"), row("GPT-OSS 120B", "OpenAI", TELEKOM, "128K", "€0.20", "€0.65", "€0.03")) }, previous, fx, { day: "d" }), /unknown Cloud/);
  assert.throws(() => parseTSystemsCatalog({ llms: a }, previous, null, { day: "d" }), /FX/);
  assert.throws(() => parseTSystemsCatalog({ llms: page(row("Only New", "OpenAI", TELEKOM, "1M", "€1", "€1", "n/a")) }, previous, fx, { day: "d" }), /refusing/);
});
