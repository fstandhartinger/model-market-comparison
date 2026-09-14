import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexKey, indexPriceList, parseBedrockPriceLists, requiredIndexes } from "../lib/aws-bedrock-catalog.mjs";

// Synthetic Price List payloads; usagetypes follow the real feed's spelling.
const priceList = (entries) => {
  const products = {}, OnDemand = {};
  entries.forEach(([usagetype, usd, unit = "1K tokens", servicename = "Amazon Bedrock"], i) => {
    const sku = `SKU${i}`;
    products[sku] = { sku, attributes: { usagetype, servicename } };
    OnDemand[sku] = { [`${sku}.T`]: { effectiveDate: "2026-09-01T00:00:00Z", priceDimensions: { [`${sku}.T.R`]: { unit, pricePerUnit: { USD: String(usd) } } } } };
  });
  return { version: "20260911124408", products, terms: { OnDemand } };
};
const meters = (offer, region, input, output, service) => ({ offer, region, input, output, ...(service ? { service } : {}) });

test("indexPriceList: 1K meters x 1000, 1M meters as is, Marketplace meters keyed by servicename, hourly units skipped", () => {
  const plain = indexPriceList(priceList([["EUC1-NovaLite-input-tokens", 0.000078], ["EUC1-X-hours", 5, "Hour"]]));
  assert.deepEqual([...plain.values()].map((v) => v.price), [0.078]);
  const mp = indexPriceList(priceList([
    ["EUC1-MP:EUC1_input_tokens_standard-Units", 5.5, "1M tokens", "Claude Opus 5 (Amazon Bedrock Edition)"],
    ["EUC1-MP:EUC1_input_tokens_standard-Units", 2.2, "1M tokens", "Claude Sonnet 5 (Amazon Bedrock Edition)"],
  ]), { marketplace: true });
  assert.equal(mp.size, 2, "the same usagetype under two services stays two meters");
  assert.throws(() => indexPriceList({ products: {}, terms: { OnDemand: {} } }), /without products/);
  assert.throws(() => indexPriceList(priceList([["EUC1-A-input-tokens", "abc"]])), /unreadable price/);
});

test("re-prices mapped rows per offer and region, keeps unmetered rows, reports changes", () => {
  const previous = { models: [
    { model_name: "Nova Lite", input_per_1m_usd: 0.078, output_per_1m_usd: 0.312, region: "eu-central-1", price_meters: meters("AmazonBedrock", "eu-central-1", "EUC1-NovaLite-input-tokens", "EUC1-NovaLite-output-tokens") },
    { model_name: "Claude Sonnet 5", input_per_1m_usd: 2.2, output_per_1m_usd: 11, region: "eu-central-1 (EU cross-region inference profile)", price_meters: meters("AmazonBedrockFoundationModels", "eu-central-1", "EUC1-MP:EUC1_input_tokens_standard-Units", "EUC1-MP:EUC1_output_tokens_standard-Units", "Claude Sonnet 5 (Amazon Bedrock Edition)") },
    { model_name: "GPT-5.6 Sol", input_per_1m_usd: 4.4, output_per_1m_usd: 22, region: "us-east-1" },
  ] };
  assert.deepEqual(requiredIndexes(previous), [indexKey("AmazonBedrock", "eu-central-1"), indexKey("AmazonBedrockFoundationModels", "eu-central-1")]);
  const indexes = new Map([
    [indexKey("AmazonBedrock", "eu-central-1"), indexPriceList(priceList([["EUC1-NovaLite-input-tokens", 0.000078], ["EUC1-NovaLite-output-tokens", 0.000312]]))],
    [indexKey("AmazonBedrockFoundationModels", "eu-central-1"), indexPriceList(priceList([
      ["EUC1-MP:EUC1_input_tokens_standard-Units", 3.3, "1M tokens", "Claude Sonnet 5 (Amazon Bedrock Edition)"],
      ["EUC1-MP:EUC1_output_tokens_standard-Units", 16.5, "1M tokens", "Claude Sonnet 5 (Amazon Bedrock Edition)"],
      ["EUC1-MP:EUC1_input_tokens_standard-Units", 5.5, "1M tokens", "Claude Opus 5 (Amazon Bedrock Edition)"],
    ]), { marketplace: true })],
  ]);
  const { models, diff } = parseBedrockPriceLists(indexes, previous);
  assert.deepEqual(models.map((m) => [m.input_per_1m_usd, m.output_per_1m_usd]), [[0.078, 0.312], [3.3, 16.5], [4.4, 22]]);
  assert.equal(models[2], previous.models[2]);
  assert.deepEqual(diff.price_changed, ["Claude Sonnet 5: 2.2/11 -> 3.3/16.5 (effective 2026-09-01)"]);
  assert.deepEqual(diff.unmetered, ["GPT-5.6 Sol"]);
});

test("vanished meters drop their row; swapped prices keep the old row; a missing index or mass loss fails closed", () => {
  const row = (name) => ({ model_name: name, input_per_1m_usd: 1, output_per_1m_usd: 4, price_meters: meters("AmazonBedrock", "eu-central-1", `EUC1-${name}-input-tokens`, `EUC1-${name}-output-tokens`) });
  const previous = { models: [row("A"), row("B"), row("C")] };
  const list = (entries) => new Map([[indexKey("AmazonBedrock", "eu-central-1"), indexPriceList(priceList(entries))]]);
  const { models, diff } = parseBedrockPriceLists(list([["EUC1-A-input-tokens", 0.009], ["EUC1-A-output-tokens", 0.002], ["EUC1-B-input-tokens", 0.001], ["EUC1-B-output-tokens", 0.004]]), previous);
  assert.deepEqual(models.map((m) => m.model_name), ["A", "B"]);
  assert.equal(models[0], previous.models[0]);
  assert.match(diff.suspicious[0], /^A: input 9 > output 2/);
  assert.deepEqual(diff.removed, ["C (EUC1-C-input-tokens no longer listed in AmazonBedrock/eu-central-1)"]);
  assert.throws(() => parseBedrockPriceLists(list([["EUC1-B-input-tokens", 0.001], ["EUC1-B-output-tokens", 0.004]]), previous), /only 1\/3 mapped rows/);
  assert.throws(() => parseBedrockPriceLists(new Map(), previous), /was not loaded/);
  assert.throws(() => parseBedrockPriceLists(new Map(), { models: [{ model_name: "x" }] }), /no price_meters/);
});

test("committed snapshot: every row except the Bedrock Mantle GPT-5.x models names its Price List meters", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../data/raw/aws-bedrock.json", import.meta.url)));
  const unmapped = snapshot.models.filter((m) => !m.price_meters).map((m) => m.model_name).sort();
  assert.deepEqual(unmapped, ["GPT-5.4", "GPT-5.5", "GPT-5.6 Luna", "GPT-5.6 Sol", "GPT-5.6 Terra"], "OpenAI models on Bedrock Mantle have no public Price List meter");
  for (const m of snapshot.models.filter((x) => x.price_meters)) {
    const p = m.price_meters;
    assert.ok(["AmazonBedrock", "AmazonBedrockFoundationModels"].includes(p.offer) && p.region && p.input && p.output, m.model_name);
    if (p.offer === "AmazonBedrockFoundationModels") assert.match(p.service, /\(Amazon Bedrock Edition\)$/, m.model_name);
  }
});
