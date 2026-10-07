import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { comparableTaskCost, UNMEASURED_TASK_NOTE } from "../lib/value-map.mjs";
import { FALLBACK_OUTPUT_TOKENS } from "../lib/effective-cost.mjs";

// CR-326 (Florian 2026-10-07): Claude Opus 4.7 and GPT-5.4 sat on the /charts Pareto line at ~$0.05 and ~$0.03 per
// task because neither has an AA tokens-per-task measurement and the cost engine priced them on its 1,000-token
// example task. The real cost module is transpiled in memory, as in cost.test.mjs.
const lib = (f) => new URL(`../lib/${f}`, import.meta.url).href;
async function load(file, deps) {
  let out = ts.transpileModule(await readFile(new URL(`../lib/${file}`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const d of deps) out = out.replace(`from "./${d}"`, `from "${lib(d)}"`);
  return import(`data:text/javascript;base64,${Buffer.from(out).toString("base64")}`);
}
const cost = await load("cost.ts", ["effective-cost.mjs", "regions.mjs", "free-route.mjs", "openrouter-pricing.mjs"]);
const client = await load("client-model.ts", ["composite.mjs", "family-representative.mjs"]);
const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
const data = client.clientData(dataset);
const priced = data.models.map((m) => ({ m, price: cost.modelPrice(m, data, null) })).filter((x) => x.price.value != null);

test("comparableTaskCost: an assumed-task $/task estimate is not comparable; measured and raw prices are", () => {
  assert.equal(comparableTaskCost({ value: 0.05, unit: "$/task", assumedTask: true }), false);
  assert.equal(comparableTaskCost({ value: 1.3, unit: "$/task", assumedTask: false }), true);
  assert.equal(comparableTaskCost({ value: 3.5, unit: "$/1M tokens" }), true);
  assert.equal(comparableTaskCost({ value: null, unit: "$/task" }), false);
  assert.equal(comparableTaskCost(null), false);
  assert.match(UNMEASURED_TASK_NOTE, /Cost estimate unavailable/);
});

test("real dataset: every assumed-task estimate is excluded, and no comparable estimate uses the 1,000-token fallback", () => {
  const assumed = priced.filter((x) => x.price.assumedTask);
  assert.ok(assumed.length > 0, "the fixture should still contain unmeasured models, or this guard tests nothing");
  for (const x of assumed) assert.equal(comparableTaskCost(x.price), false, x.m.display_name);
  for (const x of priced.filter((y) => comparableTaskCost(y.price))) {
    const measured = x.m.token_efficiency?.aa?.tokens_per_task?.value?.output;
    assert.ok(measured > 0, `${x.m.display_name}: comparable $/task without a measured token count`);
    assert.equal(x.price.effective.inputs.output_tokens_per_task, measured, x.m.display_name);
  }
});

test("real dataset: the two screenshot models are not plottable while their task tokens are unmeasured", () => {
  for (const id of ["claude-opus-4.7::max", "gpt-5.4::xhigh"]) {
    const x = priced.find((y) => y.m.id === id);
    if (!x) continue;
    if (x.price.assumedTask) assert.equal(comparableTaskCost(x.price), false, id);
  }
});

test("sanity bound: a comparable cost per task sits between the output-token bill and list price × modeled tokens", () => {
  for (const x of priced.filter((y) => comparableTaskCost(y.price) && y.price.unit === "$/task")) {
    const i = x.price.effective.inputs;
    const output = i.output_tokens_per_task, input = i.input_tokens_per_task;
    assert.ok(output > FALLBACK_OUTPUT_TOKENS, `${x.m.display_name}: ${output} output tokens per task`);
    // Output tokens are never cache-discounted, so their bill is a hard floor.
    const floor = (output * i.output_per_1m) / 1e6;
    // Upper bound: every input token at list price, plus a cache-write surcharge of at most the input price again.
    const ceiling = (output * i.output_per_1m + 2 * input * i.input_per_1m) / 1e6;
    assert.ok(x.price.value >= floor * 0.999, `${x.m.display_name}: $${x.price.value} below output floor $${floor}`);
    assert.ok(x.price.value <= ceiling * 1.001 + 1e-9, `${x.m.display_name}: $${x.price.value} above list-price ceiling $${ceiling}`);
  }
});

test("every cost chart filters through comparableTaskCost", async () => {
  for (const f of ["CostCapabilityScatter.tsx", "ChartsBoard.tsx", "ModelExplorer.tsx"]) {
    const src = await readFile(new URL(`../components/${f}`, import.meta.url), "utf8");
    assert.match(src, /comparableTaskCost\(/, f);
  }
  const scatter = await readFile(new URL("../components/CostCapabilityScatter.tsx", import.meta.url), "utf8");
  assert.match(scatter, /data-bh-unmeasured-task-note/);
});
