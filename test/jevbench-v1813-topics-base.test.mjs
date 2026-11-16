import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(p,'utf8'));
test('v1.8.13 retains the published predecessor topic exceptions',()=>{
 const base=load('r198/v1813/inputs/TOPICS-BASE.json');
 const prior=load('r198/v1812/inputs/TOPICS-BASE.json');
 const byKey=new Map(base.entries.map(e=>[e.key,e]));
 for(const entry of prior.entries) assert.deepEqual(byKey.get(entry.key),entry,entry.key);
 const newKeys=load('r198/v1812/src/new-keys.json');
 const categories=load('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.12-categories.json');
 for(const key of newKeys) if(!Object.keys(categories.systems[key]?.topics??{}).length)
  assert.ok(byKey.get(key)?.dims.includes('topics'),`${key}: published predecessor topic exception retained`);
 const own=load('r198/v1813/src/new-keys.json');
 for(const key of own) assert.equal(byKey.has(key),false,'pending additions stay out of the predecessor base');
});
