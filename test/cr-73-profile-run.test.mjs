// CR-73.1 — the daily-run profiler. It decides which lever CR-73.2/73.3/73.4 pull, so it must
// account for the whole wall clock, attribute worker calls to the stage that made them, and never
// invent a number a run did not record.
import { test } from "node:test";
import assert from "node:assert/strict";
import { profile, parseUnits, stepTimeline, unionMs, toMarkdown } from "../ops/daily/profile-run.mjs";

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

// D249 (2026-09-28): the profiler recorded 172 worker calls, 7.5 worker-hours and $1.78 for the run
// that lost the day, and none of those numbers says what went wrong. The call count was ordinary and
// the cost was ordinary; what changed was that one of a model's OpenRouter endpoints answered 33x
// slower with 12x the output tokens. Each receipt had recorded the provider all along — nothing read
// it, so finding the cause meant opening 94 receipts by hand.
const spreadReport = {
  started_at: T(0), finished_at: T(100), scope: "full", published: false, exit_code: 1,
  steps: [{ name: "refresh-benchmarks", duration_ms: 100_000, ok: false, started_at: T(0), finished_at: T(100) }],
  worker_calls: {
    returned_cost_usd: 1, calls_without_returned_cost: 0,
    calls: [
      ...Array.from({ length: 4 }, (_, i) => ({ receipt: `slow-${i}.json`, role: "critic", actual_model: "z/flash", status: "complete", returned_cost_usd: 0.2 })),
      ...Array.from({ length: 3 }, (_, i) => ({ receipt: `fast-${i}.json`, role: "critic", actual_model: "z/flash", status: "complete", returned_cost_usd: 0.05 })),
      { receipt: "worker-failure-x.json", role: "critic", actual_model: "z/flash", status: "failed", returned_cost_usd: null },
    ],
  },
};
const spreadReceipts = [
  ...Array.from({ length: 4 }, (_, i) => ({ receipt: `slow-${i}.json`, model: "z/flash", provider: "Wafer", completion_tokens: 12_000,
    start: Date.parse(T(i * 6)), end: Date.parse(T(i * 6 + 6)), duration_ms: 6_000 })),
  ...Array.from({ length: 3 }, (_, i) => ({ receipt: `fast-${i}.json`, model: "z/flash", provider: "Together", completion_tokens: 900,
    start: Date.parse(T(30 + i)), end: Date.parse(T(30 + i)), duration_ms: 500 })),
  // A failed call records no provider; it must never become the thing a reader is pointed at.
  { receipt: "worker-failure-x.json", model: "z/flash", provider: null, completion_tokens: 32_768,
    start: Date.parse(T(40)), end: Date.parse(T(80)), duration_ms: 40_000 },
];

test("D249: the profile splits a model by the endpoint that served it", () => {
  const p = profile({ report: spreadReport, receipts: spreadReceipts });
  const wafer = p.workers.by_model_provider.find((m) => m.provider === "Wafer");
  const together = p.workers.by_model_provider.find((m) => m.provider === "Together");
  assert.equal(wafer.model, "z/flash");
  assert.equal(wafer.calls, 4);
  assert.equal(wafer.median_ms, 6_000);
  assert.equal(wafer.median_completion_tokens, 12_000);
  assert.equal(together.median_ms, 500);
  assert.equal(together.median_completion_tokens, 900);
  // by_model alone cannot show it: one model, one row, a median between the two populations.
  assert.equal(p.workers.by_model.length, 1);
  assert.equal(p.workers.by_provider.find((m) => m.provider === "Wafer").calls, 4);
  assert.equal(p.workers.by_provider.find((m) => m.provider === "unknown").calls, 1, "a failed call has no provider and is grouped as unknown");
});

test("D249: medians are reported beside the sums, because a sum hides a per-call split", () => {
  const p = profile({ report: spreadReport, receipts: spreadReceipts });
  const model = p.workers.by_model[0];
  assert.equal(model.calls, 8);
  assert.equal(model.duration_ms, 4 * 6_000 + 3 * 500 + 40_000);
  assert.ok(Number.isFinite(model.median_ms), "the model row carries a median call");
  // Even medians of an even-sized list are defined, and a group with no timing reports null rather than 0.
  const empty = profile({ report: { ...spreadReport, worker_calls: { calls: [] } }, receipts: [] });
  assert.deepEqual(empty.workers.by_provider, []);
});

test("D249: the markdown names the endpoint spread, and only when a reader could act on it", () => {
  const md = toMarkdown(profile({ report: spreadReport, receipts: spreadReceipts }));
  assert.match(md, /\*\*Endpoint spread:\*\* `z\/flash` answered 12x slower on Wafer/);
  assert.match(md, /than on Together \(0\.5 s, 900 tok\)/);
  assert.ok(!/on unknown/.test(md), "a failed call records no provider and must not be the headline");
  assert.match(md, /\| Model \| provider \| calls \| min \| median call \(s\) \| median answer \(tok\) \| failed \|/);
});

test("D249: no endpoint-spread headline without enough calls to mean anything", () => {
  // One slow call on a second endpoint is noise; the sentence must stay silent.
  const receipts = [
    ...Array.from({ length: 5 }, (_, i) => ({ receipt: `fast-${i}.json`, model: "z/flash", provider: "Together", completion_tokens: 900,
      start: Date.parse(T(i)), end: Date.parse(T(i)), duration_ms: 500 })),
    { receipt: "one-off.json", model: "z/flash", provider: "Wafer", completion_tokens: 12_000, start: Date.parse(T(50)), end: Date.parse(T(80)), duration_ms: 30_000 },
  ];
  const report = { ...spreadReport, worker_calls: { returned_cost_usd: 0, calls_without_returned_cost: 0,
    calls: receipts.map((r) => ({ receipt: r.receipt, role: "critic", actual_model: "z/flash", status: "complete", returned_cost_usd: 0 })) } };
  assert.ok(!/Endpoint spread/.test(toMarkdown(profile({ report, receipts }))));
  // …and a single healthy endpoint never produces one either.
  assert.ok(!/Endpoint spread/.test(toMarkdown(profile({ report: baseReport, receipts }))));
});
