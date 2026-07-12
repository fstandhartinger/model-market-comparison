import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compositeEvidenceCount, computeCompositeScores } from "../lib/composite.mjs";

const inputsFromDataset = (dataset) => dataset.models.map((model) => ({
  id: model.id,
  scores: {
    aa_coding_index: model.benchmarks?.aa_coding_index ?? null,
    aa_coding_agent: model.benchmarks?.aa_coding_agent_index ?? null,
    aa_intelligence_index: model.benchmarks?.aa_intelligence_index ?? null,
    designarena_frontend: model.designarena?.frontend?.elo ?? null,
    designarena_fullstack: model.designarena?.fullstack?.elo ?? null,
  },
  designarenaBattles: {
    frontend: model.designarena?.frontend?.battles ?? null,
    fullstack: model.designarena?.fullstack?.battles ?? null,
  },
}));

test("observed slots use per-source percentiles and clamp AA values", () => {
  const scores = computeCompositeScores([
    { id: "below-range", scores: { aa_coding_index: -20 } },
    { id: "middle", scores: { aa_coding_index: 50 } },
    { id: "above-range", scores: { aa_coding_agent: 250 } },
    { id: "coding-high", scores: { aa_coding_index: 250 } },
  ]);

  assert.equal(scores.get("below-range"), 0);
  assert.equal(scores.get("middle"), 50);
  assert.equal(scores.get("coding-high"), 100);
  // A source with only one unique observed value contains no relative signal.
  assert.equal(scores.get("above-range"), 50);
});

test("all-missing and non-finite rows receive the neutral fallback", () => {
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

  assert.equal(scores.get("missing"), 50);
  assert.equal(scores.get("non-finite"), 50);
  assert.equal(compositeEvidenceCount({ id: "missing", scores: {} }), 0);
  assert.deepEqual(computeCompositeScores([]), new Map());
});

test("unreliable DesignArena boards are omitted before model-mean imputation", () => {
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
  assert.equal(compositeEvidenceCount({
    id: "low-elo",
    scores: { aa_coding_index: 50, designarena_frontend: 600 },
    designarenaBattles: { frontend: 499 },
  }), 1);
  assert.equal(compositeEvidenceCount({
    id: "da-boundary-low",
    scores: { designarena_frontend: 1200 },
    designarenaBattles: { frontend: 499 },
  }), 0);
  assert.equal(compositeEvidenceCount({
    id: "da-boundary-high",
    scores: { designarena_frontend: 1200 },
    designarenaBattles: { frontend: 500 },
  }), 1);
});

test("DesignArena boards are independent percentile slots instead of a variable average", () => {
  const scores = computeCompositeScores([
    {
      id: "frontend-low",
      scores: { designarena_frontend: 1000 },
      designarenaBattles: { frontend: 500 },
    },
    {
      id: "frontend-high",
      scores: { designarena_frontend: 1400 },
      designarenaBattles: { frontend: 500 },
    },
    {
      id: "fullstack-low",
      scores: { designarena_fullstack: 600 },
      designarenaBattles: { fullstack: 500 },
    },
    {
      id: "fullstack-high",
      scores: { designarena_fullstack: 1000 },
      designarenaBattles: { fullstack: 500 },
    },
    {
      id: "opposite-extremes",
      scores: { designarena_frontend: 1400, designarena_fullstack: 600 },
      designarenaBattles: { frontend: 500, fullstack: 500 },
    },
  ]);

  assert.equal(scores.get("frontend-low"), 0);
  assert.equal(scores.get("frontend-high"), 100);
  assert.equal(scores.get("fullstack-low"), 0);
  assert.equal(scores.get("fullstack-high"), 100);
  assert.equal(scores.get("opposite-extremes"), 50);
});

test("missing slots inherit the model's mean observed percentile", () => {
  const scores = computeCompositeScores([
    {
      id: "low",
      scores: {
        aa_coding_index: 0,
        aa_coding_agent: 0,
        aa_intelligence_index: 0,
        designarena_frontend: 600,
        designarena_fullstack: 600,
      },
      designarenaBattles: { frontend: 500, fullstack: 500 },
    },
    {
      id: "high",
      scores: {
        aa_coding_index: 100,
        aa_coding_agent: 100,
        aa_intelligence_index: 100,
        designarena_frontend: 1400,
        designarena_fullstack: 1400,
      },
      designarenaBattles: { frontend: 500, fullstack: 500 },
    },
    { id: "target", scores: { aa_coding_index: 100, aa_coding_agent: 50 } },
  ]);

  // Target's observed percentiles are 100 and 50. Its other three slots inherit
  // their mean 75, leaving the five-slot Composite at exactly 75.
  assert.equal(scores.get("target"), 75);
});

test("long dominance-like catalogs cannot add recursive score margins", () => {
  const rows = Array.from({ length: 228 }, (_, index) => ({
    id: `m${index}`,
    scores: { aa_intelligence_index: 100 - index / 3 },
  }));
  const scores = computeCompositeScores(rows);

  // Missing slots inherit the row's only observed percentile, so the one-slot
  // catalog still spans the full percentile range without recursive margins.
  assert.equal(scores.get("m0"), 100);
  assert.equal(scores.get("m227"), 0);
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

test("every catalog row receives a finite bounded Composite", async () => {
  const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const inputs = inputsFromDataset(dataset);
  const scores = computeCompositeScores(inputs);

  assert.equal(scores.size, dataset.models.length);
  for (const row of inputs) {
    const value = scores.get(row.id);
    assert.equal(typeof value, "number", row.id);
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 100, `${row.id}: ${value}`);
    if (compositeEvidenceCount(row) === 0) assert.equal(value, 50, row.id);
  }
});

test("DeepSeek V4 Pro ranks above Flash on the model-mean-imputed composite", async () => {
  const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const inputs = inputsFromDataset(dataset);
  const scores = computeCompositeScores(inputs);
  assert.ok(
    scores.get("deepseek-v4-pro::max") > scores.get("deepseek-v4-flash::max"),
    `expected Pro (${scores.get("deepseek-v4-pro::max")}) > Flash (${scores.get("deepseek-v4-flash::max")})`,
  );
});

test("GPT-5.6 Sol's observed-percentile mean ranks above GLM-5.2", async () => {
  const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const solRow = dataset.models.find((model) => model.id === "gpt-5.6-sol::high");
  const glmRow = dataset.models.find((model) => model.id === "glm-5.2::max");
  assert.ok(solRow && glmRow);
  for (const key of ["aa_coding_index", "aa_coding_agent_index", "aa_intelligence_index"]) {
    assert.ok(
      solRow.benchmarks[key] > glmRow.benchmarks[key],
      `expected GPT-5.6 Sol ${key} (${solRow.benchmarks[key]}) > GLM (${glmRow.benchmarks[key]})`,
    );
  }

  const inputs = inputsFromDataset(dataset);
  const scores = computeCompositeScores(inputs);
  const sol = scores.get("gpt-5.6-sol::high");
  const glm = scores.get("glm-5.2::max");

  assert.ok(sol > 95 && sol < 96, `expected GPT-5.6 Sol near 95.4, got ${sol}`);
  assert.ok(sol > glm, `expected GPT-5.6 Sol (${sol}) above GLM-5.2 (${glm})`);
});

test("Fable 5's family-scoped evidence preserves its five-slot dominance over GLM-5.2", async () => {
  const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
  const fable = dataset.models.find((model) => model.id === "claude-fable-5::max");
  const glm = dataset.models.find((model) => model.id === "glm-5.2::max");
  assert.ok(fable && glm);

  const rawSlots = (model) => [
    model.benchmarks.aa_coding_index,
    model.benchmarks.aa_coding_agent_index,
    model.benchmarks.aa_intelligence_index,
    model.designarena.frontend?.elo,
    model.designarena.fullstack?.elo,
  ];
  const fableSlots = rawSlots(fable);
  const glmSlots = rawSlots(glm);
  fableSlots.forEach((value, index) => {
    assert.equal(typeof value, "number", `Fable slot ${index} missing`);
    assert.ok(value > glmSlots[index], `expected Fable slot ${index} (${value}) > GLM (${glmSlots[index]})`);
  });

  const inputs = inputsFromDataset(dataset);
  const scores = computeCompositeScores(inputs);
  assert.ok(
    scores.get(fable.id) > scores.get("gpt-5.6-sol::high"),
    `expected Fable (${scores.get(fable.id)}) > GPT-5.6 Sol (${scores.get("gpt-5.6-sol::high")})`,
  );
  assert.ok(
    scores.get(fable.id) > scores.get(glm.id),
    `expected Fable (${scores.get(fable.id)}) > GLM-5.2 (${scores.get(glm.id)})`,
  );
});
