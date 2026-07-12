import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/variants.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const variants = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const model = (family_key, variant, agent) => ({
  id: `${family_key}::${variant}`,
  family_key,
  variant,
  scores: { composite: 50, aa_coding_agent: agent },
});

test("collapse prefers a measured GPT effort for the selected score", () => {
  const models = [
    model("gpt-5.5", "high", null),
    model("gpt-5.5", "medium", 70.5),
    model("gpt-5.5", "xhigh", 76.4),
  ];
  assert.equal(variants.preferredVariantIds(models, "aa_coding_agent").get("gpt-5.5"), "gpt-5.5::medium");
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
    model("glm-5.2", "max", null),
    model("glm-5.2", "non-reasoning", null),
  ];
  assert.equal(variants.preferredVariantIds(models, "composite").get("glm-5.2"), "glm-5.2::max");
});
