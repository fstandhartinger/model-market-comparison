import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText,checkUnrankedRow,ROW_KEYS,DRAW_KEYS} from './row_gates_v1716.mjs';
import {readV1715ForV1716} from './prev_v1716.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=path.resolve(process.argv[2]??process.cwd()),imp=p=>import(pathToFileURL(path.join(root,p)));
const {validateJevbenchV1716Bundle,readJevbenchV1716ForBoard,V1716_NEW_KEYS,V1716_DRAW_KEYS}=await imp('lib/jevbench-v1716-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-${n}.json`)));
const previous=await readV1715ForV1716(root);
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-publication.json'))).digest('hex')};
if(JSON.stringify(V1716_NEW_KEYS)!==JSON.stringify(ROW_KEYS)||JSON.stringify(b.artifact.addendum.new_keys)!==JSON.stringify(ROW_KEYS)||JSON.stringify([...V1716_DRAW_KEYS,...V1716_NEW_KEYS].sort())!==JSON.stringify(DRAW_KEYS))throw Error('key sets');
const J=new URL('.',import.meta.url).pathname;
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
for(const k of ROW_KEYS){checkNewRowText(row(b,k));const d=JSON.parse(readFileSync(path.join(J,'src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({key:k,cost:d[mode].cost});}
validateJevbenchV1716Bundle(b,{candidate:true});
for(const k of DRAW_KEYS)checkUnrankedRow(row(b,k),b.artifact.board);
// Negative tests, for EVERY row of the draw (new and carried): it can never be ranked or placed in an order list, and its note is exact.
let rejected=0,gateRejected=0;
const expectReject=(name,fn)=>{const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1716Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+name);rejected++;};
for(const K of DRAW_KEYS){
 const neg=[
  ['ranked true',x=>{const s=row(x,K);s.ranked=true;s.listing='ranked';s.rank=282;s.ranks={A:282,B:282,C:282,capability:282};x.artifact.n_ranked+=1}],
  ['rank only',x=>{row(x,K).rank=1}],
  ['ranks only',x=>{row(x,K).ranks.capability=50}],
  ['listing listed',x=>{row(x,K).listing='listed'}],
  ['reason changed',x=>{row(x,K).not_ranked_because='Not ranked.'}],
  ['old reason kept',x=>{row(x,K).not_ranked_because='Measured on the 27 Oct 2026 draw, which is not yet equated to the reference scale. This draw differs strongly from earlier draws (72% multilingual items). Shown unranked until the draw is equated.'}],
  ['draw equated',x=>{const s=row(x,K);s.draw.status='equated';s.draw.offset={I:-1.163503089365916,C:-0.6947847348911367}}],
  ...['A','B','C','capability'].map(m=>['in order '+m,x=>{x.artifact.board[m].order.push(K)}]),
  ['in order A at the top',x=>{x.artifact.board.A.order.unshift(K)}],
 ];
 for(const [name,fn] of neg)expectReject(K+' '+name,fn);
 for(const [name,fn] of neg){const y=structuredClone(b);fn(y);let threw=false;try{checkUnrankedRow(row(y,K),y.artifact.board)}catch{threw=true}if(!threw)throw Error('row gate accepted: '+K+' '+name);gateRejected++;}
}
const H2O='h2o-lightning-4b-v1.4.1',MS='microsoft-decision-1-r2',ST='strike-1',TC='torchcast-decision-31b-v1.0';
for(const [name,fn] of [
 ['carried rank moved',x=>{const s=x.artifact.systems.find(s=>s.ranked&&s.rank===7);s.rank=8}],
 ['carried score changed',x=>{const s=x.artifact.systems.find(s=>s.ranked&&s.rank===20);s.scores.A+=0.01}],
 ['live round-1 Microsoft row changed',x=>{row(x,'microsoft-decision-1').axes.cost+=1}],
 ['carried H2O v1.1 row changed',x=>{row(x,'h2o-lightning-4b').disclosure+=' x'}],
 ['H2O extra sentence dropped',x=>{row(x,H2O).not_ranked_because=row(x,'jeff_1_1_large').not_ranked_because}],
 ['draw-row disclosure changed with the cost',x=>{row(x,'jeff_1_1_large').disclosure+=' x'}],
 ['draw-row Intelligence changed with the cost',x=>{row(x,TC).axes.intelligence-=1.16}],
 ['draw-row Speed changed with the cost',x=>{row(x,TC).axes.speed+=0.5}],
 ['draw-row Capability changed',x=>{row(x,H2O).capability+=0.1}],
 ['draw-row cost reverted to all items',x=>{const s=row(x,TC);s.cost.usd_per_1000=s.cost.common_basis.usd_per_1000_all_items}],
 ['draw-row Cost axis moved',x=>{row(x,TC).axes.cost+=0.01}],
 ['draw-row composite moved',x=>{row(x,'jeff_1_1_qwen_4b').scores.A+=0.01}],
 ['draw-row common basis dropped',x=>{row(x,H2O).cost.common_basis=null}],
 ['draw-row common basis n',x=>{row(x,H2O).cost.common_basis.n_items=1500}],
 ['draw-row basis text old',x=>{const s=row(x,TC);s.cost.basis=s.cost.basis.replace('Cost on the 1,489 items every row on this draw answered (same-items rule)','over all 1,500 items')}],
 ['msft disclosure kept old',x=>{row(x,MS).disclosure=row(x,MS).disclosure.replace('so every score and the speed are computed on those 1,493 items; the cost uses the 1,489 items every row on this draw answered (same-items rule).','so every score, the speed and the cost are computed on those 1,493 items.')}],
 ['cost exception dropped',x=>{x.proof.carried_rows_equal_except=[]}],
 ['cost proof dropped',x=>{x.proof.exceptions={}}],
 ['cost proof field dropped',x=>{delete x.proof.exceptions[TC].views}],
 ['set size changed',x=>{x.proof.cost_basis.n_items=1488}],
 ['set hash changed',x=>{x.proof.cost_basis.set_sha256='c'.repeat(64)}],
 ['addendum set hash changed',x=>{x.artifact.addendum.cost_basis.set_sha256='c'.repeat(64)}],
 ['membership roster short',x=>{delete x.proof.cost_basis.per_row_membership[ST]}],
 ['repriced roster short',x=>{x.artifact.addendum.repriced_keys=x.artifact.addendum.repriced_keys.slice(1)}],
 ['top-five changed claimed',x=>{x.proof.publication_approval.top_five_effect='changed'}],
 ['old approval status',x=>{x.proof.publication_approval.status='GO (standing; no top-five change; paid public order)'}],
 ['unranked basis dropped',x=>{delete x.proof.publication_approval.unranked_basis}],
 ['equating block added',x=>{x.proof.equating={offset:{I:-1.16,C:-0.69}}}],
 ['predecessor hash',x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)}],
 ['strike cost on all items',x=>{const s=row(x,ST);s.cost.usd_per_1000=s.cost.common_basis.usd_per_1000_all_items}],
 ['strike cost kind tariff',x=>{row(x,ST).cost.kind='tariff'}],
 ['strike nominal output priced',x=>{x.proof.new_rows[ST].cost.output_tokens=1495}],
 ['strike refusals dropped from the denominator',x=>{row(x,ST).status.rows=1495}],
 ['strike paid',x=>{row(x,ST).paid_fast_lane=true}],
 ['strike topics',x=>{x.categories.systems[ST].topics={x:{n:20,competence:1}}}],
 ['strike draw equated',x=>{row(x,ST).draw.offset={I:-1.16,C:-0.69}}],
])expectReject(name,fn);
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1716ForBoard(root)!==null)throw Error('PENDING leak');
console.log(`PASS ${b.previous.artifact.systems.length} carried rows/cells (${b.previous.artifact.systems.length-7} fully equal incl. ranks; the 7 rows of the 27 Oct draw differ only in their pinned cost fields under the same-items rule), unchanged order lists, 1 exact UNRANKED new hosted row (strike-1, 1,495/1,500, estimate on the common set), all ${DRAW_KEYS.length} rows of the draw unranked with the exact note, draw not equated (offset 0); ${rejected} bundle negatives and ${gateRejected} row-gate negatives rejected`);
