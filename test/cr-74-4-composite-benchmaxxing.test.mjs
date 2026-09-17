// CR-74.4 (Florian 2026-09-17): the Main Composite takes the Benchmaxxing signal in marginally — just enough that
// GPT-6 Astra passes Claude Fable 5.1 — behind the Options checkbox "Include Benchmaxxing signal in the score" (on).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { benchmaxxingAdjustedComposite, BENCHMAXX_COMPOSITE_WEIGHT, BENCHMAXX_COMPOSITE_WEIGHT_CAP } from "../lib/composite.mjs";
import { buildBenchmarkView } from "../lib/benchmark-view.mjs";
import { benchmaxxingFamilySignals } from "../lib/benchmax.mjs";

const { clientData, isThinComposite } = await import("../lib/client-model.ts");
const { preferredVariantIds, selectableModels } = await import("../lib/variants.ts");
const { withCompositeSetting, benchmaxxingCompositeOf } = await import("../lib/composite-setting.ts");
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("CR-74.4: positive signals are penalised by w per point; negative, zero, null and off are identity", () => {
  const w = BENCHMAXX_COMPOSITE_WEIGHT;
  assert.equal(benchmaxxingAdjustedComposite(90, 2), 90 - 2 * w);
  assert.equal(benchmaxxingAdjustedComposite(90, 2, true), 90 - 2 * w);
  assert.equal(benchmaxxingAdjustedComposite(90, -7), 90, "no bonus for a negative signal");
  assert.equal(benchmaxxingAdjustedComposite(90, 0), 90);
  assert.equal(benchmaxxingAdjustedComposite(90, null), 90);
  assert.equal(benchmaxxingAdjustedComposite(90, undefined), 90);
  assert.equal(benchmaxxingAdjustedComposite(90, Number.NaN), 90);
  assert.equal(benchmaxxingAdjustedComposite(90, 5, false), 90, "include=false is the identity");
  assert.equal(benchmaxxingAdjustedComposite(null, 5), null);
  assert.equal(benchmaxxingAdjustedComposite(1, 50), 0, "clamped to 0");
});

test("CR-74.4: the weight stays marginal (≤ the documented cap)", () => {
  assert.ok(BENCHMAXX_COMPOSITE_WEIGHT > 0 && BENCHMAXX_COMPOSITE_WEIGHT <= BENCHMAXX_COMPOSITE_WEIGHT_CAP, `w = ${BENCHMAXX_COMPOSITE_WEIGHT}`);
  assert.ok(BENCHMAXX_COMPOSITE_WEIGHT_CAP <= 1, "cap agreed for CR-74.4: at most one point per signal point");
});

test("CR-74.4: payloads restore the raw composite when the option is off, and are untouched when on", () => {
  const model = (id, raw, composite) => ({ id, composite_raw: raw, scores: { composite, aa_intelligence_index: 70 } });
  const catalog = { models: [model("a", 90, 88), model("b", 80, 80)], offersByModel: {} };
  assert.equal(withCompositeSetting(catalog, true), catalog);
  const off = withCompositeSetting(catalog, false);
  assert.deepEqual(off.models.map((m) => m.scores.composite), [90, 80]);
  assert.equal(off.models[0].scores.aa_intelligence_index, 70);
  assert.equal(catalog.models[0].scores.composite, 88, "the shared payload is not mutated");
  const home = withCompositeSetting({ data: { models: [model("a", 90, 88)] }, matrix: {} }, false);
  assert.equal(home.data.models[0].scores.composite, 90);
  const bench = withCompositeSetting({ matrix: {}, filterData: { models: [model("a", 90, 88)], offers: {} } }, false);
  assert.equal(bench.filterData.models[0].scores.composite, 90);
  // Benchmaxxing-tab rows keep the raw composite; the accessor applies the option.
  const row = { composite: 90, score: 3 };
  assert.equal(benchmaxxingCompositeOf(true)(row), 90 - 3 * BENCHMAXX_COMPOSITE_WEIGHT);
  assert.equal(benchmaxxingCompositeOf(false)(row), 90);
});

test("CR-74.4: includeBenchmaxxing defaults on, persists, and old payloads load with the default", async () => {
  const transpile = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const asModule = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  const lib = (f) => new URL(`../lib/${f}`, import.meta.url).href;
  const costCode = transpile(await read("../lib/cost.ts")).replace('from "./effective-cost.mjs"', `from "${lib("effective-cost.mjs")}"`)
    .replace('from "./regions.mjs"', `from "${lib("regions.mjs")}"`).replace('from "./free-route.mjs"', `from "${lib("free-route.mjs")}"`);
  const settingsCode = transpile(await read("../lib/settings-state.ts")).replace('from "./cost"', `from "${asModule(costCode)}"`)
    .replace('from "./regions.mjs"', `from "${lib("regions.mjs")}"`).replace('from "./free-route.mjs"', `from "${lib("free-route.mjs")}"`);
  const { SETTINGS_DEFAULTS, sanitizeSettings, anyFiltersActive } = await import(asModule(settingsCode));
  const load = (payload) => ({ ...SETTINGS_DEFAULTS, ...sanitizeSettings(payload) });
  assert.equal(SETTINGS_DEFAULTS.includeBenchmaxxing, true);
  assert.equal(load({ score: "composite" }).includeBenchmaxxing, true, "a v9 payload without the key keeps the default");
  assert.equal(load({ includeBenchmaxxing: false }).includeBenchmaxxing, false);
  assert.equal(load({ includeBenchmaxxing: "no" }).includeBenchmaxxing, true);
  assert.equal(anyFiltersActive(SETTINGS_DEFAULTS), false);
  assert.equal(anyFiltersActive(load({ includeBenchmaxxing: false })), true, "Reset shows when the option is off");
  const options = await read("../components/GlobalFilters.tsx");
  assert.match(options, /label="Include Benchmaxxing signal in the score" on=\{s\.includeBenchmaxxing\}/);
  assert.match(options, /s\.setIncludeBenchmaxxing\(true\)/, "Reset restores the default");
  assert.match(await read("../components/deferred/usePageData.tsx"), /withCompositeSetting\(state\.data, includeBenchmaxxing\)/);
  assert.match(await read("../app/about/page.tsx"), /Include Benchmaxxing signal in the score/);
});

// The Overview's default ranking: one variant per live family, Featured, measured rows above the thin band.
async function overview() {
  const ds = JSON.parse(await read("../data/dataset.json"));
  const view = buildBenchmarkView(ds);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
  const byFamily = new Map(benchmaxxingFamilySignals(view).reports.map(([id, r]) => [familyOf.get(id), r.score]));
  const signals = new Map(ds.models.map((m) => [m.id, byFamily.get(m.family_key) ?? null]));
  const cd = clientData(ds, {}, signals);
  const rank = (payload) => {
    let rows = selectableModels(payload.models, true);
    const preferred = preferredVariantIds(rows, "composite");
    rows = rows.filter((m) => m.featured && m.composite_coverage > 0 && (!preferred.has(m.family_key) || preferred.get(m.family_key) === m.id));
    return rows.sort((a, b) => (Number(isThinComposite(a)) - Number(isThinComposite(b))) || (b.scores.composite - a.scores.composite) || a.id.localeCompare(b.id)).map((m) => m.family_key);
  };
  return { ds, cd, on: rank(withCompositeSetting(cd, true)), off: rank(withCompositeSetting(cd, false)) };
}

test("CR-74.4: on the 2026-09-17 data GPT-6 Astra is #1 with the option on; off keeps Claude Fable 5.1 first", async (t) => {
  const { ds, cd, on, off } = await overview();
  if (!String(ds.generated_at).startsWith("2026-09-17")) return t.skip(`calibrated on the 2026-09-17 snapshot; dataset is ${ds.generated_at}`);
  assert.deepEqual(on.slice(0, 2), ["gpt-6-astra", "claude-fable-5.1"]);
  assert.deepEqual(off.slice(0, 2), ["claude-fable-5.1", "gpt-6-astra"]);
  // Minimal: half the weight would not flip the pair.
  const fable = cd.models.find((m) => m.id === "claude-fable-5.1::max"), astra = cd.models.find((m) => m.id === "gpt-6-astra::max");
  const half = (m) => m.composite_raw - (BENCHMAXX_COMPOSITE_WEIGHT / 2) * Math.max(0, m.composite_signal ?? 0);
  assert.ok(half(fable) > half(astra), "w is not larger than needed by a factor of two");
});

test("CR-74.4: every catalog model's penalty equals w·max(0, its family signal)", async () => {
  const { cd } = await overview();
  for (const m of cd.models) {
    assert.equal(m.scores.composite, benchmaxxingAdjustedComposite(m.composite_raw, m.composite_signal, true), m.id);
    assert.ok(m.scores.composite <= m.composite_raw, m.id);
  }
});
