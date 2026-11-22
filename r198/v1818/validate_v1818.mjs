import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateJevbenchV1818Bundle,readJevbenchV1818Candidate,readJevbenchV1818ForBoard,V1818_NEW_KEYS} from '../../lib/jevbench-v1818-release.mjs';
import {readJevbenchV1817Candidate} from '../../lib/jevbench-v1817-release.mjs';
const release=await readJevbenchV1818Candidate(),previous=await readJevbenchV1817Candidate();
const original={manifest:release.manifest,artifact:release.artifact,categories:release.categories,carry:release.carry,proof:release.proof,previous,previousManifestSha256:createHash('sha256').update(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.17-publication.json')).digest('hex')};
assert.equal(validateJevbenchV1818Bundle(original,{candidate:true}),true);
const key=V1818_NEW_KEYS[0],row=x=>x.artifact.systems.find(s=>s.key===key);let n=0;
for(const fn of [x=>x.manifest.predecessor.publication_sha256='0'.repeat(64),x=>x.artifact.systems[0].display+='x',x=>x.artifact.board.A.order.reverse(),x=>x.artifact.n_ranked++,x=>x.artifact.roster_count++,x=>x.proof.scorers.score_v15='0'.repeat(64),x=>x.proof.pricing_module_sha256='0'.repeat(64),x=>x.proof.equating.offset.I=0,x=>row(x).axes.intelligence++,x=>row(x).ranked=false,x=>row(x).cost.usd_per_1000++,x=>row(x).model_pin='other',x=>row(x).disclosure+=' /home/private',x=>row(x).visibility='private',x=>x.categories.systems[key]={},x=>x.proof.publication_approval.fairness_review_required=!x.proof.publication_approval.fairness_review_required]){
 const x=structuredClone(original);fn(x);assert.throws(()=>validateJevbenchV1818Bundle(x,{candidate:true}));n++;
}
if(release.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1818ForBoard(),null);assert.throws(()=>validateJevbenchV1818Bundle(original));n++;}
writeFileSync('r198/v1818/receipts/VALIDATOR.json',JSON.stringify({status:'PASS',negative_controls:n,carried_rows:previous.artifact.systems.length},null,1)+'\n');
console.log('PASS validator;',n,'negative controls');
