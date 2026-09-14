import test from "node:test";
import assert from "node:assert/strict";
import { parseMistralPricing, parseCard, nameKey } from "../lib/mistral-catalog.mjs";

const price = (label, value) => `<p>${label} </p><mistral-atom-text-price><span class="x">$${value}</span><span></span></mistral-atom-text-price>`;
const card = (name, id, prices) => `<mistral-block-card-model class="c"><a href="#"></a><div><h3>${name}</h3><span>Open</span><p>Description.</p>${prices}<mistral-atom-button-copy-clipboard data-text="${id}"><label>${id}</label></mistral-atom-button-copy-clipboard></div></mistral-block-card-model>`;
const chat = (name, id, i, o, extra = "") => card(name, id, price("Input (/M tokens)", i) + extra + price("Output (/M tokens)", o));
const page = (...cards) => `<html><body>${cards.join("\n")}</body></html>`;
const previous = { models: [
  { model_name: "Mistral Large 3", provider_org: "Mistral", input_per_1m_usd: 0.5, output_per_1m_usd: 1.5, region: "eu", notes: "open-weight" },
  { model_name: "Ministral 3 3B", provider_org: "Mistral", input_per_1m_usd: 0.1, output_per_1m_usd: 0.1, region: "eu", notes: "edge" },
] };

test("cards yield id, name and labelled prices, including the Voxtral text-input label and cached input", () => {
  const glm = parseCard(card("GLM 5.2", "zai-glm-5-2", price("Input (/M tokens)", 1.4) + price("Cached input (/M tokens)", 0.14) + price("Output (/M tokens)", 4.4)));
  assert.deepEqual(glm, { id: "zai-glm-5-2", name: "GLM 5.2", input: 1.4, cached: 0.14, output: 4.4 });
  const vox = parseCard(card("Voxtral Small", "voxtral-small-latest", price("Audio Input (per min / per M tok)", 0.004) + price("Text Input (per min / per M tok)", 0.1) + price("Output (/M tokens)", 0.4)));
  assert.equal(vox.input, 0.1);
  assert.equal(nameKey("Ministral 3 (3B)"), nameKey("Ministral 3 3B"));
});

test("keeps curated rows by normalized name, dedupes hero copies, skips non-chat cards", () => {
  const html = page(
    chat("Mistral Large 3", "mistral-large-latest", 0.5, 1.5),
    chat("Mistral Large 3", "mistral-large-latest", 0.5, 1.5),
    chat("Ministral 3 (3B)", "ministral-3b-latest", 0.1, 0.12),
    card("OCR 4.1", "mistral-ocr-latest", `<p>OCR</p><span>$4</span><p>/ 1000 pages</p>`),
    card("Codestral Embed", "codestral-embed", price("Input (/M tokens)", 0.15)),
    card("Leanstral", "labs-leanstral-2603", ""),
    chat("GLM 5.2", "zai-glm-5-2", 1.4, 4.4, price("Cached input (/M tokens)", 0.14)),
  );
  const { models, diff } = parseMistralPricing(html, previous);
  assert.equal(models.length, 3);
  assert.equal(models[0].notes, "open-weight");
  assert.equal(models[0].api_model_id, "mistral-large-latest");
  assert.equal(models[1].model_name, "Ministral 3 3B");
  const glm = models.find((m) => m.api_model_id === "zai-glm-5-2");
  assert.equal(glm.provider_org, "Z.ai");
  assert.equal(glm.cache_read_per_1m_usd, 0.14);
  assert.equal(glm.mapping, "derived");
  assert.deepEqual(diff, { added: ["zai-glm-5-2"], removed: [], price_changed: ["ministral-3b-latest"] });
});

test("fails closed on layout changes, unpriced labels, conflicting duplicates and large loss", () => {
  assert.throws(() => parseMistralPricing("<html></html>", previous), /no model cards/);
  assert.throws(() => parseMistralPricing(page(card("Embed", "e", price("Input (/M tokens)", 1))), previous), /no priced chat/);
  assert.throws(() => parseMistralPricing(page(card("X", "x", "<p>Input (/M tokens)</p><span>Free</span>" + price("Output (/M tokens)", 1))), previous), /without a \$ amount/);
  assert.throws(() => parseMistralPricing(page(chat("Mistral Large 3", "mistral-large-latest", 0.5, 1.5), chat("Mistral Large 3", "mistral-large-latest", 0.6, 1.5)), previous), /different prices/);
  assert.throws(() => parseMistralPricing(page(chat("New", "new", 1, 1)), previous), /refusing/);
});
