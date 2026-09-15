import test from "node:test";
import assert from "node:assert/strict";
import { parseBenchmarksResponse, validateBenchmarksRows } from "../lib/openrouter-benchmarks.mjs";

const own = (n, type = "gpqa_diamond", score = 0.5) => Array.from({ length: n }, (_, i) => ({ source: "openrouter", model_permaslug: `org/model-${i}`, benchmark_type: type, accuracy: score, accuracy_stddev: 0.02, avg_cost_per_task: 0.01, total_tasks: 100, last_run_timestamp: "2026-09-15T00:00:00Z" }));
const aa = (n) => Array.from({ length: n }, (_, i) => ({ source: "artificial-analysis", model_permaslug: `org/model-${i}`, intelligence_index: 50, coding_index: 50, agentic_index: 50, pricing: null }));
const da = (n) => Array.from({ length: n }, (_, i) => ({ source: "design-arena", model_permaslug: `org/model-${i}`, arena: "models", category: "website", elo: 1200, win_rate: 50 }));
const response = (data) => JSON.stringify({ data, meta: { as_of: "2026-09-15T12:01:46.949Z", citation: null, model_count: 1, source: null, source_url: null, task_type: null, version: "v1" } });

test("parseBenchmarksResponse accepts a documented response and fails closed on drift", () => {
  const body = parseBenchmarksResponse(response(own(2)));
  assert.equal(body.data.length, 2);
  assert.throws(() => parseBenchmarksResponse("<html>"), /not JSON/);
  assert.throws(() => parseBenchmarksResponse("{}"), /no data rows/);
  assert.throws(() => parseBenchmarksResponse(JSON.stringify({ data: [{}], meta: null })), /no parseable meta.as_of/);
});

test("validateBenchmarksRows returns source counts and fails closed on bad rows", () => {
  const data = [...own(130), ...aa(150), ...da(300)];
  assert.deepEqual(validateBenchmarksRows(data), { ownRows: 130, aaRows: 150, daRows: 300, totalRows: 580 });
  assert.throws(() => validateBenchmarksRows([...own(130, "unknown_bench"), ...aa(400)]), /unexpected benchmark_type/);
  assert.throws(() => validateBenchmarksRows([...own(130, "gpqa_diamond", 1.5), ...aa(400)]), /implausible score/);
  assert.throws(() => validateBenchmarksRows([own(1, "gpqa_diamond", 0.5)[0], own(1, "gpqa_diamond", 0.5)[0], ...own(120), ...aa(400)]), /listed twice/);
  assert.throws(() => validateBenchmarksRows([{ source: "mystery", model_permaslug: "a/b" }, ...own(120), ...aa(400)]), /unexpected row source/);
  assert.throws(() => validateBenchmarksRows(own(10)), /only 10 own-run rows/);
  assert.throws(() => validateBenchmarksRows([...own(120), ...aa(10)]), /only 130 total rows/);
});

test("search items carry accuracy-free primary_score values and search config fields", () => {
  const search = { source: "openrouter", model_permaslug: "org/s", benchmark_type: "search_hle", primary_score: 0.77, primary_metric: "accuracy", search_engine: "parallel", search_surface: "server-tool", total_tasks: 50 };
  assert.deepEqual(validateBenchmarksRows([search, ...own(119), ...aa(400)]).ownRows, 120);
});
