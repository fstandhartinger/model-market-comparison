import { readFileSync } from 'node:fs';
const R='/opt/model-market-comparison/';
const { buildBenchmarkView } = await import(R+'lib/benchmark-view.mjs');
const { buildBenchmarkMatrix, compatibleRow } = await import(R+'lib/benchmark-matrix.mjs');
const { resolveAnchors } = await import(R+'lib/category-scores.mjs');
const ds = JSON.parse(readFileSync(R+'data/dataset.json'));
const tax = JSON.parse(readFileSync(R+'data/benchmark-taxonomy.json'));
const anchors = JSON.parse(readFileSync(R+'data/category-score-anchors.json'));
const m = buildBenchmarkMatrix(buildBenchmarkView(ds), ds, tax);
const byId = new Map(ds.models.map((x)=>[x.id,x]));
const featuredFam = new Set(ds.models.filter((x)=>x.featured && !x.deprecated).map((x)=>x.family_key));
const famHas = new Map(); const modelHas = new Map();
for (const [id, vals] of Object.entries(m.values)) {
  const f = byId.get(id)?.family_key;
  for (const [i,,basis] of vals) {
    if ((basis??0)!==0) continue;
    if (!modelHas.has(i)) modelHas.set(i,new Set()); modelHas.get(i).add(id);
    if (!featuredFam.has(f)) continue;
    if (!famHas.has(i)) famHas.set(i,new Set()); famHas.get(i).add(f);
  }
}
const resolved = resolveAnchors(m, anchors);
console.log('featured families:', featuredFam.size, '| min_coverage', anchors.min_coverage);
for (const c of resolved) {
  console.log('\n##', c.label, c.key);
  for (const r of c.rows) {
    const cov = (famHas.get(r.index)?.size ?? 0)/featuredFam.size;
    console.log(`  anchor ${r.key} v=${r.version} row="${r.name}" idx=${r.index} coverage=${(cov*100).toFixed(0)}% models=${modelHas.get(r.index)?.size??0} judged=${!!r.judged} sat=${!!r.saturation?.saturated}`);
  }
  // all candidate rows for each anchor key
  for (const a of c.anchors) {
    const cands = m.rows.map((r,i)=>({...r,index:i})).filter((r)=>r.key===a.key && r.group===c.group && compatibleRow(r));
    console.log(`   candidates for ${a.key}:`, cands.map((r)=>`v${r.version}[idx${r.index}] fam=${((famHas.get(r.index)?.size??0)/featuredFam.size*100).toFixed(0)}% models=${modelHas.get(r.index)?.size??0}`).join(' | '));
  }
}
// every compatible, non-judged row per group with >=60% coverage
console.log('\n## boards at or above the 60% bar today, per group');
for (const g of m.groups) {
  const list = m.rows.map((r,i)=>({...r,index:i})).filter((r)=>r.group===g.id && compatibleRow(r) && !r.judged)
    .map((r)=>({name:r.name,key:r.key,version:r.version,index:r.index,cov:(famHas.get(r.index)?.size??0)/featuredFam.size,models:modelHas.get(r.index)?.size??0}))
    .filter((r)=>r.cov>=anchors.min_coverage).sort((a,b)=>b.cov-a.cov);
  if (list.length) console.log(` ${g.id}:`, list.map((r)=>`${r.key}@${r.version} "${r.name}" ${(r.cov*100).toFixed(0)}% models=${r.models}`).join(' | '));
}
