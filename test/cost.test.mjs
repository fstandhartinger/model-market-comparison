import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// cost.ts has runtime-free type imports, so transpile the production module in
// memory and test the exact implementation without maintaining a JS duplicate.
const source = await readFile(new URL("../lib/cost.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./effective-cost.mjs"', `from "${new URL("../lib/effective-cost.mjs", import.meta.url).href}"`);
const cost = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

// Exercise the real Dataset -> client projection -> shared offer scope as one
// pipeline so a future omitted client mapping cannot silently drop policy flags.
const clientSource = await readFile(new URL("../lib/client-model.ts", import.meta.url), "utf8");
const compositeUrl = new URL("../lib/composite.mjs", import.meta.url).href;
const clientCompiled = ts.transpileModule(clientSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./composite.mjs"', `from "${compositeUrl}"`);
const client = await import(`data:text/javascript;base64,${Buffer.from(clientCompiled).toString("base64")}`);
const dataset = JSON.parse(await readFile(new URL("../data/dataset.json", import.meta.url), "utf8"));

const providers = [
  { key: "Azure::Azure", platform: "Azure", provider: "Azure", eu_hosted: true, eu_dedicated: true, non_us: false },
  { key: "Nebius::Nebius", platform: "Nebius", provider: "Nebius", eu_hosted: true, non_us: true },
  { key: "Secure::Secure", platform: "Secure", provider: "Secure", eu_hosted: true, non_us: true },
  { key: "Catalog::Catalog", platform: "Catalog", provider: "Catalog", eu_hosted: true, non_us: true },
  { key: "Policy::Azure", platform: "Azure", provider: "Policy", eu_hosted: true, non_us: false },
];
const offers = [
  { key: "Azure::Azure", platform: "Azure", provider: "Azure", input_per_1m: 1, output_per_1m: 1, region: "global", eu_hosted: false },
  { key: "Azure::Azure", platform: "Azure", provider: "Azure", input_per_1m: 2, output_per_1m: 2, region: "eu", eu_hosted: true },
  { key: "Nebius::Nebius", platform: "Nebius", provider: "Nebius", input_per_1m: 0.5, output_per_1m: 0.5, region: "us", eu_hosted: false },
  { key: "Secure::Secure", platform: "Secure", provider: "Secure", input_per_1m: 3, output_per_1m: 3, region: "eu", eu_hosted: true, tee: true },
  { key: "Secure::Secure", platform: "Secure", provider: "Secure", input_per_1m: 1.5, output_per_1m: 1.5, region: "global", eu_hosted: false, tee: true },
  { key: "Catalog::Catalog", platform: "Catalog", provider: "Catalog", input_per_1m: null, output_per_1m: null, region: "eu", eu_hosted: true },
  { key: "Policy::Azure", platform: "Azure", provider: "Policy", input_per_1m: 1.25, output_per_1m: 2.5, region: "global", eu_hosted: false, eu_policy_equivalent: true },
];

test("EU scope filters the route before deduplicating a provider", () => {
  const scope = cost.createOfferScope(null, false, providers, true, false, false);
  const ranked = cost.rankedOffers(offers, scope);
  const azure = ranked.find((offer) => offer.key === "Azure::Azure");
  assert.equal(azure?.region, "eu");
  assert.equal(azure?.blended, 2);
  assert.equal(ranked.some((offer) => offer.key === "Nebius::Nebius"), false);
  assert.equal(ranked.find((offer) => offer.key === "Policy::Azure")?.region, "global");
});

test("EU policy equivalence admits a Global offer without relabeling technical residency", () => {
  const scope = cost.createOfferScope(null, false, providers, true, false, false);
  const policy = cost.scopedCatalogOffers(offers, scope).find((offer) => offer.key === "Policy::Azure");
  assert.equal(policy?.region, "global");
  assert.equal(policy?.eu_hosted, false);
  assert.equal(policy?.eu_policy_equivalent, true);
});

test("real client projection keeps only EU-eligible Azure routes for open-weights models", () => {
  const data = client.clientData(dataset);
  const scope = cost.createOfferScope(null, true, data.providers, true, false, false);
  const azureKey = "Azure AI Foundry::Azure AI Foundry";
  // The featured flag now follows the AA Intelligence ranking (R4.4) and changes with
  // every refresh, so it is no longer part of the invariant this pipeline test guards.
  // What must hold: under the EU scope, every surviving Azure route is EU-eligible for a
  // stated reason, the policy flags survive the client projection, and the US Fireworks
  // route type never sneaks through.
  const matches = data.models
    .filter((model) => model.open_weights && !model.deprecated)
    .flatMap((model) => cost.scopedCatalogRoutes(data.offersByModel[model.id], scope)
      .filter((offer) => offer.key === azureKey)
      .map((offer) => ({ family: model.family_key, offer })));

  assert.ok(matches.length > 0, "no Azure route survived the Open + EU scope");
  for (const { family, offer } of matches) {
    assert.ok(offer.eu_hosted || offer.eu_policy_equivalent, `${family} ${offer.region}`);
    // The policy equivalence is reserved for the two audited Azure Direct Global routes.
    if (offer.eu_policy_equivalent && !offer.eu_hosted) {
      assert.equal(offer.region, "global", family);
      assert.equal(offer.route_type, "azure_direct", family);
    }
  }
  assert.equal(matches.some(({ offer }) => offer.route_type === "fireworks"), false);
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

const observation = (value, more={}) => ({value,source:'Synthetic test evidence',url:'https://example.test/source',collected_at:'2026-09-10',basis:'measured',...more});
const model = {id:'synthetic::high', display_name:'Synthetic high', variant:'high',aa_ref_input:2,aa_ref_output:10,
  token_efficiency:{aa:{source_slug:'synthetic-high',source_variant:'high',tokens_per_task:observation({output:1000,answer:500,reasoning:500}),benchmark_input_output_ratio:observation(5)},input_output_ratio:observation(20,{fallback:false})}};
const route = {key:'OpenRouter::Test',source:'synthetic',provider:'Test',platform:'OpenRouter',region:'eu',eu_hosted:true,or_model_id:'test/model',endpoint_tag:'test/fast',input_per_1m:2,output_per_1m:10,cache_read_per_1m:0.2,cache_write_per_1m:2.5};
const telemetryData = {models:[model],providers:[],offersByModel:{[model.id]:[route]},efficiency:{global_io_ratio:observation(30),openrouter_endpoints:{'test/model':{'test/fast':{or_model_id:'test/model',endpoint_tag:'test/fast',provider:'Test',status:'available',cache_hit_rate:observation(0.75,{definition:'Synthetic known input-token denominator'})}}}}};
const adjusted={priceMode:'adjusted',inputWeight:10};

test('client projection includes exact effort tokens and shared endpoint observations',()=>{
  const projected=client.clientData(dataset);
  assert.deepEqual(projected.efficiency,dataset.efficiency);
  for(const raw of dataset.models) assert.deepEqual(projected.models.find(m=>m.id===raw.id).token_efficiency,raw.token_efficiency);
});

test('client projection carries the optional Overview Benchmaxxing signal without inventing one',()=>{
  const first = dataset.models[0];
  const projected = client.clientData(dataset, {[first.id]: {score: 91.2, signal: true}});
  assert.equal(projected.models.find(m=>m.id===first.id).benchmaxxing_score, 91.2);
  assert.equal(projected.models.find(m=>m.id===first.id).benchmaxxing_signal, true);
  const untouched = projected.models.find(m=>m.id===dataset.models[1].id);
  assert.equal(untouched.benchmaxxing_score, null);
  assert.equal(untouched.benchmaxxing_signal, false);
});
test('adjusted is modelCost default and uses per-model OR ratio before global or AA proxy',()=>{
  assert.equal(cost.modelCost(model,telemetryData,null),0.023);
  const p=cost.modelPrice(model,telemetryData,null,adjusted);
  assert.equal(p.unit,'$/task');assert.equal(p.effective.inputs.input_output_ratio,20);
  assert.equal(p.effective.inputs.output_tokens_per_task,1000);
  assert.equal(p.effective.inputs.cache_hit_rate,0.75);
});
test('model I/O fallback selects global Chutes before benchmark proxy, rejects stale measurements',()=>{
  const m=structuredClone(model);m.token_efficiency.input_output_ratio=observation(90,{stale:true});
  assert.equal(cost.modelPrice(m,telemetryData,null).effective.inputs.input_output_ratio,30);
  const d=structuredClone(telemetryData);d.efficiency.global_io_ratio.stale=true;
  const p=cost.modelPrice(m,d,null);assert.equal(p.effective.inputs.input_output_ratio,5);
  assert.match(p.assumptions.join(' '),/benchmark I\/O ratio used as a proxy/);
  m.token_efficiency.aa.benchmark_input_output_ratio=null;
  assert.equal(cost.modelPrice(m,d,null).effective.inputs.input_output_ratio,10);
});
test('cache rates require platform + exact SKU + exact endpoint + same provider, with no stale borrowing',()=>{
  for(const change of [{platform:'Direct'},{or_model_id:'test/other'},{endpoint_tag:'test/other'},{provider:'Other'}]) {
    const p=cost.offerPrice({...route,...change},cost.priceContext(model,telemetryData,adjusted));
    assert.equal(p.effective.inputs.cache_hit_rate,0);
    assert.equal(p.value,0.05);
  }
  for(const status of ['ambiguous_endpoint_tag','provider_identity_conflict']) {
    const d=structuredClone(telemetryData);d.efficiency.openrouter_endpoints['test/model']['test/fast'].status=status;
    assert.equal(cost.offerPrice(route,cost.priceContext(model,d)).effective.inputs.cache_hit_rate,0);
  }
  const d=structuredClone(telemetryData);d.efficiency.openrouter_endpoints['test/model']['test/fast'].cache_hit_rate.stale=true;
  assert.equal(cost.offerPrice(route,cost.priceContext(model,d)).effective.inputs.cache_hit_rate,0);
});
test('alternate route representative changes with actual adjusted price, retaining EU scope',()=>{
  const cheapList={...route,endpoint_tag:'test/no-cache',input_per_1m:1.5,cache_read_per_1m:null};
  const ctx=cost.priceContext(model,telemetryData);
  assert.equal(cost.rankedOffers([cheapList,route],null,10)[0].endpoint_tag,'test/no-cache');
  assert.equal(cost.rankedOffers([cheapList,route],null,ctx)[0].endpoint_tag,'test/fast');
  const eu=cost.createOfferScope(null,false,[route],true,false,false);
  assert.equal(cost.rankedOffers([{...route,region:'us',eu_hosted:false},cheapList],eu,ctx)[0].endpoint_tag,'test/no-cache');
});
test('no efficiency copying across effort variants; raw mode ignores telemetry; scoped reference does not leak',()=>{
  const other={...model,id:'synthetic::low',token_efficiency:undefined};
  const d={...telemetryData,offersByModel:{[other.id]:[route]}};
  const p=cost.modelPrice(other,d,null);
  assert.equal(p.effective.inputs.output_tokens_per_task,1000);
  assert.match(p.assumptions.join(' '),/AA tokens\/task missing/);
  assert.equal(cost.modelPrice(model,telemetryData,null,{priceMode:'raw',inputWeight:1}).value,6);
  assert.equal(cost.modelPrice(model,telemetryData,new Set()).value,null);
  assert.ok(cost.modelPrice(model,{...telemetryData,offersByModel:{}},null).assumptions.some(x=>x.startsWith('No priced provider route')));
});

// R4.10 — the data-policy dimension of the shared offer scope.
const policyOffers = [
  { key: "P::private", platform: "P", provider: "private", input_per_1m: 3, output_per_1m: 3, region: "global", data_private: true },
  { key: "P::trains", platform: "P", provider: "trains", input_per_1m: 1, output_per_1m: 1, region: "global", data_private: false },
  { key: "P::unknown", platform: "P", provider: "unknown", input_per_1m: 2, output_per_1m: 2, region: "global" },
];
const policyProviders = policyOffers.map((o) => ({ key: o.key, provider: o.provider }));

test("privateDataOnly drops providers that train or retain, and keeps unknown ones", () => {
  // Dropping a route asserts that its provider trains on or keeps your data. We only
  // have that from OpenRouter's published table; absence of a published policy is not
  // evidence of a bad one, so an unlabelled route stays in.
  const on = cost.createOfferScope(null, false, policyProviders, false, false, false, true);
  const keys = cost.scopedCatalogOffers(policyOffers, on).map((o) => o.provider).sort();
  assert.deepEqual(keys, ["private", "unknown"]);
  assert.equal(on.restricted, true, "the data-policy filter must mark the scope as restricted");
});

test("allowing data training restores the excluded routes and the cheapest price with them", () => {
  const off = cost.createOfferScope(null, false, policyProviders, false, false, false, false);
  assert.equal(cost.scopedCatalogOffers(policyOffers, off).length, 3);
  assert.equal(off.restricted, false);
  // The filter is not cosmetic: it changes which route wins on price.
  const on = cost.createOfferScope(null, false, policyProviders, false, false, false, true);
  assert.equal(cost.rankedOffers(policyOffers, off)[0].provider, "trains");
  assert.equal(cost.rankedOffers(policyOffers, on)[0].provider, "unknown");
});

test("the data-policy filter composes with the other scope dimensions instead of replacing them", () => {
  const excluded = new Set(["P::unknown"]);
  const scope = cost.createOfferScope(excluded, false, policyProviders, false, false, false, true);
  assert.deepEqual(cost.scopedCatalogOffers(policyOffers, scope).map((o) => o.provider), ["private"]);
});
