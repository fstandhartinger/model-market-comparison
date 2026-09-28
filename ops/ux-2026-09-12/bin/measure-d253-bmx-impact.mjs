import { readFileSync } from 'node:fs';
const R='/opt/model-market-comparison/';
const { buildBenchmarkView } = await import(R+'lib/benchmark-view.mjs');
const { benchmaxxingFamilySignals } = await import(R+'lib/benchmax.mjs');
const ds = JSON.parse(readFileSync(R+'data/dataset.json'));
const ADDED = ['aa-gdp-pdf','stepfun-gdp-pdf'];
const out = {};
for (const [label, drop] of [['after', []], ['before', ADDED], ['aa_only', ['stepfun-gdp-pdf']]]) {
  const copy = JSON.parse(JSON.stringify(ds));
  copy.benchmark_results.judged_benchmarks = copy.benchmark_results.judged_benchmarks.filter((k)=>!drop.includes(k));
  const view = buildBenchmarkView(copy);
  const fam = benchmaxxingFamilySignals(view);
  out[label] = {
    tagged: [...new Set([...fam.tagged].map((id)=>view.models.find((m)=>m.id===id)?.family ?? id))].sort(),
    scoredFamilies: fam.reports.length,
    levels: Object.fromEntries([...fam.familyLevels]),
    dsk: view.models.find((m)=>m.family==='deepseek-v4.1-flash') ? (fam.reports.find((r)=>r.family==='deepseek-v4.1-flash') ?? null) : null,
  };
}
const diff = (a,b) => ({
  scored: [out[a].scoredFamilies, out[b].scoredFamilies],
  tagged: [out[a].tagged.length, out[b].tagged.length],
  lost: out[a].tagged.filter((f)=>!out[b].tagged.includes(f)),
  gained: out[b].tagged.filter((f)=>!out[a].tagged.includes(f)),
  moved: Object.entries(out[a].levels).filter(([f,l])=>out[b].levels[f]!==l).map(([f,l])=>`${f}: ${l} -> ${out[b].levels[f] ?? 'none'}`),
});
console.log(JSON.stringify({ both: diff('before','after'), aa_only: diff('before','aa_only'),
  deepseek_report: { before: out.before.dsk, after: out.after.dsk } }, null, 1));
