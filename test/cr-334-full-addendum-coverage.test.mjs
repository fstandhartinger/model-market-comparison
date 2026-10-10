import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listedRadarBoards, listedRadarCategoryView, listedLanguageCells } from '../scripts/jevbench-radar-spokes.mjs';
import { jevbenchCategoryView, withLiveCategoryCells, validateCategoryArtifact } from '../lib/jevbench-categories.mjs';
import { withApiFullAddendumCategories } from '../lib/jevbench-api-full-addenda.mjs';
import { radarSpokeFailures } from '../lib/jevbench-radar-spoke-gate.mjs';

// Public-intended inventory counts, authenticated separately by the producer.
// Everything else is invented: this fixture grants no publication or model admission.
const counts = {
  languages: [['en',1135],['de',40],['fr',16],['es',30],['it',13],['pt',24],['nl',17],['da',16],['sv',8],['no',4],['fi',7],['pl',39],['cs',9],['el',17],['tr',11],['uk',9],['ar',17],['hi',26],['zh',12],['ja',22],['ko',9],['id',4],['mixed',15]],
  topics: [['math',282],['coding',197],['law_policy',747],['finance_commerce',79],['support_ops',100],['everyday_language',53],['safety_security',42]],
  usecases: [['search_retrieval',24],['scientific_discovery',21],['model_routing',318],['llm_guardrails',25],['code_linting',22],['feature_extraction',16],['recruiting',17],['lead_generation',36],['customer_support',158],['insurance_claims',29],['financial_crime',54],['legal_compliance',343],['ecommerce_marketplaces',43],['moderation_trust_safety',37],['advertising',30],['gaming',18],['risk_assessment',53],['demand_forecasting',21],['knowledge_graphs',22],['other',213]],
};
function fixture() {
  const key = 'synthetic-pending-full-coverage', hash = 'a'.repeat(64);
  return {schema_version:1,kind:'jevbench-api-full-addenda',entries:[{
    key,release:'synthetic',publication_status:'published',published_at:'2026-10-10T00:00:00Z',
    provenance:{parent:'synthetic',method:'O1S',g_med_s:7,counts:{S:1200,P:300},cost_n:1479,
      ...Object.fromEntries(['input','run','scorer','categories','acceptance','publication_receipt','cost_mask'].map(k=>[`${k}_sha256`,hash])),source_url:'https://example.com/synthetic'},
    row:{key,display:'Synthetic pending coverage',api_flag:true,ranked:true,listing:'ranked',capability:50,
      scores:{A:50,B:50,C:50},axes:{intelligence:50,calibration:50,speed:50,cost:50},
      speed:{p50_s_raw:1,p50_s_adjusted:1,adjustment:'none (API)'},cost:{usd_per_1000:.01,basis:'synthetic'},
      status:{rows:1500,answered_ok:1479,status:'complete'},v16:{lane:'api',full_set_api:true,equated:false,n_items:1500,run_sha256:hash}},
    coverage:Object.fromEntries(Object.entries(counts).map(([dim,cells])=>[dim,cells.map(([key,n])=>({key,label:key,n,answered_ok:n,errors:0,coverage_n:n,competence:n<15?null:50,types:['choice'],pool:'S+P'}))])),
  }]};
}
test('full addendum is listed on API board and its real thin cells remain pending', () => {
  const a=fixture(),key=a.entries[0].key,boards=listedRadarBoards(a);
  assert.ok(boards.api.includes(key)); assert.ok(boards.open.includes(key), 'open comparison scope includes API rows too');
  const view=listedRadarCategoryView([key],a),languages=listedLanguageCells(a);
  assert.equal(radarSpokeFailures(view,[key])[key].filter(k=>k.startsWith('usecases.')).length,10);
  assert.equal(Object.values(languages.systems[key].languages).filter(c=>c.competence===null).length,10);
  assert.equal(Object.values(languages.systems[key].languages).filter(c=>c.coverage_n<60).length,22);
  const original=listedLanguageCells(); assert.equal(original.systems[key],undefined,'fixture never inserts real data');
});
test('strict CLI includes full-addendum inventory; an interim exception cannot satisfy completion', () => {
  const root=mkdtempSync(join(tmpdir(),'jev-full-addendum-'));
  try {
    mkdirSync(join(root,'scripts'));mkdirSync(join(root,'lib'));
    const radarUrl=new URL('../scripts/jevbench-radar-spokes.mjs',import.meta.url).href;
    const categoryUrl=new URL('../lib/jevbench-categories.mjs',import.meta.url).href;
    writeFileSync(join(root,'scripts/jevbench-radar-spokes.mjs'),`import * as r from ${JSON.stringify(radarUrl)};\nconst a=${JSON.stringify(fixture())};\nexport const listedRadarBoards=()=>r.listedRadarBoards(a);\nexport const listedLanguageCells=()=>r.listedLanguageCells(a);\nexport const listedRadarCategoryView=keys=>{const v=r.listedRadarCategoryView(keys,a);v.spokeExceptions[a.entries[0].key]={reason:'Synthetic interim exception'};return v;};`);
    writeFileSync(join(root,'lib/jevbench-categories.mjs'),`export * from ${JSON.stringify(categoryUrl)};`);
    const out=join(root,'report.json');
    const run=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/jevbench-full-coverage.mjs',import.meta.url)),'--repo',root,'--output',out],{encoding:'utf8'});
    assert.equal(run.status,1,run.stderr);
    assert.equal(run.stderr,'','CLI must reach its report, not fail while loading');
    const report=JSON.parse(readFileSync(out)), row=report.boards.api.rows.find(r=>r.key===fixture().entries[0].key);
    assert.equal(row.has_interim_exception,true);assert.equal(row.pass,false);
    assert.equal(row.gaps.languages.length,22);assert.equal(row.gaps.usecases.length,10);assert.deepEqual(row.gaps.topics,[]);
    assert.equal(report.exceptions_satisfy_completion,false);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('shared page consumer uses admitted row bounds without changing historical taxonomy or accepting forged bounds', () => {
  const base=withLiveCategoryCells(JSON.parse(readFileSync(new URL('../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json',import.meta.url))));
  const a=fixture(),key=a.entries[0].key;
  const overlay=withApiFullAddendumCategories(base,a);
  const view=jevbenchCategoryView('v1.6.1',[key],{artifact:overlay});
  assert.deepEqual(overlay.usecases,base.usecases,'global taxonomy/counts remain unchanged');
  assert.equal(view.systems[key].usecases.other[1],213);
  assert.equal(view.rowCategoryPoolSizes[key].usecases.other,213);
  assert.equal(overlay.systems[key].languages.it,undefined,'n13 has no numerical page cell');
  assert.throws(()=>validateCategoryArtifact({...overlay},['topics','usecases']),/other: cell/,'copied metadata is not an authenticated builder result');
  overlay.systems[key].usecases.other.n=214;
  assert.throws(()=>jevbenchCategoryView('v1.6.1',[key],{artifact:overlay}),/other: cell/,'admitted bounds cannot grow after construction');
});
