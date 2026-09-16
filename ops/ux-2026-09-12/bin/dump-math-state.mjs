// Iteration 90 (CR-65): snapshot of every published number the math rows can move — composite, inputs,
// adjusted cost (default settings, unrestricted scope), value tags, Benchmaxxing level — for before/after diffs.
// Usage: node ops/ux-2026-09-12/bin/dump-math-state.mjs OUT.json   |   ... --diff BEFORE.json AFTER.json
import { readFileSync, writeFileSync } from "node:fs";
const root = "/opt/model-market-comparison";
if (process.argv[2] === "--diff") {
  const [a, b] = [3, 4].map((i) => JSON.parse(readFileSync(process.argv[i], "utf8")));
  const top = (s) => s.top40.map((r) => `${r.id} ${r.composite}`);
  const byA = new Map(a.rows.map((r) => [r.id, r])), moves = [];
  for (const r of b.rows) { const o = byA.get(r.id); if (!o) continue;
    const d = {};
    for (const k of ["composite", "aa_intelligence_index", "aa_coding_index", "aa_coding_agent", "adjusted_cost", "value_tag", "benchmaxxing_level"]) if (JSON.stringify(o[k]) !== JSON.stringify(r[k])) d[k] = [o[k], r[k]];
    if (Object.keys(d).length) moves.push({ id: r.id, ...d }); }
  const tags = (s) => s.rows.filter((r) => r.benchmaxxing_level).map((r) => `${r.id}:${r.benchmaxxing_level}`);
  const vt = (s) => s.rows.filter((r) => r.value_tag).map((r) => `${r.id}:${r.value_tag}`);
  const setDiff = (x, y) => x.filter((v) => !y.includes(v));
  console.log(JSON.stringify({ changed_rows: moves.length, top40_before: top(a), top40_after: top(b),
    benchmaxxing_removed: setDiff(tags(a), tags(b)), benchmaxxing_added: setDiff(tags(b), tags(a)),
    value_tags_removed: setDiff(vt(a), vt(b)), value_tags_added: setDiff(vt(b), vt(a)), moves }, null, 1));
  process.exit(0);
}
const { clientData } = await import(`${root}/lib/client-model.ts`);
const { modelPrice, createScope } = await import(`${root}/lib/cost.ts`);
const { valueSignals } = await import(`${root}/lib/value-signal.mjs`);
const { buildBenchmarkView } = await import(`${root}/lib/benchmark-view.mjs`);
const { benchmaxxingFamilySignals } = await import(`${root}/lib/benchmax.mjs`);
const ds = JSON.parse(readFileSync(`${root}/data/dataset.json`, "utf8"));
// Same wiring as lib/page-data.ts "home".
const view = buildBenchmarkView(ds);
const { reports, tagged, weak } = benchmaxxingFamilySignals(view);
const fam = new Set(reports.map(([id]) => view.models.find((m) => m.id === id)?.family ?? id));
const bmx = Object.fromEntries(view.models.filter((m) => fam.has(m.family ?? m.id))
  .map((m) => [m.id, { score: null, signal: tagged.has(m.id), level: tagged.has(m.id) ? "strong" : weak.has(m.id) ? "weak" : null }]));
const data = clientData(ds, bmx);
const scope = createScope(null, data.providers);
const current = data.models.filter((m) => !m.deprecated);
const priced = current.map((m) => ({ m, price: modelPrice(m, data, scope) }));
const tags = valueSignals(priced.filter((x) => x.m.composite_coverage > 0).map((x) => ({ id: x.m.id, score: x.m.scores.composite, cost: x.price.value })));
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const rows = priced.map(({ m, price }) => ({ id: m.id, composite: r2(m.scores.composite), base: r2(m.composite_base), coverage: m.composite_coverage, attached: m.composite_attached,
  aa_intelligence_index: m.scores.aa_intelligence_index ?? null, aa_coding_index: m.scores.aa_coding_index ?? null, aa_coding_agent: m.scores.aa_coding_agent ?? null,
  adjusted_cost: price.value == null ? null : Number(price.value.toPrecision(4)),
  value_tag: tags.get(m.id) ? `${tags.get(m.id).kind}:${tags.get(m.id).level}` : null,
  benchmaxxing_level: m.benchmaxxing_level ?? null }));
const top40 = [...rows].sort((a, b) => b.composite - a.composite || a.id.localeCompare(b.id)).slice(0, 40).map(({ id, composite, coverage, attached }) => ({ id, composite, coverage, attached }));
writeFileSync(process.argv[2], JSON.stringify({ generated_at: ds.generated_at, rows, top40 }, null, 1));
console.log(process.argv[2], rows.length);
