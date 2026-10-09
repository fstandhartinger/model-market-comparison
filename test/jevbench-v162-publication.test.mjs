import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { validateJevbenchV162Bundle, readOptionalJevbenchV162Release } from '../lib/jevbench-v162-release.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
const h = 'a'.repeat(64);
async function fixture() {
  const previous = await readJevbenchV161Release();
  const artifact = structuredClone(previous.artifact);
  artifact.revision = 'v1.6.2'; artifact.run_kind = 'paid-fast-lane'; artifact.G_med = 4;
  artifact.systems = artifact.systems.filter(s => s.ranked && s.v16.lane === 'selfhosted').slice(0,2);
  artifact.systems.forEach((s,i) => { s.measured_in = 'v1.6.2'; s.intelligence.gap = i ? 5 : 3; });
  artifact.not_measured = []; artifact.roster_count = 2; artifact.n_ranked = 2;
  for (const o of ['A','B','C']) artifact.board[o].order = artifact.systems.toSorted((x,y) => y.scores[o]-x.scores[o]).map(s => s.key);
  artifact.v16.draw_release = 'v1.6-fixture'; artifact.v16.freeze_manifest_sha256 = h;
  const categories = structuredClone(previous.categories);
  categories.revision = 'v1.6.2'; categories.draw_release = 'v1.6-fixture'; categories.results_sha256 = h;
  categories.systems = Object.fromEntries(artifact.systems.map(s => [s.key,categories.systems[s.key]]));
  // Fixture deliberately gives every published dimension a measured cell.
  for (const row of Object.values(categories.systems)) for (const dim of ['topics','usecases','languages']) for (const c of categories[dim]) row[dim][c.key] ??= { n: Math.max(1,c.n), competence: 50 };
  const proof = { schema_version:1, revision:'v1.6.2', method:'jevbench::v1.6', noul_method:'O1S', bootstrap:{B:1000,seed:16}, freeze_manifest_sha256:h, seed_commitment_sha256:h, source_sha256:artifact.source_sha256, draw_release:'v1.6-fixture', systems:artifact.systems.map(s => ({key:s.key,rows:1500,admission:'ACCEPTED',admission_sha256:h,raw_sha256:h,source_review_sha256:h,model_commit:'a'.repeat(40),code_commit:'b'.repeat(40),completed_at:'2026-10-09T10:00:00Z'})), field_median:{G_med:4,members:artifact.systems.map((s,i)=>({key:s.key,gap:i?5:3}))} };
  const manifest = {schema_version:1,revision:'v1.6.2',status:'published',provisional:false,review:{verdict:'PASS',engine:'claude',receipt_sha256:h},historical_revision:'v1.6.1',historical_results_sha256:previous.sha256,files:Object.fromEntries(['results','categories','proof','history'].map(k=>[k,{path:`data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.2-${k}.json`,sha256:h}]))};
  return {manifest,artifact,categories,proof,historicalSha256:previous.sha256};
}
test('missing publication artifact keeps fresh release unavailable',async()=>{
  const root=await mkdtemp(join(tmpdir(),'jev162-'));try {assert.equal(await readOptionalJevbenchV162Release(root),null);}finally{await rm(root,{recursive:true});}
});
test('complete native cohort accepts source-bound aggregate evidence',async()=>assert.ok(validateJevbenchV162Bundle(await fixture())));
for (const [name, edit, error] of [
  ['duplicate rank board member',b=>b.artifact.board.A.order[1]=b.artifact.board.A.order[0],/board membership/],
  ['wrong scoring denominator',b=>b.artifact.sample.total=1624,/scoring denominator/],
  ['artifact bootstrap mismatch',b=>b.artifact.bootstrap.B=2000,/artifact bootstrap/],
  ['null field median',b=>b.artifact.G_med=null,/G_med/],
  ['old median members',b=>b.proof.field_median.members[0].key='historical-model',/field median cohort/],
  ['wrong bootstrap',b=>b.proof.bootstrap.B=2000,/method proof/],
  ['missing radar cell',b=>delete b.categories.systems[b.artifact.systems[0].key].topics[b.categories.topics[0].key],/missing category/],
  ['mixed old cohort row',b=>b.artifact.systems[0].measured_in='v1.6.1',/native full cohort/],
  ['item leakage',b=>b.proof.systems[0].gold='secret',/private\/item-level/],
  ['unreviewed publication',b=>b.manifest.review.verdict='PENDING',/independent release review/],
  ['unbound categories',b=>b.categories.results_sha256='b'.repeat(64),/category source binding/],
]) test(`rejects ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV162Bundle(b),error);});
test('fresh radar view uses supplied fresh categories rather than historical imported cells',async()=>{
  const b=await fixture();const key=b.artifact.systems[0].key,cat=b.categories.topics[0].key;
  b.categories.systems[key].topics[cat].competence=12.345;
  const view=jevbenchCategoryView('v1.6.2',[key],{artifact:b.categories});
  assert.equal(view.systems[key].topics[cat][0],12.345);
});
