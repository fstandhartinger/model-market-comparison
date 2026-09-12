import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEciSnapshot, fitEci, parseBenchmarkCatalog, parseCsv } from "../lib/epoch-eci.mjs";

test("Epoch CSV parser preserves quoted commas and newlines", () => {
  const rows = parseCsv('name,note,value\nmodel,"a, b\\nsecond line",1\n');
  assert.equal(rows[0].name, "model");
  assert.equal(rows[0].note, "a, b\\nsecond line");
  assert.equal(rows[0].value, "1");
});

test("Epoch ECI refit is bounded, finite, and exact for a synthetic sigmoid", () => {
  const target = 137.5;
  const points = [
    { edi: 80, slope: .05 }, { edi: 110, slope: .08 }, { edi: 145, slope: .12 },
  ].map((p) => ({ ...p, perf: 1 / (1 + Math.exp(-p.slope * (target - p.edi))) }));
  assert.ok(Math.abs(fitEci(points) - target) < 1e-6);
  assert.equal(fitEci([{ edi: 1, slope: 1, perf: 0 }]), null);
});

test("Epoch snapshot keeps every general row and only refits models with two software benchmarks", () => {
  const snapshot = buildEciSnapshot({
    collectedAt: "2026-09-12T00:00:00.000Z",
    hashes: {},
    minSoftwareModels: 1,
    benchmarkCatalog: [{ id: "a", title: "A", domains: ["Software engineering"] }, { id: "b", title: "B", domains: ["Software engineering"] }],
    generalRows: [
      { Model: "Model A", "Display name": "Model A", eci: "150", eci_ci_low: "149", eci_ci_high: "151", date: "2026-09-01", Organization: "Lab" },
      { Model: "Model B", "Display name": "Model B", eci: "140", eci_ci_low: "139", eci_ci_high: "141", date: "2026-09-01", Organization: "Lab" },
    ],
    difficultyRows: [{ benchmark_name: "A", edi: "100", estimated_slope_scaled: ".05" }, { benchmark_name: "B", edi: "120", estimated_slope_scaled: ".05" }],
    performanceRows: [{ model: "Model A", benchmark: "A", performance: ".8" }, { model: "Model A", benchmark: "B", performance: ".7" }, { model: "Model B", benchmark: "A", performance: ".8" }],
  });
  assert.deepEqual(snapshot.counts, { general_models: 2, software_models: 1 });
  assert.ok(Number.isFinite(snapshot.models[0].software));
  assert.equal(snapshot.models[1].software, null);
  assert.equal(parseBenchmarkCatalog('var e={x:{id:`x`,title:`X`,domains:[`Software engineering`]}};export{e as t};')[0].title, "X");
});
