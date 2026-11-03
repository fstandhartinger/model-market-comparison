import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertJoinParity } from "./helpers/live-catalog.mjs";
import { LAB_COUNTRIES, labBucket, labFilter } from "../lib/regions.mjs";

// D172.2 (2026-09-22): three published rows named no lab at all — they read "Other", the bucket CR-25.4
// reserves for a lab whose home country is not documented, so "Model lab based in" hid them behind a
// guess-free rule that had nothing to guess from. Each is a board-only row whose maker is stated by the
// maker itself: Pareto by Unbiased (unbiased.ai/terms, see provider-meta-unbiased.test.mjs), Muse Spark by
// Meta (every OpenRouter catalog row is "Meta: Muse Spark …"), SWE-1.7 by Cognition ("Today, we're
// launching SWE-1.7, the most capable model we've trained so far", cognition.com/blog/swe-1-7).
const ds = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
const codingAgents = JSON.parse(await readFile(new URL("../data/raw/aa-coding-agents.json", import.meta.url), "utf8"));
const designArena = JSON.parse(await readFile(new URL("../data/raw/designarena.json", import.meta.url), "utf8"));
const openRouter = JSON.parse(await readFile(new URL("../data/raw/openrouter.json", import.meta.url), "utf8"));
const row = (id) => ds.models.find((m) => m.id === id);
const paretoModels = ds.models.filter((m) => /^pareto(?:-\d{2}\.\d+(?:-[a-z]+)?)?::default$/.test(m.id));
// Pareto rows come from OpenRouter's catalog alone and the Muse Spark Max row from the Intelligence.ai
// board; both are live listings (R9.1), so an attribution is checked exactly while its source lists the row.
const paretoListed = (openRouter.models ?? []).some((m) => /^~?unbiased\/pareto(?:-\d{2}\.\d+(?:-[a-z]+)?)?$/.test(m.id));
const museListed = JSON.stringify(designArena).includes("muse-spark-1.3-max");

test("D172.2: SWE-1.7 Lightning Max is Cognition's, scored under Cognition's own harness", () => {
  const model = row("swe-1.7-lightning-max::default");
  assert.ok(model, "swe-1.7-lightning-max::default is gone; re-check this attribution");
  assert.equal(model.org, "Cognition AI");
  // Non-vacuous: the board row this model exists for really is the Devin CLI one.
  const results = model.coding_agent_results ?? [];
  assert.deepEqual(results.map((r) => [r.source_model_name, r.harness]), [["SWE-1.7 Lightning Max", "Devin CLI"]]);
  const source = JSON.stringify(codingAgents);
  assert.ok(source.includes("SWE-1.7 Lightning Max"), "the AA coding-agent snapshot no longer carries this row");
});

test("D172.2: Muse Spark 1.3 Max is Meta's, like every other Muse Spark row", () => {
  const model = row("muse-spark-1.3-max::default");
  // The board no longer publishing this id releases the row; while it does, the row must exist.
  if (museListed) assert.ok(model, "muse-spark-1.3-max::default is gone although the board still publishes it");
  if (!model) return;
  assert.equal(model.org, "Meta");
  const siblings = ds.models.filter((m) => m.family_key === "muse-spark-1.3");
  // Siblings and OpenRouter names are live: every one that exists must say Meta (R9.1).
  for (const sibling of siblings) assert.equal(sibling.org, "Meta", sibling.id);
  const catalogNames = (openRouter.models ?? []).filter((m) => String(m.id).includes("muse-spark")).map((m) => m.name);
  assert.ok(catalogNames.every((n) => /^Meta:\s/.test(n)), catalogNames.join(" | "));
  // The separate family is the board's product name, not a claim that Meta ships two models: the attachment
  // note must keep saying so, or this row should be joined rather than relabelled.
  assert.match(model.designarena_attachment_note ?? "", /family scope/);
});

test("D172.2: the labs these rows name have a documented home country, so the lab filter can place them", () => {
  for (const org of ["Unbiased", "Cognition AI", "Meta"]) {
    assert.equal(LAB_COUNTRIES[org], "US", `${org} has no documented home country`);
    assert.equal(labBucket(org), "US", org);
  }
  assertJoinParity(assert, paretoModels.length > 0, paretoListed, "Pareto model rows");
  for (const model of paretoModels) assert.equal(model.org, "Unbiased", `${model.id} lost the lab attribution`);
  // The filter itself: a US-only lab selection keeps all three, an EU-only selection drops them.
  const us = labFilter([], ["US"]), eu = labFilter([], ["EU"]);
  const fixedModels = [row("swe-1.7-lightning-max::default"), ...(museListed ? [row("muse-spark-1.3-max::default")] : [])];
  for (const model of [...paretoModels, ...fixedModels]) {
    assert.ok(model, "a fixed attribution model row is missing");
    assert.ok(us(model.org), `${model.id} (${model.org}) is not in the US lab bucket`);
    assert.ok(!eu(model.org), `${model.id} (${model.org}) must not pass an EU-only lab filter`);
  }
  // "Other" stays the guess-free bucket it was: nothing may be read into it.
  assert.equal(LAB_COUNTRIES.Other, undefined);
  assert.equal(labBucket("Other"), "Other");
});

test("D172.3: Cognition publishes no weights, so SWE-1.7 Lightning Max loses the open-weights badge", async () => {
  const model = row("swe-1.7-lightning-max::default");
  assert.equal(model.open_weights, false, "a model served only inside Devin must not read as open weights");
  // Non-vacuous: nothing else could have decided it. The row carries no AA open-weights metadata and no
  // Hugging Face repository, and the heuristic's default is open — only the lab's classification says no.
  assert.equal(model.aa_metadata?.is_open_weights ?? null, null);
  assert.equal(model.aa_metadata?.huggingface_url ?? null, null);
  const build = await readFile(new URL("../scripts/build-dataset.mjs", import.meta.url), "utf8");
  const closed = build.match(/const CLOSED_ORGS = new Set\(\[([^\]]*)\]\)/)?.[1] ?? "";
  assert.ok(closed.includes('"Cognition AI"'), closed);
  assert.match(build, /return !CLOSED_ORGS\.has\(org\);/, "the rule is still closed-by-lab, open by default");
});
