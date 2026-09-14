import test from "node:test";
import assert from "node:assert/strict";
import { parseNebiusCatalog, previousModelId, regionFlag, derivedModelName } from "../lib/nebius-catalog.mjs";

const entry = (id, input, output, country = "FI", extra = {}) => ({
  type: "text2text", name: id.split("/").pop(), status: "active", vendor: id.split("/")[0].toLowerCase(),
  flavors: [{ model_id: id, model_type: "text2text", model_name: id.split("/").pop(), label: "cheap", regions: [{ country_code: country, name: `${country.toLowerCase()}-1` }], max_model_len: 262144, input_price_per_million_tokens: input, output_price_per_million_tokens: output }],
  ...extra,
});
const previous = { models: [
  { model_name: "Kimi K3", provider_org: "Moonshot AI", input_per_1m_usd: 3, output_per_1m_usd: 15, region: "eu", notes: "flavor: cheap; served region: eu-west2 (France); id moonshotai/Kimi-K3; 1024K ctx" },
  { model_name: "GLM 5.2", provider_org: "Z.ai", input_per_1m_usd: 1.4, output_per_1m_usd: 4.4, region: "uk", notes: "id zai-org/GLM-5.2; 1024K ctx. Re-listed" },
] };

test("previous ids come from model_id or the curated notes", () => {
  assert.equal(previousModelId(previous.models[0]), "moonshotai/Kimi-K3");
  assert.equal(previousModelId({ notes: "id zai-org/GLM-5.3-Flash. added" }), "zai-org/GLM-5.3-Flash");
  assert.equal(previousModelId({ model_id: "a/b", notes: "id c/d" }), "a/b");
  assert.equal(previousModelId({ notes: "none" }), null);
});

test("Nebius catalog keeps curated names by exact id and records region, status and price changes", () => {
  const { models, diff } = parseNebiusCatalog([
    entry("moonshotai/Kimi-K3", 3, 15, "FR"),
    entry("zai-org/GLM-5.2", 1.2, 4.4, "US", { status: "error" }),
  ], previous);
  assert.equal(models[0].model_name, "Kimi K3");
  assert.equal(models[0].region, "eu");
  assert.equal(models[0].model_id, "moonshotai/Kimi-K3");
  assert.equal(models[0].context_length, 262144);
  assert.equal(models[0].mapping, undefined);
  assert.equal(models[1].status, "error");
  assert.match(models[1].notes, /catalog status: error/);
  assert.deepEqual(diff, { added: [], removed: [], price_changed: ["zai-org/GLM-5.2"], region_changed: ["zai-org/GLM-5.2"] });
});

test("new ids are derived, embeddings are skipped, removals are reported", () => {
  const embedding = { ...entry("Qwen/Qwen3-Embedding-8B", 0.01, 0), type: "embedding" };
  embedding.flavors[0].model_type = "embedding";
  const { models, skipped, diff } = parseNebiusCatalog([entry("moonshotai/Kimi-K3", 3, 15, "FR"), entry("zai-org/GLM-5.3", 1.4, 4.4, "US"), embedding], previous);
  const added = models.find((m) => m.model_id === "zai-org/GLM-5.3");
  assert.equal(added.model_name, "GLM 5.3");
  assert.equal(added.provider_org, "Z.ai");
  assert.equal(added.mapping, "derived");
  assert.deepEqual(skipped, ["Qwen/Qwen3-Embedding-8B"]);
  assert.deepEqual(diff.removed, ["zai-org/GLM-5.2"]);
});

test("Nebius catalog fails closed on bad shapes, unknown regions and large id loss", () => {
  assert.throws(() => parseNebiusCatalog([], previous), /no model array/);
  assert.throws(() => parseNebiusCatalog({ data: [] }, previous), /no model array/);
  const noPrice = entry("moonshotai/Kimi-K3", 3, 15);
  delete noPrice.flavors[0].input_price_per_million_tokens;
  assert.throws(() => parseNebiusCatalog([noPrice], previous), /numeric/);
  assert.throws(() => parseNebiusCatalog([entry("moonshotai/Kimi-K3", 3, 15, "XX")], previous), /unknown region/);
  const twoRegions = entry("moonshotai/Kimi-K3", 3, 15);
  twoRegions.flavors[0].regions.push({ country_code: "US", name: "us-central1" });
  assert.throws(() => parseNebiusCatalog([twoRegions], previous), /2 regions/);
  assert.throws(() => parseNebiusCatalog([entry("a/new", 1, 1)], previous), /refusing/);
});

test("region flags keep the UK out of the EU", () => {
  assert.equal(regionFlag("FI"), "eu");
  assert.equal(regionFlag("FR"), "eu");
  assert.equal(regionFlag("UK"), "uk");
  assert.equal(regionFlag("US"), "us");
  assert.equal(regionFlag("CH"), null);
  assert.equal(derivedModelName("DeepSeek-V4-Pro-0813"), "DeepSeek V4 Pro 0813");
});
