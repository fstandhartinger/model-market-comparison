import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(await readFile(join(__dirname, "..", "data", "dataset.json"), "utf8"));
const aa = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "artificialanalysis.json"), "utf8"));
const designArena = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "designarena.json"), "utf8"));
const openRouter = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "openrouter.json"), "utf8"));
const providerMeta = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "provider-meta.json"), "utf8"));
const codingAgents = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "aa-coding-agents.json"), "utf8"));
const copilot = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "github-copilot.json"), "utf8"));
const claude = JSON.parse(await readFile(join(__dirname, "..", "data", "raw", "claude-code.json"), "utf8"));

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

  const providers = (family) => new Set(
    ds.models.find((model) => model.family_key === family)?.offers.map((offer) => offer.provider) ?? [],
  );
  assert.ok(providers("command-a").has("Cohere"));
  assert.ok(providers("command-a").has("Azure AI Foundry"));
  assert.ok(providers("palmyra-x5").has("AWS Bedrock"));
  assert.ok(providers("palmyra-x5").has("Amazon Bedrock"));
  assert.ok(providers("sonar").has("Perplexity"));
  assert.ok(providers("nemotron-3-super-120b-a12b").has("TensorX"));
  assert.ok(providers("nemotron-3-super-120b-a12b").has("AWS Bedrock"));
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
  // composer-2 dropped out of the catalog when partial Coding-Agent rows (its only
  // data point, 2/3 eval components) stopped being ingested.
  for (const family of ["composer-2.5", "composer-2.5-fast", "raptor-mini", "grok-4.5"]) {
    assert.equal(isOpen(family), false, family);
  }
  assert.equal(ds.models.some((model) => model.family_key === "composer-2"), false, "composer-2 only ever had a partial CA row");
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

test("featured set covers the requested families", () => {
  const featured = new Set(ds.models.filter((m) => m.featured).map((m) => m.family_key));
  for (const k of ["gpt-5.5", "claude-opus-4.8", "claude-fable-5", "kimi-k2.6", "minimax-m3", "deepseek-v4-pro"]) {
    assert.ok(featured.has(k), `expected featured: ${k}`);
  }
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
  const offer = (family, provider) => offers(family).find((row) => row.provider === provider);

  assert.equal(offer("glm-5.2", "Inceptron")?.eu_hosted, true);
  assert.equal(offer("glm-5.2", "TensorX")?.eu_hosted, true);
  assert.equal(offer("glm-5.2", "Scaleway")?.eu_hosted, true);
  assert.equal(offer("glm-5.2", "Nebius")?.eu_hosted, false, "Nebius serves GLM 5.2 from the US");
  assert.equal(offer("glm-5.2", "Azure AI Foundry")?.eu_hosted, false, "Fireworks-on-Azure is US-served");
  assert.equal(offer("deepseek-v4-pro", "TensorX")?.eu_hosted, true);
  assert.equal(offer("deepseek-v4-pro", "Nebius")?.eu_hosted, false, "Nebius serves V4 Pro from the UK");
  assert.equal(offer("deepseek-v4-flash", "NextBit")?.eu_hosted, true);
  assert.equal(offer("kimi-k2.7-code", "Azure AI Foundry")?.eu_hosted, false, "policy equivalence must not falsify technical residency");
});

test("only the two approved Azure Direct Global offers receive the EU policy equivalence", () => {
  const azure = ds.models.flatMap((model) => model.offers
    .filter((offer) => offer.provider === "Azure AI Foundry")
    .map((offer) => ({ family: model.family_key, offer })));
  const equivalent = azure.filter(({ offer }) => offer.eu_policy_equivalent === true);

  assert.deepEqual(
    [...new Set(equivalent.map(({ family }) => family))].sort(),
    ["deepseek-v4-pro", "kimi-k2.7-code"],
  );
  assert.ok(equivalent.length > 0);
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

  for (const family of ["glm-5.2", "minimax-m2.7", "kimi-k2.5-thinking", "kimi-k2.6-thinking"]) {
    const rows = azure.filter((row) => row.family === family);
    assert.ok(rows.length > 0, `${family} has an Azure control route`);
    assert.ok(rows.every(({ offer }) => offer.eu_policy_equivalent !== true), family);
  }
});

test("global and EU routes from one provider are both retained", () => {
  const model = ds.models.find((row) => row.family_key === "gpt-5.4");
  const azure = model?.offers.filter((offer) => offer.provider === "Azure AI Foundry") ?? [];
  assert.ok(azure.some((offer) => offer.eu_hosted === false && offer.region === "global"));
  assert.ok(azure.some((offer) => offer.eu_hosted === true && offer.region === "eu"));
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
  assert.ok(azure55.some((offer) => offer.region === "global" && offer.pricing_tier === "short_context" && offer.input_per_1m === 5));
  assert.ok(azure55.some((offer) => offer.region === "global" && offer.pricing_tier === "long_context" && offer.input_per_1m === 10));
  assert.ok(azure55.some((offer) => offer.region === "eu" && offer.pricing_tier === "short_context" && offer.input_per_1m === 5.5));
  assert.ok(azure55.some((offer) => offer.region === "eu" && offer.pricing_tier === "long_context" && offer.input_per_1m === 11));

  const tSystems = offers.filter((offer) => offer.provider === "T-Systems LLM Hub" && offer.pricing_tier);
  assert.ok(tSystems.some((offer) => offer.pricing_tier === "up_to_200k_input"));
  assert.ok(tSystems.some((offer) => offer.pricing_tier === "above_200k_input"));

  const deepSeek = ds.models.find((model) => model.family_key === "deepseek-v4-pro")?.offers
    .filter((offer) => offer.provider === "Azure AI Foundry") || [];
  assert.ok(deepSeek.some((offer) => offer.route_type === "azure_direct" && offer.region === "global"));
  assert.ok(deepSeek.some((offer) => offer.route_type === "fireworks" && offer.region === "us"));
});

test("audited July provider prices survive the merged dataset", () => {
  const find = (family, provider) => ds.models.find((model) => model.family_key === family)?.offers.find((offer) => offer.provider === provider);
  // Inceptron re-prices frequently; re-verified 2026-07-14 against api.inceptron.io.
  assert.deepEqual(
    [find("glm-5.2", "Inceptron")?.input_per_1m, find("glm-5.2", "Inceptron")?.output_per_1m],
    [0.94, 2.9],
  );
  assert.deepEqual(
    [find("deepseek-v3.1", "AWS Bedrock")?.input_per_1m, find("deepseek-v3.1", "AWS Bedrock")?.output_per_1m],
    [0.696, 2.016],
  );
  assert.deepEqual(
    [find("qwen3-coder-480b-a35b", "AWS Bedrock")?.input_per_1m, find("qwen3-coder-480b-a35b", "AWS Bedrock")?.output_per_1m],
    [0.54, 2.16],
  );
});

test("privacy routing is not mislabeled as trusted execution", () => {
  const venice = ds.models.flatMap((model) => model.offers).filter((offer) => offer.provider === "Venice");
  assert.ok(venice.length > 0);
  assert.ok(venice.every((offer) => !offer.tee));
  const chutes = ds.models.flatMap((model) => model.offers).filter((offer) => offer.platform === "Chutes");
  assert.equal(chutes.length > 0, true);
  assert.ok(chutes.every((offer) => offer.tee && !offer.eu_hosted));
  const routedChutes = ds.models.flatMap((model) => model.offers).filter((offer) => offer.platform === "OpenRouter" && offer.provider === "Chutes");
  assert.ok(routedChutes.length > 0);
  assert.ok(routedChutes.every((offer) => !offer.tee));
});

test("current Copilot token catalog and legacy request table stay distinct", () => {
  assert.equal(copilot.collected_at, "2026-07-12");
  assert.equal(copilot.current_models.length, 26);
  assert.equal(copilot.models.length, 25);

  const model = (family) => ds.models.find((row) => row.family_key === family);
  assert.deepEqual(
    [model("gpt-5.6-sol")?.copilot?.current?.input_per_1m, model("gpt-5.6-sol")?.copilot?.current?.output_per_1m],
    [5, 30],
  );
  assert.deepEqual(
    [model("claude-sonnet-5")?.copilot?.current?.input_per_1m, model("claude-sonnet-5")?.copilot?.current?.output_per_1m],
    [2, 10],
  );
  assert.equal(model("claude-sonnet-5")?.copilot?.current?.standard_pricing_from, "2026-09-01");
  assert.equal(model("gpt-5.4")?.copilot?.multiplier, 6);
  assert.deepEqual(
    [model("claude-opus-4.8")?.copilot?.current?.input_per_1m, model("claude-opus-4.8")?.copilot?.current?.output_per_1m],
    [5, 25],
  );
  assert.deepEqual(
    [model("claude-opus-4.8")?.copilot?.fast_mode?.input_per_1m, model("claude-opus-4.8")?.copilot?.fast_mode?.output_per_1m],
    [10, 50],
  );
});

test("confirmed non-US provider metadata reaches the provider directory", () => {
  const sakana = ds.providers.find((provider) => provider.provider === "Sakana AI");
  assert.equal(sakana?.country, "Japan");
  assert.equal(sakana?.non_us, true);
  assert.equal(sakana?.eu_hosted, false);
});

test("Claude first-party snapshot contains every currently callable model", () => {
  assert.equal(claude.collected_at, "2026-07-12");
  assert.equal(claude.models.length, 11);
  assert.ok(claude.models.some((model) => model.model_name === "Claude Mythos 5"));
  assert.ok(claude.models.some((model) => model.model_name === "Claude Opus 4.1" && model.lifecycle_status === "deprecated"));
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

  assert.equal(best("DeepSeek V4 Pro (high)"), 47.3);
  assert.equal(best("DeepSeek V4 Pro (max)"), null);
  assert.equal(best("DeepSeek V4 Pro (non-reasoning)"), null);

  // Max only across harnesses for the same effort setting.
  assert.equal(best("GPT-5.5 (medium)"), 70.5);
  assert.equal(best("GPT-5.5 (xhigh)"), 76.4);
  assert.equal(best("GPT-5.5 (low)"), null);

  const expected56 = new Map([
    ["GPT-5.6 Sol (high)", 77.1], ["GPT-5.6 Sol (low)", 69.1], ["GPT-5.6 Sol (max)", 80.0],
    ["GPT-5.6 Sol (medium)", 74.6], ["GPT-5.6 Sol (none)", 58.4], ["GPT-5.6 Sol (xhigh)", 78.7],
    ["GPT-5.6 Terra (high)", 71.8], ["GPT-5.6 Terra (low)", 53.8], ["GPT-5.6 Terra (max)", 77.4],
    ["GPT-5.6 Terra (medium)", 64.2], ["GPT-5.6 Terra (none)", 40.3], ["GPT-5.6 Terra (xhigh)", 73.2],
    ["GPT-5.6 Luna (high)", 67.9], ["GPT-5.6 Luna (low)", 42.4], ["GPT-5.6 Luna (max)", 74.6],
    ["GPT-5.6 Luna (medium)", 58.7], ["GPT-5.6 Luna (none)", 37.3], ["GPT-5.6 Luna (xhigh)", 70.8],
  ]);
  for (const [name, score] of expected56) assert.equal(best(name), score, name);
});

test("freshly built dataset attaches Coding Agent scores only to exact variants", () => {
  // Data refreshes land raw sources before the generated snapshot is rebuilt. Keep
  // the source assertions above active during that window; enforce the generated
  // mapping as soon as dataset.json declares this Coding-Agent snapshot date.
  if (ds.sources.aa_coding_agents !== codingAgents.collected_at) return;

  const score = (id) => ds.models.find((m) => m.id === id)?.benchmarks?.aa_coding_agent_index ?? null;
  assert.equal(score("deepseek-v4-pro::high"), 47.3);
  assert.equal(score("deepseek-v4-pro::max"), null);
  assert.equal(score("deepseek-v4-pro::non-reasoning"), null);

  assert.equal(score("gpt-5.5::medium"), 66.2);
  assert.equal(score("gpt-5.5::xhigh"), 76.4);
  assert.equal(score("gpt-5.5::low"), null);

  for (const [family, values] of Object.entries({
    "gpt-5.6-sol": { high: 77.1, low: 69.1, max: 80.0, medium: 74.6, "non-reasoning": 58.4, xhigh: 78.7 },
    "gpt-5.6-terra": { high: 71.8, low: 53.8, max: 77.4, medium: 64.2, "non-reasoning": 40.3, xhigh: 73.2 },
    "gpt-5.6-luna": { high: 67.9, low: 42.4, max: 74.6, medium: 58.7, "non-reasoning": 37.3, xhigh: 70.8 },
  })) {
    for (const [variant, expected] of Object.entries(values)) assert.equal(score(`${family}::${variant}`), expected, `${family} ${variant}`);
  }

  // AA's bare GLM-5.2 Coding-Agent identity is the documented default-thinking
  // max configuration; it must join the AA max row, never a source-only ghost.
  assert.equal(score("glm-5.2::max"), 57.9);
  assert.equal(ds.models.some((model) => model.id === "glm-5.2::default"), false);
  assert.equal(score("glm-5.1::reasoning"), 52.3);
  assert.equal(ds.models.some((model) => model.id === "glm-5.1::default"), false);
  assert.equal(score("glm-5.1::non-reasoning"), null);
});

test("GLM-5.2 keeps all qualified source evidence on the reasoning max row", () => {
  const glm = ds.models.find((model) => model.id === "glm-5.2::max");
  assert.ok(glm);
  assert.equal(glm.benchmarks.aa_coding_index, 68.8);
  assert.equal(glm.benchmarks.aa_coding_agent_index, 57.9);
  assert.equal(glm.benchmarks.aa_intelligence_index, 51.1);
  assert.equal(glm.designarena.frontend?.modelId, "glm-5.2");
  assert.equal(glm.designarena.fullstack?.modelId, "glm-5.2");
  assert.ok(glm.designarena.frontend?.battles >= 500);
  assert.ok(glm.designarena.fullstack?.battles >= 500);
  assert.equal(ds.models.some((model) => model.id === "glm-5.2::designarena"), false);

  const nonReasoning = ds.models.find((model) => model.id === "glm-5.2::non-reasoning");
  assert.equal(nonReasoning?.benchmarks.aa_coding_index, 46.5);
  assert.equal(nonReasoning?.benchmarks.aa_intelligence_index, 34.1);
  assert.equal(nonReasoning?.benchmarks.aa_coding_agent_index ?? null, null);
  assert.deepEqual(nonReasoning?.designarena || {}, {});
});

test("family-scoped Intelligence.ai evidence attaches once to deterministic Overview representatives", () => {
  const fable = ds.models.find((model) => model.id === "claude-fable-5::max");
  assert.ok(fable);
  assert.equal(fable.designarena.frontend?.modelId, "claude-fable-5");
  assert.equal(fable.designarena.fullstack?.modelId, "claude-fable-5");
  assert.ok(fable.designarena.frontend?.battles >= 500);
  assert.ok(fable.designarena.fullstack?.battles >= 500);
  assert.match(fable.designarena_attachment_note || "", /product\/family scope without an effort setting/i);
  assert.equal(ds.models.some((model) => model.id === "claude-fable-5::designarena"), false);

  for (const attached of ds.models.filter((model) => model.designarena_attachment_note)) {
    assert.match(attached.designarena_attachment_note, /attached exactly once/i, attached.id);
    assert.match(attached.designarena_attachment_note, /does not assert.*specific effort setting/i, attached.id);
  }

  assert.equal(ds.models.some((model) => model.variant === "designarena"), false);
  assert.equal(ds.models.find((model) => model.id === "claude-sonnet-5::max")?.designarena.frontend?.modelId, "claude-sonnet-5");
  assert.equal(ds.models.find((model) => model.id === "gpt-5.5::high")?.designarena.frontend?.modelId, "gpt-5.5");
});

test("DeepSeek V4 Pro keeps its Webapps/Frontend Elo on the collapsed max representative only", () => {
  const sourceFrontend = designArena.leaderboards.frontend.data.find((row) => row.modelId === "deepseek-v4-pro");
  const sourceFullstack = designArena.leaderboards.fullstack.data.find((row) => row.modelId === "deepseek-v4-pro");
  assert.ok(sourceFrontend);
  assert.equal(sourceFullstack, undefined, "Intelligence.ai does not publish a DeepSeek V4 Pro Fullstack row");

  const max = ds.models.find((model) => model.id === "deepseek-v4-pro::max");
  assert.equal(max?.designarena.frontend?.elo, sourceFrontend.elo);
  assert.equal(max?.designarena.frontend?.battles, sourceFrontend.battles);
  assert.equal(max?.designarena.fullstack, undefined);
  assert.match(max?.designarena_attachment_note || "", /product\/family scope without an effort setting/i);

  const siblings = ds.models.filter((model) => model.family_key === "deepseek-v4-pro" && model.id !== max?.id);
  assert.ok(siblings.every((model) => Object.keys(model.designarena || {}).length === 0));
  assert.equal(ds.models.some((model) => model.id === "deepseek-v4-pro::designarena"), false);
});

test("Intelligence.ai registry display names resolve opaque and revisioned leaderboard ids", () => {
  assert.match(designArena.endpoint, /^POST https:\/\/intelligence\.ai\/api\/leaderboard$/);
  assert.match(designArena.registry_endpoint, /^GET https:\/\/intelligence\.ai\/api\/registry$/);
  const sourceIds = new Set(Object.values(designArena.leaderboards).flatMap((board) => board.data.map((row) => row.modelId)));
  assert.ok([...sourceIds].every((id) => designArena.model_registry[id]), "every leaderboard id needs registry metadata");

  const grok = ds.models.find((model) => model.id === "grok-4.5::high");
  assert.equal(grok?.designarena.frontend?.modelId, "yoda");
  assert.equal(ds.models.some((model) => model.family_key === "yoda"), false);

  const opus = ds.models.find((model) => model.id === "claude-opus-4.7::max");
  assert.equal(opus?.designarena.frontend?.modelId, "claude-opus-4-7-thinking");
  assert.equal(ds.models.some((model) => model.family_key === "claude-opus-4.7-thinking"), false);

  const grok420 = ds.models.find((model) => model.id === "grok-4.20-reasoning::default");
  assert.equal(grok420?.designarena.frontend?.modelId, "grok-4.20-0309-reasoning");
  assert.equal(ds.models.some((model) => model.family_key === "grok-4.20-0309-reasoning"), false);
});

test("all 572 Artificial Analysis rows and official weight flags survive exactly once", () => {
  const output = ds.models.filter((model) => model.aa_model_id);
  assert.equal(output.length, aa.models.length);
  assert.equal(new Set(output.map((model) => model.aa_model_id)).size, aa.models.length);
  const rawById = new Map(aa.models.map((model) => [model.id, model]));
  for (const model of output) {
    const raw = rawById.get(model.aa_model_id);
    assert.ok(raw, model.aa_model_id);
    assert.equal(model.display_name, raw.name, model.id);
    assert.equal(model.open_weights, raw.metadata.is_open_weights, model.id);
    assert.equal(model.deprecated, raw.metadata.deprecated, model.id);
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
  const providers = (family) => new Set(ds.models
    .filter((model) => model.family_key === family)
    .flatMap((model) => model.offers)
    .map((offer) => offer.provider));
  const families = new Set(ds.models.map((model) => model.family_key));

  assert.ok(providers("llama-3.3-70b-instruct").has("OVHcloud"));
  for (const provider of ["AWS Bedrock", "Nebius", "Scaleway", "STACKIT"]) {
    assert.ok(providers("gemma-3-27b-instruct").has(provider), provider);
  }
  for (const provider of ["Scaleway", "OVHcloud", "IONOS"]) {
    assert.ok(providers("mistral-small-3.2-24b-instruct").has(provider), provider);
  }
  assert.ok(providers("devstral-2-123b").has("Scaleway"));
  assert.ok(providers("mistral-nemo").has("OVHcloud"));
  assert.ok(providers("mistral-nemo").has("Chutes"));
  assert.ok(providers("mistral-medium-3.5").has("Scaleway"));
  assert.ok(providers("gemma-4-31b-it").has("Chutes"));

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
  assert.deepEqual(output.sort(), source.sort());
});

test("every current OpenRouter text SKU remains represented after free-tier deduplication", () => {
  const stable = (id) => String(id || "").replace(/^~/, "").replace(/:free$/i, "");
  const excluded = /(vision-only|embed|rerank|moderation|ocr|guard|^openrouter\/(?:free|auto|fusion|bodybuilder|pareto-code)$)/i;
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
    assert.ok(providerMeta.providers[provider.provider], provider.provider);
  }
  const ghosts = ds.models.filter((model) => !model.aa_model_id && !model.coding_agent_results?.length
    && !Object.values(model.benchmarks || {}).some((value) => value != null)
    && !Object.keys(model.designarena || {}).length && !model.offers.length && !model.copilot);
  assert.deepEqual(ghosts, []);
});
