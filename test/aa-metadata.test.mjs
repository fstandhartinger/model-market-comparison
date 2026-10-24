import test from "node:test";
import assert from "node:assert/strict";
import { enrichArtificialAnalysis, MAX_METADATA_ROLLOUT_LAG } from "../lib/aa-metadata.mjs";
import { parseArtificialAnalysisDeprecatedModels } from "../lib/aa-rsc.mjs";

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
  const withinRolloutLag = [...api, { id: "d" }];
  assert.equal(enrichArtificialAnalysis(withinRolloutLag, metadata).missing.length, MAX_METADATA_ROLLOUT_LAG);
  assert.throws(() => enrichArtificialAnalysis([...withinRolloutLag, { id: "e" }], metadata), /missing=5/);
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

test("CR-505: a row already published as deprecated may leave the leaderboard page; other absences still count", () => {
  const prior = (id, deprecated) => ({ id, slug: id, name: id, metadata: { deprecated, is_open_weights: true, license_name: "MIT" } });
  const previous = { collected_at: "2026-10-16", metadata_endpoint: "https://artificialanalysis.ai/leaderboards/models",
    models: [prior("live", false), ...["r1", "r2", "r3", "r4", "r5", "r6"].map((id) => prior(id, true)), prior("quiet", false)] };
  const api = previous.models.map(({ metadata, ...row }) => row);
  const page = new Map([["live", { isOpenWeights: true, deprecated: false }], ["quiet", { isOpenWeights: true, deprecated: false }]]);
  const result = enrichArtificialAnalysis(api, page, previous);
  assert.equal(result.missing.length, 0);
  assert.equal(result.retiredCount, 6);
  const r1 = result.models.find((m) => m.id === "r1").metadata;
  assert.equal(r1.deprecated, true);
  assert.equal(r1.license_name, "MIT");
  assert.equal(r1.retained_fields.license_name.collected_at, "2026-10-16");
  // Not previously deprecated: still a rollout lag, and five of them fail closed.
  const fresh = ["n1", "n2", "n3", "n4", "n5"].map((id) => ({ id, slug: id, name: id }));
  assert.throws(() => enrichArtificialAnalysis([...api, ...fresh], page, previous), /missing=5/);
  const notDeprecated = { ...previous, models: previous.models.map((m) => ({ ...m, metadata: { ...m.metadata, deprecated: false } })) };
  assert.throws(() => enrichArtificialAnalysis(api, page, notDeprecated), /missing=6/);
  // A different slug under the same id is a different product: no carryover, no exemption.
  const reslugged = api.map((m) => (m.id === "r1" ? { ...m, slug: "other" } : m));
  assert.deepEqual(enrichArtificialAnalysis(reslugged, page, previous).missing.map((m) => m.id), ["r1"]);
  // An empty page is still fatal.
  assert.throws(() => enrichArtificialAnalysis(api, new Map(), previous), /metadata mismatch/);
});

test("self-heal 2026-10-24: rows last published as live may leave the page when the page lists their release as deprecated", () => {
  // Shape of the 2026-10-24 leaderboard capture: live metadata rows, the release list and the model -> release map.
  const flight = {
    models: [{ slug: "live", name: "Live", isOpenWeights: true, deprecated: false }],
    releases: [{ slug: "kimi-k3", name: "Kimi K3", deprecated: true, releaseDate: "2026-07-16" },
      { slug: "live", name: "Live", deprecated: false, releaseDate: "2026-10-23" },
      { slug: "quiet", name: "Quiet", deprecated: false, releaseDate: "2026-09-01" }],
    variants: [{ slug: "kimi-k3", name: "Kimi K3 (Max)", releaseSlug: "kimi-k3" }, { slug: "kimi-k3-low", name: "Kimi K3 (Low)", releaseSlug: "kimi-k3" },
      { slug: "live", name: "Live", releaseSlug: "live" }, { slug: "quiet", name: "Quiet", releaseSlug: "quiet" }, { slug: "orphan", name: "Orphan", releaseSlug: "unlisted" }],
  };
  const html = `<script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(flight)}\n`])})</script>`;
  const deprecatedOnPage = parseArtificialAnalysisDeprecatedModels(html);
  assert.deepEqual([...deprecatedOnPage].sort(), ["kimi-k3", "kimi-k3-low"]);
  const prior = (id) => ({ id, slug: id, name: id, metadata: { deprecated: false, is_open_weights: true, license_name: "MIT" } });
  const ids = ["live", "kimi-k3", "kimi-k3-low", "quiet", "orphan"];
  const previous = { collected_at: "2026-10-23", metadata_endpoint: "https://artificialanalysis.ai/leaderboards/models", models: ids.map(prior) };
  const api = previous.models.map(({ metadata, ...row }) => row);
  const page = new Map([["live", { isOpenWeights: true, deprecated: false }]]);
  const result = enrichArtificialAnalysis(api, page, previous, deprecatedOnPage);
  assert.equal(result.retiredCount, 2);
  // A release published as live, or a release the page does not list, is still an unexplained absence.
  assert.deepEqual(result.missing.map((m) => m.id), ["quiet", "orphan"]);
  const kimi = result.models.find((m) => m.id === "kimi-k3").metadata;
  assert.equal(kimi.license_name, "MIT");
  assert.equal(kimi.retained_fields.license_name.collected_at, "2026-10-23");
  // Without the page's release evidence the same rows count against the bound as before.
  assert.equal(enrichArtificialAnalysis(api, page, previous).missing.length, 4);
  const conflicting = { releases: [{ slug: "x", deprecated: true, releaseDate: "d" }, { slug: "x", deprecated: false, releaseDate: "d" }] };
  assert.throws(() => parseArtificialAnalysisDeprecatedModels(`<script>self.__next_f.push(${JSON.stringify([1, `0:${JSON.stringify(conflicting)}\n`])})</script>`), /conflicting release deprecation/);
});
