#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseOpenRouterPage, parseOpenRouterCache, parseOpenRouterRankings } from "../lib/openrouter-efficiency.mjs";
import { completedWeek } from "../lib/chutes-efficiency.mjs";
import { writeJSONAtomic } from "../lib/snapshot.mjs";
import { captureLiveSource } from '../lib/live-source.mjs';

const raw = new URL("../data/raw/", import.meta.url);
const target = new URL("openrouter-efficiency.json", raw);
const ua = "BenchmarkHeaven/1.0 (+https://github.com/fstandhartinger/model-market-comparison)";
const args = process.argv.slice(2);
const explicit = args.find((arg) => arg.startsWith("--models="))?.slice(9).split(",");
const limit = Number(args.find((arg) => arg.startsWith("--limit="))?.slice(8) || 4);
const evidenceDir = args.find((arg) => arg.startsWith("--evidence-dir="))?.slice(15) || process.env.BH_EVIDENCE_DIR;

async function get(url) {
  // curl is the established working transport on Sandy; Node fetch intermittently
  // failed before an HTTP response. Same public URLs/UA, no cookies or auth.
  const { stdout } = await promisify(execFile)("curl", ["--silent", "--show-error", "--max-time", "60", "--user-agent", ua, "--write-out", "\n%{http_code}", url], { timeout: 65000, maxBuffer: 12000000 });
  const split = stdout.lastIndexOf("\n");
  const status = Number(stdout.slice(split + 1));
  if (status !== 200) throw new Error(`HTTP ${status}: ${url}`);
  const body = stdout.slice(0, split);
  if (/<title>just a moment|cf-chl-|g-recaptcha|hcaptcha/i.test(body.slice(0, 100000))) throw new Error(`HTTP 403 challenge detected: ${url}`);
  await captureLiveSource(url, body, { directory: evidenceDir });
  return body;
}
try {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) throw new Error("Page limit must be 1..12");
  const catalog = JSON.parse(await readFile(new URL("openrouter.json", raw), "utf8"));
  let previous = { models: {}, attempts: {} };
  try { previous = JSON.parse(await readFile(target, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const catalogIds = new Set(catalog.models.filter((m) => m.architecture?.output_modalities?.length === 1
    && m.architecture.output_modalities[0] === "text" && !m.id.includes(":") && m.endpoints?.length).map((m) => m.id));
  const collected_at = new Date().toISOString();
  const window = completedWeek(new Date(collected_at));
  const selected = explicit || [...catalogIds].sort((a, b) => (previous.attempts[a]?.collected_at || "").localeCompare(previous.attempts[b]?.collected_at || "") || a.localeCompare(b)).slice(0, limit);
  if (selected.length > 12 || !selected.length || new Set(selected).size !== selected.length || selected.some((id) => !catalogIds.has(id))) throw new Error("Select 1..12 unique exact catalog model IDs with text output");
  // The public robots policy currently allows these pages. Fail closed on a
  // changed policy; a human can review and narrow this small collector if needed.
  const robots = await get("https://openrouter.ai/robots.txt");
  const disallows = [...robots.matchAll(/^Disallow:\s*(\S*)/gim)].map((m) => m[1]).filter(Boolean);
  if (disallows.some((path) => path !== "/seo/")) throw new Error("OpenRouter robots policy changed; review before fetching model pages");
  const models = { ...previous.models };
  const attempts = { ...previous.attempts };
  let rankings = previous.rankings || null;
  let rankingsAttempt;
  const rankingsUrl = "https://openrouter.ai/rankings?view=week";
  try {
    const rankingsHtml = await get(rankingsUrl);
    rankings = { rows: parseOpenRouterRankings(rankingsHtml, window), window,
      provenance: { source: "OpenRouter weekly model rankings", url: rankingsUrl, collected_at: new Date().toISOString(), basis: "measured" },
      response_sha256: createHash("sha256").update(rankingsHtml).digest("hex") };
    rankingsAttempt = { ...rankings.provenance, status: "available" };
    if (evidenceDir) { await mkdir(evidenceDir, { recursive: true }); await writeFile(`${evidenceDir}/rankings.html`, rankingsHtml); }
  } catch (error) {
    rankingsAttempt = { source: "OpenRouter weekly model rankings", url: rankingsUrl, collected_at: new Date().toISOString(), status: "fetch_or_parse_failed", reason: error.message };
    if (/HTTP (403|429)/.test(error.message)) throw error;
  }
  let successes = 0;
  let halt = false;
  for (const id of selected) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const url = `https://openrouter.ai/${id}`;
    const at = new Date().toISOString();
    try {
      const html = await get(url);
      const parsed = parseOpenRouterPage(html, { or_model_id: id, ...window });
      if (previous.models[id]?.usage?.status === 'available' && parsed.usage.status !== 'available') {
        throw new Error(`Current usage ${parsed.usage.status}; retaining the previous complete observation and its dates`);
      }
      const response_sha256 = createHash("sha256").update(html).digest("hex");
      models[id] = { ...parsed, window, provenance: { source: "OpenRouter model-page usage", url, collected_at: at, basis: "measured" }, response_sha256 };
      const cacheUrl = `https://openrouter.ai/api/frontend/v1/stats/effective-pricing?${new URLSearchParams({ permaslug: parsed.model_permaslug, variant: parsed.variant, shape: "v7" })}`;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const cacheText = await get(cacheUrl);
        const cache = parseOpenRouterCache(JSON.parse(cacheText), parsed.endpoints);
        const cacheById = new Map(cache.joined.map((e) => [e.endpoint_id, e]));
        const missingPrior = (previous.models[id]?.endpoints || []).filter((e) => e.cache_hit_rate != null
          && parsed.endpoints.some((p) => p.endpoint_id === e.endpoint_id && p.endpoint_tag === e.endpoint_tag)
          && cacheById.get(e.endpoint_id)?.cache_hit_rate == null);
        if (missingPrior.length) throw new Error(`Partial cache summary: ${missingPrior.length} previous endpoint rates absent; retaining dated cache observation`);
        models[id].endpoints = parsed.endpoints.map((e) => cacheById.get(e.endpoint_id) || { ...e, cache_status: "not_in_effective_pricing" });
        models[id].cache = { ...cache, joined: undefined, provenance: { source: "OpenRouter effective pricing statistics", url: cacheUrl, collected_at: new Date().toISOString(), basis: "measured" }, response_sha256: createHash("sha256").update(cacheText).digest("hex") };
        models[id].cache_attempt = { ...models[id].cache.provenance, status: "available" };
        if (evidenceDir) { await mkdir(evidenceDir, { recursive: true }); await writeFile(`${evidenceDir}/${id.replaceAll("/", "--")}.cache.json`, cacheText); }
      } catch (error) {
        models[id].cache_attempt = { source: "OpenRouter effective pricing statistics", status: "fetch_or_parse_failed", reason: error.message, url: cacheUrl, collected_at: new Date().toISOString() };
        const old = previous.models[id];
        if (old?.cache?.provenance) {
          models[id].cache = { ...old.cache, retained_after_failure: true };
          models[id].endpoints = parsed.endpoints.map((endpoint) => {
            const prior = old.endpoints.find((p) => p.endpoint_id === endpoint.endpoint_id && p.endpoint_tag === endpoint.endpoint_tag && p.provider === endpoint.provider);
            return prior ? { ...endpoint, cache_hit_rate: prior.cache_hit_rate, cache_status: prior.cache_status,
              total_tokens: prior.total_tokens, source_provider_name: prior.source_provider_name, source_provider_slug: prior.source_provider_slug, cache_note: prior.cache_note } : endpoint;
          });
        } else models[id].cache = models[id].cache_attempt;
        halt = /HTTP (403|429)/.test(error.message);
      }
      attempts[id] = { source: "OpenRouter model page", url, collected_at: at, status: parsed.usage.status, http_status: 200 };
      if (evidenceDir) {
        await mkdir(evidenceDir, { recursive: true });
        await writeFile(`${evidenceDir}/${id.replaceAll("/", "--")}.html`, html);
      }
      successes++;
      console.log(`${id}: ${parsed.endpoints.length} endpoints; I/O ${parsed.usage.status}`);
      if (halt) break;
    } catch (error) {
      attempts[id] = { source: "OpenRouter model page", url, collected_at: at, status: "fetch_or_parse_failed", reason: error.message };
      console.error(`${id}: ${error.message}; previous observation/date retained if present`);
      if (/HTTP (403|429)/.test(error.message)) break; // no retries or protection workaround
    }
  }
  if (!successes) throw new Error("No model page parsed successfully; prior snapshot preserved");
  await writeJSONAtomic(fileURLToPath(target), {
    collected_at, models, attempts, rankings, rankings_attempt: rankingsAttempt,
    coverage: { catalog_models: catalog.models.length, eligible_page_models: catalogIds.size, pages_selected: selected.length, pages_succeeded_this_run: successes, retained_model_pages: Object.keys(models).length,
      policy: "At most four model pages per normal daily run, oldest-attempt first; explicit initial batches capped at twelve. Per-observation dates are retained." },
  });
} catch (error) {
  console.error(`OpenRouter efficiency refresh failed: ${error.message}`);
  process.exitCode = 1;
}
