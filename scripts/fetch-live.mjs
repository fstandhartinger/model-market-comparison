#!/usr/bin/env node
// Fetch live data from OpenRouter, ArtificialAnalysis, and DesignArena.
// Writes raw JSON snapshots into data/raw/. These snapshots are committed so the
// app has a deterministic seed even when the upstream APIs are unreachable.
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { enrichArtificialAnalysis, MAX_METADATA_ROLLOUT_LAG } from "../lib/aa-metadata.mjs";
import { parseArtificialAnalysisMetadata } from "../lib/aa-rsc.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { refreshAaEfficiency } from "./fetch-aa-efficiency.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertApprovedIdentityCoverage, assertIdentityCoverage, assertOpenRouterEndpointCoverage, assertMeasuredFields, captureLiveSource, endpointIdentity, planOpenRouterWithdrawals } from '../lib/live-source.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW = join(__dirname, "..", "data", "raw");

const AA_KEY = process.env.ARTIFICIAL_ANALYSIS_API_KEY || process.env.ARTIF_ANALYSIS_API_KEY || "";
const UA = "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";

/** CR-20260916: a source whose access was decided reads its scope from the recorded decision. */
async function readSourcePolicy(id) {
  const policies = JSON.parse(await readFile(join(__dirname, "..", "data", "source-policies.json"), "utf8"));
  const policy = policies.policies?.[id];
  if (!policy) throw new Error(`No recorded access decision for ${id}: add one to data/source-policies.json before collecting`);
  return policy;
}

const stoppedHosts = new Set();
const stopStatuses = [401, 403, 429];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, opts = {}, tries = 3) {
  const host = new URL(url).host;
  for (let i = 0; i < tries; i++) {
    if (stoppedHosts.has(host)) throw Object.assign(new Error(`Source host stopped after access restriction: ${host}`), { status: 403 });
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
      if (!res.ok) {
        if (stopStatuses.includes(res.status)) stoppedHosts.add(host);
        if (res.status === 404 && url.endsWith('/endpoints')) await captureLiveSource(url, await res.text(), { status: 404 });
        throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { status: res.status });
      }
      const body = await res.text();
      if (/^\s*</.test(body) && /<title>just a moment|cf-chl-|g-recaptcha|hcaptcha/i.test(body.slice(0, 100000))) {
        stoppedHosts.add(host);
        throw Object.assign(new Error(`Challenge detected at ${url}`), { status: 403 });
      }
      const parsed = JSON.parse(body);
      await captureLiveSource(url, body, { method: opts.method, requestBody: opts.body ? JSON.parse(opts.body) : null });
      return parsed;
    } catch (e) {
      if ([401, 403, 404, 429].includes(e.status) || i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

async function getText(url, opts = {}, tries = 3) {
  const host = new URL(url).host;
  for (let i = 0; i < tries; i++) {
    if (stoppedHosts.has(host)) throw Object.assign(new Error(`Source host stopped after access restriction: ${host}`), { status: 403 });
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000), ...opts, headers: { "User-Agent": UA, ...(opts.headers || {}) } });
      if (!res.ok) {
        if (stopStatuses.includes(res.status)) stoppedHosts.add(host);
        throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { status: res.status });
      }
      const body = await res.text();
      if (/<title>just a moment|cf-chl-|g-recaptcha|hcaptcha/i.test(body.slice(0, 100000))) {
        stoppedHosts.add(host);
        throw Object.assign(new Error(`Challenge detected at ${url}`), { status: 403 });
      }
      await captureLiveSource(url, body);
      return body;
    } catch (e) {
      if ([401, 403, 429].includes(e.status) || i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}

async function fetchArtificialAnalysis() {
  console.log("→ ArtificialAnalysis models …");
  if (!AA_KEY) throw new Error("Set ARTIFICIAL_ANALYSIS_API_KEY to fetch ArtificialAnalysis data");
  const data = await getJSON("https://artificialanalysis.ai/api/v2/data/llms/models", {
    headers: { "x-api-key": AA_KEY },
  });
  const leaderboardHtml = await getText("https://artificialanalysis.ai/leaderboards/models");
  const metadata = parseArtificialAnalysisMetadata(leaderboardHtml);
  const apiModels = data.data || [];
  let previous = {};
  try { previous = JSON.parse(await readFile(join(RAW, "artificialanalysis.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  let approvals = {};
  try { approvals = JSON.parse(await readFile(join(RAW, 'source-change-approvals.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // AA can legitimately retire or merge a model identity, but an unattended
  // collector must never infer that from one response. An expiring approval is
  // bound to both complete identity sets and the exact removed IDs.
  assertApprovedIdentityCoverage(previous.models, apiModels, (m) => m.id, 'Artificial Analysis models', { approval: approvals.aa_models });
  const priorModels = new Map((previous.models || []).map((m) => [m.id, m]));
  for (const model of apiModels) {
    if (!model.evaluations || !model.pricing || typeof model.name !== 'string' || typeof model.slug !== 'string') throw new Error('AA missing model fields');
    const old = priorModels.get(model.id);
    assertMeasuredFields(old?.evaluations, model.evaluations, [...new Set([...Object.keys(old?.evaluations || {}), ...Object.keys(model.evaluations)])], `AA ${model.id}`);
    assertMeasuredFields(old?.pricing, model.pricing, ['price_1m_input_tokens', 'price_1m_output_tokens'], `AA ${model.id}`);
  }
  const { models, missing, extraCount } = enrichArtificialAnalysis(apiModels, metadata, previous);
  if (missing.length) {
    console.log(`  warn: ${missing.length} API model(s) lack leaderboard metadata (mid-rollout), shipping with null metadata: ${missing.map((m) => m.name).join(", ")}`);
  }
  if (extraCount) console.log(`  note: leaderboard carries ${extraCount} extra metadata row(s) not in the v2 API yet`);
  console.log(`  ${models.length} models`);
  const target = join(RAW, "artificialanalysis.json");
  const snapshot = {
    source: "ArtificialAnalysis API v2",
    endpoint: "https://artificialanalysis.ai/api/v2/data/llms/models",
    metadata_endpoint: "https://artificialanalysis.ai/leaderboards/models",
    collected_at: new Date().toISOString().slice(0, 10),
    count: models.length,
    metadata_sync: {
      api_count: apiModels.length,
      leaderboard_count: metadata.size,
      missing_model_ids: missing.map((model) => model.id),
      max_allowed_rollout_lag: MAX_METADATA_ROLLOUT_LAG,
      note: "Missing leaderboard metadata is explicit and remains null; only a bounded publication lag is tolerated.",
    },
    models,
  };
  const efficiency = await refreshAaEfficiency({ target: join(RAW, "aa-efficiency.json"), evidenceDir: process.env.BH_EVIDENCE_DIR });
  await writeJSONAtomic(target, snapshot);
  console.log(`  ${efficiency.count} AA token-efficiency benchmark rows`);
}

async function fetchDesignArena() {
  console.log("→ DesignArena leaderboards …");
  // 2026-07: the leaderboard API moved back from intelligence.ai (now a plain
  // marketing site returning 404s for /api/*) to www.designarena.ai.
  // CR-20260916: this source is collected under Florian's documented-risk decision of 2026-09-16
  // ("i choose b") — the two boards that were already published stay, and nothing is added. The scope
  // is not written here but read from data/source-policies.json, so widening the collector means
  // changing the recorded decision, which is what the decision asks for.
  const policy = await readSourcePolicy("designarena");
  const baseUrl = policy.site;
  const queries = policy.permitted_boards.map((b) => ({ key: b.key, body: b.request }));
  const permit = (endpoint) => {
    if (!policy.permitted_endpoints.includes(endpoint)) {
      throw new Error(`DesignArena: ${endpoint} is outside the recorded access decision (${policy.evidence}). Expansion is ${policy.expansion}.`);
    }
  };
  permit(`POST ${baseUrl}/api/leaderboard`);
  const out = {};
  let previous = {};
  try { previous = JSON.parse(await readFile(join(RAW, 'designarena.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const q of queries) {
    const data = await getJSON(`${baseUrl}/api/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q.body),
    });
    out[q.key] = { request: q.body, data: data.data || [] };
    assertIdentityCoverage(previous.leaderboards?.[q.key]?.data, out[q.key].data, (row) => row.modelId, `DesignArena ${q.key}`);
    for (const row of out[q.key].data) {
      if (!Number.isFinite(row.elo) || !Number.isSafeInteger(row.battles) || row.battles < 0) throw new Error(`DesignArena invalid Elo/battles: ${row.modelId}`);
    }
    console.log(`  ${q.key}: ${out[q.key].data.length} models`);
  }
  // Leaderboard ids are serving identifiers, not always public product names
  // (for example `yoda` is displayed as Grok 4.5). Snapshot the source-owned
  // registry metadata used by the leaderboard UI so dataset joins do not depend
  // on a growing local alias list. Fail closed if the registry and boards drift.
  permit(`GET ${baseUrl}/api/registry`);
  const registry = await getJSON(`${baseUrl}/api/registry`);
  const modelIds = [...new Set(Object.values(out).flatMap((board) => board.data.map((row) => row.modelId)))].sort();
  const missingRegistryIds = modelIds.filter((id) => !registry.models?.[id]);
  if (missingRegistryIds.length) {
    throw new Error(`Intelligence.ai registry missing ${missingRegistryIds.length} leaderboard ids: ${missingRegistryIds.join(", ")}`);
  }
  const modelRegistry = Object.fromEntries(modelIds.map((id) => {
    const model = registry.models[id];
    return [id, {
      display_name: model.displayName || id,
      provider: model.provider || null,
      open_source: typeof model.openSource === "boolean" ? model.openSource : null,
    }];
  }));
  await writeJSONAtomic(join(RAW, "designarena.json"), {
    // Not an API the source offers for programmatic use: DesignArena publishes no API documentation,
    // licence or attribution clause. The wording says what this is, so nothing downstream can read it
    // as an official feed (CR-39.2).
    source: "DesignArena public leaderboard (the site's own leaderboard endpoint; no published API documentation or data licence)",
    access_policy: { decision: policy.decision, decided_at: policy.decided_at, evidence: policy.evidence, expansion: policy.expansion },
    endpoint: `POST ${baseUrl}/api/leaderboard`,
    registry_endpoint: `GET ${baseUrl}/api/registry`,
    collected_at: new Date().toISOString().slice(0, 10),
    model_registry: modelRegistry,
    leaderboards: out,
  });
}

// Concurrency-limited map.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let idx = 0;
  const failures = [];
  const workers = Array.from({ length: limit }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { out[i] = await fn(items[i], i); } catch (error) { failures.push(error); }
    }
  });
  await Promise.all(workers);
  if (failures.length) throw new Error(failures.map((e) => e.message).join('\n'));
  return out;
}

async function fetchOpenRouter() {
  console.log("→ OpenRouter model catalog …");
  let previous = {};
  try { previous = JSON.parse(await readFile(join(RAW, 'openrouter.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // CR-66.1: an absent identity is re-checked once after ≥ 60 s before it counts
  // as a dated withdrawal; only a removal above the bounds stops the run.
  const recheckMs = Number(process.env.BH_OR_WITHDRAWAL_RECHECK_MS ?? 60_000);
  const loadCatalog = async () => {
    const models = (await getJSON("https://openrouter.ai/api/v1/models")).data || [];
    assertIdentityCoverage([], models, (m) => m.id, 'OpenRouter catalog');
    return models;
  };
  let models = await loadCatalog();
  const absentFrom = (list) => { const ids = new Set(list.map((m) => m.id)); return (previous.models || []).filter((m) => !ids.has(m.id)).length; };
  if (absentFrom(models)) {
    console.log(`  ${absentFrom(models)} prior catalog ids absent; re-checking in ${recheckMs / 1000} s`);
    await sleep(recheckMs);
    models = await loadCatalog();
  }
  const previousById = new Map((previous.models || []).map((m) => [m.id, m]));
  console.log(`  ${models.length} models in catalog`);

  // Fetch per-provider endpoints for every model (concurrency limited) so we can
  // compute the cheapest providers per model. Some models return [] (no public
  // provider list); that's fine.
  console.log("  fetching per-provider endpoints …");
  let done = 0;
  const endpointsById = new Map(), statusById = new Map();
  const loadEndpoints = async (id) => {
    const endpointUrl = `https://openrouter.ai/api/v1/models/${id}/endpoints`;
    let endpoints, endpointStatus;
    try { endpoints = (await getJSON(endpointUrl)).data?.endpoints; }
    catch (error) {
      // Moving aliases/router SKUs have no per-provider resource. An explicit 404
      // for a model that had endpoints withdraws all of them (bounded below).
      if (error.status !== 404) throw error;
      endpoints = [];
      endpointStatus = { status: 'not_published', http_status: 404, url: endpointUrl, collected_at: new Date().toISOString() };
    }
    try { assertOpenRouterEndpointCoverage([], endpoints); }
    catch (error) { throw new Error(`${id}: ${error.message}`); }
    endpointsById.set(id, endpoints);
    if (endpointStatus) statusById.set(id, endpointStatus); else statusById.delete(id);
  };
  const lostEndpoints = (id) => {
    const now = new Set(endpointsById.get(id).map(endpointIdentity));
    return (previousById.get(id)?.endpoints || []).some((e) => !now.has(endpointIdentity(e)));
  };
  await mapLimit(models, 10, async (m) => {
    await loadEndpoints(m.id);
    done++;
    if (done % 50 === 0) console.log(`    ${done}/${models.length}`);
  });
  const recheck = models.filter((m) => lostEndpoints(m.id)).map((m) => m.id);
  if (recheck.length) {
    console.log(`  ${recheck.length} models lost prior endpoints; re-checking in ${recheckMs / 1000} s`);
    await sleep(recheckMs);
    await mapLimit(recheck, 10, loadEndpoints);
  }
  const date = new Date().toISOString().slice(0, 10);
  const plan = planOpenRouterWithdrawals({ previous, models, endpointsById, date });
  if (plan.error) throw new Error(plan.error);
  for (const m of plan.run.withdrawn_models) console.log(`  withdrawn model ${m.id} (${date})`);
  for (const e of plan.run.withdrawn_endpoints) console.log(`  withdrawn endpoint ${e.model_id} ${e.identity} (${date})`);
  for (const r of [...plan.run.restored_models, ...plan.run.restored_endpoints]) console.log(`  restored ${r.model_id ?? r.id}${r.identity ? ` ${r.identity}` : ''} (withdrawn ${r.withdrawn_at})`);
  const enriched = models.map((m) => {
    const endpoints = endpointsById.get(m.id);
    const endpointStatus = statusById.get(m.id);
    return {
      id: m.id,
      ...(endpointStatus ? { endpoint_status: endpointStatus } : {}),
      canonical_slug: m.canonical_slug,
      hugging_face_id: m.hugging_face_id ?? null,
      name: m.name,
      created: m.created,
      expiration_date: m.expiration_date ?? null,
      context_length: m.context_length,
      architecture: m.architecture ?? null,
      reasoning: m.reasoning ?? null,
      benchmarks: m.benchmarks ?? null,
      supported_parameters: m.supported_parameters ?? [],
      pricing: m.pricing, // blended default endpoint price
      endpoints: endpoints.map((e) => ({
        provider_name: e.provider_name,
        tag: e.tag,
        quantization: e.quantization ?? null,
        context_length: e.context_length,
        max_completion_tokens: e.max_completion_tokens ?? null,
        supported_parameters: e.supported_parameters ?? [],
        pricing: e.pricing,
        status: e.status,
        uptime_last_30m: e.uptime_last_30m,
      })),
    };
  });

  await writeJSONAtomic(join(RAW, "openrouter.json"), {
    source: "OpenRouter public API",
    endpoints: {
      catalog: "https://openrouter.ai/api/v1/models",
      perModel: "https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints",
    },
    collected_at: new Date().toISOString().slice(0, 10),
    count: enriched.length,
    models: enriched,
    // Identities OpenRouter no longer lists, with the date they first went missing.
    // Never priced; an identity that returns moves back into `models`.
    withdrawals: plan.withdrawals,
    withdrawal_run: plan.run,
  });
  console.log(`  wrote ${enriched.length} OpenRouter models with provider endpoints`);
  // Four model pages in rotation, then the global fallback. New observations
  // retain their own dates and never imply a fresh full-population scrape.
  for (const script of ["fetch-openrouter-efficiency.mjs", "fetch-chutes-efficiency.mjs"]) {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [join(__dirname, script)], { timeout: 600000, maxBuffer: 2000000 });
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }
}

async function main() {
  await mkdir(RAW, { recursive: true });
  const which = process.argv[2];
  if (!which || which === "aa") await fetchArtificialAnalysis();
  if (!which || which === "da") await fetchDesignArena();
  if (!which || which === "or") await fetchOpenRouter();
  console.log("✓ live fetch complete");
}

main().catch((e) => { console.error(e); process.exit(1); });
