#!/usr/bin/env node
// CR-74.4: find the smallest round weight w for `composite − w·max(0, signal)` that puts GPT-6 Astra strictly above
// Claude Fable 5.1 in the default Overview ranking (one row per live family, Featured), and list the top-20 changes.
// Usage: node scripts/cr74-composite-penalty.mjs [--symmetric]
import { readFileSync } from "node:fs";
const root = new URL("..", import.meta.url);
const { clientData, isThinComposite } = await import(new URL("lib/client-model.ts", root));
const { preferredVariantIds, selectableModels } = await import(new URL("lib/variants.ts", root));
const { buildBenchmarkView } = await import(new URL("lib/benchmark-view.mjs", root));
const { benchmaxxingFamilySignals } = await import(new URL("lib/benchmax.mjs", root));
const symmetric = process.argv.includes("--symmetric");
const ds = JSON.parse(readFileSync(new URL("data/dataset.json", root), "utf8"));
const view = buildBenchmarkView(ds);
const famOf = new Map(view.models.map((m) => [m.id, m.family ?? m.id]));
const signal = new Map(benchmaxxingFamilySignals(view).reports.map(([id, r]) => [famOf.get(id), r.score]));
const base = clientData(ds).models;
export function ranking(w, { featured = true } = {}) {
  const models = base.map((m) => {
    const s = signal.get(m.family_key) ?? null, c = m.scores.composite;
    const pen = s == null ? 0 : symmetric ? w * s : w * Math.max(0, s);
    return { ...m, signal: s, raw: c, scores: { ...m.scores, composite: Math.max(0, Math.min(100, c - pen)) } };
  });
  let rows = selectableModels(models, true);
  const pref = preferredVariantIds(rows, "composite");
  rows = rows.filter((m) => (!pref.has(m.family_key) || pref.get(m.family_key) === m.id) && m.composite_coverage > 0 && (!featured || m.featured));
  return rows.sort((a, b) => (Number(isThinComposite(a)) - Number(isThinComposite(b))) || (b.scores.composite - a.scores.composite) || a.id.localeCompare(b.id));
}
const rankOf = (rows, fam) => rows.findIndex((m) => m.family_key === fam);
const WEIGHTS = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.5, 2];
const before = ranking(0);
let chosen = null;
for (const w of WEIGHTS) { const r = ranking(w); if (rankOf(r, "gpt-6-astra") < rankOf(r, "claude-fable-5.1")) { chosen = w; break; } }
const out = { symmetric, chosen, fable: before.find((m) => m.family_key === "claude-fable-5.1"), astra: before.find((m) => m.family_key === "gpt-6-astra") };
console.log(`mode=${symmetric ? "symmetric −w·signal" : "penalty −w·max(0,signal)"} smallest flipping w=${chosen}`);
for (const k of ["fable", "astra"]) console.log(`${k}: ${out[k].id} composite=${out[k].raw.toFixed(3)} signal=${out[k].signal?.toFixed(3)}`);
for (const featured of [true, false]) {
  const shown = Number(process.env.W ?? chosen ?? 0); const b = ranking(0, { featured }), a = ranking(shown, { featured });
  console.log(`\n${featured ? "Featured (Simple default)" : "All live families (Advanced)"} top 20 at w=${shown}:`);
  a.slice(0, 20).forEach((m, i) => { const j = rankOf(b, m.family_key); console.log(`${String(i + 1).padStart(2)}. ${m.id.padEnd(34)} ${m.raw.toFixed(2)} → ${m.scores.composite.toFixed(2)}  signal ${m.signal == null ? "—" : m.signal.toFixed(2)}  ${j === i ? "" : `(was #${j + 1})`}`); });
  const top = b.slice(0, 20).map((m) => m.family_key), pos = (fam) => rankOf(a, fam);
  const swaps = top.flatMap((f, i) => top.slice(i + 1).filter((g) => pos(f) > pos(g)).map((g) => `${f} ↔ ${g}`));
  console.log(`rank changes in top 20: ${a.slice(0, 20).filter((m, i) => rankOf(b, m.family_key) !== i).length} positions; ${swaps.length} pairwise swaps among the previous top 20: ${swaps.join("; ")}`);
}
