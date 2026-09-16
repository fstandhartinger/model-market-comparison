import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// cost.ts has runtime-free type imports, so transpile the production module in
// memory and test the exact implementation without maintaining a JS duplicate.
const source = await readFile(new URL("../lib/cost.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./effective-cost.mjs"', `from "${new URL("../lib/effective-cost.mjs", import.meta.url).href}"`)
  .replace('from "./regions.mjs"', `from "${new URL("../lib/regions.mjs", import.meta.url).href}"`)
  .replace('from "./free-route.mjs"', `from "${new URL("../lib/free-route.mjs", import.meta.url).href}"`);
const cost = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

// Exercise the real Dataset -> client projection -> shared offer scope as one
// pipeline so a future omitted client mapping cannot silently drop policy flags.
const clientSource = await readFile(new URL("../lib/client-model.ts", import.meta.url), "utf8");
const compositeUrl = new URL("../lib/composite.mjs", import.meta.url).href;
const clientCompiled = ts.transpileModule(clientSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText.replace('from "./composite.mjs"', `from "${compositeUrl}"`)
  .replace('from "./family-representative.mjs"', `from "${new URL("../lib/family-representative.mjs", import.meta.url).href}"`);
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
  assert.equal(untouched.benchmaxxing_score, undefined);
  assert.equal(untouched.benchmaxxing_signal, undefined);
});

test('Composite coverage separates exact inputs from family- or product-attached values', () => {
  const projected = client.clientData(dataset);
  const slots = [
    ['aa_coding_index', 'aa_coding_index'],
    ['aa_coding_agent', 'aa_coding_agent_index'],
    ['aa_intelligence_index', 'aa_intelligence_index'],
    ['epoch_eci', 'epoch_eci'],
    ['epoch_eci_software', 'epoch_eci_software'],
    ['designarena_frontend', 'frontend'],
    ['designarena_fullstack', 'fullstack'],
  ];
  for (const raw of dataset.models) {
    const model = projected.models.find((candidate) => candidate.id === raw.id);
    assert.ok(model, raw.id);
    const exact = slots.filter(([slot, field]) => {
      const value = field === 'frontend' || field === 'fullstack'
        ? raw.designarena?.[field]?.elo
        : raw.benchmarks?.[field];
      return value != null && !model.composite_attachments[slot];
    });
    assert.equal(model.composite_coverage, exact.length, `${raw.id}: exact Composite coverage`);
    assert.ok(model.benchmark_count >= exact.length, `${raw.id}: #benchmarks must cover exact Composite inputs`);
  }
  const fable = projected.models.find((model) => model.id === 'claude-fable-5::high');
  assert.ok(fable);
  // 2026-09-15: DeepSWE (via Epoch AI) and FrontierCode 1.1 (reviewed identity join) add exact results to its one
  // Composite input.
  // 2026-09-16 (CR-34.2): OpenRouter's own GPQA Diamond and τ²-Bench Airline runs attach to this family
  // representative. Their measured avg_cost_per_task boards are `Efficiency` and stay out of #benchmarks.
  // 2026-09-16 (iteration 79): ApprenticeBench CUA joins ("claude-fable-5 · Claude Code · high") — the sixth
  // capability board. Three cost boards (FrontierCode, ApprenticeBench CUA, and the two OpenRouter twins) now
  // carry joined rows for this configuration and still do not count: that exclusion used to be untestable here
  // because no cost row was joined at all.
  // 2026-09-16 (iteration 81): SWE-rebench's 15 May – 1 Jul 2026 window joins ("Fable 5 [high]") — the seventh.
  assert.equal(fable.benchmark_count, 7);
  assert.equal(dataset.benchmark_results.observations.filter((o) => o.subject.model_id === fable.id
    && dataset.benchmark_results.registry.find((e) => e.id === o.benchmark_id)?.category === 'Efficiency').length, 4,
    'joined cost rows exist for this configuration and are excluded from #benchmarks');
  assert.equal(fable.composite_coverage, 1);
  // CR-65.1: AA measures per effort setting, so `::high` no longer shows `::max`'s AA indices; the family-scope
  // Epoch and DesignArena results are still shared.
  assert.equal(fable.composite_attachments.aa_coding_index, undefined);
  assert.equal(fable.composite_attachments.aa_intelligence_index, undefined);
  assert.ok(fable.composite_attachments.epoch_eci);
  assert.ok(fable.composite_attachments.designarena_fullstack);
});

// CR-65.1: a family fixture beside the real catalog. `::max` carries AA Intelligence, `::non-reasoning` only a
// Coding Agent result; the non-reasoning row must not inherit the AA value, and its composite must not use it.
const familyFixture = (maxIntelligence, extra = {}) => {
  const template = dataset.models.find((m) => m.id === 'claude-opus-5::non-reasoning');
  const row = (variant, benchmarks, over = {}) => ({ ...template, id: `fixture-fam::${variant}`, family_key: 'fixture-fam', family_name: 'Fixture',
    display_name: `Fixture (${variant})`, variant, benchmarks, designarena: {}, offers: [], featured: false, deprecated: false, ...over });
  return { ...dataset, models: [...dataset.models,
    row('max', { aa_intelligence_index: maxIntelligence, aa_coding_index: 70, epoch_eci: 150 }),
    row('non-reasoning', { aa_coding_agent_index: 40 }),
    ...(extra.rows ?? []).map(([variant, benchmarks, over]) => row(variant, benchmarks, over))] };
};
test('CR-65.1: effort-specific AA results never move to a sibling configuration; family-scope ECI does', () => {
  const pick = (ds, id) => client.clientData(ds).models.find((m) => m.id === id);
  const a = pick(familyFixture(50), 'fixture-fam::non-reasoning');
  const b = pick(familyFixture(10), 'fixture-fam::non-reasoning');
  assert.equal(a.scores.aa_intelligence_index, null);
  assert.equal(a.scores.aa_coding_index, null);
  assert.equal(a.composite_attachments.aa_intelligence_index, undefined);
  assert.equal(a.composite_base, b.composite_base, 'the composite does not depend on the sibling AA Intelligence');
  assert.equal(a.scores.epoch_eci, 150, 'Epoch ECI is published at family scope and is shared');
  assert.equal(a.composite_attachments.epoch_eci.sourceModelId, 'fixture-fam::max');
  // The Coding Agent result stays on its own row as well.
  assert.equal(pick(familyFixture(50), 'fixture-fam::max').scores.aa_coding_agent, null);
});
test('CR-65.1: no family maximum and no deprecated donor for a current row', () => {
  // Two current rows publish different ECI values: only the family representative's own value is shared.
  const disagree = familyFixture(50, { rows: [['low', { epoch_eci: 120 }], ['old', { epoch_eci: 190 }, { deprecated: true }]] });
  const models = client.clientData(disagree).models;
  const nonReasoning = models.find((m) => m.id === 'fixture-fam::non-reasoning');
  assert.equal(nonReasoning.scores.epoch_eci, 150, 'the representative (max) value, not the family maximum 190');
  const deprecatedOnly = familyFixture(50, { rows: [['old', { epoch_eci_software: 190 }, { deprecated: true }]] });
  assert.equal(client.clientData(deprecatedOnly).models.find((m) => m.id === 'fixture-fam::non-reasoning').scores.epoch_eci_software, null);
  // Live catalog: no current row shows a value attached from a deprecated sibling.
  const live = client.clientData(dataset).models;
  const byId = new Map(dataset.models.map((m) => [m.id, m]));
  for (const m of live) {
    if (m.deprecated) continue;
    for (const [slot, attachment] of Object.entries(m.composite_attachments)) {
      if (attachment.sourceModelId) assert.notEqual(byId.get(attachment.sourceModelId)?.deprecated, true, `${m.id} ${slot} from deprecated ${attachment.sourceModelId}`);
      assert.ok(!['aa_coding_index', 'aa_coding_agent', 'aa_intelligence_index'].includes(slot), `${m.id}: ${slot} attached across efforts`);
    }
  }
});
test('F-41: thin Composite counts exact plus attached inputs', () => {
  assert.equal(client.isThinComposite({ composite_coverage: 2, composite_attached: 4 }), false);
  assert.equal(client.isThinComposite({ composite_coverage: 2, composite_attached: 0 }), true);
  for (const model of client.clientData(dataset).models) {
    assert.equal(model.composite_attached, Math.min(7 - model.composite_coverage, Object.keys(model.composite_attachments).length), model.id);
  }
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

test('2026-09-15 cost modal semantics: exact proxy wording, proxy only for the global I/O fallback, cache basis recorded', async () => {
  assert.equal(cost.IO_PROXY_TEXT, 'Proxied from publicly available LLM usage statistics from an inference provider');
  const ioSource = (p) => p.sources.find((s) => s.label === 'Input/output ratio');
  const own = cost.offerPrice(route, cost.priceContext(model, telemetryData, adjusted));
  assert.equal(ioSource(own).proxy, false, 'a model’s own OpenRouter ratio is not a proxy');
  assert.deepEqual(own.cache, { kind: 'observed', rate: 0.75, discounted: true });
  assert.equal(own.assumedTask, false);
  const noOwnRatio = structuredClone(model); noOwnRatio.token_efficiency.input_output_ratio = null;
  const proxied = cost.offerPrice(route, cost.priceContext(noOwnRatio, telemetryData, adjusted));
  assert.equal(ioSource(proxied).proxy, true, 'the global fallback is shown with the proxy wording');
  const modal = await readFile(new URL('../components/PriceValue.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(modal, /Assumptions and limitations/);
  assert.match(modal, /\{IO_PROXY_TEXT\}\{" "\}\s*\{source\.url \? <a [^>]*>\[link\]<\/a>/, 'only "[link]" is the link');
});

test('2026-09-15 typical cache-hit baseline replaces 0 % only where no endpoint observation exists', () => {
  const endpoints = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`other/fast-${i}`, { cache_hit_rate: observation(i / 20), cache_read_per_1m: observation(0.1) }]));
  const data = { ...structuredClone(telemetryData), generated_at: '2026-09-15T00:00:00Z' };
  data.efficiency.openrouter_endpoints = { 'other/model': endpoints };
  const withBaseline = cost.offerPrice(route, cost.priceContext(model, data, adjusted));
  assert.deepEqual(withBaseline.cache, { kind: 'baseline', rate: 0.5, discounted: true });
  assert.ok(withBaseline.sources.some((s) => /typical baseline/.test(s.label) && /Median of 21 OpenRouter endpoints/.test(s.source)), 'inspectable in Sources');
  const zero = cost.offerPrice(route, cost.priceContext(model, { ...data, efficiency: { ...data.efficiency, openrouter_endpoints: {} } }, adjusted));
  assert.equal(zero.cache.kind, 'none');
  assert.ok(withBaseline.value < zero.value, 'a published cache-read price now earns the typical discount');
  const noReadPrice = { ...route, cache_read_per_1m: null };
  const plain = cost.offerPrice(noReadPrice, cost.priceContext(model, data, adjusted));
  assert.equal(plain.cache.discounted, false);
  assert.equal(plain.value, cost.offerPrice(noReadPrice, cost.priceContext(model, { ...data, efficiency: { ...data.efficiency, openrouter_endpoints: {} } }, adjusted)).value, 'no cache-read price: the baseline changes nothing');
  // Deterministic for a dataset.
  assert.equal(cost.offerPrice(route, cost.priceContext(model, data, adjusted)).value, withBaseline.value);
});

test("CR-25.4: the positive regional lists give exactly the former switches' results on the real providers", () => {
  const provs = dataset.providers.map((p) => ({ key: `${p.platform}::${p.provider}`, provider: p.provider, non_us: p.non_us, country: p.country, eu_hosted: p.eu_hosted }));
  for (const excludeChinese of [false, true]) for (const nonUsOnly of [false, true]) for (const euHostedOnly of [false, true]) {
    const old = cost.effectiveAllowed(null, excludeChinese, provs, euHostedOnly, nonUsOnly);
    const scope = cost.createOfferScope(null, excludeChinese, provs, euHostedOnly, nonUsOnly);
    assert.deepEqual(scope.allowed && [...scope.allowed].sort(), old && [...old].sort(), JSON.stringify({ excludeChinese, nonUsOnly, euHostedOnly }));
    assert.equal(scope.euHostedOnly, euHostedOnly);
  }
});

test("CR-25.4: 'Hosted in' filters per offer by hosting bucket; EU needs EU evidence", () => {
  const provs = [{ key: "P::P", provider: "P", non_us: false }];
  const us = { key: "P::P", region: "us-east-1" }, eu = { key: "P::P", region: "eu-west-1", eu_hosted: true }, global = { key: "P::P", region: "global" };
  const onlyUs = cost.createScope(null, provs, { hostedIn: ["US"] });
  assert.deepEqual([us, eu, global].map((o) => cost.offerMatchesScope(o, onlyUs)), [true, false, false]);
  const noUs = cost.createScope(null, provs, { hostedIn: ["China", "EU", "Other"] });
  assert.deepEqual([us, eu, global].map((o) => cost.offerMatchesScope(o, noUs)), [false, true, true]);
  const all = cost.createScope(null, provs, { hostedIn: ["China", "EU", "US", "Other"], providerBasedIn: ["China", "EU", "US", "Other"] });
  assert.equal(all.allowed, null);
  assert.equal(all.restricted, false);
  assert.equal(cost.providerBucket({ key: "x", provider: "SiliconFlow", non_us: true }), "China");
  assert.equal(cost.providerBucket({ key: "x", provider: "Nebius", non_us: true, country: "Netherlands" }), "EU");
  assert.equal(cost.providerBucket({ key: "x", provider: "Ambient", non_us: false, country: null }), "US", "the non-US flag decides, as before");
});

// CR-50.1 (CR-20260916l): a free ($0 / ":free") route is never a paid price.
import { isFreeRoute, paidRoutes } from "../lib/free-route.mjs";
test("CR-50.1: free routes are recognised by the :free SKU or a zero price in both directions", () => {
  assert.equal(isFreeRoute({ or_model_id: "z-ai/glm-5.2:free", input_per_1m: 0, output_per_1m: 0 }), true);
  assert.equal(isFreeRoute({ or_model_id: "x/y:free", input_per_1m: null, output_per_1m: null }), true);
  assert.equal(isFreeRoute({ platform: "Direct", input_per_1m: 0, output_per_1m: 0 }), true);
  assert.equal(isFreeRoute({ or_model_id: "z-ai/glm-5.2", input_per_1m: 0.49, output_per_1m: 1.56 }), false);
  assert.equal(isFreeRoute({ input_per_1m: 0, output_per_1m: 1 }), false, "a route that bills output is paid");
  assert.equal(isFreeRoute({ input_per_1m: null, output_per_1m: null }), false, "unpriced is not free");
  assert.deepEqual(paidRoutes([{ input_per_1m: 0, output_per_1m: 0 }, { input_per_1m: 1, output_per_1m: 2 }]).length, 1);
});

const freeOffer = { key: "OpenRouter::Decart", platform: "OpenRouter", provider: "Decart", or_model_id: "z-ai/glm-5.2:free", endpoint_tag: "decart/fp4", status: 0, input_per_1m: 0, output_per_1m: 0, region: "global", eu_hosted: false };
const paidSameProvider = { key: "OpenRouter::Decart", platform: "OpenRouter", provider: "Decart", or_model_id: "z-ai/glm-5.2", endpoint_tag: "decart/fast", status: 0, input_per_1m: 2.1, output_per_1m: 6.6, region: "global", eu_hosted: false };
const paidOther = { key: "OpenRouter::DeepInfra", platform: "OpenRouter", provider: "DeepInfra", or_model_id: "z-ai/glm-5.2", endpoint_tag: "deepinfra/fp4", status: 0, input_per_1m: 0.4875, output_per_1m: 1.56, region: "global", eu_hosted: false };
const openScope = null;

test("CR-50.1: a current free route next to paid routes — the ranking and price use the cheapest paid route", () => {
  const ranked = cost.rankedOffers([freeOffer, paidSameProvider, paidOther], openScope, 10);
  assert.ok(ranked.length === 2 && ranked.every((o) => !isFreeRoute(o)), "no free route ranked");
  assert.equal(ranked[0].provider, "DeepInfra");
  assert.ok(ranked[0].blended > 0);
  assert.ok(ranked.some((o) => o.endpoint_tag === "decart/fast"), "the provider's free SKU does not displace its paid route");
  // The full route list still carries the free route, so it can be shown labelled.
  assert.ok(cost.scopedCatalogRoutes([freeOffer, paidOther], openScope, 10).some(isFreeRoute));
});

test("CR-50.1: a vanished free endpoint leaves the paid price unchanged", () => {
  const withFree = cost.rankedOffers([freeOffer, paidOther], openScope, 10)[0].blended;
  const without = cost.rankedOffers([paidOther], openScope, 10)[0].blended;
  assert.equal(withFree, without);
});

test("CR-50.1: a model whose only route is free has no paid route and never prices at $0", () => {
  assert.deepEqual(cost.rankedOffers([freeOffer], openScope, 10), []);
  assert.deepEqual(cost.scopedCatalogOffers([freeOffer], openScope, 10), []);
});

test("CR-50.1: in the real dataset no model's price comes from a free route", () => {
  const data = client.clientData(dataset);
  const glm = data.models.find((m) => m.id === "glm-5.2::max");
  if (glm) {
    const p = cost.modelPrice(glm, data, null, 10);
    assert.ok(p.value > 0, `GLM-5.2 priced at ${p.value}`);
  }
  for (const m of data.models) {
    const r = cost.rankedOffers(data.offersByModel[m.id], null, 10);
    assert.ok(!r.some(isFreeRoute), m.id);
  }
});

test("CR-50.1: an AA reference price of $0 is not used as the fallback price", () => {
  const data = client.clientData(dataset);
  for (const m of data.models) {
    const p = cost.modelPrice(m, data, null, 10);
    if (p.value != null) assert.ok(p.value > 0, `${m.id} priced at $0 via ${p.provider}`);
  }
});
