import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { attachEfficiency } from "../lib/efficiency.mjs";
const read = (name) => JSON.parse(readFileSync(`data/raw/${name}.json`));
const inputs = () => ({ aa: read("artificialanalysis"), aaEfficiency: read("aa-efficiency"), openrouter: read("openrouter"), openrouterEfficiency: read("openrouter-efficiency"), chutesEfficiency: read("chutes-efficiency"), now: new Date().toISOString() });
const bare = (id, sku, offers = []) => ({ id, aa_model_id: null, aa_metadata: { openrouter_api_id: sku }, offers });

test("efficiency joins an exact workload SKU; sibling/ambiguous rows use labelled Chutes fallback", () => {
  const models = [bare("kimi", "moonshotai/kimi-k3"), bare("wrong-version", "moonshotai/kimi-k2"), bare("ambiguous", null, [{ or_model_id: "moonshotai/kimi-k3" }, { or_model_id: "moonshotai/kimi-k2" }])];
  const source = inputs();
  delete source.openrouterEfficiency.models["moonshotai/kimi-k2"];
  source.openrouterEfficiency.rankings.rows = source.openrouterEfficiency.rankings.rows.filter((r) => r.variant_permaslug !== source.openrouter.models.find((m) => m.id === "moonshotai/kimi-k2")?.canonical_slug);
  attachEfficiency(models, source);
  assert.equal(models[0].token_efficiency.input_output_ratio.fallback, false);
  assert.equal(models[0].token_efficiency.input_output_ratio.basis, "derived");
  for (const model of models.slice(1)) {
    assert.equal(model.token_efficiency.input_output_ratio.fallback, true);
    assert.equal(model.token_efficiency.input_output_ratio.basis, "assumed");
    assert.ok(model.token_efficiency.attempts.some((a) => a.source.startsWith("OpenRouter")));
    assert.equal(model.token_efficiency.aa.tokens_per_task, null);
  }
});
test("stale workload observations fall back without changing retained source dates", () => {
  const source = inputs(); source.now = new Date(Date.now() + 90 * 86400000).toISOString();
  const model = bare("kimi", "moonshotai/kimi-k3");
  attachEfficiency([model], source);
  assert.equal(model.token_efficiency.input_output_ratio.fallback, true);
  assert.equal(model.token_efficiency.input_output_ratio.collected_at, source.chutesEfficiency.ratio_provenance.collected_at);
  assert.equal(model.token_efficiency.input_output_ratio.stale, true);
});
test("duplicate endpoint tags and mismatched provider identities never receive a cache rate", () => {
  const source = inputs(); const kimi = source.openrouter.models.find((m) => m.id === "moonshotai/kimi-k3");
  const endpoint = kimi.endpoints[0]; kimi.endpoints.push({ ...endpoint });
  const registry = attachEfficiency([], source).openrouter_endpoints;
  assert.equal(registry[kimi.id][endpoint.tag].status, "ambiguous_endpoint_tag");
  assert.equal(registry[kimi.id][endpoint.tag].cache_hit_rate, null);
  assert.equal(registry[kimi.id][endpoint.tag].cache_read_per_1m, null);
  kimi.endpoints.pop(); endpoint.provider_name = "Different provider";
  assert.equal(attachEfficiency([], source).openrouter_endpoints[kimi.id][endpoint.tag].cache_hit_rate, null);
});
test("built efficiency observations match dated raw identities, exact values and explicit coverage", () => {
  const dataset = JSON.parse(readFileSync("data/dataset.json"));
  const source = inputs();
  const aa = new Map(source.aaEfficiency.rows.map((r) => [r.source_id, r]));
  for (const model of dataset.models) {
    const item = model.token_efficiency;
    assert.ok(item, model.id);
    const ratio = item.input_output_ratio;
    assert.ok(Number.isFinite(ratio.value) && ratio.value >= 0);
    assert.ok(ratio.url && ratio.source && ratio.collected_at);
    assert.equal(ratio.basis, ratio.fallback ? "assumed" : "derived");
    if (item.aa.tokens_per_task) {
      assert.deepEqual(item.aa.tokens_per_task.value, aa.get(model.aa_model_id).tokens_per_task);
      assert.equal(item.aa.tokens_per_task.collected_at, source.aaEfficiency.collected_at);
      assert.equal(item.aa.benchmark_input_output_ratio.interpretation, "benchmark_proxy");
    }
  }
  const registry = dataset.efficiency.openrouter_endpoints;
  let observed = 0;
  for (const [id, endpoints] of Object.entries(registry)) for (const [tag, row] of Object.entries(endpoints)) {
    assert.equal(row.or_model_id, id); assert.equal(row.endpoint_tag, tag);
    if (row.cache_hit_rate) {
      observed++;
      const page = source.openrouterEfficiency.models[id];
      const match = page.endpoints.find((e) => e.endpoint_id === row.endpoint_id);
      assert.equal(match.endpoint_tag, tag);
      assert.equal(match.cache_hit_rate, row.cache_hit_rate.value);
      assert.equal(row.cache_hit_rate.collected_at, page.cache.provenance.collected_at);
      assert.equal(row.cache_hit_rate.summary_window, null);
    }
  }
  assert.equal(observed, dataset.efficiency.coverage.endpoint_pairs_with_cache_hit_rate);
  assert.equal(dataset.efficiency.coverage.openrouter_empirical_models + dataset.efficiency.coverage.global_fallback_models, dataset.models.length);
  assert.equal(dataset.efficiency.coverage.aa_matched_dataset_models + dataset.efficiency.aa_unmatched.value.length, source.aaEfficiency.count);
});
