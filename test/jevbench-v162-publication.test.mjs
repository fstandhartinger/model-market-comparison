import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, readFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { join } from 'node:path';
import { JEVBENCH_V157_RELEASE_ARTIFACT } from '../lib/jevbench-v15-release.mjs';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { validateJevbenchV162Bundle, readOptionalJevbenchV162Release, hasPublishedJevbenchV162Release, V162_HISTORY_SHA256, V162_CARRY_SHA256, historicalCatalogue } from '../lib/jevbench-v162-release.mjs';
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
  for (const field of ['unavailable','supplement','live_category_cells','language_cells']) delete categories[field];
  categories.revision = 'v1.6.2'; categories.draw_release = 'v1.6-fixture'; categories.results_sha256 = h;
  categories.lanes = Object.fromEntries(artifact.systems.map(s=>[s.key,'selfhosted']));
  categories.systems = Object.fromEntries(artifact.systems.map(s => [s.key,categories.systems[s.key]]));
  // Fixture deliberately gives every published dimension a measured cell.
  for (const row of Object.values(categories.systems)) for (const dim of ['topics','usecases','languages']) for (const c of categories[dim]) row[dim][c.key] ??= { n: Math.max(1,c.n), competence: 50 };
  const proof = { schema_version:1, revision:'v1.6.2', method:'jevbench::v1.6', noul_method:'O1S', bootstrap:{B:1000,seed:16}, freeze_manifest_sha256:h, seed_commitment_sha256:h, source_sha256:artifact.source_sha256, draw_release:'v1.6-fixture', systems:artifact.systems.map(s => ({key:s.key,rows:1500,admission:'ACCEPTED',admission_sha256:h,raw_sha256:h,source_review_sha256:h,model_commit:'a'.repeat(40),code_commit:'b'.repeat(40),completed_at:'2026-10-09T10:00:00Z'})), field_median:{G_med:4,members:artifact.systems.map((s,i)=>({key:s.key,gap:i?5:3}))} };
  const manifest = {schema_version:1,revision:'v1.6.2',status:'published',provisional:false,review:{verdict:'PASS',engine:'claude',receipt_sha256:h},historical_revision:'v1.6.1',historical_results_sha256:previous.sha256,historical_carry_sha256:V162_CARRY_SHA256,files:Object.fromEntries(['results','categories','proof','history','history-carry'].map(k=>[k,{path:`data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.2-${k}.json`,sha256:h}]))};
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

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function diskBundle(t) {
  const root = await mkdtemp(join(tmpdir(),'jev162-bundle-'));
  t.after(()=>rm(root,{recursive:true}));
  const b = await fixture();
  const base='data/raw/benchmarks/jevbench/v1.6/';
  const paths=Object.fromEntries(['results','categories','proof','history','history-carry','publication'].map(k=>[k,join(root,base,`jevbench-v1.6.2-${k}.json`)]));
  await mkdir(dirname(paths.results),{recursive:true});
  await mkdir(dirname(join(root,JEVBENCH_V157_RELEASE_ARTIFACT)),{recursive:true});
  await copyFile(JEVBENCH_V157_RELEASE_ARTIFACT,join(root,JEVBENCH_V157_RELEASE_ARTIFACT));
  const resultBytes=JSON.stringify(b.artifact);
  b.manifest.files.results.sha256=digest(resultBytes);
  b.categories.results_sha256=digest(resultBytes);
  const contents={results:resultBytes,categories:JSON.stringify(b.categories),proof:JSON.stringify(b.proof),history:await readFile(`${base}jevbench-v1.6.1-results.json`),'history-carry':await readFile(`${base}jevbench-v1.6.0-dated-carry.json`)};
  for(const [key,bytes] of Object.entries(contents)) {b.manifest.files[key].sha256=digest(bytes);await writeFile(paths[key],bytes);}
  await writeFile(paths.publication,JSON.stringify(b.manifest));
  return {root,b,paths};
}
test('on-disk bundle activates exact fresh and immutable result/carry snapshots',async t=>{
  const {root}=await diskBundle(t);const loaded=await readOptionalJevbenchV162Release(root);
  assert.equal(loaded.artifact.revision,'v1.6.2');assert.equal(loaded.historical.sha256,V162_HISTORY_SHA256);assert.equal(loaded.historical.carrySha256,V162_CARRY_SHA256);
  assert.equal(await hasPublishedJevbenchV162Release(root),true);
  // No current v1.6.1 file exists in this root: future addenda are not consulted.
  assert.equal(loaded.historical.artifact.systems.length,140);
});
for(const key of ['results','categories','proof','history','history-carry']) test(`rejects ${key} byte mismatch`,async t=>{
 const {root,paths}=await diskBundle(t);await writeFile(paths[key],(await readFile(paths[key],'utf8'))+' ');
 await assert.rejects(readOptionalJevbenchV162Release(root),/hash/);
});
test('internally valid edited history cannot replace pinned historical source',async t=>{
 const {root,b,paths}=await diskBundle(t);const edited=JSON.parse(await readFile(paths.history,'utf8'));edited.label='invented replacement';const bytes=JSON.stringify(edited);
 await writeFile(paths.history,bytes);b.manifest.files.history.sha256=digest(bytes);b.manifest.historical_results_sha256=digest(bytes);await writeFile(paths.publication,JSON.stringify(b.manifest));
 await assert.rejects(readOptionalJevbenchV162Release(root),/immutable historical source hash/);
});
for(const kind of ['manifest-only','partial','malformed']) test(`incomplete ${kind} fails closed but cannot break existing navigation`,async t=>{
 const {root,paths}=await diskBundle(t);
 if(kind==='malformed') await writeFile(paths.publication,'{broken');
 else {await rm(paths.results);if(kind==='manifest-only')for(const key of ['categories','proof','history','history-carry'])await rm(paths[key]);}
 await assert.rejects(readOptionalJevbenchV162Release(root));const logs=[];assert.equal(await hasPublishedJevbenchV162Release(root,m=>logs.push(m)),false);assert.equal(logs.length,1);assert.ok(!logs[0].includes(root));
});
for(const key of ['publication','results','categories','proof','history','history-carry']) test(`raw private exclusion applies to ${key}`,async t=>{
 const {root,paths}=await diskBundle(t);const value=JSON.parse(await readFile(paths[key],'utf8'));value.djev='private';await writeFile(paths[key],JSON.stringify(value));await assert.rejects(readOptionalJevbenchV162Release(root),/private-only/);
});
for(const [name,edit,error] of [
 ['bad commit',b=>b.proof.systems[0].model_commit='branch-name',/system proof/],
 ['missing language split',b=>delete b.categories.languages[0].open,/category descriptor/],
 ['wrong descriptor denominator',b=>b.categories.topics[0].n++,/category descriptor/],
 ['missing lane note',b=>delete b.categories.lane_note,/category field/],
 ['old supplement',b=>b.categories.supplement={},/historical category overlay/],
 ['old live cell overlay',b=>b.categories.live_category_cells=true,/historical category overlay/],
 ['incorrect category lanes',b=>b.categories.lanes[b.artifact.systems[0].key]='api',/category lanes/],
 ['private system token',b=>b.artifact.source_note='djev',/private-only/],
]) test(`schema rejects ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV162Bundle(b),error);});
for(const listing of ['wrapper','subsidized']) test(`${listing} measured row stays outside ranked cohort and G_med`,async()=>{
 const b=await fixture();const row=structuredClone(b.artifact.systems[0]);row.key=`fixture-${listing}`;row.ranked=false;row.listing=listing;row.rank=null;
 b.artifact.systems.push(row);b.artifact.roster_count++;b.proof.systems.push({...b.proof.systems[0],key:row.key});b.categories.systems[row.key]=structuredClone(b.categories.systems[b.artifact.systems[0].key]);b.categories.lanes[row.key]='selfhosted';
 assert.ok(validateJevbenchV162Bundle(b));assert.ok(!b.proof.field_median.members.some(m=>m.key===row.key));
});

// Compile the real TSX server page; stub chart/client boundaries, not its loader or historical table.
const require=createRequire(import.meta.url);
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
async function compiled(path, substitutions) {
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};runInNewContext(output,{module,exports:module.exports,require:name=>substitutions[name]??require(name),Response,Uint8Array},{filename:path});return module.exports;
}
const absent=()=>{throw new Error('NEXT_NOT_FOUND');};
async function pageModule(root) {
 return compiled('../app/jev-models/v1.6.2/page.tsx',{
  'next/navigation':{notFound:absent},
  '../../../lib/jevbench-v162-release.mjs':{readOptionalJevbenchV162Release:()=>readOptionalJevbenchV162Release(root),historicalCatalogue},
  '../../../lib/jevbench-v15-release.mjs':{withPublicAdapterIds:a=>a},
  '../../../components/JevBenchV16Board':{JevBenchV16Board:props=>React.createElement('div',{'data-fixture-board':true,'data-cohort-rows':props.artifact.systems.length,'data-category-revision':props.categories.revision})},
  '../../../components/JevBenchReleaseVersionNav':{JevBenchReleaseVersionNav:()=>React.createElement('nav',null,'version navigation')},
  '../../../components/JevHistoryLazy':{JevHistoryLazy:()=>React.createElement('div',null,'historical versions')},
 });
}
test('actual API returns 404 and actual server page invokes notFound when absent',async t=>{
 const root=await mkdtemp(join(tmpdir(),'jev162-absent-'));t.after(()=>rm(root,{recursive:true}));
 const api=await compiled('../app/api/jevbench/v1.6.2/route.ts',{'../../../../lib/jevbench-v162-release.mjs':{readOptionalJevbenchV162Release:()=>readOptionalJevbenchV162Release(root)}});
 assert.equal((await api.GET()).status,404);
 const page=await pageModule(root);await assert.rejects(page.default(),/NEXT_NOT_FOUND/);
});
test('actual server frame renders fixture native board and every immutable historical row',async t=>{
 const {root}=await diskBundle(t);const page=await pageModule(root);const html=renderToStaticMarkup(await page.default());
 const loaded=await readOptionalJevbenchV162Release(root);const rows=historicalCatalogue(loaded.historical.artifact,loaded.historical.carry);
 assert.equal((html.match(/data-bh-jev162-historical-row=/g)??[]).length,173);
 for(const row of rows)assert.ok(html.includes(`data-bh-jev162-historical-row="${row.key}"`),row.key);
 assert.match(html,/data-category-revision="v1.6.2"/);assert.match(html,/data-cohort-rows="2"/);
});
test('historical catalogue rejects measured/carry duplicate rather than dropping it',async()=>{
 const p=await readJevbenchV161Release();assert.throws(()=>historicalCatalogue(p.artifact,{...p.carry,rows:[{...p.carry.rows[0],key:p.artifact.systems[0].key}]}),/historical duplicate/);
});

test('release history uses one isolated availability path; archived pages point to the live board',async t=>{
 const {root,paths}=await diskBundle(t);
 const hist=await compiled('../components/JevReleaseHistory.tsx',{'../lib/jevbench-v162-release.mjs':{hasPublishedJevbenchV162Release:()=>hasPublishedJevbenchV162Release(root,()=>{})}});
 assert.match(renderToStaticMarkup(await hist.JevReleaseHistory()),/href="\/jev-models\/v1.6.2"/);
 await writeFile(paths.proof,'{broken');
 const html=renderToStaticMarkup(await hist.JevReleaseHistory());
 assert.ok(!html.includes('/jev-models/v1.6.2'));assert.match(html,/JevBench v1.5.7/);
 const nav=await compiled('../components/JevBenchReleaseVersionNav.tsx',{});
 for(const active of ['v1.6.1','v1.6.0','v1.5.7','v1.5.6','v1.5.5'])assert.match(renderToStaticMarkup(await nav.JevBenchReleaseVersionNav({active})),new RegExp(`Archived release JevBench ${active.replace(/\./g,'\\.')}[^<]*</span>.*href="/jev-models"`));
});
