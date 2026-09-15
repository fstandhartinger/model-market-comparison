import { readFileSync } from 'node:fs';
import { buildBenchmarkView } from '/opt/model-market-comparison/lib/benchmark-view.mjs';
import { buildBenchmarkMatrix, compatibleRow } from '/opt/model-market-comparison/lib/benchmark-matrix.mjs';
const ds = JSON.parse(readFileSync('/opt/model-market-comparison/data/dataset.json'));
const tax = JSON.parse(readFileSync('/opt/model-market-comparison/data/benchmark-taxonomy.json'));
const m = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, tax);
const byId = new Map(ds.models.map((x) => [x.id, x]));
const featuredFam = new Set(ds.models.filter((x) => x.featured && !x.deprecated).map((x) => x.family_key));
console.log('matrix keys', Object.keys(m).join(' '), '| rows', m.rows.length, '| models with values', Object.keys(m.values).length, '| featured families', featuredFam.size);
const famHas = new Map(); // row index -> Set(family)
for (const [id, vals] of Object.entries(m.values)) { const f = byId.get(id)?.family_key; if (!featuredFam.has(f)) continue; for (const [i] of vals) { if (!famHas.has(i)) famHas.set(i, new Set()); famHas.get(i).add(f); } }
for (const g of m.groups) {
  const rows = m.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.group === g.id);
  const comp = rows.filter(({ r }) => compatibleRow(r)).map(({ r, i }) => ({ name: r.name, cov: (famHas.get(i)?.size ?? 0) / featuredFam.size })).sort((a, b) => b.cov - a.cov);
  console.log(`\n${g.id}: ${rows.length} rows, ${comp.length} compatible; top coverage:`, comp.slice(0, 6).map((c) => `${c.name} ${(c.cov * 100).toFixed(0)}%`).join(' | '));
}
