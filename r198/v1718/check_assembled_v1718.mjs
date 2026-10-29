import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const R=new URL('./receipts/',import.meta.url),load=n=>JSON.parse(readFileSync(new URL(n,R)));
const b=load('topfive-before.json'),a=load('topfive-after.json');
assert.equal(b.restated_by,'v1.7.17');assert.equal(a.restated_by,'v1.7.18');
const lists=x=>Object.fromEntries([
 ...Object.entries(x.full_rankings).flatMap(([s,r])=>Object.entries(r).flatMap(([group,ms])=>Object.entries(ms).map(([m,rows])=>[s+'/'+group+'/'+m,rows.slice(0,5).map(r=>r.key)]))),
 ...Object.entries(x.release_lists).map(([m,keys])=>['release/'+m,keys.slice(0,5)])]);
const before=lists(b),after=lists(a);assert.equal(Object.keys(after).length,40);assert.deepEqual(after,before);
writeFileSync(new URL('ASSEMBLED-TOPFIVE.json',R),JSON.stringify({status:'PASS',baseline:'v1.7.17',standard_assembled_lists:40,changed_lists:[],restated_by:a.restated_by,rows:a.merged_rows},null,1)+'\n');
console.log('PASS 0/40 actual assembled top-five lists changed against v1.7.17');
