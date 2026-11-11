import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateJevbenchV189Bundle,validateV189PublicText,readJevbenchV189ForBoard} from '../../lib/jevbench-v189-release.mjs';
import {readOptionalJevbenchV188Release} from '../../lib/jevbench-v188-release.mjs';
const D='data/raw/benchmarks/jevbench/v1.8/',load=n=>JSON.parse(readFileSync(D+'jevbench-v1.8.9-'+n+'.json'));
const previous=await readOptionalJevbenchV188Release();
const original={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(D+'jevbench-v1.8.8-publication.json')).digest('hex')};
assert.equal(validateJevbenchV189Bundle(original,{candidate:true}),true);
let n=0;const neg=fn=>{const x=structuredClone(original);fn(x);assert.throws(()=>validateJevbenchV189Bundle(x,{candidate:true}));n++;};
const row=x=>x.artifact.systems.find(s=>s.key==='karpo_decision_31b');
for(const fn of [x=>x.manifest.predecessor.publication_sha256='b'.repeat(64),x=>x.proof.publication_approval.status='PENDING',x=>x.proof.pricing_module_sha256='0'.repeat(64),x=>x.artifact.systems[0].axes.intelligence+=1,x=>x.categories.systems[previous.artifact.systems[0].key]={},x=>x.artifact.board.A.order.reverse()])neg(fn);
for(const fn of [s=>s.ranked=true,s=>s.rank=1,s=>s.ranks.A=1,s=>s.not_ranked_because='Ranked',s=>s.draw.status='equated',s=>s.axes.intelligence+=1,s=>s.cost.usd_per_1000*=2,s=>s.endpoint_condition='other',s=>s.disclosure='other',s=>s.cost.kind='tariff',s=>s.model_pin=null,s=>s.paid_fast_lane=false,s=>s.status.rows=1,s=>s.speed.n=1,s=>s.intelligence={per_type_split:{}},s=>s.calibration={parts:{}},s=>s.v16.breakdowns={},s=>s.cost.common_basis={n_items:1}])neg(x=>fn(row(x)));
for(const m of ['A','B','C','capability'])neg(x=>x.artifact.board[m].order.push('karpo_decision_31b'));
for(const dim of ['topics','usecases','languages','families'])neg(x=>x.categories.systems.karpo_decision_31b[dim]={x:{n:1,competence:99}});
let prose=0;
for(const term of ['12345678-abcd-abcd-abcd-123456789abc','test@example.com','custody','board #123','/home/private','98765','98765.','98765,','The synthetic number is 98765','98,765','87654','87,654','per-type','tier','input tokens','output tokens','PREREG','{PLACEHOLDER}'])for(const field of ['disclosure','endpoint_condition','cost']){
 const bad=structuredClone(row(original));if(field==='cost')bad.cost.basis+=' '+term;else bad[field]+=' '+term;
 assert.throws(()=>validateV189PublicText(bad),term);prose++;
}
let positive=0;
const decimals=['10106.516129','1.5235'];
function collectNumbers(v){if(typeof v==='number')decimals.push(String(v));else if(v&&typeof v==='object')for(const x of Object.values(v))collectNumbers(x);}
collectNumbers(row(original));
for(const value of new Set(decimals))for(const suffix of ['.',',','']){assert.equal(validateV189PublicText({...row(original),extra:'Published value '+value+suffix}),true,value+suffix);positive++;}
if(original.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV189ForBoard(),null);assert.throws(()=>validateJevbenchV189Bundle(original));}
writeFileSync('r198/v189/receipts/VALIDATOR.json',JSON.stringify({status:'PASS',negative_controls:n,prose_negative_controls:prose,positive_number_controls:positive,public_reader_review_gated:true},null,1)+'\n');
console.log('PASS validator;',n,'negative controls;',prose,'public wording negatives;',positive,'positive number controls');
