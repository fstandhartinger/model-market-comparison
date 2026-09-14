import test from "node:test";
import assert from "node:assert/strict";
import { parseTensorxPricing, readTable, parsePrice, derivedModelName } from "../lib/tensorx-catalog.mjs";

const HEAD = "<tr><th>Model Name</th><th>Description</th><th>Provider</th><th>Context</th><th>Input Price</th><th>Cache Read</th><th>Output Price</th></tr>";
const row = (slug, ctx, i, c, o) => `<tr><td><span>${slug}</span></td><td>Desc &amp; more</td><td>${slug.split("/")[0]}</td><td>${ctx}</td><td>${i}</td><td>${c}</td><td>${o}</td></tr>`;
const page = (...rows) => `<html><table><thead>${HEAD}</thead><tbody>${rows.join("")}</tbody></table></html>`;
const previous = { models: [
  { model_name: "GLM 5.2", provider_org: "Z.ai", input_per_1m_usd: 1.5, output_per_1m_usd: 4.5, cache_read_per_1m_usd: 0.38, region: "eu", notes: "1M ctx; cache-read $0.38/1M" },
  { model_name: "Qwen3 235B A22B 2507", provider_org: "Alibaba", input_per_1m_usd: 0.07, output_per_1m_usd: 0.46, cache_read_per_1m_usd: 0.02, region: "eu", notes: "131K ctx" },
  { model_name: "DeepSeek V3.2", provider_org: "DeepSeek", input_per_1m_usd: 0.3, output_per_1m_usd: 0.5, region: "eu", notes: "160K ctx" },
] };

test("reads the table by header and parses prices", () => {
  const rows = readTable(page(row("z-ai/glm-5.2", "1M", "$1.50", "$0.38", "$4.50")));
  assert.deepEqual(rows, [{ slug: "z-ai/glm-5.2", context: "1M", input: 1.5, cache: 0.38, output: 4.5 }]);
  assert.equal(parsePrice("-"), null);
  assert.throws(() => parsePrice("€1.50"), /unreadable/);
  assert.throws(() => readTable("<table><tr><th>Model</th></tr></table>"), /header columns missing/);
  assert.throws(() => readTable("<html></html>"), /no <table>/);
  assert.equal(derivedModelName("deepseek/deepseek-v4.1-flash"), "Deepseek V4.1 Flash");
});

test("keeps curated names by slug tail, derives new slugs, drops delisted rows and embeddings", () => {
  const { models, skipped, diff } = parseTensorxPricing(page(
    row("z-ai/glm-5.2", "1M", "$1.50", "$0.38", "$4.60"),
    row("qwen/qwen3-235b-a22b-2507", "131K", "$0.07", "$0.02", "$0.46"),
    row("deepseek/deepseek-v4.1-flash", "1M", "$0.50", "$0.13", "$1.50"),
    row("qwen/qwen3-embedding-8b", "40K", "$0.02", "-", "-"),
  ), previous);
  assert.equal(models[0].model_name, "GLM 5.2");
  assert.equal(models[0].api_model_id, "z-ai/glm-5.2");
  assert.equal(models[0].model_id, undefined);
  assert.equal(models[1].model_name, "Qwen3 235B A22B 2507");
  assert.equal(models[2].mapping, "derived");
  assert.equal(models[2].provider_org, "DeepSeek");
  assert.equal(models[2].cache_read_per_1m_usd, 0.13);
  assert.deepEqual(skipped, ["qwen/qwen3-embedding-8b"]);
  assert.deepEqual(diff, { added: ["deepseek/deepseek-v4.1-flash"], removed: ["DeepSeek V3.2"], price_changed: ["z-ai/glm-5.2"] });
});

test("fails closed on duplicates, odd names and large loss", () => {
  assert.throws(() => parseTensorxPricing(page(row("z-ai/glm-5.2", "1M", "$1", "$0.1", "$2"), row("z-ai/glm-5.2", "1M", "$1", "$0.1", "$2")), previous), /twice/);
  assert.throws(() => parseTensorxPricing(page(row("GLM 5.2", "1M", "$1", "$0.1", "$2")), previous), /unexpected model name/);
  assert.throws(() => parseTensorxPricing(page(row("a/new-model", "1M", "$1", "$0.1", "$2")), previous), /refusing/);
});
