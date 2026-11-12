import test from 'node:test';
import {jevV15BoardRow,jevV15CompareRow} from '../lib/jevbench-v15-board.mjs';
import {projectJevbenchFeed} from '../lib/jevbench-agent-feed.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {validateV189PublicText} from '../lib/jevbench-v189-release.mjs';
const key='karpo_decision_31b',D='data/raw/benchmarks/jevbench/v1.8/',load=n=>JSON.parse(readFileSync(`${D}jevbench-v1.8.10-${n}.json`));
const policy=JSON.parse(readFileSync('r198/v189/inputs/BREAKDOWN-POLICY.json'));
const V='r198/v1810/';
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
test('all v1.8.10 public artifacts retain only approved Karpo fields (equated, standard axes only)',()=>{
 for(const n of ['results','categories','proof','carry','history','history-carry','publication'])scoped(load(n));
 for(const p of [...files('r198/v189/inputs'),...files('r198/v189/src'),...files('r198/v189/receipts'),...files(V+'inputs'),...files(V+'src'),V+'receipts/EQUATED-ROW-SPEC.json',V+'receipts/EQUATING-BINDING.json',V+'receipts/BUILD.json'])scoped(JSON.parse(readFileSync(p)));
 assert.equal(validateV189PublicText(restricted),true);assert.equal(restricted.ranked,true);assert.equal(restricted.listing_note,'Measured on the 27 Oct 2026 draw; shown on the reference scale by anchor equating with four strong anchor systems (Intelligence -2.9, Calibration -1.9 points; 95% interval of the Intelligence shift -5.9 to +1.1). Its #5 place on Composite B among all systems is within the uncertainty of the draw shift.');
 assert.deepEqual(restricted.status,{status:'complete'});
 assert.equal(restricted.publication_scope,'standard-axes-only');
 for(const k of ['intelligence','calibration','noul_decisive'])assert.equal(Object.hasOwn(restricted,k),false);
 for(const dim of policy.withheld_dims)assert.equal(Object.keys(load('categories').systems[key][dim]??{}).length,0);
});
test('restricted fields and wording are rejected recursively',()=>{
 for(const f of ['n','n_items','answered_ok','missing','rows','n_over_limit','speed_n','parts','per_type_split','breakdowns','input_tokens_all','output_tokens_all']){
  assert.throws(()=>validateV189PublicText({...restricted,extra:{[f]:1}}),f);
 }
 for(const term of ['98765','98765.','98765,','The synthetic number is 98765','98,765','87654','87,654','tier','per-type','test@example.com','12345678-abcd-abcd-abcd-123456789abc','board #123','custodian'])assert.throws(()=>validateV189PublicText({...restricted,extra:term}),term);
});
test('missing breakdowns use existing empty-cell handling and an exception',()=>{
 // v1.8.9 is PASS on the base, so the exception is already recorded; v1.8.10 leaves it unchanged.
 const ex=JSON.parse(readFileSync('data/jevbench-breakdown-exceptions.json')).entries.find(e=>e.key===key);
 assert.deepEqual(ex.dims,policy.withheld_dims);assert.equal(ex.reason,policy.reason);
 const src=readFileSync('components/JevBenchV16Board.tsx','utf8');assert.ok(src.includes("publication_scope === 'standard-axes-only'"));
});

test('board and feed projections omit withheld count fields; compare values stay empty',()=>{
 const chart=jevV15BoardRow(restricted);assert.equal(Object.hasOwn(chart.speed,'n'),false);
 const compare=jevV15CompareRow(restricted);for(const pair of Object.values(compare.typeCc))assert.deepEqual(pair,{open:null,sealed:null});
 for(const cells of Object.values(compare.tierCc))for(const value of Object.values(cells))assert.equal(value,null);
 const feed=projectJevbenchFeed(load('results'),'a'.repeat(64));const row=feed.systems.find(s=>s.key===key);
 assert.ok(row);assert.equal(Object.hasOwn(row.latency,'n'),false);assert.equal(typeof row.capability.rank,'number');assert.equal(row.rank,restricted.rank);
 validateV189PublicText({...row,model_pin:restricted.model_pin});
});

test('allow-listed decimals remain whole tokens with sentence punctuation',()=>{
 const values=['10106.516129','1.5235'];
 function collect(v){if(typeof v==='number')values.push(String(v));else if(v&&typeof v==='object')for(const x of Object.values(v))collect(x);}
 collect(restricted);
 for(const value of new Set(values))for(const suffix of ['.',',',''])assert.equal(validateV189PublicText({...restricted,extra:'Published value '+value+suffix}),true,value+suffix);
});
