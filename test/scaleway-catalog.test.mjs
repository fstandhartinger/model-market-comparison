import test from "node:test";
import assert from "node:assert/strict";
import { extractNextData, parseEcbUsdRate, parseScalewayCatalog, eurPerMillion } from "../lib/scaleway-catalog.mjs";

const money = (eur) => ({ perMillionTokens: { value: { currencyCode: "EUR", units: Math.floor(eur), nanos: Math.round((eur - Math.floor(eur)) * 1e9) } } });
const api = (apiId, input, output, extra = {}) => ({ apiId, providerName: "Zai", tasks: ["chat", "code"], status: "preview", contextWindow: 256000, regions: [{ region: "fr-par", inputTokenPrice: money(input), outputTokenPrice: money(output) }], ...extra });
const fx = { rate: 1.1592, date: "2026-09-11" };
const previous = { models: [
  { model_name: "GLM 5.2", provider_org: "Z.ai", input_per_1m_usd: 2.09, output_per_1m_usd: 6.39, region: "eu", notes: "€1.80/€5.50; glm-5.2" },
  { model_name: "DeepSeek V4 Flash 0731", provider_org: "DeepSeek", input_per_1m_usd: 0.46, output_per_1m_usd: 0.93, region: "eu", notes: "€0.40/€0.80 (cached €0.08); deepseek-v4-flash-0731; added 2026-08-26" },
] };

test("reads the structured catalog and the ECB rate", () => {
  const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { externalData: { "templates.pricing-page": { catalogProducts: { generativeApis: { models: [api("glm-5.2", 1.8, 5.5)] } } } } } } })}</script></html>`;
  assert.equal(extractNextData(html)[0].apiId, "glm-5.2");
  assert.throws(() => extractNextData("<html></html>"), /no __NEXT_DATA__/);
  assert.deepEqual(parseEcbUsdRate("<Cube time='2026-09-11'><Cube currency='USD' rate='1.1592'/></Cube>"), fx);
  assert.throws(() => parseEcbUsdRate("<Cube time='2026-09-11'><Cube currency='USD' rate='11.592'/></Cube>"), /plausible/);
  assert.equal(eurPerMillion({ perMillionTokens: { value: { currencyCode: "EUR", units: 1, nanos: 800000000 } } }), 1.8);
  assert.throws(() => eurPerMillion({ perMillionTokens: { value: { currencyCode: "USD", units: 1, nanos: 0 } } }), /currency/);
});

test("keeps curated names by slug, converts with the ECB rate, keeps the notes identity format", () => {
  const cachedFlash = api("deepseek-v4-flash-0731", 0.4, 0.8, { providerName: "Deepseek" });
  cachedFlash.regions[0].inputCachedTokenPrice = money(0.08);
  const embedding = { apiId: "qwen3-embedding-8b", tasks: ["embeddings"], regions: [{ region: "fr-par", inputTokenPrice: money(0.1) }] };
  const { models, skipped, diff } = parseScalewayCatalog([api("glm-5.2", 1.8, 5.5), cachedFlash, embedding, api("qwen3.9-27b", 0.3, 1.2, { providerName: "Qwen" })], previous, fx);
  assert.equal(models[0].model_name, "GLM 5.2");
  assert.equal(models[0].input_per_1m_usd, 2.09);
  assert.equal(models[0].output_per_1m_usd, 6.38);
  assert.match(models[0].notes, /^€1\.80\/€5\.50; glm-5\.2;/);
  assert.equal(models[1].cache_read_per_1m_usd, 0.09);
  assert.match(models[1].notes, /^€0\.40\/€0\.80 \(cached €0\.08\); deepseek-v4-flash-0731;/);
  assert.equal(models[2].mapping, "derived");
  assert.equal(models[2].provider_org, "Alibaba");
  assert.deepEqual(skipped, ["qwen3-embedding-8b"]);
  assert.deepEqual(diff, { added: ["qwen3.9-27b"], removed: [], eur_price_changed: [] });
});

test("reports EUR price changes and fails closed on missing FX, empty scope or large loss", () => {
  const { diff } = parseScalewayCatalog([api("glm-5.2", 1.6, 5.5), api("deepseek-v4-flash-0731", 0.4, 0.8)], previous, fx);
  assert.deepEqual(diff.eur_price_changed, ["glm-5.2"]);
  assert.throws(() => parseScalewayCatalog([api("glm-5.2", 1.8, 5.5)], previous, null), /FX/);
  assert.throws(() => parseScalewayCatalog([{ apiId: "e", tasks: ["embeddings"], regions: [] }], previous, fx), /no priced chat/);
  assert.throws(() => parseScalewayCatalog([api("new", 1, 1)], previous, fx), /refusing/);
});
