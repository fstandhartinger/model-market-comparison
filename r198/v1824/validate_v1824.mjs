import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateJevbenchV1824Bundle,readJevbenchV1824Candidate,readJevbenchV1824ForBoard,V1824_NEW_KEYS} from '../../lib/jevbench-v1824-release.mjs';
import {readJevbenchV1823Candidate} from '../../lib/jevbench-v1823-release.mjs';
const release=await readJevbenchV1824Candidate(),previous=await readJevbenchV1823Candidate();
const original={manifest:release.manifest,artifact:release.artifact,categories:release.categories,carry:release.carry,proof:release.proof,previous,previousManifestSha256:createHash('sha256').update(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.23-publication.json')).digest('hex')};
assert.equal(validateJevbenchV1824Bundle(original,{candidate:true}),true);
const key=V1824_NEW_KEYS[0],row=x=>x.artifact.systems.find(s=>s.key===key);let n=0;
for(const fn of [x=>x.artifact.not_measured[0].reason+='x',x=>x.manifest.predecessor.publication_sha256='0'.repeat(64),x=>x.artifact.systems[0].display+='x',x=>x.artifact.board.A.order.reverse(),x=>x.artifact.n_ranked++,x=>x.artifact.roster_count++,x=>x.proof.scorers.score_v15='0'.repeat(64),x=>x.proof.pricing_module_sha256='0'.repeat(64),x=>x.proof.equating.offset.I=0,x=>row(x).axes.intelligence=1,x=>row(x).axes.calibration=1,x=>row(x).jevbench_score=1,x=>row(x).ranked=true,x=>row(x).cost.usd_per_1000++,x=>row(x).cost.kind='estimate',x=>row(x).cost.basis+=' est.',x=>row(x).axes.cost++,x=>row(x).axes.speed++,x=>row(x).speed.p50_s_adjusted++,x=>row(x).not_ranked_because+='x',x=>row(x).http_status['200']++,x=>row(x).intelligence={base:1},x=>row(x).draw={id:'v1.6-regular-20261122'},x=>delete row(x).http_status,x=>x.categories.systems[key].usecases.model_routing.n--,x=>x.proof.new_rows[key].cost.input_tokens++,x=>x.proof.api_pricing_module_sha256='0'.repeat(64),x=>x.artifact.systems.find(s=>s.key==='decide-1.1').cost.usd_per_1000++,x=>x.artifact.systems.find(s=>s.key==='decide-1.1').rank=1,x=>row(x).model_pin='other',x=>row(x).disclosure+=' /home/private',x=>row(x).visibility='private',x=>x.categories.systems[key]={},x=>x.proof.publication_approval.fairness_review_required=true]){
 const x=structuredClone(original);fn(x);assert.throws(()=>validateJevbenchV1824Bundle(x,{candidate:true}));n++;
}
if(release.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1824ForBoard(),null);assert.throws(()=>validateJevbenchV1824Bundle(original));n++;}
for(const engine of ['synthetic-preview-only','PENDING']){const x=structuredClone(original);x.manifest.review={verdict:'PASS',engine,receipt_sha256:'a'.repeat(64)};assert.throws(()=>validateJevbenchV1824Bundle(x));n++;}
writeFileSync('r198/v1824/receipts/VALIDATOR.json',JSON.stringify({status:'PASS',negative_controls:n,carried_rows:previous.artifact.systems.length,carried_rows_deep_equal:true,new_rows:V1824_NEW_KEYS,boards_orders_top_fives_unchanged:true,not_measured_unchanged:true},null,1)+'\n');
console.log('PASS validator;',n,'negative controls');
