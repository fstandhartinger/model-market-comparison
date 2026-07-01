// Diagnose the composite score: replicate lib/client-model.ts composite and print
// the per-metric normalized breakdown so we can see why one model outranks another.
import { readFileSync } from "node:fs";
const ds = JSON.parse(readFileSync(new URL("../data/dataset.json", import.meta.url)));

const BASE = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index", "designarena_frontend", "designarena_fullstack"];
const scoreOf = (m) => ({
  aa_coding_index: m.benchmarks?.aa_coding_index ?? null,
  aa_coding_agent: m.benchmarks?.aa_coding_agent_index ?? null,
  aa_intelligence_index: m.benchmarks?.aa_intelligence_index ?? null,
  designarena_frontend: m.designarena?.frontend?.elo ?? null,
  designarena_fullstack: m.designarena?.fullstack?.elo ?? null,
});
const rows = ds.models.map((m) => ({ id: m.id, name: m.display_name, fk: m.family_key, featured: m.featured, s: scoreOf(m) }));

// ranges per metric
const ranges = {};
for (const k of BASE) {
  const vals = rows.map((r) => r.s[k]).filter((v) => v != null);
  ranges[k] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length } : null;
}
const norm = (k, v) => (v == null || !ranges[k] ? null : ranges[k].max > ranges[k].min ? ((v - ranges[k].min) / (ranges[k].max - ranges[k].min)) * 100 : 100);

// current composite = mean of present normalized
const compCurrent = (r) => { const n = BASE.map((k) => norm(k, r.s[k])).filter((v) => v != null); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
// mean-imputed: missing metric -> that metric's normalized cross-model mean
const meanNorm = {}; for (const k of BASE) meanNorm[k] = ranges[k] ? norm(k, ranges[k].mean) : 50;
const compImputed = (r) => { const n = BASE.map((k) => norm(k, r.s[k]) ?? meanNorm[k]); return n.reduce((a, b) => a + b, 0) / n.length; };

console.log("Per-metric normalized cross-model MEAN (imputation value):");
for (const k of BASE) console.log(`  ${k}: mean=${ranges[k]?.mean?.toFixed(1)} -> norm ${meanNorm[k]?.toFixed(1)} | range ${ranges[k]?.min}..${ranges[k]?.max}`);

const show = (name) => {
  const r = rows.find((x) => x.name.startsWith(name)) || rows.find((x) => x.name.includes(name));
  if (!r) return console.log("NOT FOUND:", name);
  console.log(`\n${r.name}`);
  for (const k of BASE) console.log(`  ${k}: raw=${r.s[k]} norm=${norm(k, r.s[k])?.toFixed(1) ?? "— (missing → imputed " + meanNorm[k].toFixed(1) + ")"}`);
  console.log(`  composite CURRENT (mean of present) = ${compCurrent(r)?.toFixed(1)}`);
  console.log(`  composite IMPUTED (missing=field mean) = ${compImputed(r).toFixed(1)}`);
};
show("MiniMax M3");
show("GPT-5.5 (high)");

// --- Candidate fixes ---
const AA = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index"];
// (A) AA-only, mean of present
const compAApresent = (r) => { const n = AA.map((k) => norm(k, r.s[k])).filter((v) => v != null); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
// (B) AA-only, impute missing AA metric with field mean
const compAAimputed = (r) => { const n = AA.map((k) => norm(k, r.s[k]) ?? meanNorm[k]); return n.reduce((a, b) => a + b, 0) / n.length; };
// dominance check: does A beat B on every SHARED metric but lose composite?
const shared = (a, b) => BASE.filter((k) => a.s[k] != null && b.s[k] != null);
const dominates = (a, b) => { const sh = shared(a, b); return sh.length >= 2 && sh.every((k) => a.s[k] > b.s[k]); };
const violations = (compFn, label) => {
  let bad = 0; const ex = [];
  for (const a of feat) for (const b of feat) if (a.id !== b.id && dominates(a, b) && compFn(a) != null && compFn(b) != null && compFn(a) < compFn(b)) { bad++; if (ex.length < 4) ex.push(`${a.name.slice(0,22)}>${b.name.slice(0,22)} on shared but comp ${compFn(a).toFixed(1)}<${compFn(b).toFixed(1)}`); }
  console.log(`  [${label}] dominance violations: ${bad}` + (ex.length ? "\n     " + ex.join("\n     ") : ""));
};

// (C) DesignArena collapsed to ONE metric (avg of fe+fs), mean of present.
//     Keys: coding, coding_agent, intelligence, designarena(=avg). Reduces DA weight 2/5→1/4.
const KEYS4 = ["aa_coding_index", "aa_coding_agent", "aa_intelligence_index"];
const daNorm = (r) => { const f = norm("designarena_frontend", r.s.designarena_frontend), s = norm("designarena_fullstack", r.s.designarena_fullstack); const a = [f, s].filter((v) => v != null); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };
const compDAcombined = (r) => { const n = [...KEYS4.map((k) => norm(k, r.s[k])), daNorm(r)].filter((v) => v != null); return n.length ? n.reduce((a, b) => a + b, 0) / n.length : null; };
// (D) Shrinkage imputation over all 5: missing = avg(field mean, model's own present mean).
const compShrink = (r) => {
  const present = BASE.map((k) => norm(k, r.s[k])).filter((v) => v != null);
  if (!present.length) return null;
  const ownMean = present.reduce((a, b) => a + b, 0) / present.length;
  const n = BASE.map((k) => norm(k, r.s[k]) ?? (meanNorm[k] + ownMean) / 2);
  return n.reduce((a, b) => a + b, 0) / n.length;
};

console.log("\n=== Dominance-violation counts (A beats B on every shared metric but ranks lower) ===");
const feat = rows.filter((r) => r.featured && compCurrent(r) != null);
violations(compCurrent, "CURRENT (mean of present, all 5)");
violations(compImputed, "IMPUTED all-5 (missing=field mean)");
violations(compDAcombined, "DA-combined (mean of present, DA=1 key)");
violations(compShrink, "SHRINKAGE (missing=avg(field,own))");
const lead = (fn, label) => { console.log(`\n--- top 14 by ${label} ---`); [...feat].sort((a, b) => fn(b) - fn(a)).slice(0, 14).forEach((r, i) => console.log(`${String(i + 1).padStart(2)}  ${r.name.slice(0, 38).padEnd(40)} ${fn(r).toFixed(1)}`)); };
lead(compDAcombined, "DA-combined");
lead(compShrink, "SHRINKAGE");

console.log("\n=== Featured leaderboard: CURRENT vs AA-only-IMPUTED ===");
const aaRank = new Map([...feat].sort((a, b) => compAAimputed(b) - compAAimputed(a)).map((r, i) => [r.id, i + 1]));
[...feat].sort((a, b) => compAAimputed(b) - compAAimputed(a)).slice(0, 20).forEach((r, i) => {
  console.log(`${String(i + 1).padStart(2)}  ${r.name.slice(0, 40).padEnd(42)} AAimp=${compAAimputed(r).toFixed(1).padStart(5)}  (was cur ${compCurrent(r).toFixed(1)})`);
});

console.log("\n=== (old) Featured leaderboard: CURRENT vs IMPUTED composite ===");
const byCur = [...feat].sort((a, b) => compCurrent(b) - compCurrent(a));
console.log("rank  CURRENT (name = comp)                    | IMPUTED");
const impRank = new Map([...feat].sort((a, b) => compImputed(b) - compImputed(a)).map((r, i) => [r.id, i + 1]));
byCur.forEach((r, i) => {
  console.log(`${String(i + 1).padStart(2)}  ${r.name.slice(0, 40).padEnd(42)} ${compCurrent(r).toFixed(1).padStart(5)}  | imp#${String(impRank.get(r.id)).padStart(2)} ${compImputed(r).toFixed(1)}`);
});
