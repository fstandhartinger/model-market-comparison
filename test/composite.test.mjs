import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { computeCompositeScores } from "../lib/composite.mjs";

test("missing slots are neutral in a direct comparison", () => {
  const scores = computeCompositeScores([
    {
      id: "complete",
      scores: { aa_coding_index: 70, aa_coding_agent: 10, aa_intelligence_index: 60 },
    },
    {
      id: "sparse",
      scores: { aa_coding_index: 70, aa_coding_agent: null, aa_intelligence_index: 60 },
    },
  ]);
  assert.equal(scores.get("complete"), 50);
  assert.equal(scores.get("sparse"), 50);
});

test("missing coverage cannot beat an otherwise identical complete model indirectly", () => {
  const scores = computeCompositeScores([
    { id: "complete", scores: { aa_coding_index: 70, aa_coding_agent: 0, aa_intelligence_index: 60 } },
    { id: "sparse", scores: { aa_coding_index: 70, aa_coding_agent: null, aa_intelligence_index: 60 } },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `agent-only-${index}`,
      scores: { aa_coding_index: null, aa_coding_agent: 100 - index, aa_intelligence_index: null },
    })),
  ]);
  assert.equal(scores.get("complete"), scores.get("sparse"));
});

test("one shared score is enough to prevent a missing-coverage advantage", () => {
  const scores = computeCompositeScores([
    { id: "complete", scores: { aa_coding_index: 70, aa_coding_agent: 0 } },
    { id: "sparse", scores: { aa_coding_index: 70, aa_coding_agent: null } },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `agent-only-${index}`,
      scores: { aa_coding_index: null, aa_coding_agent: 100 - index },
    })),
  ]);
  assert.equal(scores.get("complete"), scores.get("sparse"));
});

test("a missing slot never amplifies the remaining shared evidence", () => {
  const scores = computeCompositeScores([
    { id: "complete", scores: { aa_coding_index: 50, aa_coding_agent: 0, aa_intelligence_index: 50 } },
    { id: "sparse", scores: { aa_coding_index: 50, aa_coding_agent: null, aa_intelligence_index: 50 } },
    { id: "peer", scores: { aa_coding_index: 0, aa_coding_agent: 0, aa_intelligence_index: null } },
  ]);
  assert.equal(scores.get("complete"), scores.get("sparse"));
});

test("a missing slot cannot dodge an adverse edge through an otherwise identical peer", () => {
  const scores = computeCompositeScores([
    { id: "complete", scores: { aa_coding_index: 50, aa_coding_agent: 0, aa_intelligence_index: 50 } },
    { id: "sparse", scores: { aa_coding_index: 50, aa_coding_agent: null, aa_intelligence_index: 50 } },
    { id: "peer", scores: { aa_coding_index: 0, aa_coding_agent: 25, aa_intelligence_index: null } },
  ]);
  assert.equal(scores.get("complete"), scores.get("sparse"));
});

test("models with no shared evidence never enter each other's denominator", () => {
  const base = computeCompositeScores([
    { id: "better", scores: { aa_coding_index: 80 } },
    { id: "worse", scores: { aa_coding_index: 60 } },
  ]);
  const withUnrelated = computeCompositeScores([
    { id: "better", scores: { aa_coding_index: 80 } },
    { id: "worse", scores: { aa_coding_index: 60 } },
    ...Array.from({ length: 8 }, (_, index) => ({ id: `agent-${index}`, scores: { aa_coding_agent: index } })),
  ]);
  assert.equal(withUnrelated.get("better"), base.get("better"));
  assert.equal(withUnrelated.get("worse"), base.get("worse"));
});

test("a model that wins every shared slot wins despite the peer's missing slots", () => {
  const scores = computeCompositeScores([
    {
      id: "strong",
      scores: { aa_coding_index: 80, aa_coding_agent: 5, aa_intelligence_index: 70 },
    },
    {
      id: "weak-sparse",
      scores: { aa_coding_index: 60, aa_coding_agent: null, aa_intelligence_index: 50 },
    },
  ]);
  assert.ok(scores.get("strong") > scores.get("weak-sparse"));
});

test("coverage dominance survives many comparisons on an extra weak slot", () => {
  const rows = [
    { id: "complete", scores: { aa_coding_index: 80, aa_coding_agent: 0, aa_intelligence_index: 80 } },
    { id: "sparse", scores: { aa_coding_index: 70, aa_coding_agent: null, aa_intelligence_index: 70 } },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `agent-peer-${index}`,
      scores: { aa_coding_index: null, aa_coding_agent: 100 - index, aa_intelligence_index: null },
    })),
  ];
  const scores = computeCompositeScores(rows);
  assert.ok(scores.get("complete") > scores.get("sparse"));
});

test("unreliable DesignArena results do not affect composite", () => {
  const base = [
    { id: "a", scores: { aa_coding_index: 50, designarena_frontend: 900 }, designarenaBattles: { frontend: 20 } },
    { id: "b", scores: { aa_coding_index: 50, designarena_frontend: 1400 }, designarenaBattles: { frontend: 20 } },
  ];
  const scores = computeCompositeScores(base);
  assert.equal(scores.get("a"), 50);
  assert.equal(scores.get("b"), 50);
});

test("DeepSeek V4 Pro ranks above Flash on the missing-neutral composite", async () => {
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
