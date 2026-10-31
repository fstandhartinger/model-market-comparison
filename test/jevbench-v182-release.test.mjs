import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasPublishedJevbenchV182Release,readJevbenchV182ForBoard,V182_NEW_KEYS,V182_NOTE} from '../lib/jevbench-v182-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {jevMethodLabel,JEV_METHOD_LABEL} from '../lib/jev-decision-limit.mjs';
const d='data/raw/benchmarks/jevbench/v1.8/',load=(v,n)=>JSON.parse(readFileSync(d+`jevbench-${v}-${n}.json`));
test('v1.8.1 carries all base rows, cells and order lists exactly',()=>{
 const b=load('v1.8.1','results'),a=load('v1.8.2','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 const cleaned=JSON.parse(readFileSync('r198/v182/inputs/CLEANED-ROWS.json'));for(const s of b.systems)assert.deepEqual(by.get(s.key),cleaned[s.key]??s);
 assert.deepEqual(a.board,b.board);assert.equal(a.systems.length,b.systems.length+V182_NEW_KEYS.length);
 const bc=load('v1.8.1','categories'),ac=load('v1.8.2','categories');for(const s of b.systems)assert.deepEqual(ac.systems[s.key],bc.systems[s.key]);
});
test('all additions unranked, common 1489 costs, zero draw offsets',()=>{
 for(const s of load('v1.8.2','results').systems.filter(s=>V182_NEW_KEYS.includes(s.key))){assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.not_ranked_because,V182_NOTE);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.equal(s.cost.common_basis.n_items,1489);assert.deepEqual(s.draw.offset,{C:0,I:0});}
});
test('visibility and All data loader follow independent review',async()=>{
 const visible=load('v1.8.2','publication').review.verdict==='PASS';assert.equal(await hasPublishedJevbenchV182Release(),visible);assert.equal(Boolean(await readJevbenchV182ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.2')),visible);
 assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.2':").length-1,1);
});
test('method label is per release and preserves v1.7 byte-for-byte',()=>{
 for(let i=0;i<=23;i++)assert.equal(jevMethodLabel(`v1.7.${i}`),JEV_METHOD_LABEL);
 assert.equal(jevMethodLabel('v1.8.1'),'method v1.8 (10 s rule, GPU-time cost basis)');assert.equal(jevMethodLabel({revision:'v1.6.1',restated_by:'v1.8.2'}),jevMethodLabel('v1.8.1'));
});
test('processed input includes expanded Oenogarum prompts and both Piccolo reads',()=>{
 const u=JSON.parse(readFileSync('r198/v182/src/usage.json'));assert.equal(u.oenogarum.input_tokens_all,739884);for(const k of ['piccolo-4b','piccolo-9b'])assert.equal(u[k].input_tokens_all,1080355);
});

test('d1027 pins its exact release history and latest release',()=>{
 const draws=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws;
 const draw=draws.find(d=>d.draw==='v1.6-regular-20261027');
 assert.deepEqual(draw.releases,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4']);
 assert.equal(draw.latest_release,'v1.8.4');
});
