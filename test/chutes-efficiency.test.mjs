import test from "node:test";
import assert from "node:assert/strict";
import { parseChutesUsage, completedWeek } from "../lib/chutes-efficiency.mjs";

const window = { start_date: "2026-09-08", end_date: "2026-09-09" };
const row = (date, input, output) => ({ chute_id: "a", name: "LLM", date, total_requests: 2, total_input_tokens: input, total_output_tokens: output });
const payload = () => [row("2026-09-08", 100, 10), row("2026-09-09", 100, 100)];
test("Chutes sums paired token counts, excludes zero-token rows, preserves zero and scope", () => {
  const result = parseChutesUsage([...payload(), { ...row("2026-09-09", 0, 0), chute_id: "diffusion" }], window);
  assert.equal(result.input_output_ratio, 200 / 110);
  assert.equal(result.totals.total_requests, 4);
  assert.equal(result.coverage.included_rows, 2);
  assert.equal(result.coverage.excluded_rows, 1);
  assert.equal(result.rows[2].total_output_tokens, 0);
});
test("Chutes rejects empty, malformed, duplicate, incomplete and impossible aggregates", () => {
  for (const bad of [null, {}, [], [payload()[0]], [...payload(), payload()[0]],
    payload().map((r) => ({ ...r, total_input_tokens: "100" })),
    payload().map((r) => ({ ...r, total_output_tokens: null })),
    payload().map((r) => ({ ...r, total_output_tokens: -1 })),
    payload().map((r) => ({ ...r, total_requests: 0 })),
    payload().map((r) => ({ ...r, total_input_tokens: Number.MAX_SAFE_INTEGER })),
    payload().map((r) => ({ ...r, date: "2026-09-31" })),
    payload().map((r) => ({ ...r, date: "2026-09-10" })),
    payload().map((r) => ({ ...r, total_output_tokens: 0 }))]) {
    assert.throws(() => parseChutesUsage(bad, window));
  }
  assert.throws(() => parseChutesUsage(payload(), { start_date: "2026-02-30", end_date: "2026-09-09" }));
});
test("Chutes uses seven completed UTC days across month/year boundaries", () => {
  assert.deepEqual(completedWeek(new Date("2026-01-02T23:59:59Z")), { start_date: "2025-12-26", end_date: "2026-01-01" });
});
