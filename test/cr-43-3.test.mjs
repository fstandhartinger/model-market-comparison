import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretBenchmaxxing, topicGapsByLean } from "../lib/benchmaxxing-interpretation.mjs";

const report = { status: "scored", score: 9.2, topicGaps: [
  { category: "Coding", pairs: 6, gap: 1.7 },
  { category: "Math", pairs: 4, gap: 23.4 },
  { category: "Science", pairs: 0, gap: NaN },
  { category: "Agentic", pairs: 11, gap: -12.6 },
] };

test("CR-43.3 / CR-69.4: topics rank by lean toward headline boards and skip topics without a pair", () => {
  assert.deepEqual(topicGapsByLean(report).map((t) => t.category), ["Math", "Coding", "Agentic"]);
});

test("CR-43.3 / CR-69.4: the headline follows the published tag level, the detail names real topics with a sign", () => {
  const strong = interpretBenchmaxxing(report, "strong");
  assert.match(strong.headline, /^Strong signal/);
  assert.equal(strong.detail, "Leans most toward headline boards: Math (23 percentile points higher on headline boards). Least: Agentic (13 percentile points higher on held-out boards).");
  assert.match(interpretBenchmaxxing(report, "weak").headline, /^Weak signal/);
  assert.match(interpretBenchmaxxing(report, null).headline, /^No tag/);
  assert.match(interpretBenchmaxxing({ ...report, score: -7 }, null).headline, /^No tag: no sign/);
  assert.match(strong.caveat, /not proof/);
});

test("CR-43.3: an unscored report never gets a verdict", () => {
  const out = interpretBenchmaxxing({ status: "insufficient-coverage", score: null, topicGaps: [] }, "strong");
  assert.match(out.headline, /Not enough/);
  assert.equal(out.detail, null);
  const one = interpretBenchmaxxing({ status: "scored", score: 10, topicGaps: [{ category: "Math", pairs: 3, gap: 5 }] }, null);
  assert.equal(one.detail, "Leans most toward headline boards: Math (5 percentile points higher on headline boards).");
});
