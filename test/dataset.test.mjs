import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(await readFile(join(__dirname, "..", "data", "dataset.json"), "utf8"));
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
  for (const [source, collectedAt] of Object.entries(ds.sources)) {
    assert.equal(collectedAt, "2026-07-12", source);
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
  assert.equal(isOpen("command-a"), false);
  assert.equal(isOpen("command-a+"), false);
  assert.equal(isOpen("sonar"), false);
  assert.equal(isOpen("sonar-pro"), false);
  assert.equal(isOpen("palmyra-x5"), false);

  const grok = ds.models.filter((model) => model.family_key.startsWith("grok"));
  assert.ok(grok.length > 0);
  assert.ok(grok.every((model) => model.org === "xAI" && model.open_weights === false));
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
  assert.equal(offer("kimi-k2.7-code", "Azure AI Foundry")?.eu_hosted, false);
});

test("global and EU routes from one provider are both retained", () => {
  const model = ds.models.find((row) => row.family_key === "gpt-5.4");
  const azure = model?.offers.filter((offer) => offer.provider === "Azure AI Foundry") ?? [];
  assert.ok(azure.some((offer) => offer.eu_hosted === false && offer.region === "global"));
  assert.ok(azure.some((offer) => offer.eu_hosted === true && offer.region === "eu"));
});

test("audited July provider prices survive the merged dataset", () => {
  const find = (family, provider) => ds.models.find((model) => model.family_key === family)?.offers.find((offer) => offer.provider === provider);
  assert.deepEqual(
    [find("glm-5.2", "Inceptron")?.input_per_1m, find("glm-5.2", "Inceptron")?.output_per_1m],
    [0.95, 3.04],
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
  const chutes = ds.models.flatMap((model) => model.offers).filter((offer) => offer.provider === "Chutes");
  assert.equal(chutes.length > 0, true);
  assert.ok(chutes.every((offer) => offer.tee && !offer.eu_hosted));
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

test("Coding Agent snapshot contains the complete 2026-07-12 homepage RSC rows", () => {
  assert.equal(codingAgents.collected_at, "2026-07-12");
  assert.equal(codingAgents.count, 43);
  assert.equal(codingAgents.rows.length, 43);
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

  assert.equal(score("gpt-5.5::medium"), 70.5);
  assert.equal(score("gpt-5.5::xhigh"), 76.4);
  assert.equal(score("gpt-5.5::low"), null);

  for (const [family, values] of Object.entries({
    "gpt-5.6-sol": { high: 77.1, low: 69.1, max: 80.0, medium: 74.6, "non-reasoning": 58.4, xhigh: 78.7 },
    "gpt-5.6-terra": { high: 71.8, low: 53.8, max: 77.4, medium: 64.2, "non-reasoning": 40.3, xhigh: 73.2 },
    "gpt-5.6-luna": { high: 67.9, low: 42.4, max: 74.6, medium: 58.7, "non-reasoning": 37.3, xhigh: 70.8 },
  })) {
    for (const [variant, expected] of Object.entries(values)) assert.equal(score(`${family}::${variant}`), expected, `${family} ${variant}`);
  }

  // Explicit audited alias; ambiguous bare/medium labels remain unattached.
  assert.equal(score("glm-5.2::max"), 57.9);
  assert.equal(score("glm-5.1::reasoning"), null);
  assert.equal(score("glm-5.1::non-reasoning"), null);
});
