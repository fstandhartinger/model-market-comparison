import test from 'node:test';
import {JEVBENCH_RELEASES} from '../lib/jevbench-releases.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateJevbenchV171Bundle,readJevbenchV171ForBoard,readOptionalJevbenchV171Release,hasPublishedJevbenchV171Release,V171_NEW_KEYS} from '../lib/jevbench-v171-release.mjs';
import {readOptionalJevbenchV170Release} from '../lib/jevbench-v170-release.mjs';
const base='data/raw/benchmarks/jevbench/v1.7/';
const load=async n=>JSON.parse(await readFile(`${base}jevbench-v1.7.1-${n}.json`));
const sha=b=>createHash('sha256').update(b).digest('hex');
const b={manifest:await load('publication'),artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV170Release(),previousManifestSha256:sha(await readFile(`${base}jevbench-v1.7.0-publication.json`))};
const opts={candidate:true};
const mutate=(fn,pattern)=>{const x=structuredClone(b);fn(x);assert.throws(()=>validateJevbenchV171Bundle(x,opts),pattern);};
test('v1.7.1 candidate preserves every carried score, CI, diagnostic, category and dated carry',()=>{
 assert.equal(validateJevbenchV171Bundle(b,opts),true);
 assert.deepEqual(JEVBENCH_RELEASES.slice(0,2).map(r=>r.version),['v1.7.1','v1.7.0']);
});
test('v1.7.1 PENDING stays unavailable to board, API and navigation',async t=>{
 if(b.manifest.review.verdict==='PASS')return t.skip('published');
 assert.equal(await readJevbenchV171ForBoard(),null);
 assert.equal(await hasPublishedJevbenchV171Release(),false);
 await assert.rejects(()=>readOptionalJevbenchV171Release(),/independent review PENDING/);
 for(const p of ['app/api/jevbench/v1.7.1/route.ts','app/jev-models/v1.7.1/page.tsx'])assert.match(await readFile(p,'utf8'),/readJevbenchV171ForBoard\(\)/);
});
test('v1.7.1 rejects changed carried point estimates or intervals',()=>{
 mutate(x=>{x.artifact.systems.find(s=>!V171_NEW_KEYS.includes(s.key)).axes.speed+=0.1;},/carried row/);
 mutate(x=>{x.artifact.systems.find(s=>s.composite_ci95?.A&&!V171_NEW_KEYS.includes(s.key)).composite_ci95.A[0]+=0.1;},/carried row/);
});
test('v1.7.1 rejects altered new row, dropped row and duplicated row',()=>{
 mutate(x=>{x.artifact.systems.find(s=>s.key===V171_NEW_KEYS[0]).capability+=1;},/new row/);
 mutate(x=>x.artifact.systems.pop(),/roster/);
 mutate(x=>x.artifact.systems.push(x.artifact.systems[0]),/duplicate/);
});
test('v1.7.1 rejects changed category, rank, price pin, provenance and predecessor',()=>{
 mutate(x=>{const k=Object.keys(x.previous.categories.systems)[0];x.categories.systems[k]={};},/carried cells/);
 mutate(x=>{x.artifact.board.A.order.reverse();},/rank|sort/);
 mutate(x=>{x.proof.pricing_module_sha256='b'.repeat(64);},/pricing pin/);
 mutate(x=>{x.proof.new_rows[V171_NEW_KEYS[0]].raw_sha256='bad';},/source pins/);
 mutate(x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64);},/predecessor/);
});

test('v1.7.1 refuses missing release review and changed-top-five publication without GO',()=>{
 assert.throws(()=>validateJevbenchV171Bundle({...b,manifest:{...b.manifest,review:{verdict:'PENDING'}}}),/review PENDING/);
 const x=structuredClone(b);x.manifest.review={verdict:'PASS',engine:'synthetic-test',receipt_sha256:'a'.repeat(64)};
 x.proof.publication_approval.top_five_effect='changes';
 assert.throws(()=>validateJevbenchV171Bundle(x),/Florian GO/);
});

test('v1.7.1 merged scope ranks and Capability cap lists match the independent site fixture',async()=>{
 const {jevLiveAllArtifact}=await import('../lib/jevbench-cohort-merge.mjs');
 const {jevbenchScopeArtifact,jevScopeClassifier}=await import('../lib/jevbench-scope.mjs');
 const {jevClassRows,JEV_V16_CLASS_OPTIONS}=await import('../lib/jevbench-jev-class.mjs');
 const f=JSON.parse(await readFile('test/fixtures/jevbench-v171-ranks.json'));
 const {readJevbenchV157Release}=await import('../lib/jevbench-v15-release.mjs');
 const historical=await readJevbenchV157Release();
 const isApi=jevScopeClassifier(b.artifact.systems,b.carry.rows,historical.artifact.systems,historical.artifact.not_measured);
 const arts={all:jevLiveAllArtifact(b.artifact,isApi),open:jevbenchScopeArtifact(b.artifact,'open',isApi),api:jevbenchScopeArtifact(b.artifact,'api',isApi)};
 for(const [scope,art] of Object.entries(arts)) {
  const ranked=art.systems.filter(s=>s.ranked);
  assert.deepEqual(Object.fromEntries(ranked.map(s=>[s.key,[s.rank,s.ranks.A,s.ranks.B,s.ranks.C,s.ranks.capability]])),f.views[scope].ranks,scope+' ranks');
  for(const m of ['A','B','C'])assert.deepEqual(art.board[m].order,f.views[scope].composite[m],scope+' '+m);
  for(const [label,opts]of [['official_caps',{}],['no_caps',{costFactor:Infinity,latencyFactor:Infinity}],['cost_off_latency_2x',{costFactor:Infinity}],['latency_none',{latencyFactor:Infinity}]]) {
   const rows=jevClassRows(ranked,{...JEV_V16_CLASS_OPTIONS,...opts}).rows.filter(r=>r.inClass).map(r=>r.row.key);
   assert.deepEqual(rows,f.views[scope].capability[label],scope+' '+label);
   if(label==='official_caps')assert.ok(!rows.includes('turion-jev-31b'));
  }
 }
});

test('version-peer links survive a v1.7.1 artifact and later v1.7 patches',async()=>{
 const source=await readFile('app/jev-models/[system]/page.tsx','utf8');
 const expression=source.match(/const versionPeer = (.*);/)[1];
 const {runInNewContext}=await import('node:vm');
 const peer={key:'standard_one_3b_sh',label:'Predecessor: StandardOne-3B-SH'};
 for(const revision of [b.artifact.revision,'v1.7.0','v1.7.2','v1.7.10']) {
  const result=runInNewContext(expression,{data:{artifact:{...b.artifact,revision}},row:{key:'standard_one_3b_sh_v4'},versionPeers:{standard_one_3b_sh_v4:peer}});
  assert.equal(result,peer,revision);
 }
 for(const revision of ['v1.6.43','v1.70.0','v1.7.invalid'])assert.equal(runInNewContext(expression,{data:{artifact:{revision}},row:{key:'standard_one_3b_sh_v4'},versionPeers:{standard_one_3b_sh_v4:peer}}),null,revision);
});

test('Turion remains ranked with over-cap cost and a bound standing GO',()=>{
 const row=b.artifact.systems.find(s=>s.key==='turion-jev-31b');
 assert.equal(row.listing,'ranked');
 assert.ok(row.cost.usd_per_1000>0.06459465517241379);
 const a=b.proof.publication_approval;
 assert.equal(a.status,'GO (standing, no top-five change)');
 assert.equal(a.top_five_effect,'none');
 assert.equal(a.top_five_preview.sha256,b.proof.topfive_diff_sha256);
 mutate(x=>{x.proof.publication_approval.top_five_preview.sha256='b'.repeat(64);},/standing GO proof/);
});
