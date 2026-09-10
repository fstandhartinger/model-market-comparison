#!/usr/bin/env node
// Pick currently-viable cheap worker models for the daily data jobs.
//
// Rule (Florian, 2026-09-10): never use a model below Artificial Analysis Intelligence
// Index 34 — weak models produce catastrophically wrong data. We already carry the AA
// index in our own dataset, so candidates are scored from our own data instead of a
// hardcoded list that rots.
//
// Usage: node pick-worker-models.mjs [--min-index 34] [--json] [--limit 10]
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const MIN_INDEX = Number(argv("--min-index", 34));
const LIMIT = Number(argv("--limit", 10));
const AS_JSON = args.includes("--json");
const DATASET = new URL("../../../data/dataset.json", import.meta.url);

// AA intelligence index by OpenRouter model id, from our own dataset.
const ds = JSON.parse(readFileSync(DATASET));
const byOrId = new Map();
for (const m of ds.models) {
  const orId = m.aa_metadata?.openrouter_api_id;
  const idx = m.benchmarks?.aa_intelligence_index;
  if (!orId || typeof idx !== "number") continue;
  const prev = byOrId.get(orId);
  if (prev == null || idx > prev) byOrId.set(orId, idx); // best variant of the model
}
// Family-level fallback: strip the ":free"/":nitro" style suffix and the vendor prefix.
const familyIndex = new Map();
for (const [orId, idx] of byOrId) {
  const slug = orId.split("/").pop().replace(/[:@].*$/, "");
  familyIndex.set(slug, Math.max(familyIndex.get(slug) ?? 0, idx));
}

const res = await fetch("https://openrouter.ai/api/v1/models", {
  headers: { "User-Agent": "benchmarkheaven/1.0 (+https://benchmarkheaven.com)" },
});
if (!res.ok) { console.error(`OpenRouter catalog HTTP ${res.status}`); process.exit(1); }
const catalog = (await res.json()).data || [];

const price = (m) => Number(m.pricing?.prompt ?? "1") + Number(m.pricing?.completion ?? "1");
const candidates = catalog.map((m) => {
  const base = m.id.replace(/:free$/, "");
  const slug = base.split("/").pop().replace(/[:@].*$/, "");
  const aa = byOrId.get(base) ?? byOrId.get(m.id) ?? familyIndex.get(slug) ?? null;
  return {
    id: m.id,
    free: m.id.endsWith(":free") || price(m) === 0,
    input_per_1m: Number(m.pricing?.prompt ?? 0) * 1e6,
    output_per_1m: Number(m.pricing?.completion ?? 0) * 1e6,
    context: m.context_length ?? null,
    aa_intelligence_index: aa,
    aa_source: byOrId.has(base) ? "exact" : familyIndex.has(slug) ? "family" : "unknown",
  };
});

const cost = (c) => c.input_per_1m + c.output_per_1m;
const byCost = (a, b) => cost(a) - cost(b) || (b.aa_intelligence_index ?? 0) - (a.aa_intelligence_index ?? 0);
const byIndex = (a, b) => (b.aa_intelligence_index ?? 0) - (a.aa_intelligence_index ?? 0);

// Three buckets, because "free" and "good enough" rarely coincide:
//  - free_verified   : free AND AA index >= MIN_INDEX. Use freely.
//  - cheap_verified  : paid but AA index >= MIN_INDEX, cheapest first. The safe default.
//  - free_unverified : free, but AA has not scored it (usually brand new). NOT usable for
//                      data-bearing work until you have evidence it is competent — smoke
//                      test it against a task with a known answer, or leave it alone.
// Anything with a KNOWN index below MIN_INDEX is excluded outright: Florian's rule is that
// weak models produce catastrophically wrong data, and that risk dwarfs the token saving.
const known = candidates.filter((c) => c.aa_intelligence_index != null);
const out = {
  min_index: MIN_INDEX,
  generated_at: new Date().toISOString().slice(0, 10),
  free_verified: known.filter((c) => c.free && c.aa_intelligence_index >= MIN_INDEX).sort(byIndex).slice(0, LIMIT),
  cheap_verified: known.filter((c) => !c.free && c.aa_intelligence_index >= MIN_INDEX).sort(byCost).slice(0, LIMIT),
  free_unverified: candidates.filter((c) => c.free && c.aa_intelligence_index == null).slice(0, LIMIT),
  excluded_too_weak: known.filter((c) => c.aa_intelligence_index < MIN_INDEX && c.free)
    .sort(byIndex).slice(0, LIMIT).map((c) => `${c.id} (AA ${c.aa_intelligence_index})`),
  note: "Chutes hosts Kimi K3 free for us (CHUTES_API_KEY) - use worker.sh --agent for agentic file work.",
};

if (AS_JSON) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
const show = (label, rows) => {
  console.log(`\n## ${label}`);
  if (!rows.length) return console.log("  (none right now)");
  for (const c of rows) {
    const aa = c.aa_intelligence_index == null ? "  ?" : String(c.aa_intelligence_index).padStart(4);
    const pr = c.free ? "FREE" : `$${c.input_per_1m.toFixed(2)}/$${c.output_per_1m.toFixed(2)}`;
    console.log(`  AA ${aa}  ${pr.padEnd(16)} ${c.id}  (${c.aa_source})`);
  }
};
console.log(`# worker candidates - minimum AA Intelligence Index ${MIN_INDEX}`);
show("free and verified competent - use freely", out.free_verified);
show("cheap and verified competent - the safe default", out.cheap_verified);
show("free but UNSCORED by AA - smoke test before trusting with data", out.free_unverified);
console.log(`\n## excluded as too weak (free but AA < ${MIN_INDEX})\n  ${out.excluded_too_weak.join("\n  ") || "(none)"}`);
console.log(`\n${out.note}`);
