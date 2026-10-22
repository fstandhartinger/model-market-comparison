import test from "node:test";
import assert from "node:assert/strict";
import { readShellModels, readModelPriceRows, readTierPrices, parseStackitCatalog } from "../lib/stackit-catalog.mjs";

const facts = (rows) => `<table><tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</tbody></table>`;
const section = (name, id, { type = "Chat", category = "LLM-Plus", status = "Supported", context = "262K Token" } = {}) =>
  `<h3 id="x">${name}</h3><a class="sl-anchor-link"><span>Section titled “${name}”</span></a><h4>Full Name: <code>${id}</code></h4><a><span>Section titled “Full Name: ${id}”</span></a><p>About ${name}.</p><h4>Facts</h4><a><span>Section titled “Facts”</span></a>${facts([["URL", "https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1"], ["Type", type], ["Category", category], ["Context length", context], ["Status", status]])}`;
const docs = (...sections) => `<html><div>Last updated on <time>Oct 15, 2026</time></div><h2>Text Models</h2><a><span>Section titled “Text Models”</span></a>${sections.join("")}<h2>Embedding Models</h2><a><span>Section titled “Embedding Models”</span></a>${section("E5 Mistral 7B", "intfloat/e5-mistral-7b-instruct", { type: "Embedding", category: "Embedding-Standard" })}</html>`;

// The product page's per-model "STACKIT AI Model Serving price table" (stackit.com relaunch, 2026-10).
const priceRow = (name, { input = "0.45", output = "0.65", sku = "llm-standard-plus-EU01", outSku = sku, type = "Chat", region = "EU01" } = {}) =>
  `<tr><td><div>${name}</div></td><td><div>${type}</div></td><td><div>${region}</div></td><td><div>${input}€</div></td><td><div>${output === "-" ? "-" : `${output}€`}</div></td><td><div><strong>Input</strong>: Model Serving-${sku}<br /><strong>Output</strong>: Model Serving-${outSku}</div></td></tr>`;
const product = (rows) => `<html><table><tr><td>Model</td><td>Type</td><td>Region</td><td>Input token price (per 1M token)</td><td>Output token price (per 1M token)</td><td>SKU</td></tr>${rows.join("")}</table></html>`;
const liveRows = [
  priceRow("Google Gemma 4 31b"),
  priceRow("GPT oss 120b"),
  priceRow("GPT oss 20b", { input: "0.15", output: "0.25", sku: "llm-standard-input-EU01", outSku: "llm-standard-output-EU01" }),
  priceRow("Meta Llama 3.3 70B Instruct FP8"),
  priceRow("Qwen3 VL 235B A22B Instruct FP8", { input: "1.50", output: "1.75", sku: "llm-standard-premium-EU01" }),
  priceRow("Qwen3.6 27B"),
  priceRow("Qwen3.8 27B"),
  priceRow("e5 mistral 7b", { input: "0.02", output: "-", sku: "embedding-standard-input-EU0", type: "Embedding" }),
];
const liveProduct = product(liveRows);
const liveDocs = docs(
  section("Qwen3-VL 235B", "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8", { category: "LLM-Premium", context: "200K Token" }),
  section("Qwen3.8 27B", "Qwen/Qwen3.8-27B"),
  section("Qwen3.6 27B", "Qwen/Qwen3.6-27B", { status: "Deprecated" }),
  section("Llama 3.3 70B", "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic"),
  section("GPT-OSS 120B", "openai/gpt-oss-120b"),
  section("Gemma 4 31B", "google/gemma-4-31B-it"),
  section("GPT-OSS 20B", "openai/gpt-oss-20b", { category: "LLM-Standard", context: "131K Token" }),
);
// The retired pre-relaunch six-row EU01 SKU table must no longer parse as prices.
const oldSku = (tier, dir, price) => `<tr><td><div>Model Serving-llm-${tier}-${dir}-EU01</div></td><td><div>Germany South</div></td><td><div>mio ${dir} token</div></td><td><div>${price} €</div></td></tr>`;
const oldProduct = `<html><table>${[oldSku("standard", "input", "0.15000000000"), oldSku("standard", "output", "0.25000000000"), oldSku("plus", "input", "0.45000000000"), oldSku("plus", "output", "0.65000000000"), oldSku("premium", "input", "1.50000000000"), oldSku("premium", "output", "1.75000000000")].join("")}</table></html>`;

const fx = { rate: 1.1592, date: "2026-09-11" };
const previous = { models: [
  { model_name: "Qwen3.6 27B", model_id: "Qwen/Qwen3.6-27B", provider_org: "Alibaba", billing_category: "LLM-Plus", input_per_1m_eur: 0.45, output_per_1m_eur: 0.65, status: "supported", context_length_label: "262K", notes: "curated note" },
  { model_name: "gpt-oss-20b", model_id: "openai/gpt-oss-20b", provider_org: "OpenAI", billing_category: "LLM-Standard", input_per_1m_eur: 0.15, output_per_1m_eur: 0.25, status: "supported", context_length_label: "131K" },
] };

test("reads Chat models, categories, status, context and the docs date", () => {
  const { models, updated } = readShellModels(docs(section("Qwen3.8 27B", "Qwen/Qwen3.8-27B"), section("GPT-OSS 20B", "openai/gpt-oss-20b", { category: "LLM-Standard", context: "131K Token" })));
  assert.equal(updated, "2026-10-15");
  assert.deepEqual(models, [
    { name: "Qwen3.8 27B", id: "Qwen/Qwen3.8-27B", category: "LLM-Plus", type: "Chat", status: "supported", context: "262K" },
    { name: "GPT-OSS 20B", id: "openai/gpt-oss-20b", category: "LLM-Standard", type: "Chat", status: "supported", context: "131K" },
  ]);
  assert.throws(() => readShellModels("<html></html>"), /no Text Models section/);
  assert.throws(() => readShellModels(docs(section("X", "x/x", { category: "LLM-Ultra" }))), /unknown billing category/);
});

test("reads the per-model price table into tiers; embedding rows are out of scope", () => {
  const rows = readModelPriceRows(liveProduct);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.find((r) => r.name === "Qwen3 VL 235B A22B Instruct FP8"), { name: "Qwen3 VL 235B A22B Instruct FP8", input: 1.5, output: 1.75, inSku: "llm-standard-premium-EU01", outSku: "llm-standard-premium-EU01" });
  assert.deepEqual(readTierPrices(liveProduct), { "LLM-Standard": { input: 0.15, output: 0.25 }, "LLM-Plus": { input: 0.45, output: 0.65 }, "LLM-Premium": { input: 1.5, output: 1.75 } });
});

test("price table fails closed: old layout, missing tier, conflicts, unknown or mismatched SKUs", () => {
  assert.throws(() => readTierPrices(oldProduct), /no EU01 input\/output price for LLM-Standard/);
  assert.throws(() => readTierPrices(product(liveRows.filter((r) => !r.includes("premium")))), /no EU01 input\/output price for LLM-Premium/);
  assert.throws(() => readTierPrices(product([...liveRows, priceRow("Dup 9B", { input: "0.50" })])), /LLM-Plus input listed twice with different prices/);
  assert.throws(() => readTierPrices(product([...liveRows, priceRow("Ultra 9B", { sku: "llm-standard-ultra-EU01" })])), /unknown input SKU "Model Serving-llm-standard-ultra-EU01"/);
  assert.throws(() => readTierPrices(product([...liveRows, priceRow("Mixed 9B", { sku: "llm-standard-input-EU01", outSku: "llm-standard-plus-EU01" })])), /different tiers/);
  assert.throws(() => readTierPrices(product(liveRows.map((r) => r.replace("EU01", "EU02")))), /no EU01 input\/output price for LLM-Standard/);
});

test("keeps curated rows by model_id, maps tier prices, converts with ECB, derives new models", () => {
  const { models, diff, docs_updated } = parseStackitCatalog(liveDocs, liveProduct, previous, fx);
  assert.equal(docs_updated, "2026-10-15");
  assert.equal(models.length, 7);
  const premium = models.find((m) => m.model_id === "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8");
  assert.equal(premium.mapping, "derived");
  assert.equal(premium.provider_org, "Alibaba");
  assert.equal(premium.input_per_1m_eur, 1.5);
  assert.equal(premium.output_per_1m_eur, 1.75);
  assert.equal(premium.input_per_1m_usd, 1.7388);
  const kept = models.find((m) => m.model_id === "Qwen/Qwen3.6-27B");
  assert.equal(kept.notes, "curated note");
  assert.equal(kept.status, "deprecated");
  const standard = models.find((m) => m.model_id === "openai/gpt-oss-20b");
  assert.equal(standard.output_per_1m_usd, 0.2898);
  assert.deepEqual(diff.added.sort(), ["Qwen/Qwen3-VL-235B-A22B-Instruct-FP8", "Qwen/Qwen3.8-27B", "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic", "openai/gpt-oss-120b", "google/gemma-4-31B-it"].sort());
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.category_or_status_changed, ["Qwen/Qwen3.6-27B"]);
  assert.deepEqual(diff.eur_price_changed, []);
  assert.throws(() => parseStackitCatalog(liveDocs, liveProduct, previous, null), /FX/);
});

test("every docs model must have a matching EU01 price row with the same billing category", () => {
  const missing = docs(section("Nova 9B", "nova/nova-9b"), section("GPT-OSS 20B", "openai/gpt-oss-20b", { category: "LLM-Standard" }));
  assert.throws(() => parseStackitCatalog(missing, liveProduct, { models: [] }, fx), /no EU01 price row for Nova 9B/);
  const mismatch = docs(section("Qwen3.8 27B", "Qwen/Qwen3.8-27B", { category: "LLM-Standard" }), section("GPT-OSS 20B", "openai/gpt-oss-20b", { category: "LLM-Standard" }));
  assert.throws(() => parseStackitCatalog(mismatch, liveProduct, { models: [] }, fx), /Qwen3\.8 27B is billed as LLM-Plus/);
  const ambiguous = docs(section("Llama 3.3", "meta/llama-3.3"));
  assert.throws(() => parseStackitCatalog(ambiguous, product([...liveRows, priceRow("Meta Llama 3.3 8B Instruct")]), { models: [] }, fx), /matches 2 EU01 price rows/);
});

test("refuses to replace the snapshot on a large model loss", () => {
  const grown = product([...liveRows, priceRow("Nova 9B")]);
  assert.throws(() => parseStackitCatalog(docs(section("Nova 9B", "nova/nova-9b")), grown, previous, fx), /refusing/);
});

// CR-534: a single documented delisting is a catalog change, not an alias failure.
test("a delisted Gemma 3 is removed while the retained roster stays complete", () => {
  const prior = { models: [...previous.models, {
    model_name: "Gemma 3 27B", model_id: "google/gemma-3-27b-it",
    provider_org: "Google", billing_category: "LLM-Plus",
    input_per_1m_eur: 0.45, output_per_1m_eur: 0.65, status: "deprecated",
  }] };
  const { models, diff } = parseStackitCatalog(liveDocs, liveProduct, prior, fx);
  assert.deepEqual(diff.removed, ["google/gemma-3-27b-it"]);
  assert.equal(models.length, 7);
  assert.ok(!models.some((model) => model.model_id === "google/gemma-3-27b-it"));
  assert.ok(models.some((model) => model.model_id === "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic"));
  assert.ok(models.some((model) => model.model_id === "google/gemma-4-31B-it"));
});
