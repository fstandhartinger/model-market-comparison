import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { computeCompositeScores } from "../lib/composite.mjs";

const expectedEloScore = (elo) => 100 / (1 + 10 ** ((1000 - elo) / 400));

test("five fixed slots use 50 for missing values and clamp AA values", () => {
  const scores = computeCompositeScores([
    { id: "neutral", scores: { aa_coding_index: 50 } },
    { id: "below-range", scores: { aa_coding_index: -20 } },
    { id: "above-range", scores: { aa_coding_agent: 250 } },
  ]);

  assert.equal(scores.get("neutral"), 50);
  assert.equal(scores.get("below-range"), 40);
  assert.equal(scores.get("above-range"), 60);
});

test("all-missing and non-finite rows remain unscored", () => {
  const scores = computeCompositeScores([
    { id: "missing", scores: {} },
    {
      id: "non-finite",
      scores: {
        aa_coding_index: Number.NaN,
        aa_coding_agent: Number.POSITIVE_INFINITY,
        designarena_frontend: Number.NEGATIVE_INFINITY,
      },
      designarenaBattles: { frontend: 10_000 },
    },
  ]);

  assert.equal(scores.get("missing"), null);
  assert.equal(scores.get("non-finite"), null);
  assert.deepEqual(computeCompositeScores([]), new Map());
});

test("unreliable DesignArena boards are missing-neutral", () => {
  const scores = computeCompositeScores([
    {
      id: "low-elo",
      scores: { aa_coding_index: 50, designarena_frontend: 600 },
      designarenaBattles: { frontend: 499 },
    },
    {
      id: "high-elo",
      scores: { aa_coding_index: 50, designarena_frontend: 1400 },
      designarenaBattles: { frontend: 499 },
    },
  ]);

  assert.equal(scores.get("low-elo"), 50);
  assert.equal(scores.get("high-elo"), 50);
});

test("DesignArena boards are independent fixed slots instead of a variable average", () => {
  const scores = computeCompositeScores([
    {
      id: "frontend-only",
      scores: { designarena_frontend: 1400 },
      designarenaBattles: { frontend: 500 },
    },
    {
      id: "fullstack-only",
      scores: { designarena_fullstack: 600 },
      designarenaBattles: { fullstack: 500 },
    },
    {
      id: "both",
      scores: { designarena_frontend: 1400, designarena_fullstack: 600 },
      designarenaBattles: { frontend: 500, fullstack: 500 },
    },
  ]);

  const frontendOnly = Math.round(((expectedEloScore(1400) + 4 * 50) / 5) * 10) / 10;
  const fullstackOnly = Math.round(((expectedEloScore(600) + 4 * 50) / 5) * 10) / 10;
  const both = Math.round(((expectedEloScore(1400) + expectedEloScore(600) + 3 * 50) / 5) * 10) / 10;

  assert.equal(scores.get("frontend-only"), frontendOnly);
  assert.equal(scores.get("fullstack-only"), fullstackOnly);
  assert.equal(scores.get("both"), both);
  assert.equal(scores.get("frontend-only"), 58.2);
  assert.equal(scores.get("fullstack-only"), 41.8);
  assert.equal(scores.get("both"), 50);
});

test("coverage-safe dominance raises leaders only and preserves a 0.1 margin", () => {
  const scores = computeCompositeScores([
    { id: "sparse", scores: { aa_coding_index: 80 } },
    { id: "leader", scores: { aa_coding_index: 90, aa_intelligence_index: 0 } },
    {
      id: "chain-leader",
      scores: { aa_coding_index: 95, aa_coding_agent: 0, aa_intelligence_index: 0 },
    },
  ]);

  // Raw fixed-slot means are sparse=56, leader=48 and chain-leader=39.
  // Constraints raise only the two leaders; the dominated row is untouched.
  assert.equal(scores.get("sparse"), 56);
  assert.equal(scores.get("leader"), 56.1);
  assert.equal(scores.get("chain-leader"), 56.2);
});

test("a row cannot dominate another row whose coverage it does not contain", () => {
  const scores = computeCompositeScores([
    { id: "partial", scores: { aa_coding_index: 90 } },
    { id: "not-covered", scores: { aa_coding_index: 80, aa_intelligence_index: 100 } },
  ]);
  // Winning the only shared slot is insufficient when the would-be leader does
  // not cover every slot observed for the other model.
  assert.equal(scores.get("partial"), 58);
  assert.equal(scores.get("not-covered"), 66);
});

test("an exact clone cannot move any existing score", () => {
  const rows = [
    { id: "m0", scores: { aa_coding_agent: 50, aa_intelligence_index: 20 } },
    { id: "m1", scores: { aa_coding_index: 10, aa_intelligence_index: 50 } },
    { id: "m2", scores: { aa_coding_index: 30 } },
    { id: "m3", scores: { aa_coding_index: 50, aa_coding_agent: 30 } },
  ];
  const base = computeCompositeScores(rows);
  const withClone = computeCompositeScores([
    ...rows,
    { id: "clone", scores: { ...rows[0].scores } },
  ]);

  for (const row of rows) assert.equal(withClone.get(row.id), base.get(row.id), row.id);
  assert.equal(withClone.get("clone"), withClone.get("m0"));
});

test("row order cannot affect composite scores", () => {
  const rows = [
    { id: "a", scores: { aa_coding_index: 91, aa_intelligence_index: 74 } },
    { id: "b", scores: { aa_coding_index: 82 } },
    { id: "c", scores: { aa_coding_agent: 67, aa_intelligence_index: 61 } },
    {
      id: "d",
      scores: { aa_coding_index: 77, designarena_frontend: 1280, designarena_fullstack: 1120 },
      designarenaBattles: { frontend: 900, fullstack: 700 },
    },
  ];
  const expected = computeCompositeScores(rows);

  for (const permutation of [
    [...rows].reverse(),
    [rows[2], rows[0], rows[3], rows[1]],
    [rows[1], rows[3], rows[0], rows[2]],
  ]) {
    const actual = computeCompositeScores(permutation);
    for (const row of rows) assert.equal(actual.get(row.id), expected.get(row.id), row.id);
  }
});

test("improving an observed score never lowers the model's composite", () => {
  let state = 0x5eed1234;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const fields = [
    "aa_coding_index",
    "aa_coding_agent",
    "aa_intelligence_index",
    "designarena_frontend",
    "designarena_fullstack",
  ];

  for (let trial = 0; trial < 5_000; trial += 1) {
    const rows = Array.from({ length: 7 }, (_, index) => {
      const scores = {};
      for (const field of fields.slice(0, 3)) {
        scores[field] = random() < 0.35 ? null : Math.round(random() * 1_000) / 10;
      }
      for (const field of fields.slice(3)) {
        scores[field] = random() < 0.45 ? null : 600 + Math.round(random() * 800);
      }
      if (Object.values(scores).every((value) => value == null)) scores.aa_coding_index = 50;
      return {
        id: `m${index}`,
        scores,
        designarenaBattles: {
          frontend: scores.designarena_frontend == null ? null : 500,
          fullstack: scores.designarena_fullstack == null ? null : 500,
        },
      };
    });

    const targetIndex = Math.floor(random() * rows.length);
    const observed = fields.filter((field) => rows[targetIndex].scores[field] != null);
    const field = observed[Math.floor(random() * observed.length)];
    const before = computeCompositeScores(rows).get(rows[targetIndex].id);
    const improved = structuredClone(rows);
    improved[targetIndex].scores[field] += field.startsWith("designarena_") ? 10 : 1;
    const after = computeCompositeScores(improved).get(rows[targetIndex].id);

    assert.ok(
      after >= before,
      `trial ${trial}: ${rows[targetIndex].id} ${field} improved but ${before} -> ${after}`,
    );
  }
});

test("scores remain bounded for extreme valid inputs", () => {
  const scores = computeCompositeScores([
    {
      id: "low",
      scores: {
        aa_coding_index: -1e9,
        aa_coding_agent: -1e9,
        aa_intelligence_index: -1e9,
        designarena_frontend: -10_000,
        designarena_fullstack: -10_000,
      },
      designarenaBattles: { frontend: 500, fullstack: 500 },
    },
    {
      id: "high",
      scores: {
        aa_coding_index: 1e9,
        aa_coding_agent: 1e9,
        aa_intelligence_index: 1e9,
        designarena_frontend: 10_000,
        designarena_fullstack: 10_000,
      },
      designarenaBattles: { frontend: 500, fullstack: 500 },
    },
  ]);

  for (const value of scores.values()) assert.ok(value >= 0 && value <= 100, value);
  assert.equal(scores.get("high"), 100);
});

test("DeepSeek V4 Pro ranks above Flash on the fixed-slot composite", async () => {
  const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const inputs = dataset.models.map((m) => ({
    id: m.id,
    scores: {
      aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
      aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
      aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
      designarena_frontend: m.designarena?.frontend?.elo ?? null,
      designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
    },
    designarenaBattles: {
      frontend: m.designarena?.frontend?.battles ?? null,
      fullstack: m.designarena?.fullstack?.battles ?? null,
    },
  }));
  const scores = computeCompositeScores(inputs);
  assert.ok(
    scores.get("deepseek-v4-pro::max") > scores.get("deepseek-v4-flash::max"),
    `expected Pro (${scores.get("deepseek-v4-pro::max")}) > Flash (${scores.get("deepseek-v4-flash::max")})`,
  );
});
