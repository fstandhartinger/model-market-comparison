import test from "node:test";
import assert from "node:assert/strict";
import { enrichArtificialAnalysis } from "../lib/aa-metadata.mjs";

test("a newly published API model keeps scores with explicitly unknown metadata", () => {
  const api = [{ id: "known", name: "Known" }, { id: "new", name: "Muse Spark 1.3 (max)", model_creator: { name: "Meta" }, evaluations: { artificial_analysis_intelligence_index: 52 } }];
  const metadata = new Map([["known", { isOpenWeights: false, deprecated: false }], ["leaderboard-only", { isOpenWeights: true }]]);
  const result = enrichArtificialAnalysis(api, metadata);
  assert.equal(result.extraCount, 1); // equal total counts do not mean equal ID sets
  assert.deepEqual(result.missing, [{ id: "new", name: "Muse Spark 1.3 (max)" }]);
  assert.equal(result.models[1].evaluations.artificial_analysis_intelligence_index, 52);
  assert.equal(result.models[1].metadata.is_open_weights, null);
  assert.equal(result.models[1].metadata.deprecated, null);
  assert.equal(result.models[0].metadata.is_open_weights, false);
});

test("broken leaderboard parsing or widespread drift cannot replace a good snapshot", () => {
  assert.throws(() => enrichArtificialAnalysis([], new Map()), /metadata mismatch/);
  assert.throws(() => enrichArtificialAnalysis([{ id: "a" }], new Map()), /metadata mismatch/);
  const metadata = new Map([["known", { isOpenWeights: false }]]);
  const api = ["known", "a", "b", "c"].map((id) => ({ id, name: id }));
  assert.equal(enrichArtificialAnalysis(api, metadata).missing.length, 3);
  assert.throws(() => enrichArtificialAnalysis([...api, { id: "d" }], metadata), /missing=4/);
});

test("slug metadata joins UUID API rows; retained fields keep their original provenance across refreshes", () => {
  const api = [{ id: "uuid", slug: "fixture-model", name: "Fixture" }];
  const previous = { collected_at: "2026-09-09", metadata_endpoint: "https://artificialanalysis.ai/leaderboards/models", models: [{ ...api[0], metadata: { is_open_weights: true, openrouter_api_id: "fixture/model", license_name: "Fixture license" } }] };
  const metadata = new Map([["fixture-model", { isOpenWeights: false, licenseName: null }]]);
  const refreshed = enrichArtificialAnalysis(api, metadata, previous);
  assert.equal(refreshed.models[0].metadata.is_open_weights, false);
  assert.equal(refreshed.models[0].metadata.license_name, null, "published null clears a previously present value");
  assert.equal(refreshed.models[0].metadata.openrouter_api_id, "fixture/model");
  assert.equal(refreshed.models[0].metadata.retained_fields.openrouter_api_id.collected_at, "2026-09-09");
  const next = enrichArtificialAnalysis(api, metadata, { ...previous, collected_at: "2026-09-10", models: refreshed.models });
  assert.equal(next.models[0].metadata.retained_fields.openrouter_api_id.collected_at, "2026-09-09");
  const changed = enrichArtificialAnalysis([{ ...api[0], slug: "different-product" }], new Map([["different-product", { isOpenWeights: false }]]), previous);
  assert.equal(changed.models[0].metadata.openrouter_api_id, null, "no metadata carryover between identities");
});
