import test from "node:test";
import assert from "node:assert/strict";
import { readPriceTables, parseIonosCatalog } from "../lib/ionos-catalog.mjs";

const td = (inner) => `<td class="tw-whitespace-normal tw-px-5"><div><span>${inner}</span></div></td>`;
const badge = (label) => ` <span class="tw-ml-4 tw-inline-block tw-rounded-sm tw-border-2">${label}</span>`;
const row = (name, i, o, isNew) => `<tr class="tw-border-b-1">${`<td class="tw-text-left"><div><p class="!tw-py-8">${name}${isNew ? badge(isNew) : ""}</p></div></td>`}${td(i)}${td(o)}</tr>`;
const table = (heading, head, rows) => `<span class="tw-block md:tw-text-5xl tw-text-4xl"><div><span>${heading}</span></div></span><div class="tw-mb-48"><table><thead><tr><th>Model</th><th>${head[0]}</th><th>${head[1]}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
const usdHead = ["Price per 1 million input tokens", "Price per 1 million output tokens"];
const eurHead = ["Preis pro 1 Million Input-Token", "Preis pro 1 Million Output-Token"];
const usdPage = (...t) => `<html>${t.join("")}</html>`;
const previous = { models: [
  { model_name: "gpt-oss-120b", provider_org: "OpenAI", input_per_1m_usd: 0.17, output_per_1m_usd: 0.71, region: "eu", notes: "€0.15/€0.65" },
  { model_name: "Llama 3.3 70B", provider_org: "Meta", input_per_1m_usd: 0.71, output_per_1m_usd: 0.71, region: "eu", notes: "€0.65/€0.65" },
  { model_name: "Mistral Small 3.2", provider_org: "Mistral", input_per_1m_usd: 0.11, output_per_1m_usd: 0.33, region: "eu", notes: "€0.10/€0.30 (Mistral Small 24B Instruct)" },
  { model_name: "Qwen3 Coder Next", provider_org: "Alibaba", input_per_1m_usd: 0.17, output_per_1m_usd: 0.89, region: "eu", notes: "€0.15/€0.80; Qwen/Qwen3-Coder-Next; 80B coding specialist" },
] };

test("reads two-token-price tables with section, badge-free names and both number formats", () => {
  const html = usdPage(
    table("Large language models new", usdHead, [`<tr>${td("Model")}${td(usdHead[0])}${td(usdHead[1])}</tr>`, row("Qwen3.8-27B", "$0.45", "$2.70", "New"), row("gpt-oss-120b", "$0.17", "$0.71")]),
    table("Embedding Models", ["Price per 1 million tokens", "Dimensions"], [row("bge-m3", "$0.02", "1024")]),
    table("Code Models", usdHead, [row("Qwen3-Coder-Next (80B)", "$0.17", "$0.89", "New")]),
  );
  assert.deepEqual(readPriceTables(html, "USD"), [
    { section: "Large language models", name: "Qwen3.8-27B", input: 0.45, output: 2.7 },
    { section: "Large language models", name: "gpt-oss-120b", input: 0.17, output: 0.71 },
    { section: "Code Models", name: "Qwen3-Coder-Next (80B)", input: 0.17, output: 0.89 },
  ]);
  const eur = usdPage(table("Large Language Models", eurHead, [row("gpt-oss-120b", "0,15 €", "0.65 €")]));
  assert.deepEqual(readPriceTables(eur, "EUR")[0], { section: "Large Language Models", name: "gpt-oss-120b", input: 0.15, output: 0.65 });
  assert.throws(() => readPriceTables("<html></html>", "USD"), /no token price tables/);
  assert.throws(() => readPriceTables(usdPage(table("LLM", usdHead, [row("x", "free", "$1")])), "USD"), /unreadable price/);
  assert.throws(() => readPriceTables(usdPage(table("LLM", usdHead, [row("x", "$1", "$1"), row("x", "$2", "$1")])), "USD"), /different prices/);
});

test("keeps curated names and note tails, refreshes EUR labels, derives new rows, reports missing EUR", () => {
  const usd = usdPage(table("Large language models", usdHead, [
    row("gpt-oss-120b", "$0.17", "$0.71"), row("Llama 3.3 70B Instruct", "$0.78", "$0.78"),
    row("Mistral Small 24B Instruct", "$0.11", "$0.33"), row("Qwen3.8-27B", "$0.45", "$2.70", "New"),
  ]), table("Code Models", usdHead, [row("Qwen3-Coder-Next (80B)", "$0.17", "$0.89")]));
  const eur = usdPage(table("Large Language Models", eurHead, [
    row("gpt-oss-120b", "0,15 €", "0,65 €"), row("Llama 3.3 70B Instruct", "0,70 €", "0,70 €"),
    row("Mistral Small 24B Instruct", "0,10 €", "0,30 €"), row("Qwen3-Coder-Next (80B)", "0,15 €", "0,80 €"),
  ]));
  const { models, eur_missing, diff } = parseIonosCatalog(usd, eur, previous);
  assert.equal(models.length, 5);
  assert.equal(models[0].notes, "€0.15/€0.65");
  assert.equal(models[1].model_name, "Llama 3.3 70B");
  assert.equal(models[1].notes, "€0.70/€0.70");
  assert.equal(models[2].model_name, "Mistral Small 3.2");
  assert.equal(models[2].notes, "€0.10/€0.30 (Mistral Small 24B Instruct)");
  assert.equal(models[3].mapping, "derived");
  assert.equal(models[3].provider_org, "Alibaba");
  assert.equal(models[3].notes, "EUR price not listed on cloud.ionos.de/preise at collection time; Qwen3.8-27B");
  assert.equal(models[4].model_name, "Qwen3 Coder Next");
  assert.equal(models[4].notes, "€0.15/€0.80; Qwen/Qwen3-Coder-Next; 80B coding specialist");
  assert.equal(models[4].catalog_section, "Code Models");
  assert.deepEqual(eur_missing, ["Qwen3.8-27B"]);
  assert.deepEqual(diff, { added: ["Qwen3.8-27B"], removed: [], usd_price_changed: ["Llama 3.3 70B"] });
});

test("fails closed when most previous models disappear", () => {
  const usd = usdPage(table("Large language models", usdHead, [row("Brand New", "$1", "$1")]));
  const eur = usdPage(table("Large Language Models", eurHead, [row("Brand New", "1 €", "1 €")]));
  assert.throws(() => parseIonosCatalog(usd, eur, previous), /refusing/);
});
