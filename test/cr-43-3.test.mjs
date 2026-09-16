import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretBenchmaxxing, unevenTopics } from "../lib/benchmaxxing-interpretation.mjs";

const report = { status: "scored", score: 31.2, topicSpread: [
  { category: "Coding", measured: 6, spread: 1.7 },
  { category: "Math", measured: 4, spread: 23.4 },
  { category: "Science", measured: 1, spread: NaN },
  { category: "Agentic", measured: 11, spread: 12.6 },
] };

test("CR-43.3: topics rank most uneven first and skip single-benchmark topics", () => {
  assert.deepEqual(unevenTopics(report).map((t) => t.category), ["Math", "Agentic", "Coding"]);
});

test("CR-43.3: the headline follows the published tag level, the detail names real topics", () => {
  const strong = interpretBenchmaxxing(report, "strong");
  assert.match(strong.headline, /^Strong signal/);
  assert.equal(strong.detail, "Most uneven topic: Math — its 4 benchmarks differ by 23 percentile points on average. Most even: Coding (2 percentile points).");
  assert.match(interpretBenchmaxxing(report, "weak").headline, /^Weak signal/);
  assert.match(interpretBenchmaxxing(report, null).headline, /^No tag/);
  assert.match(strong.caveat, /not proof/);
});

test("CR-43.3: an unscored report never gets a verdict", () => {
  const out = interpretBenchmaxxing({ status: "insufficient-coverage", score: null, topicSpread: [] }, "strong");
  assert.match(out.headline, /Not enough/);
  assert.equal(out.detail, null);
  const one = interpretBenchmaxxing({ status: "scored", score: 10, topicSpread: [{ category: "Math", measured: 3, spread: 5 }] }, null);
  assert.equal(one.detail, "Most uneven topic: Math — its 3 benchmarks differ by 5 percentile points on average.");
});
