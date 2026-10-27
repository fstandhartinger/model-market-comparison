import test from 'node:test';import assert from 'node:assert/strict';
import {bundle} from '../r196/v1711/validate_v1711.mjs';
import {validateJevbenchV1711Bundle,readJevbenchV1711ForBoard,V1711_CHANGED_KEYS} from '../lib/jevbench-v1711-release.mjs';
const original=await bundle();
test('candidate validates; publication reader accepts either PENDING-hidden or independently reviewed PASS',async()=>{
 assert.equal(validateJevbenchV1711Bundle(original,{candidate:true}),true);
 const live=await readJevbenchV1711ForBoard();
 if(original.manifest.review.verdict==='PENDING')assert.equal(live,null);else{assert.equal(original.manifest.review.verdict,'PASS');assert.equal(live.artifact.revision,'v1.7.11');}
});
for(const field of ['intelligence','calibration','speed','capability'])test('noncost '+field+' tamper refuses',()=>{
 const b=structuredClone(original);const r=b.artifact.systems.find(s=>V1711_CHANGED_KEYS.includes(s.key));if(typeof r[field]==='number')r[field]+=1;else r[field]={bad:true};
 assert.throws(()=>validateJevbenchV1711Bundle(b,{candidate:true}));
});
for(const mutate of [r=>r.cost.kind='measured',r=>r.cost.common_basis.n_items=1500,r=>r.model_pin='wrong',r=>r.cost.basis+=' PLACEHOLDER',r=>r.cost.basis+=' Florian'])test('corrected row gates refuse tamper '+String(mutate),()=>{
 const b=structuredClone(original);mutate(b.artifact.systems.find(s=>V1711_CHANGED_KEYS.includes(s.key)));assert.throws(()=>validateJevbenchV1711Bundle(b,{candidate:true}));
});
test('changed top-five cannot publish with pending fairness',()=>{
 const b=structuredClone(original);b.manifest.review={verdict:'PASS',engine:'test',receipt_sha256:'a'.repeat(64)};
 if(b.proof.publication_approval.top_five_effect==='changed'){b.proof.publication_approval.fairness_check.verdict='PENDING';assert.throws(()=>validateJevbenchV1711Bundle(b),/FAIR/);}
});
test('unrelated carried row and cell tampering refuse',()=>{
 for(const kind of ['row','cell']){const b=structuredClone(original);const k=b.artifact.systems.find(s=>!V1711_CHANGED_KEYS.includes(s.key)).key;if(kind==='row')b.artifact.systems.find(s=>s.key===k).capability+=1;else b.categories.systems[k]={bad:1};assert.throws(()=>validateJevbenchV1711Bundle(b,{candidate:true}));}
});

for(const kind of ['reference','recount'])test('proof '+kind+' tamper refuses',()=>{
 const b=structuredClone(original),r=b.proof.repriced_rows[V1711_CHANGED_KEYS[0]];
 if(kind==='reference')r.price_reference.in=999;else r.audit_sha256='0'.repeat(64);
 assert.throws(()=>validateJevbenchV1711Bundle(b,{candidate:true}));
});
