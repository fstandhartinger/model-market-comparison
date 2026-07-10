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
const VENDOR_PREFIXES = ["anthropic/", "openai/", "z-ai/", "moonshotai/", "minimax/", "xiaomi/", "deepseek/", "google/", "meta-llama/", "mistralai/", "qwen/", "x-ai/", "cohere/", "nvidia/", "amazon/", "writer/"];

function stripVendor(s) {
  let x = s.trim().replace(/^~/, "");
  const low = x.toLowerCase();
  for (const p of VENDOR_PREFIXES) if (low.startsWith(p)) { x = x.slice(p.length); break; }
  return x;
}

// Reasoning / effort variant detection.
function detectVariant(raw) {
  const s = raw.toLowerCase();
  const tests = [
    [/non[- ]?reasoning/, "non-reasoning"],
    [/x ?high|xhigh/, "xhigh"],
    [/max effort|max\b/, "max"],
    [/high effort|high\b/, "high"],
    [/medium\b/, "medium"],
    [/minimal\b/, "minimal"],
    [/\blow\b/, "low"],
    [/adaptive/, "adaptive"],
    [/thinking/, "thinking"],
    [/\breasoning\b/, "reasoning"],
  ];
  for (const [re, label] of tests) if (re.test(s)) return label;
  return "default";
}

// Reduce a raw model label to a canonical family key + display name + org.
function normalizeFamily(rawName, orgHint) {
  let x = stripVendor(rawName);
  // capture & remove parenthetical
  x = x.replace(/\([^)]*\)/g, " ");
  // remove date stamps and noisy suffixes
  x = x.replace(/\b20\d{6}\b/g, " ")
       .replace(/-?\b\d{4}\b(?=\s|$|-)/g, (m) => (/^-?(0[1-9]|1[0-2])/.test(m) ? " " : " ")) // drop bare 4-digit dates/codes
       .replace(/\b(fast|latest|preview|instruct|chat|turbo-preview)\b/gi, " ")
       .replace(/\bthinking\b/gi, " ")
       .replace(/\b(non[- ]?reasoning|reasoning|adaptive|max effort|high effort|low effort|xhigh|x high|minimal|medium|high|low)\b/gi, " ")
       .replace(/\bmay 20\d\d\b/gi, " ");
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
  return { familyKey, org: orgHint || guessOrg(familyKey) };
}

// Families that should be merged into a canonical key (alias -> canonical).
const FAMILY_ALIASES = {
  "claude-fable": "claude-fable-5",
  "claude-opus": "claude-opus-4.8",
  "claude-sonnet": "claude-sonnet-4.6",
  // AA's Coding Agent Index drops the "Claude" prefix (e.g. "Opus 4.8", "Sonnet 4.6").
  "opus-4.8": "claude-opus-4.8", "opus-4.7": "claude-opus-4.7", "opus-4.6": "claude-opus-4.6", "opus-4.5": "claude-opus-4.5",
  "sonnet-5": "claude-sonnet-5", "sonnet-4.6": "claude-sonnet-4.6", "sonnet-4.5": "claude-sonnet-4.5",
  "fable-5": "claude-fable-5", "haiku-4.5": "claude-haiku-4.5",
};
const canonFamily = (k) => FAMILY_ALIASES[k] || k;

// Providers ingested as their own first-party platform; their OpenRouter-routed
// duplicate is dropped so each appears once in the provider list/filter.
const DIRECT_PLATFORM_PROVIDERS = new Set(["Nebius", "Inceptron", "Chutes", "Scaleway", "IONOS", "Mistral", "TensorX"]);

// OpenRouter-routed providers that genuinely run inference inside a hardware TEE
// (confidential compute). Their offers are flagged tee:true so the "TEE only" filter
// surfaces them alongside Chutes' first-party TEE listing.
const TEE_OR_PROVIDERS = new Set(["Phala", "Venice"]);

// Non-text / non-LLM modalities to exclude from the comparison.
const EXCLUDE_RE = /(image|vision-only|\bvideo\b|sora|dall|whisper|\btts\b|speech|audio|embed|rerank|moderation|ocr|guard)/i;

// The models the product brief explicitly asks us to feature.
const FEATURED_RE = /^(gpt-5\.[45]|gpt-5\.6-(sol|terra|luna)(?!-pro)|claude-opus-4\.[678]|claude-sonnet-(4\.6|5)|claude-fable-5|kimi-k2\.[567]|glm-5\.[12]|minimax-(m2\.5|m2\.7|m3)|mimo-v2\.5-pro|deepseek-v4-pro)/;

// Canonicalize vendor names that arrive spelled differently across sources.
const ORG_ALIASES = {
  "Z AI": "Z.ai", "ZAI": "Z.ai", "Zhipu": "Z.ai", "Zhipu AI": "Z.ai",
  "Kimi": "Moonshot AI", "Moonshot": "Moonshot AI",
  "Meta Llama": "Meta", "Meta-Llama": "Meta",
  "Alibaba Cloud": "Alibaba", "Qwen": "Alibaba",
  "MistralAI": "Mistral", "Mistral AI": "Mistral",
  "xAI (Grok)": "xAI", "X AI": "xAI",
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
  if (key.startsWith("llama")) return "Meta";
  if (key.startsWith("mistral") || key.includes("magistral") || key.includes("ministral") || key.includes("pixtral") || key.includes("devstral")) return "Mistral";
  if (key.startsWith("qwen")) return "Alibaba";
  if (key.startsWith("nova") || key.startsWith("titan")) return "Amazon";
  if (key.startsWith("command")) return "Cohere";
  if (key.startsWith("phi")) return "Microsoft";
  return "Other";
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
const CLOSED_ORGS = new Set(["Anthropic", "OpenAI", "Google", "xAI"]);
const isOpenWeights = (org, key) => {
  if (key.includes("gpt-oss") || key.includes("gemma")) return true;
  return !CLOSED_ORGS.has(org);
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const models = new Map(); // rowId -> model row
const families = new Map(); // familyKey -> { offers:[], designarena:{}, copilot:null, meta }

function family(key, org) {
  if (!families.has(key)) families.set(key, { familyKey: key, familyName: familyDisplay(key), org, offers: [], designarena: {}, copilot: null });
  return families.get(key);
}

function num(x) {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
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
  const providerMeta = await readJSON("provider-meta.json").catch(() => ({ providers: {} }));
  const codingAgents = await readJSON("aa-coding-agents.json").catch(() => ({ rows: [] }));
  const copilot = await readJSON("github-copilot.json");
  const claude = await readJSON("claude-code.json");

  // --- ArtificialAnalysis: benchmark + reference pricing, per variant row ---
  for (const m of aa.models) {
    const { familyKey, org } = normalizeFamily(m.name, m.model_creator?.name);
    const variant = detectVariant(m.name);
    const rowId = `${familyKey}::${variant}`;
    const ev = m.evaluations || {};
    const pr = m.pricing || {};
    const fam = family(familyKey, org);
    models.set(rowId, {
      id: rowId,
      family_key: familyKey,
      family_name: fam.familyName,
      display_name: m.name,
      org,
      variant,
      open_weights: isOpenWeights(org, familyKey),
      release_date: m.release_date || null,
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
  }

  // --- DesignArena: elo per family (both leaderboards) ---
  for (const [board, payload] of Object.entries(da.leaderboards)) {
    for (const row of payload.data) {
      const { familyKey } = normalizeFamily(row.modelId);
      const fam = family(familyKey, guessOrg(familyKey));
      // keep the highest-battle entry per family/board
      const prev = fam.designarena[board];
      if (!prev || (row.battles || 0) > (prev.battles || 0)) {
        fam.designarena[board] = { elo: num(row.elo), winRate: num(row.winRate), battles: num(row.battles), modelId: row.modelId };
      }
    }
  }

  // --- OpenRouter: per-provider token offers ---
  for (const m of or.models) {
    if (EXCLUDE_RE.test(m.id) || EXCLUDE_RE.test(m.name || "")) continue;
    const { familyKey, org } = normalizeFamily(m.id);
    const fam = family(familyKey, org);
    for (const e of m.endpoints || []) {
      // Providers we already ingest as their own first-party platform (with EU region
      // info) — skip their OpenRouter-routed duplicate so they appear only once.
      if (DIRECT_PLATFORM_PROVIDERS.has(e.provider_name)) continue;
      const inP = num(e.pricing?.prompt);
      const outP = num(e.pricing?.completion);
      if (inP == null && outP == null) continue;
      fam.offers.push({
        source: "OpenRouter",
        provider: e.provider_name || "Unknown",
        platform: "OpenRouter",
        input_per_1m: inP != null ? inP * 1e6 : null,
        output_per_1m: outP != null ? outP * 1e6 : null,
        region: "global",
        unit: "per_1m_token",
        or_model_id: m.id,
        status: e.status ?? null,
        tee: TEE_OR_PROVIDERS.has(e.provider_name) || undefined,
      });
    }
  }

  // --- AWS Bedrock ---
  for (const m of aws.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "AWS Bedrock", provider: "AWS Bedrock", platform: "AWS Bedrock",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "eu-central-1", unit: "per_1m_token", notes: m.notes || "",
    });
  }

  // --- Azure AI Foundry ---
  for (const m of azure.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "Azure AI Foundry", provider: "Azure AI Foundry", platform: "Azure AI Foundry",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "swedencentral", unit: "per_1m_token", notes: m.notes || "",
    });
  }

  // --- Google Vertex AI ---
  for (const m of vertex.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "Google Vertex AI", provider: "Google Vertex AI", platform: "Google Vertex AI",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "europe-west4", unit: "per_1m_token", notes: m.notes || "",
    });
  }

  // --- EU-native platforms: Nebius, Inceptron, Scaleway, IONOS, Mistral, TensorX ---
  for (const [plat, src] of [["Nebius", nebius], ["Inceptron", inceptron], ["Scaleway", scaleway], ["IONOS", ionos], ["Mistral", mistral], ["TensorX", tensorx]]) {
    for (const m of src.models || []) {
      const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
      const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
      fam.offers.push({
        source: plat, provider: plat, platform: plat,
        input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
        region: m.region || "eu", unit: "per_1m_token", notes: m.notes || "",
      });
    }
  }

  // --- Chutes (first-party, all confidential-compute / TEE) ---
  for (const m of chutes.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.offers.push({
      source: "Chutes", provider: "Chutes", platform: "Chutes",
      input_per_1m: num(m.input_per_1m_usd), output_per_1m: num(m.output_per_1m_usd),
      region: m.region || "global", unit: "per_1m_token",
      tee: m.confidential_compute === true, notes: m.notes || "",
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

  // --- GitHub Copilot (per-request pricing — separate axis) ---
  for (const m of copilot.models || []) {
    const { familyKey } = normalizeFamily(m.model_name, m.provider_org);
    const fam = family(familyKey, m.provider_org || guessOrg(familyKey));
    fam.copilot = {
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

  // --- Attach family-level data (offers, designarena, copilot) to each row ---
  // Ensure every family has at least one model row (create a default row if a
  // family only has pricing/benchmark-less data, e.g. open models not in AA).
  for (const [key, fam] of families) {
    const rows = [...models.values()].filter((r) => r.family_key === key);
    if (rows.length === 0) {
      const rowId = `${key}::default`;
      const row = {
        id: rowId, family_key: key, family_name: fam.familyName, display_name: fam.familyName,
        org: fam.org, variant: "default", open_weights: isOpenWeights(fam.org, key), release_date: null,
        benchmarks: {}, aa_reference_price: {}, aa_speed: {}, offers: [], designarena: {}, copilot: null,
      };
      models.set(rowId, row);
      rows.push(row);
    }
    // Collapse multiple offers from the SAME (platform, provider) to a single cheapest
    // one. A provider often lists several tiers/SKUs for one model — short vs long
    // context, Global vs DataZone-EU, or duplicate OpenRouter slugs (thinking / dated) —
    // which otherwise render as two rows with different prices for the same provider.
    // The comparison shows one price per provider: the cheapest (standard) blended rate.
    const blendOf = (o) => (o.input_per_1m != null && o.output_per_1m != null)
      ? (10 * o.input_per_1m + o.output_per_1m) / 11
      : (o.input_per_1m ?? o.output_per_1m ?? Infinity);
    const bestByProvider = new Map();
    for (const o of fam.offers) {
      const pk = `${o.platform}::${o.provider}`;
      const prev = bestByProvider.get(pk);
      if (!prev || blendOf(o) < blendOf(prev)) bestByProvider.set(pk, o);
    }
    fam.offers = [...bestByProvider.values()];
    for (const r of rows) {
      r.offers = fam.offers;
      r.designarena = fam.designarena;
      r.copilot = fam.copilot;
    }
  }

  // AA Coding Agent Index: per family, the HIGHEST score across all harnesses
  // (Claude Code / Codex / Cursor CLI / …). Scores are 0–1 → store as 0–100.
  const agentMax = new Map();
  for (const r of codingAgents.rows || []) {
    const sc = num(r.score);
    if (sc == null) continue;
    const { familyKey } = normalizeFamily(r.model_name);
    const v = sc * 100;
    if (!agentMax.has(familyKey) || v > agentMax.get(familyKey)) agentMax.set(familyKey, Math.round(v * 10) / 10);
  }

  const modelRows = [...models.values()];
  // Attach the family-level Coding Agent Index to every variant row.
  for (const r of modelRows) {
    if (agentMax.has(r.family_key)) { r.benchmarks = r.benchmarks || {}; r.benchmarks.aa_coding_agent_index = agentMax.get(r.family_key); }
  }
  // Apply documented benchmark overrides (e.g. suppress a corrupt AA value).
  for (const ov of benchmarkOverrides) {
    for (const r of modelRows) {
      if (r.family_key !== canonFamily(ov.family_key)) continue;
      if (ov.variant && r.variant !== ov.variant) continue;
      if (r.benchmarks && ov.field in r.benchmarks) { r.benchmarks[ov.field] = ov.value ?? null; r.benchmark_override_note = ov.reason; }
    }
  }
  for (const r of modelRows) {
    r.org = canonOrg(r.org);
    r.featured = FEATURED_RE.test(r.family_key);
    const b = r.benchmarks || {};
    r.has_benchmark = b.aa_coding_index != null || b.aa_intelligence_index != null || b.aa_coding_agent_index != null ||
      (r.designarena && (r.designarena.frontend || r.designarena.fullstack));
    r.has_pricing = r.offers.some((o) => o.input_per_1m != null || o.output_per_1m != null);
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
  // Surface providers from the metadata that have no priced offers yet (e.g. TrustedRouter, still launching).
  for (const [name, m] of Object.entries(pmeta)) {
    if (!m.coming_soon) continue;
    if (providers.some((p) => p.provider === name)) continue;
    providers.push({ platform: name, provider: name, model_count: 0, eu_hosted: !!m.eu_hosted, non_us: !!m.non_us, eu_dedicated: !!m.eu_dedicated, hyperscaler: !!m.hyperscaler, country: m.country || null, note: m.note || "", coming_soon: true });
  }

  const dataset = {
    generated_at: new Date().toISOString(),
    counts: { models: modelRows.length, families: families.size, providers: providers.length,
              offers: modelRows.reduce((s, r) => s + r.offers.length, 0) },
    sources: {
      openrouter: or.collected_at, artificialanalysis: aa.collected_at, designarena: da.collected_at,
      aws_bedrock: aws.collected_at, azure_foundry: azure.collected_at,
      google_vertex: vertex.collected_at, nebius: nebius.collected_at, inceptron: inceptron.collected_at,
      scaleway: scaleway.collected_at, ionos: ionos.collected_at, mistral: mistral.collected_at, tensorx: tensorx.collected_at,
      chutes: chutes.collected_at,
      aa_coding_agents: codingAgents.collected_at, github_copilot: copilot.collected_at, claude_code: claude.collected_at,
    },
    models: modelRows,
    providers,
  };
  await writeFile(OUT, JSON.stringify(dataset, null, 2));
  console.log("✓ dataset.json", dataset.counts);
}

build().catch((e) => { console.error(e); process.exit(1); });
