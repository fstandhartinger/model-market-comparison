import test from "node:test";
import assert from "node:assert/strict";
import { parseMistralPricing, parseMistralDocsModel, pricedChatCards, cardsNeedingDocs, parseCard, nameKey } from "../lib/mistral-catalog.mjs";

const price = (label, value) => `<p>${label} </p><mistral-atom-text-price><span class="x">$${value}</span><span></span></mistral-atom-text-price>`;
const cats = (...slugs) => slugs.map((s) => `<p data-category-slug="${s}">${s}</p>`).join("");
const card = (name, categories, prices, docs = null) => `<mistral-block-card-model class="c">${docs ? `<a href="https://docs.mistral.ai/models/${docs}"></a>` : ""}<div><h3>${name}</h3><span>Open</span><p>Description.</p>${cats(...categories)}${prices}</div></mistral-block-card-model>`;
const chat = (name, i, o, extra = "", docs = null) => card(name, ["text-to-text"], price("Input (/M tokens)", i) + extra + price("Output (/M tokens)", o), docs);
const page = (...cards) => `<html><body>${cards.join("\n")}</body></html>`;
// A docs model page: one copyable API id badge, then "$ | amount | label | /M Tokens" blocks, the
// second of which the real page repeats without labels.
const docsPage = (id, { input, cached = null, output }) => `<html><button title="Click to copy: ${id}">${id}</button>
  <div><span>$</span><span>${input}</span><span>Input</span><span>/M Tokens</span>
  ${cached === null ? "" : `<span>$</span><span>${cached}</span><span>Cached input</span><span>/M Tokens</span>`}
  <span>$</span><span>${output}</span><span>Output</span><span>/M Tokens</span></div>
  <div><span>$</span><span>${input}</span><span>/M Tokens</span></div></html>`;

const previous = { models: [
  { model_name: "Mistral Large 3", provider_org: "Mistral", input_per_1m_usd: 0.5, output_per_1m_usd: 1.5, region: "eu", notes: "open-weight", api_model_id: "mistral-large-latest" },
  { model_name: "Ministral 3 3B", provider_org: "Mistral", input_per_1m_usd: 0.1, output_per_1m_usd: 0.1, region: "eu", notes: "edge", api_model_id: "ministral-3b-latest" },
  { model_name: "GLM 5.2", provider_org: "Z.ai", input_per_1m_usd: 1.4, output_per_1m_usd: 4.4, cache_read_per_1m_usd: 0.14, region: "eu", api_model_id: "zai-glm-5-2" },
] };

test("cards yield name, categories, docs link and labelled prices, including the Voxtral text-input label", () => {
  const glm = parseCard(card("GLM 5.2", ["text-to-text", "coding"], price("Input (/M tokens)", 1.4) + price("Cached input (/M tokens)", 0.14) + price("Output (/M tokens)", 4.4), "zai-glm-5-2"));
  assert.deepEqual(glm, { name: "GLM 5.2", docs_url: "https://docs.mistral.ai/models/zai-glm-5-2", categories: ["text-to-text", "coding"], input: 1.4, cached: 0.14, output: 4.4 });
  const vox = parseCard(card("Voxtral Small", ["text-to-text"], price("Audio Input (per min / per M tok)", 0.004) + price("Text Input (per min / per M tok)", 0.1) + price("Output (/M tokens)", 0.4)));
  assert.equal(vox.input, 0.1);
  assert.equal(vox.docs_url, null);
  assert.equal(nameKey("Ministral 3 (3B)"), nameKey("Ministral 3 3B"));
});

test("a docs model page yields the copyable API id and its labelled USD prices", () => {
  assert.deepEqual(parseMistralDocsModel(docsPage("zai-glm-5-3", { input: 1.4, cached: 0.14, output: 4.4 })),
    { api_model_id: "zai-glm-5-3", input: 1.4, cached: 0.14, output: 4.4 });
  assert.deepEqual(parseMistralDocsModel(docsPage("codestral-latest", { input: 0.3, output: 0.9 })).cached, null);
  assert.throws(() => parseMistralDocsModel("<html>no badge</html>"), /exactly one copyable API id/);
  assert.throws(() => parseMistralDocsModel(`<button title="Click to copy: a"></button><button title="Click to copy: b"></button>`), /exactly one copyable API id/);
  assert.throws(() => parseMistralDocsModel(`<button title="Click to copy: x"></button><span>Free</span><span>Input</span><span>/M Tokens</span>`), /without a \$ amount/);
});

test("only text-to-text cards are chat models: classifier and fine-tuning cards are priced per million too", () => {
  const html = page(
    chat("Mistral Large 3", 0.5, 1.5),
    card("Classifier API model (3B)", ["classifier-apis"], price("Training cost (/M tokens)", 1) + price("Input (/M tokens)", 0.1) + price("Output (/M tokens)", 0.1)),
    card("Mistral Embed", ["embedding", "text-to-text"], price("Input (/M tokens)", 0.1)),
    card("OCR 4.1", ["ocr", "multimodal", "text-to-text"], "<p>OCR</p><span>$4</span><p>/ 1000 pages</p>"),
  );
  assert.deepEqual([...pricedChatCards(html).keys()], ["mistrallarge3"]);
});

test("identity is the normalized card name against the curated snapshot; hero copies dedupe", () => {
  const html = page(
    // The hero tile carries no category of its own; the catalog entry below it does.
    card("Mistral Large 3", [], price("Input (/M tokens)", 0.5) + price("Output (/M tokens)", 1.5)),
    chat("Mistral Large 3", 0.5, 1.5),
    chat("Ministral 3 (3B)", 0.1, 0.12),
    chat("GLM 5.2", 1.4, 4.4, "", "zai-glm-5-2"),
  );
  const { models, diff } = parseMistralPricing(html, previous);
  assert.equal(models.length, 3);
  assert.equal(models[0].api_model_id, "mistral-large-latest");
  assert.equal(models[0].notes, "open-weight");
  assert.equal(models[1].model_name, "Ministral 3 3B");
  assert.equal(models[1].api_model_id, "ministral-3b-latest");
  // The pricing page stopped serving cached input; the loss is named, never carried over silently.
  assert.equal(models[2].cache_read_per_1m_usd, undefined);
  assert.deepEqual(diff, { added: [], removed: [], price_changed: ["ministral-3b-latest"], cache_read_dropped: ["GLM 5.2"] });
});

test("a resolved docs page supplies a new model's id and a lost cached price, and is cross-checked", () => {
  const html = page(
    chat("Mistral Large 3", 0.5, 1.5),
    chat("Ministral 3 (3B)", 0.1, 0.1),
    chat("GLM 5.2", 1.4, 4.4, "", "zai-glm-5-2"),
    chat("GLM 5.3", 1.4, 4.4, "", "zai-glm-5-3"),
  );
  assert.deepEqual(cardsNeedingDocs(html, previous).map((n) => [n.reason, n.card.name]), [["cache_read", "GLM 5.2"], ["api_id", "GLM 5.3"]]);
  const docs = new Map([
    ["glm52", parseMistralDocsModel(docsPage("zai-glm-5-2", { input: 1.4, cached: 0.14, output: 4.4 }))],
    ["glm53", parseMistralDocsModel(docsPage("zai-glm-5-3", { input: 1.4, cached: 0.14, output: 4.4 }))],
  ]);
  const { models, diff } = parseMistralPricing(html, previous, { docs });
  const glm53 = models.find((m) => m.api_model_id === "zai-glm-5-3");
  assert.equal(glm53.provider_org, "Z.ai");
  assert.equal(glm53.mapping, "derived");
  assert.equal(glm53.cache_read_per_1m_usd, 0.14);
  assert.equal(models.find((m) => m.api_model_id === "zai-glm-5-2").cache_read_per_1m_usd, 0.14);
  assert.deepEqual(diff, { added: ["zai-glm-5-3"], removed: [], price_changed: [], cache_read_dropped: [] });
  // Two first-party pages describing different list prices publish nothing.
  const disagreeing = new Map([...docs, ["glm53", parseMistralDocsModel(docsPage("zai-glm-5-3", { input: 2.4, output: 4.4 }))]]);
  assert.throws(() => parseMistralPricing(html, previous, { docs: disagreeing }), /input price differs between the pricing page \(\$1.4\) and its docs page \(\$2.4\)/);
});

test("fails closed on layout changes, unpriced labels, conflicting duplicates, unidentifiable models and large loss", () => {
  assert.throws(() => parseMistralPricing("<html></html>", previous), /no model cards/);
  assert.throws(() => parseMistralPricing(page(card("Embed", ["text-to-text"], price("Input (/M tokens)", 1))), previous), /no priced chat/);
  assert.throws(() => parseMistralPricing(page(card("X", ["text-to-text"], "<p>Input (/M tokens)</p><span>Free</span>" + price("Output (/M tokens)", 1))), previous), /without a \$ amount/);
  assert.throws(() => parseMistralPricing(page(chat("Mistral Large 3", 0.5, 1.5), chat("Mistral Large 3", 0.6, 1.5)), previous), /different prices/);
  // A new card whose id the page no longer publishes and whose docs page was not resolved.
  const unknown = page(chat("Mistral Large 3", 0.5, 1.5), chat("Ministral 3 (3B)", 0.1, 0.1), chat("GLM 5.2", 1.4, 4.4), chat("New Model", 1, 2, "", "new-model"));
  assert.throws(() => parseMistralPricing(unknown, previous), /no API id for "New Model".*docs page was not resolved/s);
  assert.throws(() => parseMistralPricing(page(chat("New Model", 1, 2)), previous), /no API id for "New Model".*links no docs model page/s);
  assert.throws(() => parseMistralPricing(page(chat("Mistral Large 3", 0.5, 1.5)), previous), /refusing/);
});
