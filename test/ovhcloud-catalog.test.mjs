import test from "node:test";
import assert from "node:assert/strict";
import { readCards, parseOvhcloudCatalog } from "../lib/ovhcloud-catalog.mjs";

const price = (value, unit) => `<div class="d-flex"><h2 class="_text--heading-2 Models_priceMain__yxl2K" data-ods="text">${value}<!-- -->€</h2><span class="_text--caption m-2" data-ods="text">/<!-- -->${unit}</span></div>`;
const card = (slug, title, prices, category = "LLM", ctx = "131<!-- -->K") => `<div data-tc-clic="public-cloud::ai-endpoints::link-discover-catalog-ai-endpoints-${slug}" style="cursor:pointer"><div class="_card"><span class="_text--caption_1aw48_2" data-ods="text">${category}</span><h3 class="_text--heading-3 Models_modelTitle__HWqKA" data-ods="text">${title}</h3><div class="Models_price__VnaI3">${prices}</div><p><strong>Max. context size<!-- -->:</strong> <!-- -->${ctx}</p></div></div>`;
const chat = (slug, title, i, o) => card(slug, title, price(i, "Mtoken(input)") + price(o, "Mtoken(output)"));
const page = (...cards) => `<html><div class="models-listing">${cards.join("")}</div></html>`;
const fx = { rate: 1.1592, date: "2026-09-11" };
const previous = { models: [
  { model_name: "gpt-oss-120b", model_id: "gpt-oss-120b", provider_org: "OpenAI", input_per_1m_eur: 0.08, output_per_1m_eur: 0.4, input_per_1m_usd: 0.09, output_per_1m_usd: 0.46, currency: "EUR", region: "eu", eu_hosted: true, notes: "Apache 2.0; FP4" },
  { model_name: "Llama 3.3 70B", model_id: "Meta-Llama-3_3-70B-Instruct", provider_org: "Meta", input_per_1m_eur: 0.67, output_per_1m_eur: 0.67, currency: "EUR", region: "eu", eu_hosted: true, notes: "Llama licence" },
] };

test("reads cards: title, category, context and unit-labelled EUR prices", () => {
  const cards = readCards(page(chat("gpt-oss-120b", "gpt-oss-120b", "0.08", "0.4"), card("bge-m3", "bge-m3", price("0.01", "Mtoken"), "EMBEDDINGS", "8<!-- -->K")));
  assert.deepEqual(cards[0], { slug: "gpt-oss-120b", title: "gpt-oss-120b", category: "LLM", inputEur: 0.08, outputEur: 0.4, context: "131K" });
  assert.equal(cards[1].inputEur, null);
  assert.throws(() => readCards("<html></html>"), /no model cards/);
  assert.throws(() => readCards(page(chat("x", "X", "free", "0.4"))), /unreadable price/);
});

test("keeps curated rows by model_id, converts with ECB, skips non-token cards, derives new ones", () => {
  const { models, skipped, diff } = parseOvhcloudCatalog(page(
    chat("gpt-oss-120b", "gpt-oss-120b", "0.08", "0.4"),
    chat("meta-llama-3-3-70b-instruct", "Meta-Llama-3_3-70B-Instruct", "0.74", "0.74"),
    card("whisper-large-v3", "whisper-large-v3", price("0.00004", "second")),
    chat("qwen-3-8-27b", "Qwen3.8-27B", "0.4", "2.7"),
    chat("gpt-oss-120b", "gpt-oss-120b", "0.08", "0.4"),
  ), previous, fx);
  assert.equal(models.length, 3);
  assert.equal(models[0].notes, "Apache 2.0; FP4");
  assert.equal(models[0].output_per_1m_usd, 0.46);
  assert.equal(models[1].model_name, "Llama 3.3 70B");
  assert.equal(models[1].input_per_1m_usd, 0.86);
  assert.equal(models[2].mapping, "derived");
  assert.equal(models[2].provider_org, "Alibaba");
  assert.equal(models[2].output_per_1m_usd, 3.13);
  assert.deepEqual(skipped, ["whisper-large-v3"]);
  assert.deepEqual(diff, { added: ["Qwen3.8-27B"], removed: [], eur_price_changed: ["Meta-Llama-3_3-70B-Instruct"] });
});

test("fails closed on missing FX, conflicting duplicates, empty scope and large loss", () => {
  const html = page(chat("gpt-oss-120b", "gpt-oss-120b", "0.08", "0.4"), chat("meta-llama-3-3-70b-instruct", "Meta-Llama-3_3-70B-Instruct", "0.67", "0.67"));
  assert.throws(() => parseOvhcloudCatalog(html, previous, null), /FX/);
  assert.throws(() => parseOvhcloudCatalog(page(chat("gpt-oss-120b", "gpt-oss-120b", "0.08", "0.4"), chat("gpt-oss-120b", "gpt-oss-120b", "0.09", "0.4")), previous, fx), /different prices/);
  assert.throws(() => parseOvhcloudCatalog(page(card("bge-m3", "bge-m3", price("0.01", "Mtoken"))), previous, fx), /no priced/);
  assert.throws(() => parseOvhcloudCatalog(page(chat("new", "New", "1", "1")), previous, fx), /refusing/);
});
