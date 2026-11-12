import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {validateJevbenchV1810Bundle,readJevbenchV1810ForBoard,V1810_RANKED_KEYS,V1810_UNRANKED,V1810_EQUATED_KEYS,V1810_OFFSET} from '../../lib/jevbench-v1810-release.mjs';
import {readOptionalJevbenchV189Release} from '../../lib/jevbench-v189-release.mjs';
const D='data/raw/benchmarks/jevbench/v1.8/',load=n=>JSON.parse(readFileSync(D+'jevbench-v1.8.10-'+n+'.json'));
const previous=await readOptionalJevbenchV189Release();
const original={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(D+'jevbench-v1.8.9-publication.json')).digest('hex')};
assert.equal(validateJevbenchV1810Bundle(original,{candidate:true}),true);
let n=0;const neg=(fn,opts={candidate:true})=>{const x=structuredClone(original);fn(x);assert.throws(()=>validateJevbenchV1810Bundle(x,opts));n++;};
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
const R0=V1810_RANKED_KEYS[0],R1=V1810_RANKED_KEYS.at(-1),U0=Object.keys(V1810_UNRANKED)[0],H2O='h2o-lightning-4b-v1.4.1',KARPO='karpo_decision_31b';
// bundle-level negatives
for(const fn of [x=>x.manifest.predecessor.publication_sha256='b'.repeat(64),x=>x.proof.publication_approval.status='PENDING',x=>x.proof.pricing_module_sha256='0'.repeat(64),
 x=>x.artifact.systems.find(s=>!V1810_EQUATED_KEYS.includes(s.key)).axes.intelligence+=1,x=>x.categories.systems[previous.artifact.systems[0].key]={},x=>x.artifact.board.A.order.reverse(),
 x=>x.artifact.board.B.order.pop(),x=>x.artifact.board.capability.order.push(U0),x=>x.artifact.n_ranked+=1,x=>x.artifact.roster_count+=1,x=>x.artifact.systems.pop(),
 x=>x.proof.equating.offset.I=-1.16,x=>x.proof.equating.offset_ci95.I[0]-=1,x=>x.proof.equating.anchors.pop(),x=>x.proof.equating.files.equating.sha256='0'.repeat(64),
 x=>x.proof.equating.status='anchor-runs-pending',x=>delete x.proof.equated_rows[R0],x=>x.proof.equated_rows[R0].treatment='unranked',x=>x.proof.ranked_rows.pop(),
 x=>x.proof.new_rows={x:1},x=>x.proof.exceptions={x:1},x=>x.proof.scorers.score_v15='0'.repeat(64),x=>x.proof.topfive_diff_sha256='a'.repeat(64),x=>x.proof.publication_approval.top_five_effect='unchanged',
 x=>x.proof.publication_approval.fresh_baseline='v1.8.8',x=>x.proof.publication_approval.fairness_check.verdict='SUSPICIOUS',x=>x.proof.publication_approval.fairness_check.path='other.json',
 x=>x.proof.publication_approval.go.quote='ja',x=>x.proof.publication_approval.equating_basis.decision='none',x=>x.artifact.addendum.ranked_keys.pop(),x=>x.artifact.addendum.new_keys=['x'],
 x=>x.artifact.addendum.same_draw='v1.6-regular-20261012',x=>x.artifact.source_sha256='0'.repeat(64),x=>x.artifact.method='other',x=>x.artifact.G_med+=0.1,x=>x.carry.rows=[],x=>x.categories.systems[R0]={}])neg(fn);
// row-level negatives on the equated rows
for(const [name,fn] of Object.entries({
 intelligence:s=>s.axes.intelligence+=0.01,calibration:s=>s.axes.calibration+=0.01,speed:s=>s.axes.speed+=0.01,capability:s=>s.capability+=0.01,scoreA:s=>s.scores.A+=0.01,scoreB:s=>s.scores.B+=0.01,scoreC:s=>s.scores.C+=0.01,
 view:s=>s.views['Balanced 33:33:33']+=0.01,headline:s=>s.jevbench_score+=0.01,published:s=>s.published_scores.axes.intelligence+=0.5,unranked:s=>{s.ranked=false;s.listing='unranked';s.not_ranked_because='x'},
 rank:s=>s.rank=1,ranks:s=>s.ranks.A+=1,rankCap:s=>s.ranks.capability+=1,staleReason:s=>s.not_ranked_because='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale.',
 note:s=>s.listing_note='other',noteStale:s=>s.listing_note+=' stronger anchors are being measured',drawStatus:s=>s.draw.status='anchor-runs-pending',drawOffset:s=>s.draw.offset.I=0,drawCi:s=>s.draw.offset_ci95.C[1]+=1,
 disclosure:s=>s.disclosure+=' This draw is not yet equated to the reference scale.',internal:s=>s.disclosure+=' See workers/r276-v1810-build2.',gmed:s=>s.v16.g_med_used+=0.1,ci:s=>s.composite_ci95.A[0]+=1,cost:s=>s.cost.usd_per_1000*=2})){
 neg(x=>fn(row(x,R0)));if(name!=='drawStatus')neg(x=>fn(row(x,R1)));
}
neg(x=>{const s=row(x,U0);s.ranked=true;s.listing='ranked';delete s.not_ranked_because});
neg(x=>{row(x,U0).not_ranked_because='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale; stronger anchor runs for that draw are being measured. Shown unranked until then.'});
neg(x=>{row(x,U0).axes.intelligence+=1});
neg(x=>{const s=row(x,H2O);s.listing_note=s.listing_note.replace(' On the 300 public items every draw shares, this version scores 57.2 Intelligence vs 61.1 for H2O-Lightning-4B v1.1.','')});
neg(x=>{row(x,KARPO).publication_scope='all'});
neg(x=>{row(x,KARPO).disclosure+=' per-type tier 98765'});
for(const m of ['A','B','C','capability'])neg(x=>x.artifact.board[m].order=x.artifact.board[m].order.filter(k=>k!==R0));
// carried rows (not on the draw) may change only rank/ranks
neg(x=>{const s=x.artifact.systems.find(s=>!V1810_EQUATED_KEYS.includes(s.key)&&s.ranked);s.cost.usd_per_1000+=1e-6});
neg(x=>{const s=x.artifact.systems.find(s=>!V1810_EQUATED_KEYS.includes(s.key)&&s.ranked);s.display+='x'});
// Public readers: PENDING review is refused, a PASS manifest needs a bound FAIR verdict
if(original.manifest.review.verdict==='PENDING'){assert.equal(await readJevbenchV1810ForBoard(),null);assert.throws(()=>validateJevbenchV1810Bundle(original));n++;}
neg(x=>{x.manifest.review={engine:'synthetic',verdict:'PASS',receipt_sha256:'a'.repeat(64)}},{candidate:false});   // fairness PENDING while the review says PASS
neg(x=>{x.manifest.review={engine:'e',verdict:'PASS',receipt_sha256:'a'.repeat(64)};x.proof.publication_approval.fairness_check={path:'workers/r276-v1810-fair/RESULT.json',verdict:'FAIR'}},{candidate:false});   // FAIR without receipt pin
assert.equal(original.proof.publication_approval.fairness_check.verdict,'PENDING');
writeFileSync('r198/v1810/receipts/VALIDATOR.json',JSON.stringify({status:'PASS',negative_controls:n,equated_rows:V1810_EQUATED_KEYS.length,ranked_rows:V1810_RANKED_KEYS.length,unranked_rows:Object.keys(V1810_UNRANKED),offset:V1810_OFFSET,public_reader_review_gated:true,fairness_gate:'PENDING refused by every public reader until a FAIR receipt is bound'},null,1)+'\n');
console.log('PASS validator;',n,'negative controls rejected;',V1810_EQUATED_KEYS.length,'equated rows,',V1810_RANKED_KEYS.length,'ranked');
