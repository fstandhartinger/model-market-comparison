import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { assertExercised, assertJoinParity, listedRow, rawCatalog } from "./helpers/live-catalog.mjs";

// CR-17 (Florian 2026-09-15): the EU-hosted filter per exact offer, against the official AWS / Microsoft
// documentation checked 2026-09-15 (Hermes audit /home/flori/jobs/benchmarkheaven-eu-hosting-audit-20260915,
// re-verified from its captures). isEuOffer is the production rule, transpiled like test/cost.test.mjs does.
const source = await readFile(new URL("../lib/cost.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } })
  .outputText.replace('from "./effective-cost.mjs"', `from "${new URL("../lib/effective-cost.mjs", import.meta.url).href}"`)
  .replace('from "./regions.mjs"', `from "${new URL("../lib/regions.mjs", import.meta.url).href}"`)
  .replace('from "./free-route.mjs"', `from "${new URL("../lib/free-route.mjs", import.meta.url).href}"`)
  .replace('from "./openrouter-pricing.mjs"', `from "${new URL("../lib/openrouter-pricing.mjs", import.meta.url).href}"`);
const { isEuOffer } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const ds = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
const offers = (family, provider) => ds.models.filter((m) => m.family_key === family).flatMap((m) => (m.offers ?? []).filter((o) => o.provider === provider));

// Live vendor catalogs list, delist and re-price daily (R9.1): an EU route is required exactly while
// the retained AWS / Azure catalog lists its row, at the raw row's price, and must vanish with it.
const bedrock = rawCatalog("aws-bedrock.json");
const azureFoundry = rawCatalog("azure-foundry.json");
const direct = (family, provider) => offers(family, provider).filter((o) => o.platform === provider);

test("CR-17.1: Claude Sonnet 5 and Opus 5 pass via AWS Bedrock's EU geo profile; Fable 5 / 5.1 on Bedrock do not (US/Global only)", () => {
  assertExercised(assert, [["claude-sonnet-5", "Claude Sonnet 5"], ["claude-opus-5", "Claude Opus 5"]].map(([family, name]) =>
    assertJoinParity(assert, direct(family, "AWS Bedrock").some(isEuOffer),
      listedRow(bedrock, (row) => row.model_name === name && /EU cross-region/.test(row.region)), `${family}: EU Bedrock route`)), "Bedrock EU geo profiles");
  for (const family of ["claude-fable-5", "claude-fable-5.1"]) {
    const bedrockOffers = [...offers(family, "AWS Bedrock"), ...offers(family, "Amazon Bedrock").filter((o) => o.source !== "OpenRouter")];
    assert.ok(!bedrockOffers.some(isEuOffer), `${family}: no EU Bedrock route`);
  }
});

test("CR-17.2: Azure AI Foundry EU Data Zone — GPT-5.6 and DeepSeek-V4 Flash pass; GPT-6 Astra (Data Zone US only) does not", () => {
  const euRow = (name) => listedRow(azureFoundry, (row) => row.model_name === `${name} (EU Data Zone)`);
  assertExercised(assert, [["gpt-5.6-sol", "GPT-5.6 Sol"], ["gpt-5.6-luna", "GPT-5.6 Luna"], ["gpt-5.6-terra", "GPT-5.6 Terra"]].map(([family, name]) =>
    assertJoinParity(assert, direct(family, "Azure AI Foundry").some((o) => isEuOffer(o) && o.region === "eu"), euRow(name), `${family}: EU Data Zone`)), "GPT-5.6 EU Data Zone");
  assert.ok(!offers("gpt-6-astra", "Azure AI Foundry").some(isEuOffer), "gpt-6-astra: Global only in Europe");
  const flash = direct("deepseek-v4-flash", "Azure AI Foundry").filter(isEuOffer);
  const flashRow = euRow("DeepSeek-V4 Flash");
  if (assertJoinParity(assert, flash.length > 0, flashRow, "deepseek-v4-flash: EU Data Zone route")) {
    assert.ok(flash.every((o) => o.region === "eu" && o.input_per_1m === flashRow.input_per_1m_usd && o.output_per_1m === flashRow.output_per_1m_usd));
  }
});

test("CR-17.3: a Global route passes only via an audited all-EU OpenRouter provider or one of the two documented Azure company-policy equivalents", async () => {
  const meta = JSON.parse(await readFile(new URL("../data/raw/provider-meta.json", import.meta.url), "utf8")).providers;
  const passing = ds.models.flatMap((m) => (m.offers ?? []).filter((o) => isEuOffer(o) && o.region === "global").map((o) => ({ family: m.family_key, o })));
  // OpenRouter exposes no region: only providers whose whole public serverless fleet is documented as EU-hosted
  // (openrouter_eu_hosted, with its basis in the provider note) may carry a Global OpenRouter row into the filter.
  const strays = passing.filter(({ o }) => !(o.eu_policy_equivalent || (o.platform === "OpenRouter" && meta[o.provider]?.openrouter_eu_hosted === true && /EU|Finland|FI\)|datacenters ES|Paris/.test(meta[o.provider].note))));
  assert.deepEqual(strays.map(({ family, o }) => `${family}|${o.provider}|${o.platform}`), []);
  const policy = [...new Set(passing.filter(({ o }) => o.eu_policy_equivalent).map(({ family, o }) => `${family}|${o.provider}`))].sort();
  // The approval list is fixed; which approved routes exist follows Azure's live catalog (R9.1).
  const approved = { "deepseek-v4-pro": "DeepSeek-V4 Pro", "kimi-k2.7-code": "Kimi K2.7 Code (Azure Direct)" };
  assert.deepEqual(policy, Object.entries(approved).filter(([, name]) => listedRow(azureFoundry, name)).map(([family]) => `${family}|Azure AI Foundry`).sort());
  assert.ok(ds.models.flatMap((m) => m.offers ?? []).filter((o) => o.eu_policy_equivalent).every((o) => o.eu_hosted === false && o.region === "global"), "equivalents never claim EU residency");
});
