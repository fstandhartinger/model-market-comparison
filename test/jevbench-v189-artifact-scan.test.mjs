import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {validateV189PublicText,V189_NEW_ROWS} from '../lib/jevbench-v189-release.mjs';
import {JEVBENCH_RELEASES} from '../lib/jevbench-releases.mjs';
const K='karpo_decision_31b',pin=V189_NEW_ROWS[K].model_pin;
const policy=JSON.parse(readFileSync('r198/v189/inputs/BREAKDOWN-POLICY.json'));
const check=v=>validateV189PublicText({...v,model_pin:pin});
function walk(v){
 if(Array.isArray(v)){v.forEach(walk);return;}
 if(!v||typeof v!=='object')return;
 if(v.key===K){
  if(v.dims){const {decision,...publicFields}=v;assert.equal(decision,policy.decision);check(publicFields);}
  else check(v);
 }
 if(Object.hasOwn(v,K)){
  const row=v[K],dims=['topics','usecases','languages'];
  if(row&&typeof row==='object'){if(Object.keys(row).length&&Object.keys(row).every(k=>dims.includes(k)))for(const dim of policy.withheld_dims)assert.equal(Object.keys(row[dim]??{}).length,0);else check(row);}
  else if(typeof row==='string')check({text:row});
 }
 Object.values(v).forEach(walk);
}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!e.name.startsWith('.')?files(dir+'/'+e.name):e.isFile()&&e.name.endsWith('.json')?[dir+'/'+e.name]:[]);}
test('every changed public data artifact and release page is scanned in the new row scope',()=>{
 const bound=JSON.parse(readFileSync('r198/v189/receipts/SOURCE-BINDING-PATHS.json')).paths;
 const paths=new Set([...bound.filter(p=>p.endsWith('.json')), ...files('r198/v189/inputs'), ...files('r198/v189/src'), ...files('r198/v189/receipts'), 'data/jevbench-breakdown-exceptions.json']);
 for(const p of paths)if(existsSync(p))walk(JSON.parse(readFileSync(p)));
 for(const n of ['results','categories','carry','proof','history','history-carry','publication'])walk(JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.9-${n}.json`)));
 check(V189_NEW_ROWS[K]);
 // Scan visible JSX literals and metadata; data expressions are checked in the bound artifacts above.
 const page=readFileSync('app/jev-models/v1.8.9/page.tsx','utf8');
 for(const m of page.matchAll(/>([^<>]*)</g))check({text:m[1].replace(/\{[^}]*\}/g,'')});
 for(const m of page.matchAll(/(?:title|description):'([^']*)'/g))check({text:m[1]});
 check({text:JEVBENCH_RELEASES.find(r=>r.version==='v1.8.9').text});
});
