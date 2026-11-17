import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const load=p=>JSON.parse(readFileSync(p,'utf8'));

test('v1.8.15 retains the published predecessor topic exceptions',()=>{
 const base=load('r198/v1815/inputs/TOPICS-BASE.json');
 // The predecessor input is its PRE-publication state. v1.8.14 deliberately
 // replaces Karpo's former three-dimension exception when publishing its cells.
 // Reconstruct the published state with the immutable predecessor publisher in
 // an isolated public-only fixture, then compare the entire candidate base.
 const root=mkdtempSync(join(tmpdir(),'v1814-published-topics-'));
 try{
  for(const path of ['r198/v1814/add_topics_exception_v1814.py','r198/v1814/inputs/TOPICS-BASE.json','r198/v1814/src/new-keys.json','data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.14-publication.json']){
   const dest=join(root,path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(path,dest);
  }
  assert.equal(load(join(root,'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.14-publication.json')).review.verdict,'PASS');
  execFileSync('python3',['-B',join(root,'r198/v1814/add_topics_exception_v1814.py')],{cwd:root});
  assert.deepEqual(base,load(join(root,'data/jevbench-breakdown-exceptions.json')),'entire published predecessor exception state retained');
 }finally{rmSync(root,{recursive:true,force:true});}
 const byKey=new Map(base.entries.map(e=>[e.key,e]));
 const newKeys=load('r198/v1814/src/new-keys.json');
 const categories=load('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.14-categories.json');
 for(const key of newKeys) if(!Object.keys(categories.systems[key]?.topics??{}).length)
  assert.ok(byKey.get(key)?.dims.includes('topics'),`${key}: published predecessor topic exception retained`);
 const own=load('r198/v1815/src/new-keys.json');
 for(const key of own) assert.equal(byKey.has(key),false,'pending additions stay out of the predecessor base');
});
