import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateJevbenchV182Bundle,validateV182PublicText,V182_NEW_KEYS,readJevbenchV182ForBoard} from '../../lib/jevbench-v182-release.mjs';
import {readOptionalJevbenchV181Release} from '../../lib/jevbench-v181-release.mjs';
const root=process.cwd(),J=fileURLToPath(new URL('.',import.meta.url)),D=root+'/data/raw/benchmarks/jevbench/v1.8/',load=n=>JSON.parse(readFileSync(D+'jevbench-v1.8.2-'+n+'.json'));
const previous=await readOptionalJevbenchV181Release();
const cleanedRows=JSON.parse(readFileSync(J+'inputs/CLEANED-ROWS.json'));for(const s of Object.values(cleanedRows))assert.equal(validateV182PublicText(s),true);
const original={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(D+'jevbench-v1.8.1-publication.json')).digest('hex')};
assert.equal(validateJevbenchV182Bundle(original,{candidate:true}),true);
let n=0;const neg=fn=>{const x=structuredClone(original);fn(x);assert.throws(()=>validateJevbenchV182Bundle(x,{candidate:true}));n++;};
neg(x=>x.manifest.predecessor.publication_sha256='b'.repeat(64));neg(x=>x.proof.publication_approval.status='PENDING');neg(x=>x.proof.pricing_module_sha256='0'.repeat(64));neg(x=>x.proof.cost_basis.n_items=1500);
neg(x=>x.artifact.systems[0].axes.intelligence+=1);neg(x=>x.categories.systems[previous.artifact.systems[0].key]={});neg(x=>x.artifact.board.A.order.reverse());
for(const k of V182_NEW_KEYS){
 const row=x=>x.artifact.systems.find(s=>s.key===k);
 for(const fn of [s=>s.ranked=true,s=>s.rank=1,s=>s.ranks.A=1,s=>s.not_ranked_because='Ranked',s=>s.draw.status='equated',s=>s.axes.intelligence+=1,s=>s.cost.usd_per_1000*=2,s=>s.cost.common_basis.n_items=1500,s=>s.decision_limit.n_over_limit+=1,s=>s.disclosure+=' /home/private',s=>s.endpoint_condition+=' VM 12345678-abcd-abcd-abcd-123456789abc',s=>s.paid_fast_lane=!s.paid_fast_lane])neg(x=>fn(row(x)));
 for(const m of ['A','B','C','capability'])neg(x=>x.artifact.board[m].order.push(k));
 neg(x=>x.proof.new_rows[k].cost.input_tokens_common+=1);
 neg(x=>x.categories.systems[k].topics={x:{n:1,competence:99}});
 neg(x=>delete x.categories.systems[k].languages);
}
// Check the prose guard directly as well as the full bundle so exact-row pins
// cannot mask an ineffective wording rule. Every nested string is covered.
const forbidden=['0.064595','x cap','cost cap USD','0.15 s','worker','lead','custody','custodian','release owner','measurement review','deputy','board','#123','Florian','CoS','order id','jevbench-add-requests','fastlane-native','r201-v182','Disposition is for','code_revision','at the time of drafting','internally measured export','eligible for intake','class C deviation','TTL-fit','pair-fit','accepted root pricing reference','pre-registration review','provider decide (proxy aws)'];
let proseNegatives=0;
for(const k of V182_NEW_KEYS){
 const fresh=original.artifact.systems.find(s=>s.key===k);assert.equal(validateV182PublicText(fresh),true);
 for(const field of ['disclosure','endpoint_condition','cost.basis'])for(const term of forbidden){
  const bad=structuredClone(fresh);if(field==='cost.basis')bad.cost.basis+=' '+term;else bad[field]+=' '+term;
  assert.throws(()=>validateV182PublicText(bad));proseNegatives++;
  if(k===V182_NEW_KEYS[0]&&field==='disclosure')neg(x=>{x.artifact.systems.find(s=>s.key===k).disclosure+=' '+term;});
 }
}
if(original.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV182ForBoard(),null);assert.throws(()=>validateJevbenchV182Bundle(original));}
writeFileSync(J+'receipts/VALIDATOR.json',JSON.stringify({status:'PASS',negative_controls:n,prose_negative_controls:proseNegatives,rows:V182_NEW_KEYS.length,public_reader_review_gated:true},null,1)+'\n');
console.log('PASS validator;',n,'negative controls rejected;',V182_NEW_KEYS.length,'unranked rows');
