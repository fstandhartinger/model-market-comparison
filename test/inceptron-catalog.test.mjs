import test from "node:test";
import assert from "node:assert/strict";
import { parseInceptronCatalog } from "../lib/inceptron-catalog.mjs";

const model = (id, name, prompt, completion, extra = {}) => ({
  id, name, object: "model", owned_by: id.split("/")[0], quantization: "fp4", context_length: 1048576,
  input_modalities: ["text"], output_modalities: ["text"], supported_features: ["chat", "tools"],
  pricing: { prompt, completion, input_cache_reads: "0.00000018", input_cache_writes: "0", image: "0", request: "0" },
  ...extra,
});
const previous = { models: [
  { model_name: "GLM 5.2", provider_org: "Z.ai", input_per_1m_usd: 1.25, output_per_1m_usd: 2.99, cache_read_per_1m_usd: 0.22, region: "eu", notes: "fp4 quant. Inceptron model id zai-org/GLM-5.2." },
  { model_name: "GLM 5.3", provider_org: "Z.ai", input_per_1m_usd: 1.25, output_per_1m_usd: 4.4, cache_read_per_1m_usd: 0.26, region: "eu", notes: "Added 2026-09-08: api.inceptron.io zai-org/GLM-5.3" },
  { model_name: "DeepSeek V4 Flash 0731", provider_org: "DeepSeek", input_per_1m_usd: 0.13, output_per_1m_usd: 0.28, region: "eu", notes: "Added 2026-08-26" },
] };

test("converts per-token USD to per-1M with four decimals, keeps curated notes, derives new ids", () => {
  const { models, skipped, diff } = parseInceptronCatalog({ data: [
    model("zai-org/GLM-5.2", "GLM 5.2", "0.0000010998", "0.0000029905"),
    model("zai-org/GLM-5.3", "GLM 5.3", "0.00000125", "0.0000044", { pricing: { prompt: "0.00000125", completion: "0.0000044", input_cache_reads: "0.00000026" } }),
    model("deepseek-ai/DeepSeek-V4-Flash-0731", "DeepSeek V4 Flash 0731", "0.000000064", "0.0000001734"),
    model("moonshotai/Kimi-K3", "Kimi K3", "0.0000006", "0.0000025", { input_modalities: ["text", "image"], context_length: 262144, quantization: "int4" }),
    model("BAAI/bge-m3", "bge-m3", "0.00000001", "0", { supported_features: ["embeddings"] }),
  ] }, previous);
  assert.equal(models.length, 4);
  assert.deepEqual(skipped, ["BAAI/bge-m3"]);
  assert.equal(models[0].input_per_1m_usd, 1.0998);
  assert.equal(models[0].output_per_1m_usd, 2.9905);
  assert.equal(models[0].cache_read_per_1m_usd, 0.18);
  assert.equal(models[0].cache_write_per_1m_usd, undefined);
  assert.equal(models[0].notes, "fp4 quant. Inceptron model id zai-org/GLM-5.2.");
  assert.equal(models[0].api_model_id, "zai-org/GLM-5.2");
  assert.equal(models[2].input_per_1m_usd, 0.064);
  assert.equal(models[3].mapping, "derived");
  assert.equal(models[3].provider_org, "Moonshot AI");
  assert.equal(models[3].notes, "Listed by api.inceptron.io/v1/models as moonshotai/Kimi-K3; int4 quant; 262,144 context; text+image");
  assert.deepEqual(diff.added, ["moonshotai/Kimi-K3"]);
  assert.deepEqual(diff.removed, []);
  assert.equal(diff.price_changed.length, 2);
  assert.match(diff.price_changed[0], /^GLM 5\.2: 1\.25\/2\.99 \(cache 0\.22\) -> 1\.0998\/2\.9905 \(cache 0\.18\)$/);
});

test("fails closed on shape changes, unreadable prices, duplicates and large loss", () => {
  assert.throws(() => parseInceptronCatalog({ models: [] }, previous), /no data array/);
  assert.throws(() => parseInceptronCatalog({ data: [model("zai-org/GLM-5.2", "GLM 5.2", "free", "0.000003")] }, previous), /unreadable prompt price/);
  assert.throws(() => parseInceptronCatalog({ data: [model("zai-org/GLM-5.2", "GLM 5.2", "0.000001", "0.000003"), model("zai-org/GLM-5.2", "GLM 5.2", "0.000001", "0.000003")] }, previous), /listed twice/);
  assert.throws(() => parseInceptronCatalog({ data: [model("x/New", "New", "0.000001", "0.000003")] }, previous), /refusing/);
});
