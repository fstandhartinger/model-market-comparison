// CR-73.1 — the daily-run profiler. It decides which lever CR-73.2/73.3/73.4 pull, so it must
// account for the whole wall clock, attribute worker calls to the stage that made them, and never
// invent a number a run did not record.
import { test } from "node:test";
import assert from "node:assert/strict";
import { profile, parseUnits, stepTimeline, unionMs } from "../ops/daily/profile-run.mjs";

const T = (seconds) => new Date(Date.UTC(2026, 8, 17, 13, 0, seconds)).toISOString();

test("unionMs merges overlapping spans and keeps disjoint ones apart", () => {
  assert.equal(unionMs([{ start: 0, end: 10 }, { start: 5, end: 20 }]), 20);
  assert.equal(unionMs([{ start: 0, end: 10 }, { start: 20, end: 30 }]), 20);
  assert.equal(unionMs([]), 0);
  assert.equal(unionMs([{ start: 0, end: null }]), 0, "a call without an end contributes nothing");
});

test("stepTimeline uses recorded timestamps and marks the steps it had to reconstruct", () => {
  const timeline = stepTimeline({
    started_at: T(0),
    steps: [
      { name: "a", duration_ms: 1000, started_at: T(0), finished_at: T(1) },
      { name: "gate-precommit", duration_ms: 2000 },
      { name: "c", duration_ms: 1000, started_at: T(5), finished_at: T(6) },
    ],
  });
  assert.equal(timeline.reconstructed_steps, 1);
  assert.equal(timeline.approximate, true);
  assert.deepEqual(timeline.steps.map((s) => s.reconstructed), [false, true, false]);
  assert.equal(timeline.steps[1].start, Date.parse(T(1)), "the reconstructed step starts where the measured one ended");
  assert.equal(timeline.steps[1].end, Date.parse(T(3)));
});

const baseReport = {
  started_at: T(0), finished_at: T(100), scope: "full", published: true, exit_code: 0,
  steps: [
    { name: "npm-ci", duration_ms: 10_000, ok: true, started_at: T(0), finished_at: T(10) },
    { name: "review-live", duration_ms: 60_000, ok: true, started_at: T(10), finished_at: T(70) },
    { name: "npm-test", duration_ms: 20_000, ok: true, started_at: T(70), finished_at: T(90) },
  ],
  worker_calls: {
    returned_cost_usd: 0.5, calls_without_returned_cost: 0,
    calls: [
      { receipt: "worker-1.json", role: "oneshot", actual_model: "free/producer", status: "complete", returned_cost_usd: 0 },
      { receipt: "worker-2.json", role: "critic", actual_model: "paid/critic", status: "complete", returned_cost_usd: 0.5 },
      { receipt: "worker-failure-3.json", role: "critic", actual_model: "paid/critic", status: "failed", returned_cost_usd: null },
    ],
  },
};
const receipts = [
  { receipt: "worker-1.json", model: "free/producer", start: Date.parse(T(12)), end: Date.parse(T(22)), duration_ms: 10_000 },
  { receipt: "worker-2.json", model: "paid/critic", start: Date.parse(T(22)), end: Date.parse(T(52)), duration_ms: 30_000 },
  { receipt: "worker-failure-3.json", model: "paid/critic", start: Date.parse(T(52)), end: Date.parse(T(62)), duration_ms: 10_000 },
];

test("profile accounts for the whole wall clock, not only the steps", () => {
  const p = profile({ report: baseReport, receipts });
  assert.equal(p.run.wall_ms, 100_000);
  assert.equal(p.accounting.steps_ms, 90_000);
  assert.equal(p.accounting.unaccounted_ms, 10_000, "the 10 s outside any step stay visible");
  assert.equal(p.accounting.unaccounted_share, 10);
});

test("profile attributes worker calls to the stage that made them", () => {
  const p = profile({ report: baseReport, receipts });
  const live = p.stages.find((s) => s.name === "review-live");
  assert.equal(live.worker_calls, 3);
  assert.equal(live.worker_ms, 50_000);
  assert.equal(live.worker_cost_usd, 0.5);
  for (const name of ["npm-ci", "npm-test"]) assert.equal(p.stages.find((s) => s.name === name).worker_calls, 0);
  assert.deepEqual(p.critical_path.map((s) => s.name), ["review-live", "npm-test", "npm-ci"]);
});

test("profile measures serialisation, failed calls and the floor", () => {
  const p = profile({ report: baseReport, receipts });
  assert.equal(p.workers.calls, 3);
  assert.equal(p.workers.serial_ms, 50_000);
  assert.equal(p.workers.elapsed_ms, 50_000);
  assert.equal(p.workers.concurrency, 1, "back-to-back calls never overlap");
  assert.equal(p.workers.share_of_wall, 50);
  assert.equal(p.workers.failed_calls, 1);
  assert.equal(p.workers.failed_ms, 10_000);
  // Floor = the stages that make no worker call (npm-ci + npm-test = 30 s) + the longest call (30 s).
  assert.equal(p.headroom.irreducible_floor_ms, 60_000);
  assert.equal(p.headroom.serialisation_ms, 20_000, "what perfect overlap could hide");
  assert.equal(p.headroom.cacheable_worker_ms, 50_000);
});

test("overlapping calls are reported as concurrency above 1", () => {
  const overlapping = receipts.map((r) => ({ ...r, start: Date.parse(T(12)), end: Date.parse(T(12)) + r.duration_ms }));
  const p = profile({ report: baseReport, receipts: overlapping });
  assert.equal(p.workers.serial_ms, 50_000);
  assert.equal(p.workers.elapsed_ms, 30_000, "the union is the longest of the three");
  assert.ok(p.workers.concurrency > 1.6);
});

test("a call with no receipt still counts, and missing numbers stay null", () => {
  const p = profile({ report: baseReport, receipts: [] });
  assert.equal(p.workers.calls, 3);
  assert.equal(p.workers.timed_calls, 0);
  assert.equal(p.workers.concurrency, null, "no measured span means no concurrency claim");
  assert.equal(p.stages.find((s) => s.name === "review-live").worker_calls, 0);
  const bare = profile({ report: { steps: [] } });
  assert.equal(bare.run.wall_ms, null);
  assert.equal(bare.accounting.unaccounted_ms, null);
});

test("a receipt the run report never listed is not silently dropped", () => {
  const p = profile({ report: baseReport, receipts: [...receipts, { receipt: "worker-4.json", model: "paid/critic", start: Date.parse(T(62)), end: Date.parse(T(68)), duration_ms: 6_000 }] });
  assert.equal(p.workers.calls, 4);
  assert.equal(p.workers.serial_ms, 56_000);
  assert.equal(p.workers.failed_calls, 2, "the orphan receipt is flagged, not counted as a clean call");
});

test("parseUnits reads the per-source lines the two long stages print", () => {
  const { units, benchmarkChecks } = parseUnits({
    live: [
      "live gauntlet aa: contract accepted; 652 rows verified against primary bodies; 2 explicit model examples",
      "live gauntlet aa_coding_v15: contract NOT accepted — previous snapshot retained (round 1: worker: fetch failed)",
    ].join("\n"),
    benchmarks: [
      "Benchmark refresh: 134 checks; 0/7 changed score rows accepted; 16 explicit retained failures",
      "BENCHMARK RETAINED livebench::2026-06-25: Primary source unavailable: HTTP Error 404: Not Found",
    ].join("\n"),
  });
  assert.deepEqual(benchmarkChecks, { checks: 134, accepted_changed_rows: 0, changed_rows: 7, retained_failures: 16 });
  assert.equal(units.length, 3);
  assert.deepEqual(units[0], { stage: "review-live", unit: "aa", outcome: "accepted", rows: 652 });
  assert.equal(units[1].outcome, "retained");
  assert.equal(units[2].unit, "livebench::2026-06-25");
});
