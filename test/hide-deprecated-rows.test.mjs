import { test } from "node:test";
import assert from "node:assert/strict";
import { compileTsModule, importTsModule } from "./helpers/transpile-ts.mjs";

const clientModelModule = await compileTsModule(new URL("../lib/client-model.ts", import.meta.url));
const variants = await importTsModule(new URL("../lib/variants.ts", import.meta.url), { "./client-model": clientModelModule });
const variantsModule = await compileTsModule(new URL("../lib/variants.ts", import.meta.url), { "./client-model": clientModelModule });
const costStub = `data:text/javascript,${encodeURIComponent("export const scopeFromSettings=()=>({restricted:false});export const offerMatchesScope=()=>true;")}`;
const topModels = await importTsModule(new URL("../lib/top-models.ts", import.meta.url), {
  "./client-model": clientModelModule, "./cost": costStub, "./variants": variantsModule,
});

const row = (family_key, variant, { deprecated = false, agent = 50, da = null } = {}) => ({
  id: `${family_key}::${variant}`, family_key, variant, deprecated, featured: true, open_weights: false, org: "x",
  scores: { composite: agent, aa_coding_agent: agent, designarena_frontend: da },
  composite_coverage: 1,
});

test("a fully deprecated family off every DesignArena board disappears", () => {
  const rows = [row("old", "high", { deprecated: true }), row("old", "low", { deprecated: true }), row("new", "high")];
  assert.deepEqual(variants.selectableModels(rows, true, "aa_coding_agent").map((m) => m.id), ["new::high"]);
});

test("a live family keeps its best-measured row even when that row is deprecated (GPT-5.4 case)", () => {
  const xhigh = row("gpt-5.4", "xhigh", { deprecated: true, agent: 80 });
  const medium = row("gpt-5.4", "medium", { agent: 30 });
  const kept = variants.selectableModels([medium, xhigh], true, "aa_coding_agent");
  assert.deepEqual(kept.map((m) => m.id).sort(), ["gpt-5.4::medium", "gpt-5.4::xhigh"]);
  assert.equal(variants.preferredVariantIds(kept, "aa_coding_agent").get("gpt-5.4"), "gpt-5.4::xhigh");
});

test("deprecated effort variants of a live family do not show as separate rows", () => {
  const rows = [row("fam", "xhigh", { deprecated: true, agent: 80 }), row("fam", "low", { deprecated: true, agent: 20 }),
    row("fam", "medium", { deprecated: true, agent: 40 }), row("fam", "default", { agent: 10 })];
  const kept = variants.selectableModels(rows, true, "aa_coding_agent").map((m) => m.id).sort();
  assert.deepEqual(kept, ["fam::default", "fam::xhigh"]);
});

test("a deprecated model kept alive by a DesignArena board keeps one row", () => {
  const rows = [row("opus", "a", { deprecated: true, agent: 60, da: 1200 }), row("opus", "b", { deprecated: true, agent: 40 })];
  assert.deepEqual(variants.selectableModels(rows, true, "aa_coding_agent").map((m) => m.id), ["opus::a"]);
});

test("toggle off shows every row", () => {
  const rows = [row("old", "high", { deprecated: true }), row("fam", "x", { deprecated: true }), row("fam", "y")];
  assert.equal(variants.selectableModels(rows, false, "aa_coding_agent").length, 3);
});

test("top-models applies family_alive and then the row rule", () => {
  const data = {
    models: [
      { ...row("old", "high", { deprecated: true, agent: 99 }), family_alive: false },
      { ...row("fam", "xhigh", { deprecated: true, agent: 80 }), family_alive: true },
      { ...row("fam", "low", { deprecated: true, agent: 70 }), family_alive: true },
      { ...row("fam", "default", { agent: 10 }), family_alive: true },
    ],
    offers: Object.fromEntries(["old::high", "fam::xhigh", "fam::low", "fam::default"].map((id) => [id, [{ key: "k" }]])),
    providers: [],
  };
  const base = { score: "aa_coding_agent", collapse: false, openOnly: false, featured: false, familySet: null, excludedSet: null,
    hostedIn: [], providerBasedIn: [], labAllowed: null, allowDataTraining: true };
  assert.deepEqual(topModels.topModelIds(data, { ...base, hideDeprecated: true }, 10), ["fam::xhigh", "fam::default"]);
  assert.deepEqual(topModels.topModelIds(data, { ...base, hideDeprecated: false }, 10), ["old::high", "fam::xhigh", "fam::low", "fam::default"]);
});

// CR-329.2: only retired FAMILIES are deprecated models — the badge and the filter agree.
test("retiredFamilies names only families with every configuration retired and no DesignArena board", () => {
  const rows = [
    row("old", "high", { deprecated: true }),
    row("opus-5", "max", { deprecated: true, agent: 90 }), row("opus-5", "default"),
    row("opus-4.6", "max", { deprecated: true, da: 1200 }),
  ];
  assert.deepEqual([...variants.retiredFamilies(rows)], ["old"]);
  // With the toggle on, no row of a retired family remains — so no row in the table can carry the badge.
  const kept = variants.selectableModels(rows, true, "aa_coding_agent");
  const retired = variants.retiredFamilies(rows);
  assert.equal(kept.filter((m) => retired.has(m.family_key)).length, 0);
  assert.ok(kept.some((m) => m.id === "opus-5::max"), "a current model's best AA run is not a deprecated model");
});

test("live dataset: the toggle removes rows and leaves no retired family behind", async () => {
  const { readFile } = await import("node:fs/promises");
  const ds = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const models = ds.models.map((m) => ({ ...m, scores: { designarena_frontend: m.designarena?.frontend?.elo ?? null, designarena_fullstack: m.designarena?.fullstack?.elo ?? null } }));
  const retired = variants.retiredFamilies(models);
  const kept = variants.selectableModels(models, true);
  assert.ok(retired.size > 50, `expected many retired families, got ${retired.size}`);
  assert.ok(kept.length < models.length - 100, `toggle must hide rows (${kept.length} of ${models.length} kept)`);
  assert.equal(kept.filter((m) => retired.has(m.family_key)).length, 0);
});
