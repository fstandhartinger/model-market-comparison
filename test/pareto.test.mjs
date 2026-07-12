import { test } from "node:test";
import assert from "node:assert/strict";
import { paretoFrontier } from "../lib/pareto.mjs";

const ids = (points) => points.map((point) => point.id);

test("Pareto frontier keeps cost/capability tradeoffs and removes dominated interiors", () => {
  const points = [
    { id: "cheapest", x: 1, y: 40 },
    { id: "tradeoff", x: 2, y: 60 },
    { id: "dominated", x: 3, y: 50 },
    { id: "strongest", x: 4, y: 80 },
  ];
  assert.deepEqual(ids(paretoFrontier(points)), ["cheapest", "tradeoff", "strongest"]);
});

test("Pareto frontier handles cost, score, and exact ties correctly", () => {
  const points = [
    { id: "same-cost-best", x: 1, y: 60 },
    { id: "same-cost-worse", x: 1, y: 50 },
    { id: "same-score-costlier", x: 2, y: 60 },
    { id: "exact-tie-b", x: 1, y: 60 },
    { id: "exact-tie-a", x: 1, y: 60 },
  ];
  assert.deepEqual(ids(paretoFrontier(points)), ["exact-tie-a", "exact-tie-b", "same-cost-best"]);
});

test("Pareto frontier is deterministic, order independent, and supports empty/singleton filters", () => {
  const points = [
    { id: "a", x: 0.1, y: 45 },
    { id: "b", x: 0.5, y: 75 },
    { id: "c", x: 0.3, y: 60 },
    { id: "d", x: 0.7, y: 55 },
  ];
  const expected = ids(paretoFrontier(points));
  assert.deepEqual(ids(paretoFrontier([...points].reverse())), expected);
  assert.deepEqual(paretoFrontier([]), []);
  assert.deepEqual(paretoFrontier([points[0]]), [points[0]]);
});

test("Pareto helper agrees with the strict minimize-cost/maximize-score definition", () => {
  const points = Array.from({ length: 80 }, (_, index) => ({
    id: `p${index}`,
    x: ((index * 37) % 29) + 1,
    y: ((index * 53) % 41) + 1,
  }));
  const frontier = new Set(paretoFrontier(points).map((point) => point.id));
  for (const [index, point] of points.entries()) {
    const dominated = points.some((other, otherIndex) => otherIndex !== index
      && other.x <= point.x && other.y >= point.y
      && (other.x < point.x || other.y > point.y));
    assert.equal(frontier.has(point.id), !dominated, point.id);
  }
});
