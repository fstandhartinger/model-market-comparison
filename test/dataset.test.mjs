import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assertExercised, assertJoinParity, listedRow, openRouterListed, rawCatalog } from "./helpers/live-catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(await readFile(join(__dirname, "..", "data", "dataset.json"), "utf8"));
const aa = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "artificialanalysis.json"), "utf8"));
const tSystemsSnapshot = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "t-systems-llm-hub.json"), "utf8"));
// CR-634: the frozen v4.x snapshot (Coding/Math Index, and the source of every v4→v5 estimate).
const aaV4 = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "artificialanalysis-v4.json"), "utf8"));
const designArena = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "designarena.json"), "utf8"));
const openRouter = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "openrouter.json"), "utf8"));
const providerMeta = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "provider-meta.json"), "utf8"));
const codingAgents = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "aa-coding-agents.json"), "utf8"));
const copilot = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "github-copilot.json"), "utf8"));
const claude = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "claude-code.json"), "utf8"));
const epochEci = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "epoch-eci.json"), "utf8"));
const stackit = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "stackit.json"), "utf8"));
const chutesCatalog = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "chutes.json"), "utf8"));
const inceptron = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "inceptron.json"), "utf8"));
const azureFoundry = rawCatalog("azure-foundry.json");
const bedrock = rawCatalog("aws-bedrock.json");
const nebius = rawCatalog("nebius.json");
const ovhcloud = rawCatalog("ovhcloud.json");
const scaleway = rawCatalog("scaleway.json");
const ionos = rawCatalog("ionos.json");
const tensorx = rawCatalog("tensorx.json");

const REQUIRED = [
  "gpt-5.5", "gpt-5.4", "gpt-5.5-mini", "gpt-5.4-mini",
  "claude-opus-4.8", "claude-opus-4.7", "claude-opus-4.6", "claude-sonnet-4.6", "claude-fable-5",
  "kimi-k2.5", "kimi-k2.6", "kimi-k2.7-code",
  "glm-5.1", "glm-5.2",
  "minimax-m2.5", "minimax-m2.7", "minimax-m3",
  "mimo-v2.5-pro", "deepseek-v4-pro",
];

test("dataset has models, families and offers", () => {
  assert.ok(ds.models.length > 100, "expected many models");
  assert.ok(ds.counts.offers > 500, "expected many offers");
});

test("Epoch ECI source is complete and attached conservatively", () => {
  assert.equal(epochEci.counts.general_models, epochEci.models.length);
  assert.ok(epochEci.counts.general_models >= 200);
  assert.ok(epochEci.counts.software_models >= 20);
  assert.equal(ds.sources.epoch_eci, epochEci.collected_at);
  assert.equal(ds.source_status.epoch_eci.version, epochEci.definition_version);
  const attached = ds.models.filter((model) => model.benchmarks?.epoch_eci != null);
  assert.ok(attached.length > 50 && attached.length < epochEci.models.length);
  assert.ok(attached.every((model) => model.epoch_eci_attachment_note?.includes("attached once")));
  assert.equal(new Set(attached.map((model) => model.family_key)).size, attached.length);
});

test("every published source snapshot is current for this refresh", () => {
  // Sources refresh independently (a DesignArena-only refetch must not require
  // re-scraping every catalog), so assert a minimum freshness instead of one
  // pinned date. Bump the floor on each full refresh cycle.
  const FLOOR = "2026-07-12";
  for (const [source, collectedAt] of Object.entries(ds.sources)) {
    assert.ok(String(collectedAt) >= FLOOR, `${source} snapshot ${collectedAt} predates ${FLOOR}`);
  }
});

test("all brief-required model families are present", () => {
  const keys = new Set(ds.models.map((m) => m.family_key));
  // gpt-5.5-mini / gpt-5.4-mini may be absent upstream; only fail on the hard requirements
  const hard = REQUIRED.filter((k) => !k.endsWith("-mini"));
  for (const k of hard) assert.ok(keys.has(k), `missing required family: ${k}`);
});

test("product names are not mistaken for reasoning-effort variants", () => {
  const ids = new Set(ds.models.map((model) => model.id));
  assert.ok(ids.has("minimax-m2.5::default"));
  assert.ok(ids.has("minimax-m2.7::default"));
  assert.ok(ids.has("minimax-m3::default"));
  assert.ok(ids.has("mistral-medium-3::default"));
  assert.ok(ids.has("mistral-medium-3.5::default"));
  assert.ok(ids.has("qwen3.7-max::default"));
  assert.equal([...ids].some((id) => id.startsWith("mistral-3::medium") || id.startsWith("minimax-m3::max")), false);
});

test("moving aliases and safe provider prefixes do not split model families", () => {
  const families = new Set(ds.models.map((model) => model.family_key));
  assert.equal(families.has("gpt-"), false, "generic gpt-chat-latest must not create an empty family");
  assert.equal(families.has("gpt-mini"), false, "generic gpt-mini-latest must not create an empty family");
  assert.equal([...families].some((family) => family.endsWith("-")), false);

  for (const duplicate of [
    "cohere-command-a", "cohere-command-a-plus",
    "writer-palmyra-x5",
    "perplexity-sonar", "perplexity-sonar-pro",
    "nvidia-nemotron-3-super-120b-a12b",
    "nvidia-nemotron-3-nano-30b-a3b",
  ]) {
    assert.equal(families.has(duplicate), false, `provider-prefix duplicate: ${duplicate}`);
  }

  // Provider-prefixed names must join the canonical family. Pin the join, not the live listing:
  // each offer is required exactly while today's raw catalog lists it (R9.1).
  const routes = (family, provider, platform) => (ds.models.find((model) => model.family_key === family)?.offers ?? [])
    .some((offer) => offer.provider === provider && offer.platform === platform);
  assertExercised(assert, [
    assertJoinParity(assert, routes("command-a", "Cohere", "OpenRouter"), openRouterListed(openRouter, "cohere/command-a", "Cohere"), "command-a Cohere"),
    assertJoinParity(assert, routes("command-a", "Azure AI Foundry", "Azure AI Foundry"), listedRow(azureFoundry, "Cohere Command A"), "command-a Azure AI Foundry"),
    assertJoinParity(assert, routes("palmyra-x5", "AWS Bedrock", "AWS Bedrock"), listedRow(bedrock, (row) => /palmyra x5/i.test(row.model_name)), "palmyra-x5 AWS Bedrock"),
    assertJoinParity(assert, routes("palmyra-x5", "Amazon Bedrock", "OpenRouter"), openRouterListed(openRouter, "writer/palmyra-x5", "Amazon Bedrock"), "palmyra-x5 Amazon Bedrock"),
    assertJoinParity(assert, routes("sonar", "Perplexity", "OpenRouter"), openRouterListed(openRouter, "perplexity/sonar", "Perplexity"), "sonar Perplexity"),
    // 2026-08-26: TensorX removed Nemotron 3 Super from its catalog; Bedrock still carries it.
    assertJoinParity(assert, routes("nemotron-3-super-120b-a12b", "AWS Bedrock", "AWS Bedrock"), listedRow(bedrock, "NVIDIA Nemotron 3 Super 120B A12B"), "nemotron-3-super AWS Bedrock"),
  ], "provider-prefix joins");
});

test("open-weights filter metadata excludes audited proprietary families", () => {
  const isOpen = (family) => ds.models.find((model) => model.family_key === family)?.open_weights;
  assert.equal(isOpen("nova-pro"), false);
  assert.equal(isOpen("magistral-medium-1.2"), false);
  assert.equal(isOpen("codestral-2"), false);
  assert.equal(isOpen("mistral-medium-3"), false);
  assert.equal(isOpen("mistral-medium-3.5"), true);
  assert.equal(isOpen("mistral-large-3"), true);
  // AA now publishes official open-weight releases for Command A / A+.
  assert.equal(isOpen("command-a"), true);
  assert.equal(isOpen("command-a+"), true);
  assert.equal(isOpen("sonar"), false);
  assert.equal(isOpen("sonar-pro"), false);
  assert.equal(isOpen("palmyra-x5"), false);
  // composer-2 returned on 2026-07-22: AA publishes a complete Cursor-CLI
  // Coding-Agent row (3/3 eval components) for it again.
  // composer-2 comes and goes with AA's Cursor-CLI board rows; assert only when present.
  for (const family of ["composer-2.5", "composer-2.5-fast", "grok-4.5"]) {
    assert.equal(isOpen(family), false, family);
  }
  // 2026-09-08: Raptor Mini retired from Copilot and no longer has a catalog source.
  assert.equal(isOpen("raptor-mini"), undefined);
  if (isOpen("composer-2") !== undefined) assert.equal(isOpen("composer-2"), false, "composer-2");
  assert.equal(ds.models.some((model) => model.family_key === "yoda"), false, "registry alias yoda must join Grok 4.5");

  const grok = ds.models.filter((model) => model.family_key.startsWith("grok"));
  assert.ok(grok.length > 0);
  assert.ok(grok.every((model) => model.org === "xAI"));
  assert.deepEqual(grok.filter((model) => model.open_weights).map((model) => model.family_key).sort(), ["grok-1", "grok-2-dec-24"]);
  assert.equal(ds.models.some((model) => model.org === "SpaceXAI"), false);
});

test("OpenRouter aliases merge free tiers and exclude router/music pseudo-models", () => {
  const families = new Set(ds.models.map((model) => model.family_key));
  assert.equal([...families].some((family) => family.endsWith("-free")), false);
  assert.equal([...families].some((family) => /^openrouter-(free|auto|fusion|bodybuilder|pareto-code)$/.test(family)), false);
  assert.equal([...families].some((family) => family.includes("lyria")), false);
});

// R4.4: the featured set follows the AA Intelligence Index chart instead of a
// hand-kept list, so the test re-derives the rule from the data rather than naming
// families that a single release would invalidate.
test("featured set is the AA Intelligence top 20 plus the explicit pins", () => {
  const selection = ds.build_diagnostics.featured_selection;
  assert.equal(selection.top_n, 20);

  const best = new Map();
  for (const m of ds.models) {
    if (m.deprecated === true) continue;
    const v = m.benchmarks?.aa_intelligence_index;
    if (v == null) continue;
    if (!best.has(m.family_key) || best.get(m.family_key) < v) best.set(m.family_key, v);
  }
  const ranked = [...best.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
  const expected = new Set(ranked.slice(0, selection.top_n));
  for (const pin of selection.pins) if (best.has(pin)) expected.add(pin);

  const featured = new Set(ds.models.filter((m) => m.featured).map((m) => m.family_key));
  assert.deepEqual([...featured].sort(), [...expected].sort());
  assert.deepEqual(selection.families.map((f) => f.family_key).sort(), [...expected].sort());
});

test("featured models are current, scored and explicitly named where Florian asked", () => {
  const featured = ds.models.filter((m) => m.featured);
  assert.ok(featured.length > 0);
  // A recommendation shortlist must not recommend a retired model, and every featured
  // family has to carry the index that put it on the list.
  for (const m of featured) assert.notEqual(m.deprecated, true, `deprecated but featured: ${m.family_key}`);
  const families = new Set(featured.map((m) => m.family_key));
  for (const family of families) {
    const rows = ds.models.filter((m) => m.family_key === family);
    assert.ok(rows.some((m) => m.benchmarks?.aa_intelligence_index != null), `no AA index: ${family}`);
  }
  // R4.4, Florian verbatim: "Ich vermisse bisschen DeepSeek V4.1 Flash, denke das sollte da mit rein".
  assert.ok(families.has("deepseek-v4.1-flash"), "DeepSeek V4.1 Flash must be featured");
  assert.ok(families.size <= 24, `"roughly the top 20" must stay roughly 20, got ${families.size}`);
});

test("benchmarks never silently coerce null to 0", () => {
  // The Pro variants have no AA coding index — they must be null, not 0.
  const pro = ds.models.find((m) => m.display_name.includes("GPT-5.5 Pro"));
  if (pro) assert.equal(pro.benchmarks.aa_coding_index, null);
});

test("offers carry numeric per-1M pricing or are explicitly null", () => {
  for (const m of ds.models) {
    for (const o of m.offers) {
      if (o.unit === "per_1m_token") {
        for (const f of ["input_per_1m", "output_per_1m"]) {
          assert.ok(o[f] === null || typeof o[f] === "number", `${m.family_key} ${o.provider} ${f}`);
        }
      }
    }
  }
});

test("every offer carries audited residency and provider-origin flags", () => {
  for (const model of ds.models) {
    for (const offer of model.offers) {
      assert.equal(typeof offer.eu_hosted, "boolean", `${model.family_key} ${offer.provider} eu_hosted`);
      assert.equal(typeof offer.non_us, "boolean", `${model.family_key} ${offer.provider} non_us`);
    }
  }
});

test("EU residency is specific to the model offer, not inherited from the provider", () => {
  const offers = (family) => ds.models.find((model) => model.family_key === family)?.offers ?? [];
  const offer = (family, provider) => offers(family).find((row) => row.provider === provider && row.platform === provider);
  // Each residency fact holds while the vendor lists the row; a delisted row must leave no offer (R9.1).
  const residency = (family, provider, listed, euHosted, message = `${family} ${provider}`) => {
    if (assertJoinParity(assert, offer(family, provider), listed, `${family} ${provider}`)) {
      assert.equal(offer(family, provider).eu_hosted, euHosted, message);
    }
    return Boolean(listed);
  };
  const apiId = (id) => (row) => row.api_model_id === id || row.model_id === id;

  assertExercised(assert, [
    residency("glm-5.2", "Inceptron", listedRow(inceptron, apiId("zai-org/GLM-5.2")), true),
    residency("glm-5.2", "TensorX", listedRow(tensorx, apiId("z-ai/glm-5.2")), true),
    residency("glm-5.2", "Scaleway", listedRow(scaleway, apiId("glm-5.2")), true),
    residency("deepseek-v4-pro-0813", "TensorX", listedRow(tensorx, apiId("deepseek/deepseek-v4-pro-0813")), true),
    // Nebius retired the uk-south1 region on 2026-07-30 and dropped its GLM-5.2 and
    // DeepSeek V4 Pro listings with it; Kimi K3 launched in the new eu-west2 (FR) region.
    residency("kimi-k3", "Nebius", listedRow(nebius, apiId("moonshotai/Kimi-K3")), true, "Nebius serves Kimi K3 from eu-west2 (France)"),
  ], "EU-resident offers");
  assertExercised(assert, [
    residency("glm-5.2", "Azure AI Foundry", listedRow(azureFoundry, (row) => /^GLM 5\.2( Fast)? \(Fireworks\)$/.test(row.model_name)), false, "Fireworks-on-Azure is US-served"),
    residency("kimi-k2.7-code", "Azure AI Foundry", listedRow(azureFoundry, (row) => row.model_name.startsWith("Kimi K2.7 Code")), false, "policy equivalence must not falsify technical residency"),
  ], "non-EU Azure offers");
});

test("only the two approved Azure Direct Global offers receive the EU policy equivalence", () => {
  const azure = ds.models.flatMap((model) => model.offers
    .filter((offer) => offer.provider === "Azure AI Foundry")
    .map((offer) => ({ family: model.family_key, offer })));
  const equivalent = azure.filter(({ offer }) => offer.eu_policy_equivalent === true);

  // The approval list is fixed; which approved offers exist follows Azure's live catalog (R9.1).
  const approved = { "deepseek-v4-pro": "DeepSeek-V4 Pro", "kimi-k2.7-code": "Kimi K2.7 Code (Azure Direct)" };
  assert.deepEqual(
    [...new Set(equivalent.map(({ family }) => family))].sort(),
    Object.entries(approved).filter(([, name]) => listedRow(azureFoundry, name)).map(([family]) => family).sort(),
  );
  for (const { offer } of equivalent) {
    assert.equal(offer.region, "global");
    assert.equal(offer.eu_hosted, false);
    assert.equal(offer.route_type, "azure_direct");
    assert.match(offer.notes, /inference may occur outside the EU/i);
    assert.match(offer.notes, /not a technical EU data-residency guarantee/i);
  }

  const fireworks = azure.filter(({ offer }) => offer.route_type === "fireworks");
  assert.ok(fireworks.length > 0);
  assert.ok(fireworks.every(({ offer }) => offer.region === "us"));
  assert.ok(fireworks.every(({ offer }) => offer.eu_hosted === false));
  assert.ok(fireworks.every(({ offer }) => offer.eu_policy_equivalent !== true));

  // "Kimi K2.x Thinking (Azure Direct)" rows now join the base families.
  // minimax-m2.7 -> minimax-m3 (2026-07-31): the Retail API never had an M2.7 meter;
  // the $0.33/$1.32 Fireworks meters are "FW MiniMax 3", so the offer moved to M3.
  const controlRoutes = [
    ["glm-5.2", /^GLM 5\.2( Fast)? \(Fireworks\)$/],
    ["minimax-m3", /^MiniMax M3 \(Fireworks\)$/],
    ["kimi-k2.5", /^Kimi K2\.5 Thinking /],
    ["kimi-k2.6", /^Kimi K2\.6 Thinking /],
  ];
  assertExercised(assert, controlRoutes.map(([family, name]) => {
    const rows = azure.filter((row) => row.family === family);
    assertJoinParity(assert, rows.length > 0, listedRow(azureFoundry, (row) => name.test(row.model_name)), `${family} Azure control route`);
    assert.ok(rows.every(({ offer }) => offer.eu_policy_equivalent !== true), family);
    return rows.length > 0;
  }), "Azure control routes");
});

test("global and EU routes from one provider are both retained", () => {
  const model = ds.models.find((row) => row.family_key === "gpt-5.4");
  const azure = model?.offers.filter((offer) => offer.provider === "Azure AI Foundry") ?? [];
  // Anchored on GPT-5.4 while Azure lists both its Global and EU Data Zone meters (R9.1).
  assertExercised(assert, [
    assertJoinParity(assert, azure.some((offer) => offer.eu_hosted === false && offer.region === "global"), listedRow(azureFoundry, "GPT-5.4"), "gpt-5.4 Azure global"),
    assertJoinParity(assert, azure.some((offer) => offer.eu_hosted === true && offer.region === "eu"), listedRow(azureFoundry, "GPT-5.4 (EU Data Zone)"), "gpt-5.4 Azure EU"),
  ], "gpt-5.4 Azure routes");
});

test("mixed-region OpenRouter providers never inherit an EU flag from company metadata", () => {
  const routedNebius = ds.models.flatMap((model) => model.offers)
    .filter((offer) => offer.platform === "OpenRouter" && offer.provider === "Nebius");
  assert.ok(routedNebius.length > 0);
  assert.ok(routedNebius.every((offer) => offer.eu_hosted === false));
});

test("EU-capable gateway providers mark only their explicitly European OpenRouter routes", () => {
  const offers = ds.models.flatMap((model) => model.offers).filter((offer) => offer.platform === "OpenRouter");
  for (const provider of ["Amazon Bedrock", "Azure", "Google"]) {
    assert.equal(providerMeta.providers[provider]?.eu_hosted, true, `${provider} directory capability`);
    assert.equal(providerMeta.providers[provider]?.openrouter_eu_hosted, false, `${provider} blanket routing`);
    const rows = offers.filter((offer) => offer.provider === provider);
    assert.ok(rows.some((offer) => offer.region === "eu" && offer.eu_hosted), `${provider} explicit EU route`);
    assert.ok(rows.some((offer) => offer.region === "global" && !offer.eu_hosted), `${provider} global route`);
  }
});

test("context-price tiers and distinct managed routes survive dataset deduplication", () => {
  const offers = ds.models.flatMap((model) => model.offers);
  const azure55 = offers.filter((offer) => offer.provider === "Azure AI Foundry" && ["short_context", "long_context"].includes(offer.pricing_tier));
  // Azure context tiers come from the retail meters the daily collector reads (R9.1): every
  // tiered raw row must survive deduplication as its own offer at the raw price, and no tier
  // offer may outlive its raw row.
  const azureTiers = azureFoundry.models
    .map((row) => ({ row, tier: row.model_name.match(/\((short|long) context\)/)?.[1] }))
    .filter(({ tier }) => tier);
  for (const { row, tier } of azureTiers) {
    const pricingTier = `${tier}_context`;
    assert.ok(azure55.some((offer) => offer.region === row.region && offer.pricing_tier === pricingTier && offer.input_per_1m === row.input_per_1m_usd),
      `Azure ${row.model_name} (${row.region}) survives deduplication`);
  }
  const tierKey = (region, tier, input) => `${region}|${tier}|${input}`;
  assert.deepEqual(
    [...new Set(azure55.map((offer) => tierKey(offer.region, offer.pricing_tier, offer.input_per_1m)))].sort(),
    [...new Set(azureTiers.map(({ row, tier }) => tierKey(row.region, `${tier}_context`, row.input_per_1m_usd)))].sort(),
    "every Azure context-tier offer has its raw row",
  );

  // T-Systems lists and delists tiered models daily (R9.1), so the tiers to expect come from the
  // snapshot rows rather than a literal threshold that the next catalog change would break.
  const tSystems = offers.filter((offer) => offer.provider === "T-Systems LLM Hub" && offer.pricing_tier);
  const tieredRows = tSystemsSnapshot.models
    .map((row) => row.model_name.match(/\((≤|>)(\d+)k\)/))
    .filter(Boolean)
    .map(([, side, size]) => `${side === "≤" ? "up_to" : "above"}_${size}k_input`);
  for (const tier of tieredRows) {
    assert.ok(tSystems.some((offer) => offer.pricing_tier === tier), `T-Systems ${tier}`);
  }
  // Both directions (#41228): with zero tiered snapshot rows the loop above asserts nothing, so a
  // tier offer that outlived its delisted row would pass unnoticed.
  assert.deepEqual([...new Set(tSystems.map((offer) => offer.pricing_tier))].sort(), [...new Set(tieredRows)].sort(), "T-Systems tiers match the snapshot");

  const deepSeek = ds.models.find((model) => model.family_key === "deepseek-v4-pro")?.offers
    .filter((offer) => offer.provider === "Azure AI Foundry") || [];
  assertExercised(assert, [
    assertJoinParity(assert, deepSeek.some((offer) => offer.route_type === "azure_direct" && offer.region === "global"), listedRow(azureFoundry, "DeepSeek-V4 Pro"), "deepseek-v4-pro Azure Direct"),
    assertJoinParity(assert, deepSeek.some((offer) => offer.route_type === "fireworks" && offer.region === "us"), listedRow(azureFoundry, "DeepSeek-V4 Pro (Fireworks)"), "deepseek-v4-pro Fireworks"),
  ], "deepseek-v4-pro Azure routes");
});

test("audited July provider prices survive the merged dataset", () => {
  const find = (family, provider) => ds.models.find((model) => model.family_key === family)?.offers.find((offer) => offer.provider === provider);
  // Inceptron re-prices intraday and is refreshed by the daily collector (R9.1), so the merged
  // offer must equal the snapshot row rather than a literal that the next run would break.
  const glm52 = inceptron.models.find((model) => model.model_name === "GLM 5.2");
  assert.ok(glm52, "GLM 5.2 stays in the Inceptron snapshot");
  const glm52Offer = find("glm-5.2", "Inceptron");
  assert.ok(glm52Offer, "GLM 5.2 Inceptron offer is merged");
  if (inceptron.availability?.state === "list_prices_withdrawn_by_source") {
    // CR-721 / CR-725: while Inceptron's models page shows its cards without prices, every
    // snapshot row is unpriced (price_status "n/a") and the merged direct offer carries no price;
    // the OpenRouter feed price (api_catalog_price) must never be copied into the direct offer.
    assert.equal(glm52.price_status, "n/a");
    assert.ok(glm52.input_per_1m_usd == null && glm52.output_per_1m_usd == null, "withdrawn snapshot row has no direct price");
    assert.equal(glm52Offer.price_status, "n/a");
    assert.deepEqual([glm52Offer.input_per_1m ?? null, glm52Offer.output_per_1m ?? null], [null, null], "withdrawn Inceptron price is not published");
  } else {
    assert.ok(glm52.input_per_1m_usd > 0 && glm52.output_per_1m_usd > 0);
    assert.deepEqual(
      [glm52Offer.input_per_1m, glm52Offer.output_per_1m],
      [glm52.input_per_1m_usd, glm52.output_per_1m_usd],
    );
  }
  // Bedrock prices follow the AWS Price List the daily collector reads (R9.1): the merged offer
  // must carry the raw row's price while the row is listed, and disappear with it.
  for (const [family, name] of [["deepseek-v3.1", "DeepSeek V3.1"], ["qwen3-coder-480b-a35b", "Qwen3 Coder 480B A35B"]]) {
    const row = listedRow(bedrock, name);
    if (assertJoinParity(assert, find(family, "AWS Bedrock"), row, `${family} AWS Bedrock`)) {
      assert.ok(row.input_per_1m_usd > 0 && row.output_per_1m_usd > 0, name);
      assert.deepEqual(
        [find(family, "AWS Bedrock").input_per_1m, find(family, "AWS Bedrock").output_per_1m],
        [row.input_per_1m_usd, row.output_per_1m_usd],
        family,
      );
    }
  }
});

test("privacy routing is not mislabeled as trusted execution", () => {
  const venice = ds.models.flatMap((model) => model.offers).filter((offer) => offer.provider === "Venice");
  assert.equal(venice.length > 0, openRouter.models.some((model) => (model.endpoints ?? []).some((endpoint) => endpoint.provider_name === "Venice")), "Venice offers follow OpenRouter's endpoints");
  assert.ok(venice.every((offer) => !offer.tee));
  const chutes = ds.models.flatMap((model) => model.offers).filter((offer) => offer.platform === "Chutes");
  assert.equal(chutes.length > 0, true);
  assert.ok(chutes.every((offer) => offer.tee && !offer.eu_hosted));
  const routedChutes = ds.models.flatMap((model) => model.offers).filter((offer) => offer.platform === "OpenRouter" && offer.provider === "Chutes");
  assert.ok(routedChutes.length > 0);
  assert.ok(routedChutes.every((offer) => !offer.tee));
});

test("current Copilot token catalog and legacy request table stay distinct", () => {
  assert.ok(copilot.collected_at >= "2026-09-08");
  // The daily collector (R9.1) follows GitHub's catalog, so counts move with real retirements
  // (MAI-Code-1-Flash, 2026-09-10); assert a sane, duplicate-free catalog instead of a literal count.
  assert.ok(copilot.current_models.length >= 20, `current_models: ${copilot.current_models.length}`);
  // Official legacy table contracted to five rows (owner-reviewed 2026-10-31).
  // Exact-set removal approval and shrink refusal are covered by the collector tests.
  assert.ok(copilot.models.length >= 1, `legacy models: ${copilot.models.length}`);
  assert.equal(new Set(copilot.current_models.map((row) => row.model_name)).size, copilot.current_models.length);
  assert.equal(new Set(copilot.models.map((row) => row.model_name)).size, copilot.models.length);

  const model = (family) => ds.models.find((row) => row.family_key === family);
  // Current token prices follow GitHub's catalog (R9.1): a listed row reaches its family at the
  // raw price; a family whose row left the catalog carries no current Copilot price.
  const currentRow = (name) => listedRow({ models: copilot.current_models }, name);
  const currentPrice = (family, name, key = "current") => {
    const row = currentRow(name);
    const joined = model(family)?.copilot?.[key];
    if (assertJoinParity(assert, joined?.input_per_1m != null, row, `${family} Copilot ${key}`)) {
      assert.deepEqual([joined.input_per_1m, joined.output_per_1m], [row.input_per_1m_usd, row.output_per_1m_usd], `${family} Copilot ${key}`);
    }
    return Boolean(row);
  };
  assertExercised(assert, [
    currentPrice("gpt-5.6-sol", "GPT-5.6 Sol"),
    currentPrice("claude-sonnet-5", "Claude Sonnet 5"),
    currentPrice("claude-opus-4.8", "Claude Opus 4.8"),
    currentPrice("claude-opus-4.8", "Claude Opus 4.8 (fast mode) (preview)", "fast_mode"),
  ], "Copilot current token prices");
  assert.equal(model("claude-sonnet-5")?.copilot?.current?.standard_pricing_from, null);
  // Legacy multipliers follow GitHub's annual-plan table, which drops retired models (GPT-5.4 6x,
  // retired 2026-10-19). Every listed multiplier reaches exactly one family; a retired model carries none.
  const legacyRow = (name) => copilot.models.find((row) => row.model_name === name);
  const familyCopilot = new Map(ds.models.filter((row) => row.copilot).map((row) => [row.family_key, row.copilot]));
  const pairs = (rows) => rows.map((row) => `${row[0]}@${row[1]}`).sort();
  assert.deepEqual(
    pairs([...familyCopilot.values()].filter((c) => c.multiplier != null).map((c) => [c.multiplier, c.usd_per_request])),
    pairs(copilot.models.map((row) => [row.premium_request_multiplier, row.effective_usd_per_request])),
  );
  assert.equal(model("claude-opus-4.8")?.copilot?.multiplier ?? null, legacyRow("Claude Opus 4.8")?.premium_request_multiplier ?? null);
  if (legacyRow("GPT-5.4")) {
    assert.equal(model("gpt-5.4")?.copilot?.multiplier, 6);
  } else {
    const retired = copilot.retirement_history.find((row) => row.name === "GPT-5.4");
    assert.ok(retired && retired.retirement_date <= copilot.collected_at, "GPT-5.4 left the legacy table without a retirement");
    assert.equal(model("gpt-5.4")?.copilot?.multiplier ?? null, null);
  }
});

test("confirmed non-US provider metadata reaches the provider directory", () => {
  const sakana = ds.providers.find((provider) => provider.provider === "Sakana AI");
  assert.equal(sakana?.country, "Japan");
  assert.equal(sakana?.non_us, true);
  assert.equal(sakana?.eu_hosted, false);
});

test("Claude first-party snapshot contains every currently callable model", () => {
  assert.ok(claude.collected_at >= "2026-09-08");
  // The daily collector (R9.1) follows Anthropic's pricing page, so models join (Opus 5.5 09-23,
  // Sonnet 5.5 09-29, Haiku 5.5 10-07), get re-priced (Sonnet 5.5 cache read 10-07) and retire.
  // Pin how the page is parsed, not today's rows: unique callable ids, and every row priced by
  // the page's own modifiers (5m cache write, cache read with its per-model exceptions, batch).
  const ids = claude.models.map((model) => model.model_id);
  assert.ok(ids.length >= 10, `only ${ids.length} callable models — pricing parse likely broken`);
  assert.equal(new Set(ids).size, ids.length, "duplicate Claude model ids");
  const modifiers = claude.pricing_modifiers;
  const exceptions = modifiers?.prompt_cache_read_multiplier_exceptions ?? {};
  const near = (actual, expected) => Math.abs(actual - expected) < 1e-9;
  for (const model of claude.models) {
    const what = model.model_id;
    assert.match(model.lifecycle_status, /^(active|deprecated)$/, what);
    assert.ok(model.input_per_1m_usd > 0 && model.output_per_1m_usd > model.input_per_1m_usd, what);
    assert.ok(near(model.cache_write_per_1m_usd, model.input_per_1m_usd * modifiers.prompt_cache_5m_write_multiplier), `${what} cache write`);
    assert.ok(near(model.cache_read_per_1m_usd, model.input_per_1m_usd * (exceptions[what] ?? modifiers.prompt_cache_read_multiplier)), `${what} cache read`);
    assert.ok(near(model.batch_output_per_1m_usd, model.output_per_1m_usd * (1 - modifiers.batch_discount_pct / 100)), `${what} batch output`);
  }
  // Every cache-read exception names a listed model and actually differs from the default.
  for (const [id, multiplier] of Object.entries(exceptions)) {
    assert.ok(ids.includes(id), `cache-read exception for unlisted ${id}`);
    assert.notEqual(multiplier, modifiers.prompt_cache_read_multiplier, id);
  }
  // 2026-09-08: official lifecycle confirms retirement on August 5; a retired model never returns.
  assert.equal(claude.models.some((model) => model.model_name === "Claude Opus 4.1"), false);
});

test("Coding Agent snapshot is fresh and internally consistent", () => {
  // Minimum-freshness floor (bumped on full refresh cycles) — a pinned date broke
  // every incremental rescrape. Count must match rows and stay plausible (AA's board
  // grows over time; a sudden collapse would signal a broken scrape).
  assert.ok(String(codingAgents.collected_at) >= "2026-07-12", String(codingAgents.collected_at));
  assert.equal(codingAgents.rows.length, codingAgents.count);
  assert.ok(codingAgents.rows.length >= 40, `only ${codingAgents.rows.length} rows — scrape likely broken`);
});

test("Coding Agent source rows retain their exact effort variants", () => {
  const rows = codingAgents.rows;
  const best = (name) => {
    const scores = rows.filter((r) => r.model_name === name).map((r) => r.score);
    return scores.length ? Math.round(Math.max(...scores) * 1000) / 10 : null;
  };

  assert.equal(best("DeepSeek V4 Pro (high)"), 32.8); // 2026-08-26: AA re-scored 31.4 -> 32.8
  assert.equal(best("DeepSeek V4 Pro (max)"), null);
  assert.equal(best("DeepSeek V4 Pro (non-reasoning)"), null);

  // Max only across harnesses for the same effort setting.
  assert.equal(best("GPT-5.5 (medium)"), 55.3); // 2026-08-26: AA re-scored 54.4 -> 55.3
  assert.equal(best("GPT-5.5 (xhigh)"), 61); // 2026-08-26: AA CA index v1.4 rebase
  assert.equal(best("GPT-5.5 (low)"), null);

  // 2026-08-26: AA rebased the Coding Agent Index (v1.4, Terminal-Bench 2.1 + reward-hacking
  // detection) so pinned absolute values churn on every rescore. Assert structure instead:
  // every GPT-5.6 tier/effort row exists as its own exact variant, and effort ordering holds.
  for (const tier of ["Sol", "Terra", "Luna"]) {
    const eff = (e) => best(`GPT-5.6 ${tier} (${e})`);
    for (const e of ["none", "low", "medium", "high", "xhigh", "max"]) assert.ok(eff(e) != null, `GPT-5.6 ${tier} (${e}) missing`);
    assert.ok(eff("none") < eff("low") && eff("low") < eff("high") && eff("high") <= Math.max(eff("xhigh"), eff("max")), `${tier} effort ordering`);
  }
});

test("freshly built dataset attaches Coding Agent scores only to exact variants", () => {
  // Data refreshes land raw sources before the generated snapshot is rebuilt. Keep
  // the source assertions above active during that window; enforce the generated
  // mapping as soon as dataset.json declares this Coding-Agent snapshot date.
  if (ds.sources.aa_coding_agents !== codingAgents.collected_at) return;

  const score = (id) => ds.models.find((m) => m.id === id)?.benchmarks?.aa_coding_agent_index ?? null;
  assert.equal(score("deepseek-v4-pro::high"), 32.8); // 2026-08-26: AA re-scored
  assert.equal(score("deepseek-v4-pro::max"), null);
  assert.equal(score("deepseek-v4-pro::non-reasoning"), null);

  assert.equal(score("gpt-5.5::medium"), 51.2); // 2026-08-26: AA re-scored 50.3 -> 51.2
  assert.equal(score("gpt-5.5::xhigh"), 61); // 2026-08-26: AA CA index v1.4 rebase
  assert.equal(score("gpt-5.5::low"), null);

  // 2026-08-26: AA CA index v1.4 rebase — assert exact-variant attachment structurally
  // (every GPT-5.6 tier x effort row carries its own score; effort ordering holds).
  for (const family of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]) {
    for (const v of ["non-reasoning", "low", "medium", "high", "xhigh", "max"]) assert.ok(score(`${family}::${v}`) != null, `${family} ${v}`);
    assert.ok(score(`${family}::non-reasoning`) < score(`${family}::low`) && score(`${family}::low`) < score(`${family}::high`), `${family} ordering`);
  }

  // AA's bare GLM-5.2 Coding-Agent identity is the documented default-thinking
  // max configuration; it must join the AA max row, never a source-only ghost.
  assert.equal(score("glm-5.2::max"), 43.3); // 2026-08-26: AA re-scored 43.2 -> 43.3
  assert.equal(ds.models.some((model) => model.id === "glm-5.2::default"), false);
  assert.ok(score("glm-5.1::reasoning") != null); // 2026-08-26: value churns with AA rescoring; attachment is what matters
  assert.equal(ds.models.some((model) => model.id === "glm-5.1::default"), false);
  assert.equal(score("glm-5.1::non-reasoning"), null);
});

test("GLM-5.2 keeps all qualified source evidence on the reasoning max row", () => {
  const glm = ds.models.find((model) => model.id === "glm-5.2::max");
  assert.ok(glm);
  assert.equal(glm.benchmarks.aa_coding_index, 68.8);
  assert.equal(glm.benchmarks.aa_coding_agent_index, 43.3); // 2026-08-26: AA re-scored
  // AA periodically re-scores this row (34 -> 33.7 on 2026-09-20). Pin the attachment to
  // today's exact source value instead of making normal source churn break publication.
  // CR-634: v5.0 when AA rescored the row, else the labelled estimate from its frozen v4.x value.
  const aaGlm = aa.models.find((model) => model.slug === "glm-5-2" && model.name.toLowerCase() === "glm-5.2 (max)");
  const aaGlmV4 = aaV4.models.find((model) => model.id === aaGlm?.id);
  assert.ok(aaGlm && aaGlmV4);
  const v5 = aaGlm.evaluations.artificial_analysis_intelligence_index;
  if (v5 != null) assert.deepEqual([glm.benchmarks.aa_intelligence_index, glm.aa_intelligence.status], [v5, "measured"]);
  else assert.deepEqual([glm.aa_intelligence.status, glm.aa_intelligence.v4_value, glm.benchmarks.aa_intelligence_index], ["estimated", aaGlmV4.evaluations.artificial_analysis_intelligence_index, glm.aa_intelligence.value]);
  assert.equal(glm.designarena.frontend?.modelId, "glm-5.2");
  assert.equal(glm.designarena.fullstack?.modelId, "glm-5.2");
  assert.ok(glm.designarena.frontend?.battles >= 500);
  assert.ok(glm.designarena.fullstack?.battles >= 500);
  assert.equal(ds.models.some((model) => model.id === "glm-5.2::designarena"), false);

  const nonReasoning = ds.models.find((model) => model.id === "glm-5.2::non-reasoning");
  assert.equal(nonReasoning?.benchmarks.aa_coding_index, 46.5);
  // 2026-09-09: AA re-scored the non-reasoning row 26.5 -> 22.4 alongside the max row.
  assert.equal(nonReasoning?.aa_intelligence?.v4_value, 22.4);
  assert.equal(nonReasoning?.aa_intelligence?.status, "estimated");
  assert.equal(nonReasoning?.benchmarks.aa_coding_agent_index ?? null, null);
  assert.deepEqual(nonReasoning?.designarena || {}, {});
});

test("family-scoped Intelligence.ai evidence attaches once to deterministic Overview representatives", () => {
  // 2026-09-01: AA added exact Fable effort rows; ::high became the deterministic
  // collapsed representative for family-scoped Intelligence.ai evidence.
  const fable = ds.models.find((model) => model.id === "claude-fable-5::high");
  assert.ok(fable);
  assert.equal(fable.designarena.frontend?.modelId, "claude-fable-5");
  assert.equal(fable.designarena.fullstack?.modelId, "claude-fable-5");
  assert.ok(fable.designarena.frontend?.battles >= 500);
  assert.ok(fable.designarena.fullstack?.battles >= 500);
  assert.match(fable.designarena_attachment_note || "", /product\/family scope without an effort setting/i);
  assert.equal(ds.models.some((model) => model.id === "claude-fable-5::designarena"), false);

  // 2026-09-16 (CR-28.2): a note is either family-scoped ("attached exactly once", no effort
  // claimed) or exact, because Intelligence.ai's own registry names the tested effort. Nothing else.
  for (const attached of ds.models.filter((model) => model.designarena_attachment_note)) {
    const note = attached.designarena_attachment_note;
    if (/names the tested effort/i.test(note)) {
      assert.match(note, new RegExp(`attached to ${attached.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, exactly that catalog configuration`, 'i'), attached.id);
      assert.match(note, /\((?:[a-z-]+, )*[a-z-]+\)/, attached.id);
    } else {
      assert.match(note, /attached exactly once/i, attached.id);
      assert.match(note, /does not assert.*specific effort setting/i, attached.id);
    }
  }

  // The five source rows whose registry display name states an effort join that exact
  // configuration, and two efforts of one family no longer overwrite each other on battle count.
  const named = Object.entries(designArena.model_registry ?? {})
    .filter(([, meta]) => /\((?:x\s?high|xhigh|max|high|medium|low|minimal)\)/i.test(meta?.display_name ?? ''));
  assert.ok(named.length >= 3, 'the source still states efforts in its registry');
  for (const [sourceId] of named) {
    const owners = ds.models.filter((m) => Object.values(m.designarena ?? {}).some((b) => b?.modelId === sourceId));
    assert.equal(owners.length, 1, `${sourceId} attaches exactly once`);
    assert.match(owners[0].designarena_attachment_note, /names the tested effort/i, sourceId);
  }
  const astra = ds.models.find((m) => m.id === 'gpt-6-astra::xhigh');
  assert.equal(astra?.designarena.frontend?.modelId, 'gpt-6-astra', 'GPT-6 Astra (xhigh) sits on ::xhigh');
  assert.equal(ds.models.find((m) => m.id === 'gpt-6-astra::high')?.designarena.frontend, undefined);
  // Both published GPT-5.6 Sol configurations survive; before CR-28.2 the smaller one was dropped.
  assert.equal(ds.models.find((m) => m.id === 'gpt-5.6-sol::xhigh')?.designarena.frontend?.modelId, 'gpt-5.6-sol-xhigh');
  assert.equal(ds.models.find((m) => m.id === 'gpt-5.6-sol::medium')?.designarena.frontend?.modelId, 'gpt-5.6-sol');

  assert.equal(ds.models.some((model) => model.variant === "designarena"), false);
  // AA can score a previously unmeasured preferred effort on a later refresh.
  // On 2026-09-11 Sonnet 5 high gained an Intelligence Index; high then owns
  // family evidence under the existing preference rule, rather than max.
  const sonnetHighSource = aaV4.models.find((model) => model.slug === "claude-sonnet-5-high");
  const sonnetHighMeasured = ["artificial_analysis_intelligence_index", "artificial_analysis_coding_index"]
    .some((key) => Number.isFinite(sonnetHighSource?.evaluations?.[key]));
  const sonnetOwner = `claude-sonnet-5::${sonnetHighMeasured ? "high" : "max"}`;
  assert.deepEqual(ds.models.filter((model) => model.family_key === "claude-sonnet-5" && model.designarena.frontend)
    .map((model) => model.id), [sonnetOwner]);
  assert.equal(ds.models.find((model) => model.id === sonnetOwner)?.designarena.frontend?.modelId, "claude-sonnet-5");
  assert.equal(ds.models.find((model) => model.id === "gpt-5.5::high")?.designarena.frontend?.modelId, "gpt-5.5");
});

test("DeepSeek V4 Pro DesignArena rows mirror the source and sit on the max representative only", () => {
  // 2026-08-05: DesignArena DELISTED deepseek-v4-pro from the frontend board (it had
  // been the board's lowest Elo at ~1000). The dataset must mirror the source either
  // way: rows only when the source has them, always attached to ::max, never cloned.
  const sourceFrontend = designArena.leaderboards.frontend.data.find((row) => row.modelId === "deepseek-v4-pro");
  const sourceFullstack = designArena.leaderboards.fullstack.data.find((row) => row.modelId === "deepseek-v4-pro");

  const max = ds.models.find((model) => model.id === "deepseek-v4-pro::max");
  if (sourceFrontend) {
    assert.equal(max?.designarena.frontend?.elo, sourceFrontend.elo);
    assert.equal(max?.designarena.frontend?.battles, sourceFrontend.battles);
    assert.match(max?.designarena_attachment_note || "", /product\/family scope without an effort setting/i);
  } else {
    assert.equal(max?.designarena.frontend, undefined, "no phantom frontend row when the source has none");
  }
  if (sourceFullstack) {
    assert.equal(max?.designarena.fullstack?.elo, sourceFullstack.elo);
  } else {
    assert.equal(max?.designarena.fullstack, undefined);
  }

  const siblings = ds.models.filter((model) => model.family_key === "deepseek-v4-pro" && model.id !== max?.id);
  assert.ok(siblings.every((model) => Object.keys(model.designarena || {}).length === 0));
  assert.equal(ds.models.some((model) => model.id === "deepseek-v4-pro::designarena"), false);
});

test("Intelligence.ai registry display names resolve opaque and revisioned leaderboard ids", () => {
  // 2026-07: the API moved back from intelligence.ai to www.designarena.ai.
  assert.match(designArena.endpoint, /^POST https:\/\/www\.designarena\.ai\/api\/leaderboard$/);
  assert.match(designArena.registry_endpoint, /^GET https:\/\/www\.designarena\.ai\/api\/registry$/);
  const sourceIds = new Set(Object.values(designArena.leaderboards).flatMap((board) => board.data.map((row) => row.modelId)));
  assert.ok([...sourceIds].every((id) => designArena.model_registry[id]), "every leaderboard id needs registry metadata");

  const grok = ds.models.find((model) => model.id === "grok-4.5::high");
  assert.equal(grok?.designarena.frontend?.modelId, "yoda");
  assert.equal(ds.models.some((model) => model.family_key === "yoda"), false);

  // 2026-09-07: DesignArena removed Opus 4.7 from both current boards.
  const opus = ds.models.find((model) => model.id === "claude-opus-4.7::medium");
  assert.equal(opus?.designarena.frontend, undefined);
  assert.equal(ds.models.some((model) => model.family_key === "claude-opus-4.7-thinking"), false);

  const grok420 = ds.models.find((model) => model.id === "grok-4.20-reasoning::default");
  assert.equal(grok420?.designarena.frontend?.modelId, "grok-4.20-0309-reasoning");
  assert.equal(ds.models.some((model) => model.family_key === "grok-4.20-0309-reasoning"), false);
});

test("all Artificial Analysis rows and official weight flags survive exactly once", () => {
  const output = ds.models.filter((model) => model.aa_model_id);
  assert.equal(output.length, aa.models.length);
  assert.equal(new Set(output.map((model) => model.aa_model_id)).size, aa.models.length);
  const rawById = new Map(aa.models.map((model) => [model.id, model]));
  for (const model of output) {
    const raw = rawById.get(model.aa_model_id);
    assert.ok(raw, model.aa_model_id);
    assert.equal(model.display_name, raw.name, model.id);
    assert.equal(model.open_weights, raw.metadata.is_open_weights === true, model.id);
    assert.equal(model.deprecated, raw.metadata.deprecated === true, model.id);
  }
});

test("audited upstream repository corrections preserve source provenance", () => {
  const expected = new Map([
    ["aa83359a-d804-4f0b-b5bf-dc637711c26f", {
      corrected: "https://huggingface.co/meta-llama/Meta-Llama-3-70B-Instruct",
      source: "https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct",
    }],
    ["222fb320-6e55-4672-846a-b6d5a24a45f4", {
      corrected: "https://huggingface.co/google/gemma-3-4b-it",
      source: "https://huggingface.co/google/gemma-3-12b-it",
    }],
  ]);
  for (const [id, urls] of expected) {
    const model = ds.models.find((row) => row.aa_model_id === id);
    assert.equal(model?.aa_metadata?.huggingface_url, urls.corrected, id);
    assert.equal(model?.aa_metadata?.source_huggingface_url, urls.source, id);
    assert.ok(model?.aa_metadata?.metadata_correction, id);
  }
});

test("audited provider checkpoint aliases join their benchmark families", () => {
  const families = new Set(ds.models.map((model) => model.family_key));

  // Each alias join is required exactly while today's raw catalog lists the row (R9.1); a delisted
  // row must not survive as a phantom offer (CR-534 STACKIT Gemma 3, CR-597 Chutes Nemo).
  const routes = (family, provider, platform) => ds.models.some((model) => model.family_key === family
    && model.offers.some((offer) => offer.provider === provider && offer.platform === platform));
  const id = (value) => (row) => [row.model_id, row.api_model_id, row.tee_model_id].includes(value);
  const name = (value) => (row) => row.model_name === value;
  const aliasJoins = [
    ["llama-3.3-70b-instruct", "OVHcloud", ovhcloud, id("Meta-Llama-3_3-70B-Instruct")],
    // 2026-08-26: Scaleway EOL'd gemma-3-27b (08-01) and devstral-2 (08-01).
    ["gemma-3-27b-instruct", "AWS Bedrock", bedrock, name("Gemma 3 27B")],
    ["gemma-3-27b-instruct", "Nebius", nebius, id("google/gemma-3-27b-it")],
    // CR-534: STACKIT delisted Gemma 3 in its 2026-10-15 documentation.
    ["gemma-3-27b-instruct", "STACKIT", stackit, id("google/gemma-3-27b-it")],
    // STACKIT checkpoint-alias regression on its FP8 Llama SKU.
    ["llama-3.3-70b-instruct", "STACKIT", stackit, id("cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic")],
    // 2026-08-26: OVHcloud delisted Mistral Small 3.2 and Mistral Nemo from its AI Endpoints catalog.
    ["mistral-small-3.2-24b-instruct", "Scaleway", scaleway, id("mistral-small-3.2-24b-instruct-2506")],
    ["mistral-small-3.2-24b-instruct", "IONOS", ionos, name("Mistral Small 3.2")],
    // CR-597: Chutes removed Mistral-Nemo-Instruct-2407-TEE on 2026-10-28.
    ["mistral-nemo", "Chutes", chutesCatalog, name("Mistral-Nemo")],
    ["mistral-medium-3.5", "Scaleway", scaleway, id("mistral-medium-3.5-128b")],
    ["gemma-4-31b-it", "Chutes", chutesCatalog, id("google/gemma-4-31B-turbo-TEE")],
  ];
  assertExercised(assert, aliasJoins.map(([family, provider, catalog, match]) =>
    assertJoinParity(assert, routes(family, provider, provider), listedRow(catalog, match), `${family} ${provider}`)), "checkpoint alias joins");

  for (const orphan of [
    "meta-llama-3.3-70b-instruct", "gemma-3-27b-it", "mistral-small-3.2-24b",
    "mistral-small-3.2-24b-instruct-2506", "devstral-2-123b-instruct-2512",
    "mistral-nemo-instruct-2407", "mistral-medium-3.5-128b", "gemma-4-31b-turbo",
  ]) assert.equal(families.has(orphan), false, orphan);
});

test("canonical organizations are consistent across source aliases", () => {
  assert.ok(ds.models.filter((model) => model.family_key.startsWith("hermes-")).every((model) => model.org === "Nous Research"));
  assert.ok(ds.models.filter((model) => model.family_key.startsWith("ui-tars-")).every((model) => model.org === "ByteDance Seed"));
});

test("every COMPLETE Coding Agent harness result is retained and the summary is its median", () => {
  // Partial rows (complete === false, evalCount < indexComponentCount) are not
  // comparable index values and are intentionally not ingested — AA's own visible
  // chart omits them (e.g. "Opus 4.6 (medium)" at 2/3 components).
  const rows = ds.models.filter((model) => model.coding_agent_results?.length);
  const expected = codingAgents.rows.filter((row) => row.complete !== false).length;
  assert.equal(rows.reduce((sum, model) => sum + model.coding_agent_results.length, 0), expected);
  for (const model of rows) {
    const tenths = model.coding_agent_results.map((result) => Math.round(result.score * 10)).sort((a, b) => a - b);
    const middle = Math.floor(tenths.length / 2);
    const expectedTenths = tenths.length % 2 ? tenths[middle] : Math.round((tenths[middle - 1] + tenths[middle]) / 2);
    assert.equal(model.benchmarks.aa_coding_agent_index, expectedTenths / 10, model.id);
  }
});

test("DesignArena board rows attach once and never clone across effort siblings", () => {
  const source = [];
  for (const [board, payload] of Object.entries(designArena.leaderboards)) {
    for (const row of payload.data) source.push(`${board}::${row.modelId}`);
  }
  const output = [];
  for (const model of ds.models) {
    for (const [board, row] of Object.entries(model.designarena || {})) output.push(`${board}::${row.modelId}`);
  }
  // Never clone or invent: every attached row must exist in the source.
  const sourceSet = new Set(source);
  for (const key of output) assert.ok(sourceSet.has(key), `invented row: ${key}`);
  // A source row may be superseded ONLY by the build's documented alias dedup:
  // when the registry reveals a stealth codename as another product (e.g.
  // "magnesium" -> "GPT 5.6 Sol (xHigh)", 2026-08-09), the family keeps just its
  // highest-battle row per board. Unrevealed rows must never go missing.
  const outputSet = new Set(output);
  for (const key of source.filter((k) => !outputSet.has(k))) {
    const modelId = key.split("::")[1];
    const display = designArena.model_registry?.[modelId]?.display_name;
    assert.ok(display && display !== modelId,
      `source row ${key} missing from dataset without a registry alias to justify dedup`);
  }
});

test("every current OpenRouter text SKU remains represented after free-tier deduplication", () => {
  const stable = (id) => String(id || "").replace(/^~/, "").replace(/:free$/i, "");
  const excluded = /(vision-only|embed|rerank|moderation|ocr|guard|:batch$|^openrouter\/(?:free|auto|fusion|bodybuilder|pareto-code)$)/i;
  const moving = /^~?[^/]+\/[^/]*latest$/i;
  const expected = new Set(openRouter.models.filter((model) => {
    const outputs = model.architecture?.output_modalities || [];
    return outputs.includes("text") && !outputs.some((mode) => mode !== "text")
      && !excluded.test(model.id) && !excluded.test(model.name || "") && !moving.test(model.id)
      && !(model.expiration_date && String(model.expiration_date) < String(openRouter.collected_at))
      && (model.endpoints || []).some((endpoint) => endpoint.pricing?.prompt != null || endpoint.pricing?.completion != null);
  }).map((model) => stable(model.id)));
  const actual = new Set(ds.models.flatMap((model) => model.offers).map((offer) => offer.or_model_id).filter(Boolean).map(stable));
  assert.deepEqual([...actual].filter((id) => expected.has(id)).sort(), [...expected].sort());
});

test("AA rows receive only their exact OpenRouter SKU or a repository-verified replacement for a stale alias", () => {
  const stable = (id) => String(id || "").replace(/^~/, "").replace(/:free$/i, "");
  const stableHf = (id) => String(id || "").replace(/^https?:\/\/(?:www\.)?huggingface\.co\//i, "").replace(/\/$/, "").toLowerCase();
  for (const model of ds.models.filter((row) => row.aa_metadata?.openrouter_api_id)) {
    const expected = stable(model.aa_metadata.openrouter_api_id);
    for (const offer of model.offers.filter((row) => row.or_model_id)) {
      assert.ok(
        stable(offer.or_model_id) === expected || stable(offer.or_canonical_slug) === expected
          || (stableHf(model.aa_metadata.huggingface_url) && stableHf(offer.or_hugging_face_id) === stableHf(model.aa_metadata.huggingface_url)),
        `${model.id}: ${offer.or_model_id} is not ${model.aa_metadata.openrouter_api_id}`,
      );
    }
  }
});

test("all published providers have metadata and no generated normalization ghosts remain", () => {
  for (const provider of ds.providers.filter((row) => !row.coming_soon)) {
    // 17 Sep 2026: a provider new to OpenRouter publishes marked unverified instead of failing the daily run.
    if (provider.metadata_unverified) {
      assert.ok(!providerMeta.providers[provider.provider], `${provider.provider}: curated metadata exists but the row is marked unverified`);
      assert.deepEqual([provider.eu_hosted, provider.non_us, provider.eu_dedicated], [false, false, false], provider.provider);
      for (const model of ds.models) for (const offer of model.offers.filter((o) => o.provider === provider.provider)) assert.equal(offer.eu_hosted, false, `${model.id} @ ${provider.provider}`);
      continue;
    }
    assert.ok(providerMeta.providers[provider.provider], provider.provider);
  }
  const ghosts = ds.models.filter((model) => !model.aa_model_id && !model.coding_agent_results?.length
    && !Object.values(model.benchmarks || {}).some((value) => value != null)
    && !Object.keys(model.designarena || {}).length && !model.offers.length && !model.copilot);
  assert.deepEqual(ghosts, []);
});

test("September frontier additions retain prices, exact efforts and conservative metadata", () => {
  for (const family of ["gpt-6-astra", "glm-5.3-flash", "qwen3.8-max-0902"]) {
    const rows = ds.models.filter((m) => m.family_key === family);
    assert.ok(rows.length, family);
    // Featuring is decided by the AA Intelligence rank (R4.4), not by a hand-kept list —
    // the dated Qwen refresh carries pricing only and therefore has no rank of its own.
    if (family !== "qwen3.8-max-0902") assert.ok(rows.some((m) => m.has_benchmark), family);
    // The dated Qwen release has pricing only; bare-family scores must not be copied.
    assert.ok(rows.some((m) => m.offers.some((o) => o.input_per_1m != null)), family);
  }
  for (const model of ds.models.filter((m) => m.aa_metadata?.available === false)) {
    assert.equal(model.open_weights, false, "unknown weights must not become open from the lab name");
    assert.equal(model.aa_metadata.is_open_weights, null);
  }
  const astra = ds.models.find((m) => m.family_key === "gpt-6-astra");
  assert.equal(astra.copilot.current.input_per_1m, 10);
  assert.equal(astra.copilot.multiplier, null, "current models must not acquire an invented legacy multiplier");
});
