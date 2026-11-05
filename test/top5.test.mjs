import { test } from "node:test";
import assert from "node:assert/strict";
import { topFamilies } from "../scripts/top5.mjs";

const model = (id, benchmarks, extra = {}) => ({ id, family_key: id, family_name: id,
  display_name: id, variant: "default", offers: [], benchmarks, ...extra });
const dataset = (models) => ({ models, providers: [], sources: {}, benchmark_results: { observations: [], registry: [], details: {}, coverage: { by_model: {} } } });

for (const slot of ["epoch_eci", "epoch_eci_software"]) {
  test(`top-five uses ${slot} to separate models tied on AA`, () => {
    const rows = topFamilies(dataset([model("low", { aa_intelligence_index: 50, [slot]: 10 }), model("high", { aa_intelligence_index: 50, [slot]: 90 })]), 1);
    assert.deepEqual(rows, [{ family_key: "high", name: "high", composite: 75 }]);
  });
}

test("evidence-free featured families cannot enter the top five", () => {
  const rows = topFamilies(dataset([
    model("empty", {}, { featured: true }),
    model("measured", { aa_intelligence_index: 80 }),
  ]));
  assert.deepEqual(rows.map((r) => r.family_key), ["measured"]);
});

test("family collapse prefers own coverage over a thin sibling's higher imputed score", () => {
  const ds = dataset([
    model("thin", { aa_intelligence_index: 100 }, { family_key: "family" }),
    model("measured", { aa_intelligence_index: 80, aa_coding_index: 80 }, { family_key: "family" }),
    model("reference", { aa_intelligence_index: 90, aa_coding_index: 90 }),
  ]);
  assert.equal(topFamilies(ds).find((r) => r.family_key === "family").name, "measured");
});

test("retired and evidence-free families stay out, current measured families need no featured flag", () => {
  const rows = topFamilies(dataset([
    model("retired", { aa_intelligence_index: 100 }, { deprecated: true }),
    model("current", { aa_intelligence_index: 80 }),
  ]));
  assert.deepEqual(rows.map((r) => r.family_key), ["current"]);
});

// A family source belongs to the product; effort-specific AA values stay exact.
test("family-scoped Epoch evidence reaches a measured sibling before ranking", () => {
  const models = [
    model("family-high", { aa_intelligence_index: 90, aa_coding_index: 90 }, { family_key: "family", variant: "high" }),
    model("family-default", { epoch_eci: 100 }, { family_key: "family" }),
    model("reference", { aa_intelligence_index: 100, aa_coding_index: 100, epoch_eci: 10 }),
  ];
  const row = topFamilies(dataset(models)).find((r) => r.family_key === "family");
  const withoutDonor = topFamilies(dataset(models.filter((m) => m.id !== "family-default")))
    .find((r) => r.family_key === "family");
  assert.equal(row.name, "family-high");
  assert.ok(row.composite > withoutDonor.composite);
});
