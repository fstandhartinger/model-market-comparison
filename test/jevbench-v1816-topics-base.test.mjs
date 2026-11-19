import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
const load=p=>JSON.parse(readFileSync(p,'utf8'));

test('v1.8.16 retains the published predecessor topic exceptions',()=>{
 const base=load('r198/v1816/inputs/TOPICS-BASE.json');
 // Reconstruct the published predecessor state with its publisher in an isolated fixture.
 const root=mkdtempSync(join(tmpdir(),'v1815-published-topics-'));
 try{
  for(const path of ['r198/v1815/add_topics_exception_v1815.py','r198/v1815/inputs/TOPICS-BASE.json','r198/v1815/src/new-keys.json','data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.15-publication.json']){
   const dest=join(root,path);mkdirSync(dirname(dest),{recursive:true});copyFileSync(path,dest);
  }
  assert.equal(load(join(root,'data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.15-publication.json')).review.verdict,'PASS');
  execFileSync('python3',['-B',join(root,'r198/v1815/add_topics_exception_v1815.py')],{cwd:root});
  const published=load(join(root,'data/jevbench-breakdown-exceptions.json'));
  const baseByKey=new Map(base.entries.map(e=>[e.key,e]));
  for(const entry of published.entries) assert.deepEqual(baseByKey.get(entry.key),entry,`${entry.key}: published predecessor exception retained`);
  const current=load('data/jevbench-breakdown-exceptions.json');
  const currentByKey=new Map(current.entries.map(e=>[e.key,e]));
  for(const entry of base.entries) assert.deepEqual(currentByKey.get(entry.key),entry,`${entry.key}: pinned main exception retained`);
 }finally{rmSync(root,{recursive:true,force:true});}
 const byKey=new Map(base.entries.map(e=>[e.key,e]));
 const newKeys=load('r198/v1815/src/new-keys.json');
 const categories=load('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.15-categories.json');
 for(const key of newKeys) if(!Object.keys(categories.systems[key]?.topics??{}).length)
  assert.ok(byKey.get(key)?.dims.includes('topics'),`${key}: published predecessor topic exception retained`);
 const own=load('r198/v1816/src/new-keys.json');
 for(const key of own) assert.equal(byKey.has(key),false,'pending additions stay out of the predecessor base');
});
