#!/usr/bin/env node
// Merge all raw data sources into a single normalized dataset.json.
// Output shape is documented in data/SCHEMA.md and consumed by the DB seeder
// (scripts/seed-db.mjs) and as the app's bundled fallback dataset.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, "..", "data", "raw");
const OUT = join(__dirname, "..", "data", "dataset.json");

const readJSON = async (f) => JSON.parse(await readFile(join(RAW, f), "utf8"));

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
function stripVendor(s) {
  let x = s.trim().replace(/^~/, "");
  // OpenRouter ids are always author/model. Strip any author, not a brittle
  // allow-list: a fixed list previously split 18 benchmark/price identities
  // such as stepfun/step-3.7-flash and inclusionai/ling-2.6.
  if (x.includes("/")) x = x.slice(x.indexOf("/") + 1);
  return x.replace(/:free$/i, "");
}

const stableOpenRouterId = (id) => String(id || "").replace(/^~/, "").replace(/:free$/i, "");
const stableHuggingFaceId = (id) => String(id || "")
  .replace(/^https?:\/\/(?:www\.)?huggingface\.co\//i, "")
  .replace(/\/$/, "")
  .toLowerCase();

const REASONING_CONFIG_RE = /\b(?:non[- ]?reasoning|reasoning|adaptive|thinking|x\s?high|xhigh|high|medium|low|minimal|max)(?:\s+effort)?\b/i;
const SERVING_ANNOTATION_RE = /^(?:fireworks|azure direct|eu data zone|short context|long context|fast mode|none)$/i;
const PRICING_TIER_ANNOTATION_RE = /^(?:[<>≤≥]=?\s*)?\d+(?:\.\d+)?\s*[km](?:\s+(?:input|tokens?))?$/i;

function pricingTier(rawName) {
  const annotations = [...String(rawName || "").matchAll(/\(([^)]*)\)/g)].map((match) => match[1].trim());
  for (const annotation of annotations) {
    if (/short context/i.test(annotation)) return "short_context";
    if (/long context/i.test(annotation)) return "long_context";
    const threshold = annotation.match(/^([<>≤≥]=?)\s*(\d+(?:\.\d+)?)\s*([km])/i);
    if (threshold) {
      const comparator = threshold[1].includes(">") || threshold[1].includes("≥") ? "above" : "up_to";
      return `${comparator}_${threshold[2]}${threshold[3].toLowerCase()}_input`;
    }
  }
  return null;
}

function routeType(rawName) {
  const annotations = [...String(rawName || "").matchAll(/\(([^)]*)\)/g)].map((match) => match[1].trim());
  if (annotations.some((value) => /^fireworks$/i.test(value))) return "fireworks";
  if (annotations.some((value) => /^azure direct$/i.test(value))) return "azure_direct";
  return null;
}

// Reasoning / effort variant detection.
function detectVariant(raw) {
  // AA expresses reasoning effort in parenthetical qualifiers. Restricting the
  // detector to those qualifiers avoids treating product names such as MiniMax,
  // Mistral Medium and Qwen Max as effort variants.
  const s = [...raw.matchAll(/\(([^)]*)\)/g)]
    .map((match) => match[1])
    .filter((value) => REASONING_CONFIG_RE.test(value) || /\bnone\b/i.test(value))
    .join(" ")
    .toLowerCase();
  if (!s) return "default";
  const effort = [
    [/x ?high|xhigh/, "xhigh"],
    [/max effort|\bmax\b/, "max"],
    [/high effort|\bhigh\b/, "high"],
    [/\bmedium\b/, "medium"],
    [/\bminimal\b/, "minimal"],
    [/\blow\b/, "low"],
  ].find(([re]) => re.test(s))?.[1];
  if (/non[- ]?reasoning|\bnone\b/.test(s)) return effort ? `non-reasoning-${effort}` : "non-reasoning";
  if (effort) return effort;
  if (/adaptive/.test(s)) return "adaptive";
  if (/thinking/.test(s)) return "thinking";
  if (/\breasoning\b/.test(s)) return "reasoning";
  return "default";
}

// Reduce a raw model label to a canonical family key + display name + org.
function normalizeFamily(rawName, orgHint) {
  let x = stripVendor(rawName);
  // Drop only benchmark configuration and serving annotations. Identity-bearing
  // tokens such as instruct/chat/thinking/fast/preview, Vision and release
  // revisions (2512/2507/0528/0905/0613) must survive normalization.
  x = x.replace(/\(([^)]*)\)/g, (_match, annotation) => {
    if (REASONING_CONFIG_RE.test(annotation) || SERVING_ANNOTATION_RE.test(annotation.trim())
        || PRICING_TIER_ANNOTATION_RE.test(annotation.trim())) return " ";
    return ` ${annotation} `;
  });
  // unify version dashes: 4-8 -> 4.8 ; k2-6 stays handled below
  x = x.replace(/(\d)[-_](\d)\b/g, "$1.$2");
  // normalize separators
  x = x.toLowerCase().replace(/[^a-z0-9.+]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // family-specific cleanups
  x = x
    .replace(/^claude-/, "claude-")
    .replace(/^gpt-?/, "gpt-")
    .replace(/kimi-k2(\d)/, "kimi-k2.$1")
    .replace(/^minimax-(\d)/, "minimax-m$1"); // "MiniMax 2.7" → minimax-m2.7
  // collapse trailing version separators
  x = x.replace(/\.$/, "");
  const familyKey = canonFamily(x || rawName.toLowerCase());
  // display name: title-ish from the cleaned key
  return { familyKey, org: canonOrg(orgHint || guessOrg(familyKey)) };
}

// Families that should be merged into a canonical key (alias -> canonical).
const FAMILY_ALIASES = {
  "claude-fable": "claude-fable-5",
  "claude-opus": "claude-opus-4.8",
  "claude-sonnet": "claude-sonnet-4.6",
  "claude-4.1-opus": "claude-opus-4.1",
  "claude-4.5-opus": "claude-opus-4.5",
  "claude-4.6-opus": "claude-opus-4.6",
  "claude-4.5-sonnet": "claude-sonnet-4.5",
  "claude-4.6-sonnet": "claude-sonnet-4.6",
  "claude-4.5-haiku": "claude-haiku-4.5",
  // AA's Coding Agent Index drops the "Claude" prefix (e.g. "Opus 4.8", "Sonnet 4.6").
  "opus-4.8": "claude-opus-4.8", "opus-4.7": "claude-opus-4.7", "opus-4.6": "claude-opus-4.6", "opus-4.5": "claude-opus-4.5",
  "sonnet-5": "claude-sonnet-5", "sonnet-4.6": "claude-sonnet-4.6", "sonnet-4.5": "claude-sonnet-4.5",
  "fable-5": "claude-fable-5", "haiku-4.5": "claude-haiku-4.5",
  // Provider-prefixed product labels from managed-cloud catalogs must join the
  // benchmark/OpenRouter family rather than creating a second model.
  "cohere-command-a": "command-a",
  "cohere-command-a-plus": "command-a+",
  "command-a-plus": "command-a+",
  // Audited cross-catalog aliases. These spellings differ only by an omitted
  // architecture/serving suffix; release and mode suffixes are intentionally
  // not aliased here.
  "gemma-3-27b": "gemma-3-27b-it",
  "gemma-4-26b": "gemma-4-26b-a4b-it",
  "gemma-4-26b-a4b": "gemma-4-26b-a4b-it",
  "gemma-4-31b": "gemma-4-31b-it",
  "qwen3-235b": "qwen3-235b-a22b",
  "qwen3.5-397b": "qwen3.5-397b-a17b",
  "qwen3.6-35b": "qwen3.6-35b-a3b",
  "qwen3-coder-30b": "qwen3-coder-30b-a3b",
  "qwen3-next-80b": "qwen3-next-80b-a3b",
  "qwen3-235b-a22b-instruct-2507": "qwen3-235b-a22b-2507-instruct",
  "nemotron-nano-3-30b": "nemotron-3-nano-30b-a3b",
  "nemotron-3-nano-30b": "nemotron-3-nano-30b-a3b",
  "devstral-2": "devstral-2-123b",
  "mistral-small-3.2": "mistral-small-3.2-24b",
};
const canonFamily = (k) => {
  const exact = FAMILY_ALIASES[k];
  if (exact) return exact;
  return k
    .replace(/^writer-(palmyra(?:-|$))/, "$1")
    .replace(/^perplexity-(sonar(?:-|$))/, "$1")
    .replace(/^nvidia-(nemotron(?:-|$))/, "$1");
};

// OpenRouter-routed providers that genuinely run inference inside a hardware TEE
// (confidential compute). Their offers are flagged tee:true so the "TEE only" filter
// surfaces them alongside Chutes' first-party TEE listing.
const TEE_OR_PROVIDERS = new Set(["Phala"]);

// Non-text / non-LLM modalities to exclude from the comparison.
const EXCLUDE_RE = /(vision-only|embed|rerank|moderation|ocr|guard|^openrouter\/(?:free|auto|fusion|bodybuilder|pareto-code)$)/i;
// A moving generic alias is not a stable model identity. Its current price can
// be compared only after the upstream catalog names the concrete model version.
const AMBIGUOUS_MODEL_RE = /^~?[^/]+\/[^/]*latest$/i;

// The models the product brief explicitly asks us to feature.
const FEATURED_RE = /^(gpt-5\.[45]|gpt-5\.6-(sol|terra|luna)(?!-pro)|claude-opus-4\.[678]|claude-sonnet-(4\.6|5)|claude-fable-5|kimi-k2\.[567]|glm-5\.[12]|minimax-(m2\.5|m2\.7|m3)|mimo-v2\.5-pro|deepseek-v4-pro)/;

// Canonicalize vendor names that arrive spelled differently across sources.
const ORG_ALIASES = {
  "Z AI": "Z.ai", "ZAI": "Z.ai", "Zhipu": "Z.ai", "Zhipu AI": "Z.ai",
  "Kimi": "Moonshot AI", "Moonshot": "Moonshot AI",
  "Meta Llama": "Meta", "Meta-Llama": "Meta",
  "Alibaba Cloud": "Alibaba", "Qwen": "Alibaba",
  "MistralAI": "Mistral", "Mistral AI": "Mistral",
  "xAI (Grok)": "xAI", "X AI": "xAI", "SpaceXAI": "xAI",
  "Z.AI": "Z.ai", "z-ai": "Z.ai",
  "Nvidia": "NVIDIA", "Meta Llama": "Meta", "meta-llama": "Meta",
  "Amazon Bedrock": "Amazon", "Google AI": "Google", "Google AI Studio": "Google",
  "Microsoft Azure": "Microsoft",
  "Nous": "Nous Research", "ByteDance": "ByteDance Seed",
};
function canonOrg(org) { return ORG_ALIASES[org] || org; }

function guessOrg(key) {
  if (key.startsWith("claude") || key.includes("fable") || key.includes("opus") || key.includes("sonnet") || key.includes("haiku")) return "Anthropic";
  if (key.startsWith("gpt") || key.includes("o3") || key.includes("o4") || key.includes("gpt-oss")) return "OpenAI";
  if (key.startsWith("kimi")) return "Moonshot AI";
  if (key.startsWith("glm")) return "Z.ai";
  if (key.startsWith("minimax")) return "MiniMax";
  if (key.startsWith("mimo")) return "Xiaomi";
  if (key.startsWith("deepseek")) return "DeepSeek";
  if (key.startsWith("gemini") || key.startsWith("gemma")) return "Google";
  if (key.startsWith("grok")) return "xAI";
  if (key.startsWith("sonar")) return "Perplexity";
  if (key.startsWith("palmyra")) return "Writer";
  if (key.startsWith("nemotron")) return "NVIDIA";
  if (key.startsWith("llama")) return "Meta";
  if (key.startsWith("mistral") || key.includes("magistral") || key.includes("ministral") || key.includes("pixtral") || key.includes("devstral")) return "Mistral";
  if (key.startsWith("qwen")) return "Alibaba";
  if (key.startsWith("nova") || key.startsWith("titan")) return "Amazon";
  if (key.startsWith("command")) return "Cohere";
  if (key.startsWith("phi")) return "Microsoft";
  if (key.startsWith("codestral")) return "Mistral";
  if (key.startsWith("composer")) return "Cursor";
  if (key.startsWith("reka")) return "Reka AI";
  if (key.startsWith("magnum")) return "Anthracite";
  if (key.startsWith("remm")) return "Undi95";
  if (key.startsWith("mythomax")) return "Gryphe";
  return "Other";
}

function openRouterOrg(model) {
  const fromName = String(model.name || "").match(/^([^:]+):\s/)?.[1];
  if (fromName) return canonOrg(fromName);
  const author = String(model.id || "").replace(/^~/, "").split("/")[0];
  const authorAliases = {
    anthropic: "Anthropic", openai: "OpenAI", google: "Google", qwen: "Alibaba",
    alibaba: "Alibaba", "meta-llama": "Meta", mistralai: "Mistral", "x-ai": "xAI",
    deepseek: "DeepSeek", moonshotai: "Moonshot AI", nvidia: "NVIDIA", cohere: "Cohere",
    amazon: "Amazon", microsoft: "Microsoft", perplexity: "Perplexity", writer: "Writer",
    xiaomi: "Xiaomi", "z-ai": "Z.ai", minimax: "MiniMax",
    rekaai: "Reka AI", "anthracite-org": "Anthracite", undi95: "Undi95", gryphe: "Gryphe",
  };
  return authorAliases[author.toLowerCase()] || guessOrg(stripVendor(model.id || ""));
}

// A few provider catalogs omit an unambiguous checkpoint suffix even though
// their product page identifies the served SKU. Keep this source-specific so a
// benchmark label such as "(Reasoning)" is not globally rewritten to Instruct.
function normalizeCatalogFamily(model, platform) {
  const notes = String(model.notes || "");
  const explicitId = notes.match(/\bid\s+([a-z0-9][a-z0-9._/+:-]*)/i)?.[1];
  // Scaleway's audited snapshot has a fixed "EUR prices; model-slug; modality"
  // note format. Do not apply a generic trailing-semicolon heuristic: words
  // such as "coding"/"reasoning" in other catalogs are not model ids.
  const scalewayId = platform === "Scaleway" ? notes.match(/^[^;]+;\s*([^;]+)/)?.[1]?.trim() : null;
  const documentedId = explicitId || scalewayId;
  let identity = model.tee_model_id || model.model_id || documentedId || model.model_name;
  identity = String(identity)
    .replace(/-tee$/i, "")
    .replace(/-(?:fp8|bf16|fp4|mxfp4)(?:-dynamic)?$/i, "")
    .replace(/[.,;:]$/, "");
  const normalized = normalizeFamily(identity, model.provider_org);
  const catalogAliases = {
    "qwen3-235b-a22b-2507": "qwen3-235b-a22b-2507-instruct",
    "qwen3-next-80b-thinking": "qwen3-next-80b-a3b-thinking",
    "qwen3-next-80b-instruct": "qwen3-next-80b-a3b-instruct",
    "hermes-4-405b": "hermes-4-llama-3.1-405b",
    "hermes-4-70b": "hermes-4-llama-3.1-70b",
    "meta-llama-3.3-70b-instruct": "llama-3.3-70b-instruct",
    "gemma-3-27b-it": "gemma-3-27b-instruct",
    "mistral-small-3.2-24b": "mistral-small-3.2-24b-instruct",
    "mistral-small-3.2-24b-instruct-2506": "mistral-small-3.2-24b-instruct",
    "devstral-2-123b-instruct-2512": "devstral-2-123b",
    "mistral-nemo-instruct-2407": "mistral-nemo",
  };
  const platformAliases = {
    Scaleway: { "mistral-medium-3.5-128b": "mistral-medium-3.5" },
    Chutes: { "gemma-4-31b-turbo": "gemma-4-31b-it" },
  };
  const familyKey = platformAliases[platform]?.[normalized.familyKey]
    || catalogAliases[normalized.familyKey]
    || normalized.familyKey;
  return { ...normalized, familyKey, catalogIdentity: identity, platform };
}

// Pretty family display name from key.
function familyDisplay(key) {
  return key
    .split("-")
    .map((w) => {
      if (/^v?\d/.test(w) || w.includes(".")) return w.toUpperCase().replace("V", "V");
      if (["gpt", "glm", "mimo"].includes(w)) return w.toUpperCase();
      if (w === "oss") return "OSS";
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/\bK2\.(\d)/i, "K2.$1");
}

// Open-weights heuristic.
const CLOSED_ORGS = new Set(["Anthropic", "OpenAI", "Google", "xAI", "Amazon"]);
const CLOSED_FAMILY_RE = /^(command(?:-|$)|sonar(?:-|$)|palmyra(?:-|$)|magistral-medium(?:-|$)|codestral(?:-|$)|mistral-medium-(?:3|3\.1)(?:-|$)|mistral-large$|mai(?:-|$)|composer(?:-|$)|raptor-mini(?:-|$)|yoda(?:-|$))/;
const isOpenWeights = (org, key) => {
  if (key.includes("gpt-oss") || key.includes("gemma")) return true;
  if (CLOSED_FAMILY_RE.test(key)) return false;
  return !CLOSED_ORGS.has(org);
};

// The public AA feed currently contains two demonstrably incorrect repository
// URLs (the model names and repository sizes disagree). Preserve the source URL
// for auditability, but use the verified checkpoint identity for joins and for
// the generated dataset so an 8B/12B checkpoint cannot contaminate a 70B/4B row.
const AA_HF_URL_CORRECTIONS = {
  "aa83359a-d804-4f0b-b5bf-dc637711c26f": {
    url: "https://huggingface.co/meta-llama/Meta-Llama-3-70B-Instruct",
    reason: "AA source points Llama 3 Instruct 70B at the 8B repository",
  },
  "222fb320-6e55-4672-846a-b6d5a24a45f4": {
    url: "https://huggingface.co/google/gemma-3-4b-it",
    reason: "AA source points Gemma 3 4B Instruct at the 12B repository",
  },
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const models = new Map(); // rowId -> model row
const families = new Map(); // familyKey -> { offers:[], designarena:{}, copilot:null, meta }

function family(key, org, metadata = {}) {
  const normalizedOrg = canonOrg(org || "Other");
  if (!families.has(key)) {
    families.set(key, {
      familyKey: key, familyName: familyDisplay(key), org: normalizedOrg,
      offers: [], copilot: null, openWeights: metadata.openWeights,
    });
  }
  const fam = families.get(key);
  if ((fam.org === "Other" || !fam.org) && normalizedOrg !== "Other") fam.org = normalizedOrg;
  if (typeof metadata.openWeights === "boolean" && typeof fam.openWeights !== "boolean") {
    fam.openWeights = metadata.openWeights;
  }
  return fam;
}

function emptyModel({ familyKey, fam, id, displayName, variant = "default", openWeights, releaseDate = null }) {
  return {
    id: id || `${familyKey}::${variant}`,
    family_key: familyKey,
    family_name: fam.familyName,
    display_name: displayName || fam.familyName,
    org: fam.org,
    variant,
    open_weights: typeof openWeights === "boolean" ? openWeights : (fam.openWeights ?? isOpenWeights(fam.org, familyKey)),
    release_date: releaseDate,
    benchmarks: {}, aa_reference_price: {}, aa_speed: {}, offers: [], designarena: {}, copilot: null,
  };
}

function num(x) {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function offerRunsInEu(offer, meta = {}) {
  if (typeof offer.eu_hosted === "boolean") return offer.eu_hosted;
  const notes = offer.notes || "";
  if (/outside the eu data boundary|excluded from the eu data boundary|us-served|served region:\s*(us|uk)/i.test(notes)) return false;
  const region = String(offer.region || "").toLowerCase();
  if (region === "us" || region === "uk" || region.startsWith("us-") || region.startsWith("uk-")) return false;
  if (region === "eu" || region.startsWith("eu-") || region.startsWith("europe-")
      || /\b(eu cross-region|swedencentral|westeurope|francecentral|germanywestcentral|polandcentral|spaincentral)\b/.test(region)) return true;
  // OpenRouter exposes no region field. A provider-level EU flag may be used
  // only for an audited provider whose public serverless fleet itself is EU
  // hosted (not merely EU-capable via a separate dedicated/BYOC product).
  return offer.platform === "OpenRouter" && region === "global" && meta.openrouter_eu_hosted === true;
}

async function build() {
  const aa = await readJSON("artificialanalysis.json");
  const da = await readJSON("designarena.json");
  const or = await readJSON("openrouter.json");
  const aws = await readJSON("aws-bedrock.json");
  const azure = await readJSON("azure-foundry.json");
  const vertex = await readJSON("google-vertex.json").catch(() => ({ models: [] }));
  const nebius = await readJSON("nebius.json").catch(() => ({ models: [] }));
  const inceptron = await readJSON("inceptron.json").catch(() => ({ models: [] }));
  const scaleway = await readJSON("scaleway.json").catch(() => ({ models: [] }));
  const ionos = await readJSON("ionos.json").catch(() => ({ models: [] }));
  const mistral = await readJSON("mistral.json").catch(() => ({ models: [] }));
  const tensorx = await readJSON("tensorx.json").catch(() => ({ models: [] }));
  const chutes = await readJSON("chutes.json").catch(() => ({ models: [] }));
  const ovhcloud = await readJSON("ovhcloud.json").catch(() => ({ models: [] }));
  const stackit = await readJSON("stackit.json").catch(() => ({ models: [] }));
  const tSystems = await readJSON("t-systems-llm-hub.json").catch(() => ({ models: [] }));
  const providerMeta = await readJSON("provider-meta.json").catch(() => ({ providers: {} }));
  const codingAgents = await readJSON("aa-coding-agents.json").catch(() => ({ rows: [] }));
  const copilot = await readJSON("github-copilot.json");
  const claude = await readJSON("claude-code.json");

  // --- ArtificialAnalysis: benchmark + reference pricing, per exact variant ---
  // The public leaderboard metadata is authoritative for weights/licensing and
  // for its exact OpenRouter id. Never infer those fields from the lab name.
  const aaOrCandidates = new Map();
  const aaHfCandidates = new Map();
  for (const m of aa.models) {
    const meta = m.metadata || {};
    const hfCorrection = AA_HF_URL_CORRECTIONS[m.id] || null;
    const huggingfaceUrl = hfCorrection?.url || meta.huggingface_url || null;
    const named = normalizeFamily(m.name, m.model_creator?.name);
    const routed = meta.openrouter_api_id ? normalizeFamily(meta.openrouter_api_id, m.model_creator?.name) : null;
    // AA sometimes writes a serving checkpoint as a parenthetical config while
    // OpenRouter exposes it as the product id. Thinking/Instruct are priced as
    // distinct SKUs, so use that exact identity when the source provides it.
    const routeDefinesProduct = routed && /(?:^|-)(?:thinking|instruct)(?:-|$)/.test(routed.familyKey);
    const familyKey = routeDefinesProduct ? routed.familyKey : named.familyKey;
    const org = named.org;
    const variant = detectVariant(m.name);
    const rowId = `${familyKey}::${variant}`;
    const ev = m.evaluations || {};
    const pr = m.pricing || {};
    const fam = family(familyKey, org, { openWeights: meta.is_open_weights });
    if (models.has(rowId)) {
      throw new Error(`Artificial Analysis normalization collision: ${rowId} (${models.get(rowId).display_name} / ${m.name})`);
    }
    models.set(rowId, {
      id: rowId,
      family_key: familyKey,
      family_name: fam.familyName,
      display_name: m.name,
      org,
      variant,
      open_weights: typeof meta.is_open_weights === "boolean" ? meta.is_open_weights : isOpenWeights(org, familyKey),
      release_date: m.release_date || null,
      deprecated: meta.deprecated === true,
      aa_model_id: m.id || null,
      aa_metadata: {
        is_reasoning: typeof meta.is_reasoning === "boolean" ? meta.is_reasoning : null,
        commercial_allowed: typeof meta.commercial_allowed === "boolean" ? meta.commercial_allowed : null,
        license_name: meta.license_name || null,
        license_url: meta.license_url || null,
        huggingface_url: huggingfaceUrl,
        source_huggingface_url: hfCorrection ? (meta.huggingface_url || null) : undefined,
        metadata_correction: hfCorrection?.reason,
        openrouter_api_id: meta.openrouter_api_id || null,
        context_window_tokens: num(meta.context_window_tokens),
      },
      benchmarks: {
        aa_intelligence_index: num(ev.artificial_analysis_intelligence_index),
        aa_coding_index: num(ev.artificial_analysis_coding_index),
        aa_math_index: num(ev.artificial_analysis_math_index),
        aa_livecodebench: num(ev.livecodebench),
        aa_scicode: num(ev.scicode),
        aa_terminalbench_hard: num(ev.terminalbench_hard),
        aa_tau2: num(ev.tau2),
        aa_gpqa: num(ev.gpqa),
        aa_mmlu_pro: num(ev.mmlu_pro),
      },
      aa_reference_price: {
        input_per_1m: num(pr.price_1m_input_tokens),
        output_per_1m: num(pr.price_1m_output_tokens),
        blended_3to1: num(pr.price_1m_blended_3_to_1),
      },
      aa_speed: { output_tps: num(m.median_output_tokens_per_second), ttft_s: num(m.median_time_to_first_token_seconds) },
      offers: [],
      designarena: {},
      copilot: null,
    });
    if (meta.openrouter_api_id) {
      const orId = stableOpenRouterId(meta.openrouter_api_id);
      if (!aaOrCandidates.has(orId)) aaOrCandidates.set(orId, new Set());
      aaOrCandidates.get(orId).add(familyKey);
    }
    if (huggingfaceUrl) {
      const hfId = stableHuggingFaceId(huggingfaceUrl);
      if (!aaHfCandidates.has(hfId)) aaHfCandidates.set(hfId, new Set());
      aaHfCandidates.get(hfId).add(familyKey);
    }
  }

  // Use an AA → OpenRouter join only when all AA rows agree on one product
  // identity. Known upstream ambiguities (for example GPT-5.2 vs Codex and
  // dated Mistral Large releases sharing one id) fall back to OpenRouter's own
  // canonical id rather than contaminating either family.
  const aaOrFamily = new Map();
  const ambiguousAaOrIds = [];
  for (const [orId, keys] of aaOrCandidates) {
    if (keys.size === 1) aaOrFamily.set(orId, [...keys][0]);
    else ambiguousAaOrIds.push({ orId, families: [...keys].sort() });
  }
  const aaHfFamily = new Map();
  const ambiguousAaHfIds = [];
  for (const [hfId, keys] of aaHfCandidates) {
    if (keys.size === 1) aaHfFamily.set(hfId, [...keys][0]);
    else ambiguousAaHfIds.push({ hfId, families: [...keys].sort() });
  }

  // --- DesignArena: preserve each exact board/model identity for later attach ---
  const designArenaByFamily = new Map();
  const designArenaAliases = {
    "claude-opus-4.5-20251101": "claude-opus-4.5",
    "claude-sonnet-4.5-20250929": "claude-sonnet-4.5",
  };
  for (const [board, payload] of Object.entries(da.leaderboards)) {
    for (const row of payload.data) {
      const normalized = normalizeFamily(row.modelId).familyKey;
      const familyKey = designArenaAliases[normalized] || normalized;
      family(familyKey, guessOrg(familyKey));
      if (!designArenaByFamily.has(familyKey)) designArenaByFamily.set(familyKey, {});
      const entries = designArenaByFamily.get(familyKey);
      // Keep the highest-battle entry if a board happens to publish aliases.
      const prev = entries[board];
      if (!prev || (row.battles || 0) > (prev.battles || 0)) {
        entries[board] = { elo: num(row.elo), winRate: num(row.winRate), battles: num(row.battles), modelId: row.modelId };
      }
    }
  }

  // --- OpenRouter: per-provider token offers ---
  const orIdsByFamily = new Map();
  const openRouterRoutes = [];
  for (const m of or.models) {
    const outputs = m.architecture?.output_modalities || [];
    // This is a language-model comparison: multimodal INPUT is fine, but image,
    // audio or video OUTPUT products are separate products and are excluded.
    if (!outputs.includes("text") || outputs.some((mode) => mode !== "text")) continue;
    if (EXCLUDE_RE.test(m.id) || EXCLUDE_RE.test(m.name || "") || AMBIGUOUS_MODEL_RE.test(m.id)) continue;
    if (m.expiration_date && String(m.expiration_date) < String(or.collected_at)) continue;

    const stableOrId = stableOpenRouterId(m.id);
    const stableCanonicalSlug = stableOpenRouterId(m.canonical_slug);
    const own = normalizeFamily(m.id, openRouterOrg(m));
    // A matching repository is a stronger permanent identity than an old AA
    // OpenRouter alias (notably Gemma 3n preview vs final).
    const hfMappedFamily = aaHfFamily.get(stableHuggingFaceId(m.hugging_face_id));
    const mappedFamily = hfMappedFamily || aaOrFamily.get(stableOrId) || aaOrFamily.get(stableCanonicalSlug);
    const familyKey = mappedFamily || own.familyKey;
    const org = mappedFamily ? [...models.values()].find((row) => row.family_key === familyKey)?.org || own.org : own.org;
    const pricedEndpoints = (m.endpoints || []).filter((e) => num(e.pricing?.prompt) != null || num(e.pricing?.completion) != null);
    if (!pricedEndpoints.length) continue;

    const hasPublishedWeights = typeof m.hugging_face_id === "string" && m.hugging_face_id.trim().length > 0;
    const fam = family(familyKey, org, { openWeights: hasPublishedWeights });
    fam.contextWindowTokens = Math.max(fam.contextWindowTokens || 0, num(m.context_length) || 0) || null;
    if (!fam.openrouterModelIds) fam.openrouterModelIds = new Set();
    fam.openrouterModelIds.add(m.id);
    if (!orIdsByFamily.has(familyKey)) orIdsByFamily.set(familyKey, new Set());
    orIdsByFamily.get(familyKey).add(stableOrId);
    openRouterRoutes.push({
      familyKey, id: m.id, canonicalSlug: m.canonical_slug || null,
      name: m.name || familyDisplay(familyKey), org,
      openWeights: hasPublishedWeights,
      huggingFaceId: m.hugging_face_id || null,
      contextLength: num(m.context_length),
    });

    for (const e of pricedEndpoints) {
      const inP = num(e.pricing?.prompt);
      const outP = num(e.pricing?.completion);
      const tag = String(e.tag || "");
      const euRoute = /(?:^|\/)(?:eu(?:rope)?|eu-[a-z0-9-]+|europe(?:-[a-z0-9-]+)?|swedencentral)(?:\/|$)/i.test(tag);
      fam.offers.push({
        source: "OpenRouter",
        provider: e.provider_name || "Unknown",
        platform: "OpenRouter",
        input_per_1m: inP != null ? inP * 1e6 : null,
        output_per_1m: outP != null ? outP * 1e6 : null,
        cache_read_per_1m: num(e.pricing?.input_cache_read) != null ? num(e.pricing.input_cache_read) * 1e6 : null,
        cache_write_per_1m: num(e.pricing?.input_cache_write) != null ? num(e.pricing.input_cache_write) * 1e6 : null,
        internal_reasoning_per_1m: num(e.pricing?.internal_reasoning) != null ? num(e.pricing.internal_reasoning) * 1e6 : null,
        region: euRoute ? "eu" : "global",
        unit: "per_1m_token",
        or_model_id: m.id,
        or_canonical_slug: m.canonical_slug || null,
        or_hugging_face_id: m.hugging_face_id || null,
        endpoint_tag: e.tag || null,
        quantization: e.quantization || null,
        context_length: num(e.context_length) ?? num(m.context_length),
        max_completion_tokens: num(e.max_completion_tokens),
        status: e.status ?? null,
        eu_hosted: euRoute || undefined,
        tee: TEE_OR_PROVIDERS.has(e.provider_name) || undefined,
      });
    }
  }

  // --- AWS Bedrock ---
  for (const m of aws.models || []) {
    const { familyKey } = normalizeCatalogFamily(m, "AWS Bedrock");
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "AWS Bedrock", provider: "AWS Bedrock", platform: "AWS Bedrock",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "eu-central-1", unit: "per_1m_token", notes: m.notes || "",
      pricing_tier: pricingTier(m.model_name), route_type: routeType(m.model_name),
      eu_hosted: typeof m.eu_hosted === "boolean" ? m.eu_hosted : undefined,
    });
  }

  // --- Azure AI Foundry ---
  for (const m of azure.models || []) {
    if (AMBIGUOUS_MODEL_RE.test(m.model_name || "")) continue;
    const { familyKey } = normalizeCatalogFamily(m, "Azure AI Foundry");
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "Azure AI Foundry", provider: "Azure AI Foundry", platform: "Azure AI Foundry",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "swedencentral", unit: "per_1m_token", notes: m.notes || "",
      pricing_tier: pricingTier(m.model_name), route_type: routeType(m.model_name),
      eu_hosted: typeof m.eu_hosted === "boolean" ? m.eu_hosted : undefined,
    });
  }

  // --- Google Vertex AI ---
  for (const m of vertex.models || []) {
    const { familyKey } = normalizeCatalogFamily(m, "Google Vertex AI");
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "Google Vertex AI", provider: "Google Vertex AI", platform: "Google Vertex AI",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "europe-west4", unit: "per_1m_token", notes: m.notes || "",
      pricing_tier: pricingTier(m.model_name), route_type: routeType(m.model_name),
      eu_hosted: typeof m.eu_hosted === "boolean" ? m.eu_hosted : undefined,
    });
  }

  // --- Direct serverless / managed catalogs ---
  for (const [plat, src] of [
    ["Nebius", nebius], ["Inceptron", inceptron], ["Scaleway", scaleway],
    ["IONOS", ionos], ["Mistral", mistral], ["TensorX", tensorx],
    ["OVHcloud", ovhcloud], ["STACKIT", stackit], ["T-Systems LLM Hub", tSystems],
  ]) {
    for (const m of src.models || []) {
      const { familyKey, catalogIdentity } = normalizeCatalogFamily(m, plat);
      const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
      fam.offers.push({
        source: plat, provider: plat, platform: plat,
        input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
        cache_read_per_1m: num(m.cache_read_per_1m_usd), cache_write_per_1m: num(m.cache_write_per_1m_usd),
        input_per_1m_eur: num(m.input_per_1m_eur), output_per_1m_eur: num(m.output_per_1m_eur),
        currency: m.currency || src.currency || ((m.input_per_1m_eur != null || m.output_per_1m_eur != null) ? "EUR" : "USD"),
        region: m.region || "eu", unit: "per_1m_token", notes: m.notes || "",
        provider_model_id: m.model_id || (catalogIdentity !== m.model_name ? catalogIdentity : null),
        context_length: num(m.context_length),
        catalog_status: m.status || null,
        hosting_class: m.hosting_class || null,
        pricing_tier: pricingTier(m.model_name), route_type: routeType(m.model_name),
        eu_hosted: typeof m.eu_hosted === "boolean" ? m.eu_hosted : undefined,
      });
    }
  }

  // --- Chutes (first-party, all confidential-compute / TEE) ---
  for (const m of chutes.models || []) {
    const { familyKey } = normalizeCatalogFamily(m, "Chutes");
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "Chutes", provider: "Chutes", platform: "Chutes",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      cache_read_per_1m: num(m.cache_read_per_1m_usd), cache_write_per_1m: num(m.cache_write_per_1m_usd),
      region: m.region || "global", unit: "per_1m_token",
      tee: m.confidential_compute === true, notes: m.notes || "",
      provider_model_id: m.tee_model_id || null,
      context_length: num(m.context_length),
      eu_hosted: typeof m.eu_hosted === "boolean" ? m.eu_hosted : undefined,
    });
  }

  // --- Anthropic direct / Claude Code (token list price) ---
  for (const m of claude.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, "Anthropic");
    const fam = family(familyKey, "Anthropic");
    fam.offers.push({
      source: "Anthropic API / Claude Code", provider: "Anthropic", platform: "Anthropic",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      cache_read_per_1m: num(m.cache_read_per_1m_usd), cache_write_per_1m: num(m.cache_write_per_1m_usd),
      region: "global", unit: "per_1m_token", notes: m.notes || "",
    });
  }

  // --- GitHub Copilot current AI-Credit/token billing (separate product axis) ---
  for (const m of copilot.current_models || []) {
    // "fast mode" / "preview" describe the Copilot feature tier, not a
    // different underlying model product.
    const copilotProductName = String(m.model_name).replace(/\((?:fast mode|preview)\)/gi, " ");
    const { familyKey } = normalizeFamily(copilotProductName, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    const mode = /fast mode/i.test(m.model_name) ? "fast_mode" : "current";
    fam.copilot = {
      ...(fam.copilot || { multiplier: null, usd_per_request: null }),
      [mode]: {
        input_per_1m: num(m.input_per_1m_usd),
        cached_input_per_1m: num(m.cached_input_per_1m_usd),
        cache_write_per_1m: num(m.cache_write_per_1m_usd),
        output_per_1m: num(m.output_per_1m_usd),
        release_status: m.release_status || undefined,
        feature_status: m.feature_status || undefined,
        category: m.category || undefined,
        long_context: m.long_context || null,
        promotion_ends_at: m.promotion_ends_at || null,
        standard_pricing_from: m.standard_pricing_from || null,
        standard_input_per_1m: num(m.standard_input_per_1m_usd),
        standard_cached_input_per_1m: num(m.standard_cached_input_per_1m_usd),
        standard_cache_write_per_1m: num(m.standard_cache_write_per_1m_usd),
        standard_output_per_1m: num(m.standard_output_per_1m_usd),
        notes: m.notes || "",
      },
    };
  }

  // Legacy annual Pro/Pro+ premium-request billing — separate from current token billing.
  for (const m of copilot.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.copilot = {
      ...(fam.copilot || {}),
      multiplier: num(m.premium_request_multiplier),
      usd_per_request: num(m.effective_usd_per_request),
      notes: m.notes || "",
    };
  }

  // --- Manual supplements (required models missing from live APIs) ---
  let benchmarkOverrides = [];
  try {
    const manual = await readJSON("manual.json");
    benchmarkOverrides = manual.benchmark_overrides || [];
    for (const m of manual.models || []) {
      const key = canonFamily(m.family_key);
      const fam = family(key, m.org || guessOrg(key));
      if (m.family_name) fam.familyName = m.family_name;
      const rowId = `${key}::default`;
      if (![...models.values()].some((r) => r.family_key === key)) {
        models.set(rowId, {
          id: rowId, family_key: key, family_name: fam.familyName, display_name: m.family_name || fam.familyName,
          org: m.org || fam.org, variant: "default", open_weights: m.open_weights ?? isOpenWeights(fam.org, key),
          release_date: m.release_date || null, benchmarks: {}, aa_reference_price: {}, aa_speed: {},
          offers: [], designarena: {}, copilot: null, manual_notes: m.notes || "",
        });
      }
    }
    for (const o of manual.offers || []) {
      const fam = family(canonFamily(o.family_key), guessOrg(o.family_key));
      fam.offers.push({ ...o, family_key: undefined });
    }
  } catch { /* no manual file */ }

  // AA Coding Agent Index: preserve every published harness result for the exact
  // product+effort identity. The displayed summary is the median across harnesses;
  // taking the maximum rewarded models merely for having more submitted harnesses.
  const agentResults = new Map();
  for (const r of codingAgents.rows || []) {
    const sc = num(r.score);
    if (sc == null) continue;
    const normalizedAgent = normalizeFamily(r.model_name);
    const codingAgentFamilyAliases = {
      // AA labels the Fable harness run by its documented Opus fallback path;
      // it is still the Claude Fable 5 max product/configuration.
      "fable-5-with-fallback": "claude-fable-5",
    };
    const familyKey = codingAgentFamilyAliases[normalizedAgent.familyKey] || normalizedAgent.familyKey;
    const org = normalizedAgent.org;
    // AA calls the no-reasoning GPT-5.6 setting "none" in the Coding-Agent feed.
    const variant = /\(\s*none\s*\)/i.test(r.model_name) ? "non-reasoning" : detectVariant(r.model_name);
    const modelId = `${familyKey}::${variant}`;
    const fam = family(familyKey, org);
    if (!models.has(modelId)) {
      models.set(modelId, emptyModel({ familyKey, fam, id: modelId, displayName: r.model_name, variant }));
    }
    if (!agentResults.has(modelId)) agentResults.set(modelId, []);
    agentResults.get(modelId).push({
      harness: r.harness || "Unknown",
      score: Math.round(sc * 1000) / 10,
      source_model_name: r.model_name,
    });
  }
  const medianToTenth = (values) => {
    const sorted = values.map((value) => Math.round(value * 10)).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const tenths = sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    return tenths / 10;
  };
  for (const [modelId, results] of agentResults) {
    const row = models.get(modelId);
    row.coding_agent_results = results;
    row.benchmarks.aa_coding_agent_index = medianToTenth(results.map((result) => result.score));
  }

  const routeAliases = (route) => new Set([
    stableOpenRouterId(route.id), stableOpenRouterId(route.canonicalSlug),
  ].filter(Boolean));
  const sourceAliasesForRow = (row) => new Set([
    stableOpenRouterId(row.aa_metadata?.openrouter_api_id),
    stableOpenRouterId(row.openrouter_metadata?.id),
    stableOpenRouterId(row.openrouter_metadata?.canonical_slug),
  ].filter(Boolean));
  const huggingFaceForRow = (row) => stableHuggingFaceId(
    row.aa_metadata?.huggingface_url || row.openrouter_metadata?.hugging_face_id,
  );
  const aliasesOverlap = (a, b) => [...a].some((value) => b.has(value));

  // Every current OpenRouter SKU must remain reachable. If AA points only at a
  // preview/old alias while OpenRouter also publishes a newer stable SKU, create
  // a separate catalog row rather than silently dropping or merging that route.
  const representedRoutes = new Set();
  for (const route of openRouterRoutes) {
    const aliases = routeAliases(route);
    const routeKey = [...aliases].sort().join("|");
    if (representedRoutes.has(routeKey)) continue;
    representedRoutes.add(routeKey);
    const fam = families.get(route.familyKey) || family(route.familyKey, route.org, { openWeights: route.openWeights });
    const rows = [...models.values()].filter((row) => row.family_key === route.familyKey);
    const routeHf = stableHuggingFaceId(route.huggingFaceId);
    const exact = rows.some((row) => aliasesOverlap(aliases, sourceAliasesForRow(row))
      || (routeHf && huggingFaceForRow(row) === routeHf));
    const generic = rows.some((row) => !row.aa_model_id && !row.openrouter_metadata);
    if (exact || generic || rows.length === 0) continue;
    let suffix = "openrouter";
    let serial = 2;
    while (models.has(`${route.familyKey}::${suffix}`)) suffix = `openrouter-${serial++}`;
    const row = emptyModel({
      familyKey: route.familyKey, fam, id: `${route.familyKey}::${suffix}`,
      displayName: route.name, variant: suffix, openWeights: route.openWeights,
    });
    row.openrouter_metadata = {
      id: route.id, canonical_slug: route.canonicalSlug,
      hugging_face_id: route.huggingFaceId,
      context_window_tokens: route.contextLength,
    };
    models.set(row.id, row);
  }

  // Ensure every catalog family has a model row, then attach only data that is
  // genuinely family-wide (offers and product billing). Model-configuration
  // benchmarks are attached separately below.
  const blendOf = (o) => (o.input_per_1m != null && o.output_per_1m != null)
    ? (10 * o.input_per_1m + o.output_per_1m) / 11
    : (o.input_per_1m ?? o.output_per_1m ?? Infinity);
  const endpointHealth = (offer) => {
    if (offer.platform !== "OpenRouter") return 0;
    if (offer.status === 0) return 0;
    if (offer.status === -2) return 1;
    if (offer.status === -5) return 2;
    if (offer.status == null) return 3;
    return 4;
  };
  for (const [key, fam] of families) {
    let rows = [...models.values()].filter((row) => row.family_key === key);
    if (!rows.length) {
      const row = emptyModel({ familyKey: key, fam });
      models.set(row.id, row);
      rows = [row];
    }
    const bestByProviderScope = new Map();
    for (const offer of fam.offers) {
      const meta = (providerMeta.providers || {})[offer.provider] || {};
      offer.eu_hosted = offerRunsInEu(offer, meta);
      offer.non_us = !!meta.non_us;
      // Keep separate OpenRouter model SKUs until attaching to an exact AA row;
      // e.g. Qwen Instruct and Thinking have different prices under one family.
      const route = offer.or_model_id ? `::or=${stableOpenRouterId(offer.or_model_id)}` : "";
      const sku = [offer.endpoint_tag, offer.pricing_tier, offer.route_type].filter(Boolean).join("/");
      const scope = `${offer.platform}::${offer.provider}::eu=${offer.eu_hosted ? 1 : 0}::tee=${offer.tee ? 1 : 0}${route}::sku=${sku}`;
      const previous = bestByProviderScope.get(scope);
      if (!previous || endpointHealth(offer) < endpointHealth(previous)
          || (endpointHealth(offer) === endpointHealth(previous) && blendOf(offer) < blendOf(previous))) {
        bestByProviderScope.set(scope, offer);
      }
    }
    fam.offers = [...bestByProviderScope.values()];
    for (const row of rows) {
      row.family_name = fam.familyName;
      if (row.org === "Other" && fam.org !== "Other") row.org = fam.org;
      const exactOrAliases = sourceAliasesForRow(row);
      const exactHf = huggingFaceForRow(row);
      const directOffers = fam.offers.filter((offer) => !offer.or_model_id);
      const exactOrOffers = exactOrAliases.size
        ? fam.offers.filter((offer) => offer.or_model_id && aliasesOverlap(exactOrAliases, new Set([
          stableOpenRouterId(offer.or_model_id), stableOpenRouterId(offer.or_canonical_slug),
        ].filter(Boolean))))
        : [];
      const exactHfOffers = exactHf
        ? fam.offers.filter((offer) => offer.or_model_id && stableHuggingFaceId(offer.or_hugging_face_id) === exactHf)
        : [];
      const selectedRouterOffers = exactOrOffers.length
        ? exactOrOffers
        : exactHfOffers.length
          ? exactHfOffers
          : (exactOrAliases.size || exactHf) ? [] : fam.offers.filter((offer) => offer.or_model_id);
      row.offers = [...directOffers, ...selectedRouterOffers];
      row.copilot = fam.copilot;
    }
  }

  // DesignArena publishes one exact result per board/model id, not a family-wide
  // result for every AA effort setting. A multi-variant family therefore gets a
  // dedicated DesignArena row instead of fictitious clones on all siblings.
  for (const [familyKey, entries] of designArenaByFamily) {
    const fam = families.get(familyKey) || family(familyKey, guessOrg(familyKey));
    const rows = [...models.values()].filter((row) => row.family_key === familyKey);
    let target = rows.length === 1 && rows[0].variant === "default"
      ? rows[0]
      : models.get(`${familyKey}::designarena`);
    if (!target) {
      target = emptyModel({
        familyKey, fam, id: `${familyKey}::designarena`,
        displayName: Object.values(entries)[0]?.modelId || fam.familyName,
        variant: "designarena",
      });
      target.offers = fam.offers;
      target.copilot = fam.copilot;
      models.set(target.id, target);
    }
    target.designarena = entries;
  }

  let modelRows = [...models.values()];
  // Apply documented benchmark overrides (e.g. suppress a corrupt AA value).
  for (const ov of benchmarkOverrides) {
    for (const r of modelRows) {
      if (r.family_key !== canonFamily(ov.family_key)) continue;
      if (ov.variant && r.variant !== ov.variant) continue;
      if (r.benchmarks && ov.field in r.benchmarks) { r.benchmarks[ov.field] = ov.value ?? null; r.benchmark_override_note = ov.reason; }
    }
  }
  // Remove normalization ghosts only when no source contributes any observable
  // benchmark, catalog offer or product-billing datum.
  for (const row of modelRows) {
    const hasScore = Object.values(row.benchmarks || {}).some((value) => value != null);
    const hasDesign = Object.keys(row.designarena || {}).length > 0;
    if (!row.aa_model_id && !row.coding_agent_results?.length
        && !hasScore && !hasDesign && !row.offers.length && !row.copilot) models.delete(row.id);
  }
  modelRows = [...models.values()];
  for (const r of modelRows) {
    r.org = canonOrg(r.org);
    r.featured = FEATURED_RE.test(r.family_key);
    const b = r.benchmarks || {};
    r.has_benchmark = b.aa_coding_index != null || b.aa_intelligence_index != null || b.aa_coding_agent_index != null ||
      (r.designarena && (r.designarena.frontend || r.designarena.fullstack));
    r.has_pricing = r.offers.some((o) => o.input_per_1m != null || o.output_per_1m != null || o.input_per_1m_eur != null || o.output_per_1m_eur != null);
  }

  const attachedAgentResults = modelRows.reduce((sum, row) => sum + (row.coding_agent_results?.length || 0), 0);
  const expectedAgentResults = (codingAgents.rows || []).filter((row) => num(row.score) != null).length;
  if (attachedAgentResults !== expectedAgentResults) {
    throw new Error(`Coding Agent result loss: expected ${expectedAgentResults}, attached ${attachedAgentResults}`);
  }
  if (modelRows.filter((row) => row.aa_model_id).length !== aa.models.length) {
    throw new Error(`Artificial Analysis row loss: expected ${aa.models.length}`);
  }

  // distinct providers / platforms summary
  const providerStats = new Map();
  for (const r of modelRows) {
    for (const o of r.offers) {
      const k = `${o.platform}::${o.provider}`;
      if (!providerStats.has(k)) providerStats.set(k, { platform: o.platform, provider: o.provider, model_count: new Set() });
      providerStats.get(k).model_count.add(r.family_key);
    }
  }
  const pmeta = providerMeta.providers || {};
  const metaFor = (name) => pmeta[name] || {};
  const providers = [...providerStats.values()].map((p) => {
    const m = metaFor(p.provider);
    return {
      platform: p.platform, provider: p.provider, model_count: p.model_count.size,
      eu_hosted: !!m.eu_hosted, non_us: !!m.non_us, eu_dedicated: !!m.eu_dedicated, hyperscaler: !!m.hyperscaler, country: m.country || null, note: m.note || "",
    };
  }).sort((a, b) => b.model_count - a.model_count);
  const missingProviderMeta = providers.filter((provider) => !pmeta[provider.provider]).map((provider) => provider.provider);
  if (missingProviderMeta.length) {
    throw new Error(`Missing provider metadata: ${missingProviderMeta.sort().join(", ")}`);
  }
  // Surface providers from the metadata that have no priced offers yet (e.g. TrustedRouter, still launching).
  for (const [name, m] of Object.entries(pmeta)) {
    if (!m.coming_soon) continue;
    if (providers.some((p) => p.provider === name)) continue;
    providers.push({ platform: name, provider: name, model_count: 0, eu_hosted: !!m.eu_hosted, non_us: !!m.non_us, eu_dedicated: !!m.eu_dedicated, hyperscaler: !!m.hyperscaler, country: m.country || null, note: m.note || "", coming_soon: true });
  }

  const dataset = {
    generated_at: new Date().toISOString(),
    counts: { models: modelRows.length, families: new Set(modelRows.map((row) => row.family_key)).size, providers: providers.length,
              offers: modelRows.reduce((s, r) => s + r.offers.length, 0) },
    sources: {
      openrouter: or.collected_at, artificialanalysis: aa.collected_at, designarena: da.collected_at,
      aws_bedrock: aws.collected_at, azure_foundry: azure.collected_at,
      google_vertex: vertex.collected_at, nebius: nebius.collected_at, inceptron: inceptron.collected_at,
      scaleway: scaleway.collected_at, ionos: ionos.collected_at, mistral: mistral.collected_at, tensorx: tensorx.collected_at,
      chutes: chutes.collected_at, ovhcloud: ovhcloud.collected_at, stackit: stackit.collected_at,
      t_systems_llm_hub: tSystems.collected_at,
      aa_coding_agents: codingAgents.collected_at, github_copilot: copilot.collected_at, claude_code: claude.collected_at,
      provider_meta: providerMeta.collected_at,
    },
    build_diagnostics: {
      artificialanalysis_rows_input: aa.models.length,
      artificialanalysis_rows_output: modelRows.filter((row) => row.aa_model_id).length,
      artificialanalysis_openrouter_ambiguous_ids: ambiguousAaOrIds,
      artificialanalysis_huggingface_ambiguous_ids: ambiguousAaHfIds,
      openrouter_source_models: or.models.length,
      openrouter_ids_by_merged_family: [...orIdsByFamily.entries()]
        .filter(([, ids]) => ids.size > 1)
        .map(([family_key, ids]) => ({ family_key, source_ids: [...ids].sort() })),
      coding_agent_results_input: expectedAgentResults,
      coding_agent_results_output: attachedAgentResults,
    },
    models: modelRows,
    providers,
  };
  await writeFile(OUT, JSON.stringify(dataset, null, 2));
  console.log("✓ dataset.json", dataset.counts);
}

build().catch((e) => { console.error(e); process.exit(1); });
