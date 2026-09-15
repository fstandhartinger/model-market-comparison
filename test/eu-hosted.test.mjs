import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// CR-17 (Florian 2026-09-15): the EU-hosted filter per exact offer, against the official AWS / Microsoft
// documentation checked 2026-09-15 (Hermes audit /home/flori/jobs/benchmarkheaven-eu-hosting-audit-20260915,
// re-verified from its captures). isEuOffer is the production rule, transpiled like test/cost.test.mjs does.
const source = await readFile(new URL("../lib/cost.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } })
  .outputText.replace('from "./effective-cost.mjs"', `from "${new URL("../lib/effective-cost.mjs", import.meta.url).href}"`)
  .replace('from "./regions.mjs"', `from "${new URL("../lib/regions.mjs", import.meta.url).href}"`);
const { isEuOffer } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const ds = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));
const offers = (family, provider) => ds.models.filter((m) => m.family_key === family).flatMap((m) => (m.offers ?? []).filter((o) => o.provider === provider));

test("CR-17.1: Claude Sonnet 5 and Opus 5 pass via AWS Bedrock's EU geo profile; Fable 5 / 5.1 on Bedrock do not (US/Global only)", () => {
  for (const family of ["claude-sonnet-5", "claude-opus-5"]) assert.ok(offers(family, "AWS Bedrock").some(isEuOffer), `${family}: EU Bedrock route`);
  for (const family of ["claude-fable-5", "claude-fable-5.1"]) {
    const bedrock = [...offers(family, "AWS Bedrock"), ...offers(family, "Amazon Bedrock").filter((o) => o.source !== "OpenRouter")];
    assert.ok(!bedrock.some(isEuOffer), `${family}: no EU Bedrock route`);
  }
});

test("CR-17.2: Azure AI Foundry EU Data Zone — GPT-5.6 and DeepSeek-V4 Flash pass; GPT-6 Astra (Data Zone US only) does not", () => {
  for (const family of ["gpt-5.6-sol", "gpt-5.6-luna", "gpt-5.6-terra"]) assert.ok(offers(family, "Azure AI Foundry").some((o) => isEuOffer(o) && o.region === "eu"), `${family}: EU Data Zone`);
  assert.ok(!offers("gpt-6-astra", "Azure AI Foundry").some(isEuOffer), "gpt-6-astra: Global only in Europe");
  const flash = offers("deepseek-v4-flash", "Azure AI Foundry").filter(isEuOffer);
  assert.equal(flash.length > 0, true, "deepseek-v4-flash: EU Data Zone route");
  assert.ok(flash.every((o) => o.region === "eu" && o.input_per_1m === 0.21 && o.output_per_1m === 0.56));
});

test("CR-17.3: a Global route passes only via an audited all-EU OpenRouter provider or one of the two documented Azure company-policy equivalents", async () => {
  const meta = JSON.parse(await readFile(new URL("../data/raw/provider-meta.json", import.meta.url), "utf8")).providers;
  const passing = ds.models.flatMap((m) => (m.offers ?? []).filter((o) => isEuOffer(o) && o.region === "global").map((o) => ({ family: m.family_key, o })));
  // OpenRouter exposes no region: only providers whose whole public serverless fleet is documented as EU-hosted
  // (openrouter_eu_hosted, with its basis in the provider note) may carry a Global OpenRouter row into the filter.
  const strays = passing.filter(({ o }) => !(o.eu_policy_equivalent || (o.platform === "OpenRouter" && meta[o.provider]?.openrouter_eu_hosted === true && /EU|Finland|FI\)|datacenters ES|Paris/.test(meta[o.provider].note))));
  assert.deepEqual(strays.map(({ family, o }) => `${family}|${o.provider}|${o.platform}`), []);
  const policy = [...new Set(passing.filter(({ o }) => o.eu_policy_equivalent).map(({ family, o }) => `${family}|${o.provider}`))].sort();
  assert.deepEqual(policy, ["deepseek-v4-pro|Azure AI Foundry", "kimi-k2.7-code|Azure AI Foundry"]);
  assert.ok(ds.models.flatMap((m) => m.offers ?? []).filter((o) => o.eu_policy_equivalent).every((o) => o.eu_hosted === false && o.region === "global"), "equivalents never claim EU residency");
});
