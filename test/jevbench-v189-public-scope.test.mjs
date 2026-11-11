import test from 'node:test';
import {jevV15BoardRow,jevV15CompareRow} from '../lib/jevbench-v15-board.mjs';
import {projectJevbenchFeed} from '../lib/jevbench-agent-feed.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {validateV189PublicText} from '../lib/jevbench-v189-release.mjs';
const key='karpo_decision_31b',D='data/raw/benchmarks/jevbench/v1.8/',load=n=>JSON.parse(readFileSync(`${D}jevbench-v1.8.9-${n}.json`));
const policy=JSON.parse(readFileSync('r198/v189/inputs/BREAKDOWN-POLICY.json'));
const restricted=load('results').systems.find(s=>s.key===key);
function scoped(value){
 if(Array.isArray(value)){for(const x of value)scoped(x);return;}
 if(!value||typeof value!=='object')return;
 if(value.key===key){const {decision,...rest}=value;if(value.dims){assert.equal(decision,policy.decision);validateV189PublicText({...rest,model_pin:restricted.model_pin});}else validateV189PublicText({...value,model_pin:restricted.model_pin});}
 if(Object.hasOwn(value,key)){
  const v=value[key];if(v&&typeof v==='object'){const dims=['topics','usecases','languages'];if(Object.keys(v).length&&Object.keys(v).every(k=>dims.includes(k))){for(const dim of policy.withheld_dims)assert.equal(Object.keys(v[dim]??{}).length,0);}else validateV189PublicText({...v,model_pin:restricted.model_pin});}
 }
 for(const v of Object.values(value))scoped(v);
}
function files(dir){return readdirSync(dir).flatMap(n=>{const p=dir+'/'+n;return statSync(p).isDirectory()&&!n.startsWith('.')?files(p):p.endsWith('.json')?[p]:[];});}
test('all new public artifacts retain only approved Karpo fields',()=>{
 for(const n of ['results','categories','proof','carry','history','history-carry','publication'])scoped(load(n));
 for(const p of [...files('r198/v189/inputs'),...files('r198/v189/src'),...files('r198/v189/receipts')])scoped(JSON.parse(readFileSync(p)));
 assert.equal(validateV189PublicText(restricted),true);
 assert.deepEqual(restricted.status,{status:'complete'});
 assert.equal(restricted.publication_scope,'standard-axes-only');
 for(const k of ['intelligence','calibration','noul_decisive'])assert.equal(Object.hasOwn(restricted,k),false);
 for(const dim of policy.withheld_dims)assert.equal(Object.keys(load('categories').systems[key][dim]??{}).length,0);
});
test('restricted fields and wording are rejected recursively',()=>{
 for(const f of ['n','n_items','answered_ok','missing','rows','n_over_limit','speed_n','parts','per_type_split','breakdowns','input_tokens_all','output_tokens_all']){
  assert.throws(()=>validateV189PublicText({...restricted,extra:{[f]:1}}),f);
 }
 for(const term of ['1495','1,495','32768','32,768','422','1500','1,500','input limit','refused','tier','per-type','test@example.com','12345678-abcd-abcd-abcd-123456789abc','board #123','custodian'])assert.throws(()=>validateV189PublicText({...restricted,extra:term}),term);
});
test('missing breakdowns use existing empty-cell handling and an exception',()=>{
 const pub=load('publication');const ex=JSON.parse(readFileSync('data/jevbench-breakdown-exceptions.json')).entries.find(e=>e.key===key);
 if(pub.review.verdict==='PASS'){assert.deepEqual(ex.dims,policy.withheld_dims);assert.equal(ex.reason,policy.reason);}
 else assert.equal(ex,undefined);
 const src=readFileSync('components/JevBenchV16Board.tsx','utf8');assert.ok(src.includes("publication_scope === 'standard-axes-only'"));
});

test('board and feed projections omit withheld count fields; compare values stay empty',()=>{
 const chart=jevV15BoardRow(restricted);assert.equal(Object.hasOwn(chart.speed,'n'),false);
 const compare=jevV15CompareRow(restricted);for(const pair of Object.values(compare.typeCc))assert.deepEqual(pair,{open:null,sealed:null});
 for(const cells of Object.values(compare.tierCc))for(const value of Object.values(cells))assert.equal(value,null);
 const feed=projectJevbenchFeed(load('results'),'a'.repeat(64));const row=feed.systems.find(s=>s.key===key);
 assert.ok(row);assert.equal(Object.hasOwn(row.latency,'n'),false);assert.equal(row.capability.rank,null);assert.equal(row.rank,null);
 validateV189PublicText({...row,model_pin:restricted.model_pin});
});
