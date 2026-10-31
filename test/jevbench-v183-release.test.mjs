import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasPublishedJevbenchV183Release,readJevbenchV183ForBoard,V183_NEW_KEYS,V183_NOTE} from '../lib/jevbench-v183-release.mjs';
import {readJevAllDataInput} from '../lib/jevbench-alldata-input.mjs';
import {jevMethodLabel,JEV_METHOD_LABEL} from '../lib/jev-decision-limit.mjs';
const d='data/raw/benchmarks/jevbench/v1.8/',load=(v,n)=>JSON.parse(readFileSync(d+`jevbench-${v}-${n}.json`));
test('v1.8.2 carries all base rows, cells and order lists exactly',()=>{
 const b=load('v1.8.2','results'),a=load('v1.8.3','results'),by=new Map(a.systems.map(s=>[s.key,s]));
 const cleaned=JSON.parse(readFileSync('r198/v183/inputs/CLEANED-ROWS.json'));for(const s of b.systems)assert.deepEqual(by.get(s.key),cleaned[s.key]??s);
 assert.deepEqual(a.board,b.board);assert.equal(a.systems.length,b.systems.length+V183_NEW_KEYS.length);
 const bc=load('v1.8.2','categories'),ac=load('v1.8.3','categories');for(const s of b.systems)assert.deepEqual(ac.systems[s.key],bc.systems[s.key]);
});
test('all additions unranked, common 1489 costs, zero draw offsets',()=>{
 for(const s of load('v1.8.3','results').systems.filter(s=>V183_NEW_KEYS.includes(s.key))){assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.not_ranked_because,V183_NOTE);assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});assert.equal(s.cost.common_basis.n_items,1489);assert.deepEqual(s.draw.offset,{C:0,I:0});}
});
test('visibility and All data loader follow independent review',async()=>{
 const visible=load('v1.8.3','publication').review.verdict==='PASS';assert.equal(await hasPublishedJevbenchV183Release(),visible);assert.equal(Boolean(await readJevbenchV183ForBoard()),visible);assert.equal(Boolean(await readJevAllDataInput('v1.8.3')),visible);
 assert.equal(readFileSync('lib/jevbench-alldata-input.mjs','utf8').split("'v1.8.3':").length-1,1);
});
test('method label is per release and preserves v1.7 byte-for-byte',()=>{
 for(let i=0;i<=23;i++)assert.equal(jevMethodLabel(`v1.7.${i}`),JEV_METHOD_LABEL);
 assert.equal(jevMethodLabel('v1.8.2'),'method v1.8 (10 s rule, GPU-time cost basis)');assert.equal(jevMethodLabel({revision:'v1.6.1',restated_by:'v1.8.3'}),jevMethodLabel('v1.8.2'));
});
test('processed tokens retain both Piccolo reads, expanded allec forwards and server Cribl usage',()=>{
 const u=JSON.parse(readFileSync('r198/v183/src/usage.json'));
 assert.equal(u['piccolo-27b'].input_tokens_all,1064693);assert.equal(u['allec-oavg'].input_tokens_all,739884);assert.equal(u['cribl-decision-1.0-9b'].input_tokens_all,853860);assert.equal(u['cribl-decision-1.0-27b'].input_tokens_all,853860);assert.equal(u['zils-ai-z3-mini-soup-preview'].input_tokens_all,964081);assert.equal(u['zils-ai-z3-mini-soup-preview'].output_tokens_all,0);
});

test('d1027 pins its exact release history and latest release',()=>{
 const draws=JSON.parse(readFileSync('data/jevbench-draw-equating.json')).draws;
 const draw=draws.find(d=>d.draw==='v1.6-regular-20261027');
 assert.deepEqual(draw.releases,['v1.7.13','v1.7.14','v1.7.15','v1.7.16','v1.7.17','v1.7.19','v1.7.21','v1.7.22','v1.8.1','v1.8.2','v1.8.3','v1.8.4']);
 assert.equal(draw.latest_release,'v1.8.4');
});

test('release navigation links its immediate predecessor',()=>{const page=readFileSync('app/jev-models/v1.8.3/page.tsx','utf8');assert.ok(page.includes('href="/jev-models/v1.8.2">Previous v1.8.2</a>'));});
