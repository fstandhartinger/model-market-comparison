import test from "node:test";
import assert from "node:assert/strict";
import { parseMistralPricing, parseMistralDocsModel, pricedChatCards, cardsNeedingDocs, parseRow, parseCell, nameKey } from "../lib/mistral-catalog.mjs";

// The 7 Oct 2026 layout (docs.mistral.ai/inference/pricing): one table per family section, the unit
// stated above each table, the Standard pricing mode pressed by default.
const sale = (was, now) => `<span><del><span class="sr-only">Original price:<!-- --> </span>$${was}</del><ins><span class="sr-only">Sale price:<!-- --> </span>$${now}</ins></span>`;
const cell = (v) => `<td class="p-2">${v === null ? "—" : typeof v === "number" ? `$${v}` : v}</td>`;
const row = (name, input, cached, output, slug = nameKey(name)) => `<tr class="r"><td class="p-2"><a target="_blank" href="/models/${slug}">${name}<!-- --> <span class="font-mono">↗</span></a></td>${cell(input)}${cell(cached)}${cell(output)}</tr>`;
const section = (unit, ...rows) => `<div><h2>Section</h2><span>Prices ${unit}</span><label><button type="button" role="checkbox" aria-checked="false" data-state="unchecked"></button>Regional inference</label><button class="b" aria-pressed="true">Standard</button><button aria-pressed="false">Batch</button></div>
  <table><thead><tr><th>Model</th><th class="e">Input</th><th>Cached input</th><th>Output</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
const page = (...sections) => `<html><body>${sections.join("\n")}</body></html>`;
const chat = (...rows) => section("/M Tokens", ...rows);
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
  { model_name: "GLM 5.2", source_name: "Z.ai GLM 5.2", provider_org: "Z.ai", input_per_1m_usd: 1.4, output_per_1m_usd: 4.4, cache_read_per_1m_usd: 0.14, region: "eu", api_model_id: "zai-glm-5-2" },
] };

test("cells: bare amounts, sale prices with their list price, other units, dashes and Free", () => {
  assert.deepEqual(parseCell("$0.5"), { price: 0.5, list: null });
  assert.deepEqual(parseCell(sale(1.36, 0.68)), { price: 0.68, list: 1.36 });
  assert.deepEqual(parseCell("$4 /1000 Pages"), { unit: "$4 /1000 Pages" });
  assert.equal(parseCell("—"), null);
  assert.equal(parseCell("Free"), null);
  assert.deepEqual(parseCell(`${sale(2, 1)} /Min`), { unit: "Original price: $2 Sale price: $1 /Min" }, "a unit beside a sale price is not per M tokens");
  const r = parseRow(row("Mistral Large 4", sale(1.36, 0.68), sale(0.14, 0.07), sale(4.18, 2.09), "mistral-large-4-0"));
  assert.equal(r.name, "Mistral Large 4");
  assert.equal(r.docs_url, "https://docs.mistral.ai/models/mistral-large-4-0");
  assert.deepEqual([r.input, r.cached, r.output], [{ price: 0.68, list: 1.36 }, { price: 0.07, list: 0.14 }, { price: 2.09, list: 4.18 }]);
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

test("only per-million-token rows with input and output are chat models; 'Prices as marked' sections are skipped", () => {
  const html = page(
    chat(row("Mistral Large 3", 0.5, 0.05, 1.5), row("Codestral Embed", 0.15, 0.015, null)),
    section("as marked", row("OCR 4.1", "$4 /1000 Pages", "$0.4 /1000 Pages", null), row("Voxtral TTS", "$0 /M Chars", "$0 /M Chars", "$16 /M Chars"), row("Some Bare Model", 1, null, 2)),
    chat(row("Mistral Moderation 2", "Free", "Free", "Free")),
  );
  assert.deepEqual([...pricedChatCards(html).keys()], ["mistrallarge3"]);
});

test("identity is the normalized name (or the name the page last used) against the snapshot; duplicates must agree", () => {
  const html = page(
    chat(row("Mistral Large 3", 0.5, 0.05, 1.5), row("Ministral 3 (3B)", 0.1, null, 0.12)),
    chat(row("Mistral Large 3", 0.5, 0.05, 1.5), row("Z.ai GLM 5.2", 1.4, null, 4.4, "zai-glm-5-2")),
  );
  const { models, diff } = parseMistralPricing(html, previous);
  assert.equal(models.length, 3);
  assert.equal(models[0].api_model_id, "mistral-large-latest");
  assert.equal(models[0].notes, "open-weight");
  assert.equal(models[0].cache_read_per_1m_usd, 0.05);
  assert.equal(models[1].model_name, "Ministral 3 3B");
  assert.equal(models[1].api_model_id, "ministral-3b-latest");
  // "Z.ai GLM 5.2" is the curated "GLM 5.2" by its recorded source name; a lost cached price is named, never carried over.
  assert.equal(models[2].model_name, "GLM 5.2");
  assert.equal(models[2].source_name, "Z.ai GLM 5.2");
  assert.equal(models[2].cache_read_per_1m_usd, undefined);
  assert.deepEqual(diff, { added: [], removed: [], price_changed: ["ministral-3b-latest"], cache_read_dropped: ["GLM 5.2"] });
});

test("a resolved docs page supplies a new model's id, matches a renamed row by API id, and is cross-checked", () => {
  const html = page(chat(
    row("Mistral Large 3", 0.5, 0.05, 1.5),
    row("Ministral 3 (3B)", 0.1, 0.01, 0.1),
    row("Z.ai GLM 5.2 Turbo", 1.4, 0.14, 4.4, "zai-glm-5-2"),
    row("Mistral Large 4", sale(1.36, 0.68), sale(0.14, 0.07), sale(4.18, 2.09), "mistral-large-4-0"),
  ));
  assert.deepEqual(cardsNeedingDocs(html, previous).map((n) => [n.reason, n.card.name]), [["api_id", "Z.ai GLM 5.2 Turbo"], ["api_id", "Mistral Large 4"]]);
  const docs = new Map([
    ["zaiglm52turbo", parseMistralDocsModel(docsPage("zai-glm-5-2", { input: 1.4, cached: 0.14, output: 4.4 }))],
    ["mistrallarge4", parseMistralDocsModel(docsPage("mistral-large-4", { input: 0.68, cached: 0.07, output: 2.09 }))],
  ]);
  const { models, diff } = parseMistralPricing(html, previous, { docs });
  const glm = models.find((m) => m.api_model_id === "zai-glm-5-2");
  assert.equal(glm.model_name, "GLM 5.2");
  assert.equal(glm.mapping, undefined);
  const large4 = models.find((m) => m.api_model_id === "mistral-large-4");
  assert.equal(large4.mapping, "derived");
  assert.equal(large4.provider_org, "Mistral");
  assert.deepEqual([large4.input_per_1m_usd, large4.cache_read_per_1m_usd, large4.output_per_1m_usd], [0.68, 0.07, 2.09]);
  assert.match(large4.notes, /^Sale price on the Mistral pricing page \(list \$1\.36 input \/ \$0\.14 cached \/ \$4\.18 output per M tokens\)\. No end date stated\.$/);
  assert.deepEqual(diff, { added: ["mistral-large-4"], removed: [], price_changed: [], cache_read_dropped: [] });
  // The next run knows the row: no docs read, and "derived" stays out of diff.added.
  assert.deepEqual(cardsNeedingDocs(html, { models }).map((n) => n.card.name), []);
  const again = parseMistralPricing(html, { models });
  assert.deepEqual(again.diff.added, []);
  // The sale note goes when the list price returns; curated notes stay.
  const ended = parseMistralPricing(page(chat(row("Mistral Large 4", 1.36, 0.14, 4.18, "mistral-large-4-0"), row("Mistral Large 3", 0.5, 0.05, 1.5))), { models });
  assert.equal(ended.models[0].notes, undefined);
  assert.equal(ended.models[1].notes, "open-weight");
  // Two first-party pages describing different prices publish nothing.
  const disagreeing = new Map([...docs, ["mistrallarge4", parseMistralDocsModel(docsPage("mistral-large-4", { input: 1.36, output: 4.18 }))]]);
  assert.throws(() => parseMistralPricing(html, previous, { docs: disagreeing }), /input price differs between the pricing page \(\$0.68\) and its docs page \(\$1.36\)/);
});

test("fails closed on layout changes, missing units, conflicting duplicates, unidentifiable models and large loss", () => {
  assert.throws(() => parseMistralPricing("<html></html>", previous), /no pricing tables/);
  // Each section has its own mode controls: one section on Batch, or with the regional surcharge on, fails the refresh.
  const flagship = chat(row("Mistral Large 3", 0.5, 0.05, 1.5), row("Ministral 3 (3B)", 0.1, 0.01, 0.1));
  const batch = chat(row("GLM 5.2", 0.7, 0.07, 2.2)).replace('aria-pressed="true">Standard', 'aria-pressed="false">Standard').replace('aria-pressed="false">Batch', 'aria-pressed="true">Batch');
  assert.throws(() => parseMistralPricing(page(flagship, batch), previous), /not on the Standard pricing mode \(pressed: \["Batch"\]\)/);
  const regional = chat(row("GLM 5.2", 1.4, 0.14, 4.4)).replace('aria-checked="false"', 'aria-checked="true"');
  assert.throws(() => parseMistralPricing(page(flagship, regional), previous), /regional-inference switch is not off/);
  assert.throws(() => parseMistralPricing(page(section("per something", row("Mistral Large 3", 0.5, 0.05, 1.5))), previous), /unit heading/);
  assert.throws(() => parseMistralPricing(page(chat(row("Codestral Embed", 0.15, 0.015, null))), previous), /no priced chat/);
  assert.throws(() => parseMistralPricing(page(chat(row("Mistral Large 3", 0.5, 0.05, 1.5)).replace("<th>Cached input</th>", "<th>Cache</th>")), previous), /unexpected table header/);
  assert.throws(() => parseMistralPricing(page(chat(row("Mistral Large 3", 0.5, "$0.05 /Min", 1.5))), previous), /cached-input price in another unit/);
  assert.throws(() => parseMistralPricing(page(chat(row("Mistral Large 3", 0.5, 0.05, 1.5)), chat(row("Mistral Large 3", 0.6, 0.05, 1.5))), previous), /different prices/);
  const unknown = page(chat(row("Mistral Large 3", 0.5, 0.05, 1.5), row("Ministral 3 (3B)", 0.1, 0.01, 0.1), row("GLM 5.2", 1.4, 0.14, 4.4), row("New Model", 1, null, 2)));
  assert.throws(() => parseMistralPricing(unknown, previous), /no API id for "New Model".*docs page was not resolved/s);
  assert.throws(() => parseMistralPricing(page(chat(row("Mistral Large 3", 0.5, 0.05, 1.5))), previous), /refusing/);
});
