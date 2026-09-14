import test from "node:test";
import assert from "node:assert/strict";
import { readShellModels, readTierPrices, parseStackitCatalog } from "../lib/stackit-catalog.mjs";

const facts = (rows) => `<table><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</tbody></table>`;
const section = (name, id, { type = "Chat", category = "LLM-Plus", status = "Supported", context = "262K Token" } = {}) =>
  `<h3 id="x">${name}</h3><a class="sl-anchor-link"><span>Section titled “${name}”</span></a><h4>Full Name: <code>${id}</code></h4><a><span>Section titled “Full Name: ${id}”</span></a><p>About ${name}.</p><h4>Facts</h4><a><span>Section titled “Facts”</span></a>${facts([["URL", "https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1"], ["Type", type], ["Category", category], ["Context length", context], ["Status", status]])}`;
const docs = (...sections) => `<html><div>Last updated on <time>Sep 8, 2026</time></div><h2>Text Models</h2><a><span>Section titled “Text Models”</span></a>${sections.join("")}<h2>Embedding Models</h2><a><span>Section titled “Embedding Models”</span></a>${section("E5 Mistral 7B", "intfloat/e5-mistral-7b-instruct", { type: "Embedding", category: "Embedding-Standard" })}</html>`;
const sku = (tier, dir, price) => `<tr><td><div>Model Serving-llm-${tier}-${dir}-EU01</div></td><td><div>Germany South</div></td><td><div>mio ${dir} token</div></td><td><div>${price} €</div></td><td><div>1.00 €</div></td></tr>`;
const product = (skus) => `<html><table>${skus.join("")}${sku("embedding-standard".replace("llm-", ""), "input", "0.02000000000").replace("llm-embedding", "embedding")}</table></html>`;
const allSkus = [sku("standard", "input", "0.15000000000"), sku("standard", "output", "0.25000000000"), sku("plus", "input", "0.45000000000"), sku("plus", "output", "0.65000000000"), sku("premium", "input", "1.50000000000"), sku("premium", "output", "1.75000000000")];
const fx = { rate: 1.1592, date: "2026-09-11" };
const previous = { models: [
  { model_name: "Qwen3.6 27B", model_id: "Qwen/Qwen3.6-27B", provider_org: "Alibaba", billing_category: "LLM-Plus", input_per_1m_eur: 0.45, output_per_1m_eur: 0.65, status: "supported", context_length_label: "262K", notes: "curated note" },
  { model_name: "gpt-oss-20b", model_id: "openai/gpt-oss-20b", provider_org: "OpenAI", billing_category: "LLM-Standard", input_per_1m_eur: 0.15, output_per_1m_eur: 0.25, status: "supported", context_length_label: "131K" },
] };

test("reads Chat models, categories, status, context and the docs date", () => {
  const { models, updated } = readShellModels(docs(section("Qwen3.8 27B", "Qwen/Qwen3.8-27B"), section("GPT-OSS 20B", "openai/gpt-oss-20b", { category: "LLM-Standard", context: "131K Token" })));
  assert.equal(updated, "2026-09-08");
  assert.deepEqual(models, [
    { name: "Qwen3.8 27B", id: "Qwen/Qwen3.8-27B", category: "LLM-Plus", type: "Chat", status: "supported", context: "262K" },
    { name: "GPT-OSS 20B", id: "openai/gpt-oss-20b", category: "LLM-Standard", type: "Chat", status: "supported", context: "131K" },
  ]);
  assert.throws(() => readShellModels("<html></html>"), /no Text Models section/);
  assert.throws(() => readShellModels(docs(section("X", "x/x", { category: "LLM-Ultra" }))), /unknown billing category/);
});

test("reads all three EU01 tiers and fails closed on gaps or conflicts", () => {
  assert.deepEqual(readTierPrices(product(allSkus)), { "LLM-Standard": { input: 0.15, output: 0.25 }, "LLM-Plus": { input: 0.45, output: 0.65 }, "LLM-Premium": { input: 1.5, output: 1.75 } });
  assert.throws(() => readTierPrices(product(allSkus.slice(0, 5))), /no EU01 input\/output price for LLM-Premium/);
  assert.throws(() => readTierPrices(product([...allSkus, sku("plus", "input", "0.50000000000")])), /different prices/);
});

test("keeps curated rows by model_id, maps tier prices, converts with ECB, derives new models", () => {
  const { models, diff, docs_updated } = parseStackitCatalog(docs(
    section("Qwen3.8 27B", "Qwen/Qwen3.8-27B"),
    section("Qwen3.6 27B", "Qwen/Qwen3.6-27B", { status: "Deprecated" }),
    section("GPT-OSS 20B", "openai/gpt-oss-20b", { category: "LLM-Standard", context: "131K Token" }),
  ), product(allSkus), previous, fx);
  assert.equal(docs_updated, "2026-09-08");
  assert.equal(models.length, 3);
  assert.equal(models[0].mapping, "derived");
  assert.equal(models[0].provider_org, "Alibaba");
  assert.equal(models[0].input_per_1m_usd, 0.5216);
  assert.equal(models[0].output_per_1m_usd, 0.7535);
  assert.equal(models[1].notes, "curated note");
  assert.equal(models[1].status, "deprecated");
  assert.equal(models[2].output_per_1m_usd, 0.2898);
  assert.deepEqual(diff, { added: ["Qwen/Qwen3.8-27B"], removed: [], category_or_status_changed: ["Qwen/Qwen3.6-27B"], eur_price_changed: [] });
  assert.throws(() => parseStackitCatalog(docs(section("New", "new/new")), product(allSkus), previous, fx), /refusing/);
  assert.throws(() => parseStackitCatalog(docs(section("New", "new/new")), product(allSkus), previous, null), /FX/);
});
