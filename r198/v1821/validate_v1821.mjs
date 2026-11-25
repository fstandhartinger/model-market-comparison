import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateJevbenchV1821Bundle,readJevbenchV1821Candidate,readJevbenchV1821ForBoard,V1821_NEW_KEYS} from '../../lib/jevbench-v1821-release.mjs';
import {readJevbenchV1820Candidate} from '../../lib/jevbench-v1820-release.mjs';
const release=await readJevbenchV1821Candidate(),previous=await readJevbenchV1820Candidate();
const original={manifest:release.manifest,artifact:release.artifact,categories:release.categories,carry:release.carry,proof:release.proof,previous,previousManifestSha256:createHash('sha256').update(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.20-publication.json')).digest('hex')};
assert.equal(validateJevbenchV1821Bundle(original,{candidate:true}),true);
const key=V1821_NEW_KEYS[0],row=x=>x.artifact.systems.find(s=>s.key===key);let n=0;
for(const fn of [x=>x.manifest.predecessor.publication_sha256='0'.repeat(64),x=>x.artifact.systems[0].display+='x',x=>x.artifact.board.A.order.reverse(),x=>x.artifact.n_ranked++,x=>x.artifact.roster_count++,x=>x.proof.scorers.score_v15='0'.repeat(64),x=>x.proof.pricing_module_sha256='0'.repeat(64),x=>x.proof.equating.offset.I=0,x=>row(x).axes.intelligence++,x=>row(x).ranked=true,x=>row(x).cost.usd_per_1000++,x=>row(x).model_pin='other',x=>row(x).disclosure+=' /home/private',x=>row(x).visibility='private',x=>x.categories.systems[key]={},x=>x.proof.publication_approval.fairness_review_required=true]){
 const x=structuredClone(original);fn(x);assert.throws(()=>validateJevbenchV1821Bundle(x,{candidate:true}));n++;
}
if(release.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1821ForBoard(),null);assert.throws(()=>validateJevbenchV1821Bundle(original));n++;}
for(const engine of ['synthetic-preview-only','PENDING']){const x=structuredClone(original);x.manifest.review={verdict:'PASS',engine,receipt_sha256:'a'.repeat(64)};assert.throws(()=>validateJevbenchV1821Bundle(x));n++;}
writeFileSync('r198/v1821/receipts/VALIDATOR.json',JSON.stringify({status:'PASS',negative_controls:n,carried_rows:previous.artifact.systems.length},null,1)+'\n');
console.log('PASS validator;',n,'negative controls');
