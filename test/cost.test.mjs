import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// cost.ts has runtime-free type imports, so transpile the production module in
// memory and test the exact implementation without maintaining a JS duplicate.
const source = await readFile(new URL("../lib/cost.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const cost = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const providers = [
  { key: "Azure::Azure", platform: "Azure", provider: "Azure", eu_hosted: true, eu_dedicated: true, non_us: false },
  { key: "Nebius::Nebius", platform: "Nebius", provider: "Nebius", eu_hosted: true, non_us: true },
  { key: "Secure::Secure", platform: "Secure", provider: "Secure", eu_hosted: true, non_us: true },
  { key: "Catalog::Catalog", platform: "Catalog", provider: "Catalog", eu_hosted: true, non_us: true },
];
const offers = [
  { key: "Azure::Azure", platform: "Azure", provider: "Azure", input_per_1m: 1, output_per_1m: 1, region: "global", eu_hosted: false },
  { key: "Azure::Azure", platform: "Azure", provider: "Azure", input_per_1m: 2, output_per_1m: 2, region: "eu", eu_hosted: true },
  { key: "Nebius::Nebius", platform: "Nebius", provider: "Nebius", input_per_1m: 0.5, output_per_1m: 0.5, region: "us", eu_hosted: false },
  { key: "Secure::Secure", platform: "Secure", provider: "Secure", input_per_1m: 3, output_per_1m: 3, region: "eu", eu_hosted: true, tee: true },
  { key: "Secure::Secure", platform: "Secure", provider: "Secure", input_per_1m: 1.5, output_per_1m: 1.5, region: "global", eu_hosted: false, tee: true },
  { key: "Catalog::Catalog", platform: "Catalog", provider: "Catalog", input_per_1m: null, output_per_1m: null, region: "eu", eu_hosted: true },
];

test("EU scope filters the route before deduplicating a provider", () => {
  const scope = cost.createOfferScope(null, false, providers, true, false, false);
  const ranked = cost.rankedOffers(offers, scope);
  const azure = ranked.find((offer) => offer.key === "Azure::Azure");
  assert.equal(azure?.region, "eu");
  assert.equal(azure?.blended, 2);
  assert.equal(ranked.some((offer) => offer.key === "Nebius::Nebius"), false);
});

test("EU plus TEE requires both flags on the same offer", () => {
  const scope = cost.createOfferScope(null, false, providers, true, false, true);
  assert.deepEqual(cost.rankedOffers(offers, scope).map((offer) => [offer.key, offer.region]), [["Secure::Secure", "eu"]]);
});

test("provider exclusions are honored before price ranking", () => {
  const scope = cost.createOfferScope(new Set(["Secure::Secure"]), false, providers, false, false, false);
  const ranked = cost.rankedOffers(offers, scope);
  assert.equal(ranked.some((offer) => offer.key === "Secure::Secure"), false);
  assert.equal(ranked.filter((offer) => offer.key === "Azure::Azure").length, 1);
  assert.equal(ranked.find((offer) => offer.key === "Azure::Azure")?.region, "global");
});

test("non-US filtering composes with offer-level EU filtering", () => {
  const scope = cost.createOfferScope(null, false, providers, true, true, false);
  assert.deepEqual(cost.rankedOffers(offers, scope).map((offer) => offer.key), ["Secure::Secure"]);
});

test("scoped catalog listings retain active unpriced models without entering price ranks", () => {
  const scope = cost.createOfferScope(null, false, providers, true, false, false);
  assert.ok(cost.scopedCatalogOffers(offers, scope).some((offer) => offer.key === "Catalog::Catalog"));
  assert.equal(cost.rankedOffers(offers, scope).some((offer) => offer.key === "Catalog::Catalog"), false);
});

test("provider-level dedicated capability never turns a non-EU offer into an EU offer", () => {
  const scope = cost.createOfferScope(null, false, providers, true, false, false);
  const azure = cost.scopedCatalogRoutes(offers, scope).filter((offer) => offer.key === "Azure::Azure");
  assert.deepEqual(azure.map((offer) => offer.region), ["eu"]);
});
