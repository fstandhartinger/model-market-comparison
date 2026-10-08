import assert from 'node:assert/strict';
import { languageRoster } from '../lib/jevbench-language-roster.mjs';
const active=[{key:'active',display:'Active',ranked:true,rank:1,axes:{I:99}}];
const pending=[{key:'active',display:'Older'}, {key:'carry',display:'Carry'}, {key:'waiting',display:'Waiting'}];
const carry=[{key:'carry',display:'Carry',api_flag:true,axes:{I:12},composite_v15:3,v156_rank:1}];
const cells={carry:{languages:{hi:{n:60,coverage_n:60,competence:10}}}};
const before=JSON.stringify({active,pending,carry,cells});
const rows=languageRoster(active,pending,carry,cells,r=>r.api_flag===true);
assert.equal(rows.length,3);assert.equal(rows[0],active[0]);assert.equal(rows[1].language_listing,'historical');assert.equal(rows[1].language_listing_note,'Historical headline · measured language cells');
for(const r of rows.slice(1))for(const k of ['axes','capability','jevbench_score','composite_v15','v156_rank'])assert.equal(k in r,false);
assert.equal(rows[2].language_listing_note,'Catalogue entry · language measurement pending');
assert.equal(JSON.stringify({active,pending,carry,cells}),before);
assert.deepEqual(languageRoster([],pending,carry,cells,r=>r.api_flag===true,'api').map(r=>r.key),['carry']);


import { readFileSync } from 'node:fs';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevbenchScopeCarry, jevScopeClassifier } from '../lib/jevbench-scope.mjs';
import { jevLanguageRows } from '../lib/jevbench-categories.mjs';
import { listedRadarBoards } from '../scripts/jevbench-radar-spokes.mjs';
const read = f => JSON.parse(readFileSync(new URL('../'+f, import.meta.url)));
const rel=read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
const dated=read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json');
const aggregate=read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-language-cells.json');
const merged=jevWithApiA4Rows(rel,read('data/jevbench-api-a4-equated.json'),new Map(dated.rows.map(r=>[r.key,r])));
const isApi=jevScopeClassifier(merged.systems,dated.rows,merged.not_measured);
const expected=listedRadarBoards();
for(const scope of ['open','api']) {
 const artifact=jevbenchScopeArtifact(merged,scope,isApi);
 const scopedCarry=jevbenchScopeCarry(dated,scope==='open'?'all':'api',isApi);
 const view=jevLanguageRows(languageRoster(artifact.systems,artifact.not_measured,scopedCarry.rows,aggregate.systems,isApi,scope),scope);
 assert.deepEqual(new Set(view.map(r=>r.key)),new Set(expected[scope]),scope+': language view must match every listed row');
 assert.equal(view.length,new Set(view.map(r=>r.key)).size);
 for(const row of artifact.systems)assert.equal(view.find(r=>r.key===row.key),row,'active headline object must be unchanged');
 for(const row of view.filter(r=>!artifact.systems.some(a=>a.key===r.key))) {
  assert.equal(row.ranked,false); assert.equal(row.rank,null);
  assert.equal('axes' in row,false); assert.equal('composite_v15' in row,false);
 }
}
