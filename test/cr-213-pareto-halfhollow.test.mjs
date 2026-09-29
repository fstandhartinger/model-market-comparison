import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importTsModule } from "./helpers/transpile-ts.mjs";
import { pickChart } from "../lib/pick-chart.mjs";

// CR-213 (Florian 2026-09-29): on the home page's Pareto chart incomplete Main Composites are shown by default, the
// green line connects across them, and 4/7–6/7 is half-filled while 3/7 or fewer stays hollow.
const { compositeMarker, coverageMarker, compositeCoverageLabel, compositeChartVisible } = await importTsModule(new URL("../lib/client-model.ts", import.meta.url));
const src = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");
const row = (exact, attached = 0) => ({ composite_coverage: exact, composite_attached: attached });

test("CR-213: 7/7 solid, 4/7–6/7 half-filled, 3/7 or fewer hollow", () => {
  const expected = { 0: "hollow", 1: "hollow", 2: "hollow", 3: "hollow", 4: "half", 5: "half", 6: "half", 7: "solid" };
  for (const [n, marker] of Object.entries(expected)) {
    assert.equal(compositeMarker(row(Number(n)), "composite"), marker, `${n}/7`);
    assert.equal(coverageMarker(compositeCoverageLabel(row(Number(n)), "composite")), marker, `${n}/7 via label`);
  }
  // Attached inputs count like exact ones, and other scores are never marked.
  assert.equal(compositeMarker(row(2, 2), "composite"), "half");
  assert.equal(compositeMarker(row(1), "aa_intelligence"), "solid");
  assert.equal(coverageMarker(null), "solid");
});

test("CR-213: incomplete Composites are plotted by default, and the old stored opt-out is dropped", async () => {
  const s = await src("lib/settings-state.ts");
  assert.match(s, /showIncompleteComposites: true \}/);
  assert.doesNotMatch(s, /includeIncompleteComposites\b(?!`)/, "the CR-211 key (stored false for past visitors) is no longer read");
  assert.equal(compositeChartVisible(row(3), "composite", true), true);
});

test("CR-213: the Pareto line connects across incomplete models", () => {
  const m = (id, y, cost, incomplete = false) => ({ id, scores: { composite: y }, cost, incomplete });
  // b (5/7) is cheaper than a and scores higher than c: it must sit on the frontier.
  const chart = pickChart([m("a", 90, 10), m("b", 80, 1, true), m("c", 60, 0.5)], "composite");
  assert.deepEqual([...chart.frontier].sort(), ["a", "b", "c"]);
});

test("CR-213: the value map puts incomplete points on the green line and explains the markers", async () => {
  const scatter = await src("components/CostCapabilityScatter.tsx");
  assert.match(scatter, /const passing = allPoints\.filter\(\(p\) => p\.pass\);/);
  assert.doesNotMatch(scatter, /not on the green line|left off the green line/);
  const toggle = await src("components/IncompleteCompositeToggle.tsx");
  assert.match(toggle, /data-bh-composite-legend/);
  assert.match(toggle, /half-filled/);
  assert.match(toggle, /3\/7 or fewer/);
  assert.match(toggle, /4–6\/7/);
});
