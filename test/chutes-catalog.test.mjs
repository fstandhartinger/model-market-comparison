import test from "node:test";
import assert from "node:assert/strict";
import { parseChutesCatalog, derivedModelName } from "../lib/chutes-catalog.mjs";

const row = (id, input, output, extra = {}) => ({ id, confidential_compute: true, context_length: 262144, price: { input: { usd: input }, output: { usd: output }, input_cache_read: { usd: input / 10 } }, ...extra });
const previous = { models: [
  { model_name: "Kimi K3", provider_org: "Moonshot AI", input_per_1m_usd: 3, output_per_1m_usd: 15, cache_read_per_1m_usd: 0.3, confidential_compute: true, tee_model_id: "moonshotai/Kimi-K3-TEE", notes: "kept" },
  { model_name: "GLM-5.1", provider_org: "Z.ai", input_per_1m_usd: 0.98, output_per_1m_usd: 3.08, confidential_compute: true, tee_model_id: "zai-org/GLM-5.1-TEE" },
] };

test("Chutes catalog keeps curated names by exact id and strips float noise", () => {
  const { models, diff } = parseChutesCatalog({ data: [row("moonshotai/Kimi-K3-TEE", 3, 15), row("zai-org/GLM-5.1-TEE", 0.98, 3.08)] }, previous);
  assert.equal(models[0].model_name, "Kimi K3");
  assert.equal(models[0].notes, "kept");
  assert.equal(models[0].cache_read_per_1m_usd, 0.3);
  assert.equal(models[0].mapping, undefined);
  assert.deepEqual(diff, { added: [], removed: [], price_changed: ["zai-org/GLM-5.1-TEE"] });
});

test("Chutes catalog marks new ids as derived and reports removals and price changes", () => {
  const { models, diff } = parseChutesCatalog({ data: [row("moonshotai/Kimi-K3-TEE", 2.5, 15), row("Qwen/Qwen3.9-27B-FP8-TEE", 0.3, 2)] }, previous);
  const added = models.find((m) => m.tee_model_id === "Qwen/Qwen3.9-27B-FP8-TEE");
  assert.equal(added.model_name, "Qwen3.9-27B");
  assert.equal(added.provider_org, "Alibaba");
  assert.equal(added.mapping, "derived");
  assert.deepEqual(diff.removed, ["zai-org/GLM-5.1-TEE"]);
  assert.deepEqual(diff.price_changed, ["moonshotai/Kimi-K3-TEE"]);
});

test("Chutes catalog fails closed on missing prices, missing TEE flag, empty data or large id loss", () => {
  assert.throws(() => parseChutesCatalog({ data: [] }, previous), /no data/);
  assert.throws(() => parseChutesCatalog({ data: [{ ...row("a/b-TEE", 1, 1), price: {} }] }, previous), /numeric/);
  assert.throws(() => parseChutesCatalog({ data: [{ ...row("a/b-TEE", 1, 1), confidential_compute: undefined }] }, previous), /confidential/);
  assert.throws(() => parseChutesCatalog({ data: [row("a/b-TEE", 1, 1)] }, { models: [...previous.models, { tee_model_id: "c" }] }), /refusing/);
});

test("context length falls back to max_model_len, then the previous value, never blank", () => {
  const prev = { models: [{ ...previous.models[1], context_length: 202752 }] };
  const noCtx = (extra) => row("zai-org/GLM-5.1-TEE", 0.98, 3.08, { context_length: undefined, ...extra });
  assert.equal(parseChutesCatalog({ data: [noCtx({ max_model_len: 131072 })] }, prev).models[0].context_length, 131072);
  assert.equal(parseChutesCatalog({ data: [noCtx({})] }, prev).models[0].context_length, 202752);
});

test("derived model names drop vendor prefix, TEE and quant suffixes", () => {
  assert.equal(derivedModelName("deepseek-ai/DeepSeek-V4-Flash-0731-TEE"), "DeepSeek-V4-Flash-0731");
  assert.equal(derivedModelName("Nemotron-3-Nano-Omni-30B-TEE"), "Nemotron-3-Nano-Omni-30B");
});
