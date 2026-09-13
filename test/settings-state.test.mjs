import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Transpile the production modules in memory (as cost.test.mjs does) and test the exact
// implementation of the settings load/migration rules.
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const asModule = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
const costCode = transpile(await readFile(new URL("../lib/cost.ts", import.meta.url), "utf8"))
  .replace('from "./effective-cost.mjs"', `from "${new URL("../lib/effective-cost.mjs", import.meta.url).href}"`);
const settingsCode = transpile(await readFile(new URL("../lib/settings-state.ts", import.meta.url), "utf8"))
  .replace('from "./cost"', `from "${asModule(costCode)}"`);
const { SETTINGS_DEFAULTS, sanitizeSettings, advancedFiltersActive, anyFiltersActive } = await import(asModule(settingsCode));

const load = (payload) => ({ ...SETTINGS_DEFAULTS, ...sanitizeSettings(payload) });

test("R5.3/F-40: defaults give Simple 86 (>85) / no cap and Advanced no floor / no cap", () => {
  assert.equal(SETTINGS_DEFAULTS.minScore, 86);
  assert.equal(SETTINGS_DEFAULTS.minScoreTouched, false);
  assert.equal(SETTINGS_DEFAULTS.simpleMaxCost, null);
  assert.equal(SETTINGS_DEFAULTS.advancedMinScore, 0);
  assert.equal(SETTINGS_DEFAULTS.maxCost, null);
  assert.equal(advancedFiltersActive(SETTINGS_DEFAULTS), false);
  assert.equal(anyFiltersActive(SETTINGS_DEFAULTS), false);
});

test("F-40: touching Simple's pair does not mark Advanced as filtered", () => {
  const s = { ...SETTINGS_DEFAULTS, minScore: 86, minScoreTouched: true, simpleMaxCost: 2 };
  assert.equal(advancedFiltersActive(s), false);
  assert.equal(anyFiltersActive(s), true);
});

test("F-40: the Advanced pair and Guided floors count as Advanced filters", () => {
  assert.equal(advancedFiltersActive({ ...SETTINGS_DEFAULTS, advancedMinScore: 70 }), true);
  assert.equal(advancedFiltersActive({ ...SETTINGS_DEFAULTS, maxCost: 5 }), true);
  assert.equal(advancedFiltersActive({ ...SETTINGS_DEFAULTS, minIntelligence: 60 }), true);
  assert.equal(advancedFiltersActive({ ...SETTINGS_DEFAULTS, minCoding: 55 }), true);
});

test("F-40 migration: a pre-split payload keeps its floor and cap on Simple only", () => {
  const s = load({ score: "composite", minScore: 86, minScoreTouched: true, maxCost: 3.5 });
  assert.equal(s.minScore, 86);
  assert.equal(s.minScoreTouched, true);
  assert.equal(s.simpleMaxCost, 3.5);
  assert.equal(s.maxCost, null);
  assert.equal(s.advancedMinScore, 0);
  assert.equal(advancedFiltersActive(s), false);
});

test("F-40 migration: a pre-split payload with no cap leaves both caps empty", () => {
  const s = load({ minScore: 86, maxCost: null });
  assert.equal(s.simpleMaxCost, null);
  assert.equal(s.maxCost, null);
});

test("F-40: a split payload round-trips both pairs independently", () => {
  const stored = { ...SETTINGS_DEFAULTS, minScore: 90, minScoreTouched: true, simpleMaxCost: 1, advancedMinScore: 60, maxCost: 5 };
  const s = load(JSON.parse(JSON.stringify(stored)));
  assert.deepEqual([s.minScore, s.minScoreTouched, s.simpleMaxCost, s.advancedMinScore, s.maxCost], [90, true, 1, 60, 5]);
});

test("sanitize rejects implausible limits", () => {
  const s = load({ advancedMinScore: -3, maxCost: "5", simpleMaxCost: Number.NaN, minScore: -1 });
  assert.equal(s.advancedMinScore, 0);
  assert.equal(s.maxCost, null);
  assert.equal(s.simpleMaxCost, null);
  assert.equal(s.minScore, 86);
  assert.equal(s.minScoreTouched, false);
});
