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
