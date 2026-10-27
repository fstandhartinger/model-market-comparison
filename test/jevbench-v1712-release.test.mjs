import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readOptionalJevbenchV1711Release} from '../lib/jevbench-v1711-release.mjs';
import {validateJevbenchV1712Bundle,readOptionalJevbenchV1712Release,readJevbenchV1712ForBoard,V1712_ROOT,V1712_TEXT_BASIS_SHA256} from '../lib/jevbench-v1712-release.mjs';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const load=async p=>{const bytes=await readFile(p);return {value:JSON.parse(bytes),sha256:sha(bytes)};};
const previous=await readOptionalJevbenchV1711Release();
const predecessor=await load(`${V1712_ROOT}/jevbench-v1.7.11-publication.json`);
const f=async k=>(await load(`${V1712_ROOT}/jevbench-v1.7.12-${k}.json`)).value;
const original={manifest:await f('publication'),artifact:await f('results'),categories:await f('categories'),carry:await f('carry'),proof:await f('proof'),previous,previousManifestSha256:predecessor.sha256};
const textKeys=Object.keys(V1712_TEXT_BASIS_SHA256);
test('candidate validates; board reader accepts either PENDING-hidden or independently reviewed PASS',async()=>{
 assert.equal(validateJevbenchV1712Bundle(original,{candidate:true}),true);
 const live=await readJevbenchV1712ForBoard();
 if(original.manifest.review.verdict==='PENDING')assert.equal(live,null);
 else{assert.equal(original.manifest.review.verdict,'PASS');assert.equal(live.artifact.revision,'v1.7.12');assert.equal(validateJevbenchV1712Bundle(original),true);assert.ok((await readOptionalJevbenchV1712Release()));}
});
test('pending review is refused when published validation is requested',()=>{
 const b=structuredClone(original);b.manifest.review={engine:'PENDING',verdict:'PENDING',receipt_sha256:null};
 assert.throws(()=>validateJevbenchV1712Bundle(b),/PENDING/);
});
for(const field of ['intelligence','calibration','speed','capability'])test('numeric '+field+' tamper refuses',()=>{
 const b=structuredClone(original);const r=b.artifact.systems.find(s=>textKeys.includes(s.key));if(typeof r[field]==='number')r[field]+=1;else r[field]={bad:true};
 assert.throws(()=>validateJevbenchV1712Bundle(b,{candidate:true}));
});
for(const mutate of [r=>r.cost.basis+=' extra',r=>r.cost.usd_per_1000+=1])test('text-only row gates refuse tamper '+String(mutate),()=>{
 const b=structuredClone(original);mutate(b.artifact.systems.find(s=>textKeys.includes(s.key)));assert.throws(()=>validateJevbenchV1712Bundle(b,{candidate:true}));
});
test('unrelated carried row and cell tampering refuse',()=>{
 for(const kind of ['row','cell']){const b=structuredClone(original);const k=b.artifact.systems.find(s=>!textKeys.includes(s.key)).key;if(kind==='row')b.artifact.systems.find(s=>s.key===k).capability+=1;else b.categories.systems[k]={bad:1};assert.throws(()=>validateJevbenchV1712Bundle(b,{candidate:true}));}
});
test('ranked order tamper refuses',()=>{
 const b=structuredClone(original);b.artifact.board.A.order.reverse();
 assert.throws(()=>validateJevbenchV1712Bundle(b,{candidate:true}));
});
