import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/variants.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const variants = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const model = (family_key, variant, agent, { composite = 50, coverage = agent == null ? 0 : 1 } = {}) => ({
  id: `${family_key}::${variant}`,
  family_key,
  variant,
  scores: { composite, aa_coding_agent: agent },
  composite_coverage: coverage,
});

test("collapse picks the strongest measured GPT effort for the selected score", () => {
  // The family is represented by its best measured configuration (like AA's
  // Coding-Agent "max across harnesses") — not a static effort preference.
  const models = [
    model("gpt-5.5", "high", null),
    model("gpt-5.5", "medium", 70.5),
    model("gpt-5.5", "xhigh", 76.4),
  ];
  assert.equal(variants.preferredVariantIds(models, "aa_coding_agent").get("gpt-5.5"), "gpt-5.5::xhigh");
});

test("collapse keeps DeepSeek Coding-Agent evidence instead of an unmeasured max row", () => {
  const models = [
    model("deepseek-v4-pro", "high", 47.3),
    model("deepseek-v4-pro", "max", null),
    model("deepseek-v4-pro", "non-reasoning", null),
  ];
  assert.equal(variants.preferredVariantIds(models, "aa_coding_agent").get("deepseek-v4-pro"), "deepseek-v4-pro::high");
});

test("collapse prefers an explicit GLM max result over a generic default alias", () => {
  const models = [
    model("glm-5.2", "default", 57.9),
    model("glm-5.2", "max", null, { composite: 78.6, coverage: 5 }),
    model("glm-5.2", "non-reasoning", null),
  ];
  assert.equal(variants.preferredVariantIds(models, "composite").get("glm-5.2"), "glm-5.2::max");
});

test("neutral Composite fallback cannot replace a measured family representative", () => {
  const models = [
    model("claude-sonnet-5", "high", null, { composite: 50, coverage: 0 }),
    model("claude-sonnet-5", "max", null, { composite: 94.9, coverage: 2 }),
    model("claude-sonnet-5", "designarena", null, { composite: 100, coverage: 1 }),
  ];
  assert.equal(
    variants.preferredVariantIds(models, "composite").get("claude-sonnet-5"),
    "claude-sonnet-5::max",
  );
});

test("collapsed representative fallback is deterministic and prefers a measured Claude effort", () => {
  const medium = model("claude-sonnet-4.6", "medium", 54.2, { composite: 70, coverage: 1 });
  const nonReasoningLow = model("claude-sonnet-4.6", "non-reasoning-low", null, { composite: 60, coverage: 1 });
  for (const rows of [[medium, nonReasoningLow], [nonReasoningLow, medium]]) {
    assert.equal(
      variants.preferredVariantIds(rows, "composite").get("claude-sonnet-4.6"),
      "claude-sonnet-4.6::medium",
    );
  }
});

test("hide-deprecated hides whole families, not individual variants", () => {
  // AA deprecates individual effort rows when it re-benchmarks; a live family
  // routinely keeps its strongest measurements on a deprecated row (GPT-5.4
  // (xhigh)). Variants stay selectable as long as the FAMILY has any active row.
  const deprecatedReasoning = { ...model("mixed", "reasoning", 90), deprecated: true };
  const activeDefault = { ...model("mixed", "default", 70), deprecated: false };
  const hidden = variants.selectableModels([deprecatedReasoning, activeDefault], true);

  assert.deepEqual(hidden.map((row) => row.id).sort(), ["mixed::default", "mixed::reasoning"]);
  assert.equal(variants.preferredVariantIds(hidden, "aa_coding_agent").get("mixed"), "mixed::reasoning");

  const shown = variants.selectableModels([deprecatedReasoning, activeDefault], false);
  assert.equal(variants.preferredVariantIds(shown, "aa_coding_agent").get("mixed"), "mixed::reasoning");
});

test("a fully deprecated family has no selectable model while hiding is active", () => {
  const models = [
    { ...model("retired", "reasoning", 80), deprecated: true },
    { ...model("retired", "non-reasoning", 60), deprecated: true },
  ];
  assert.deepEqual(variants.selectableModels(models, true), []);
  assert.equal(variants.selectableModels(models, false).length, 2);
});
