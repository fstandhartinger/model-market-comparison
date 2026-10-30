import test from 'node:test';
import assert from 'node:assert/strict';
import {bundle} from '../r198/v180/validate_v180.mjs';
import {validateJevbenchV180Bundle,validateV180Approval} from '../lib/jevbench-v180-release.mjs';
test('v1.8.0 cost restatement and negative controls',()=>assert.equal(validateJevbenchV180Bundle(bundle,{candidate:true}),true));
test('v1.8.0 publication requires a fully bound GO',()=>assert.throws(()=>validateV180Approval({status:'PENDING'})));
test('v1.8.0 rejects a wiped Capability order against v1.7.23',()=>{
 const b=structuredClone(bundle);b.artifact.board.capability.order=[];
 assert.throws(()=>validateJevbenchV180Bundle(b,{candidate:true}),/capability board unchanged/);
});
test('v1.8.0 retains historical Capability ranks on unranked rows',()=>{
 for(const [key,rank]of [['apus-openjev-v1-35b-a3b',66],['bb-qwen3.5-4b-lora',65]]){
  assert.equal(bundle.artifact.systems.find(s=>s.key===key).ranks.capability,rank);
 }
 const b=structuredClone(bundle);b.artifact.systems.find(s=>s.key==='apus-openjev-v1-35b-a3b').ranks.capability=null;
 assert.throws(()=>validateJevbenchV180Bundle(b,{candidate:true}),/capability rank unchanged/);
});
