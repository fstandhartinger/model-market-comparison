import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText,checkUnrankedRow,ROW_KEYS,DRAW_KEYS} from './row_gates_v1715.mjs';
import {readV1714ForV1715} from './prev_v1715.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=path.resolve(process.argv[2]??process.cwd()),imp=p=>import(pathToFileURL(path.join(root,p)));
const {validateJevbenchV1715Bundle,readJevbenchV1715ForBoard,V1715_NEW_KEYS,V1715_DRAW_KEYS}=await imp('lib/jevbench-v1715-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-${n}.json`)));
const previous=await readV1714ForV1715(root);
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-publication.json'))).digest('hex')};
if(JSON.stringify(V1715_NEW_KEYS)!==JSON.stringify(ROW_KEYS)||JSON.stringify(b.artifact.addendum.new_keys)!==JSON.stringify(ROW_KEYS)||JSON.stringify([...V1715_DRAW_KEYS,...V1715_NEW_KEYS].sort())!==JSON.stringify(DRAW_KEYS))throw Error('key sets');
const J=new URL('.',import.meta.url).pathname;
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
for(const k of ROW_KEYS){checkNewRowText(row(b,k));const d=JSON.parse(readFileSync(path.join(J,'src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({key:k,cost:d[mode].cost});}
validateJevbenchV1715Bundle(b,{candidate:true});
for(const k of DRAW_KEYS)checkUnrankedRow(row(b,k),b.artifact.board);
// Negative tests, for EVERY row of the draw (new and carried): it can never be ranked or placed in an order list, and its note is exact.
let rejected=0,gateRejected=0;
const expectReject=(name,fn)=>{const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1715Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+name);rejected++;};
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
const H2O='h2o-lightning-4b-v1.4.1';
for(const [name,fn] of [
 ['carried rank moved',x=>{const s=x.artifact.systems.find(s=>s.ranked&&s.rank===7);s.rank=8}],
 ['carried score changed',x=>{const s=x.artifact.systems.find(s=>s.ranked&&s.rank===20);s.scores.A+=0.01}],
 ['live round-1 Microsoft row changed',x=>{row(x,'microsoft-decision-1').axes.cost+=1}],
 ['carried H2O v1.1 row changed',x=>{row(x,'h2o-lightning-4b').disclosure+=' x'}],
 ['H2O extra sentence dropped',x=>{row(x,H2O).not_ranked_because=row(x,'jeff_1_1_large').not_ranked_because}],
 ['draw-row disclosure changed with the note',x=>{row(x,'jeff_1_1_large').disclosure+=' x'}],
 ['draw-row number changed with the note',x=>{row(x,'torchcast-decision-31b-v1.0').axes.intelligence-=1.16}],
 ['note exception dropped',x=>{x.proof.carried_rows_equal_except=[]}],
 ['note proof dropped',x=>{x.proof.exceptions={}}],
 ['top-five changed claimed',x=>{x.proof.publication_approval.top_five_effect='changed'}],
 ['old approval status',x=>{x.proof.publication_approval.status='GO (standing; no top-five change; paid public order for Torchcast)'}],
 ['unranked basis dropped',x=>{delete x.proof.publication_approval.unranked_basis}],
 ['paid row private',x=>{x.proof.publication_approval.paid_public.visibility='private'}],
 ['equating block added',x=>{x.proof.equating={offset:{I:-1.16,C:-0.69}}}],
 ['predecessor hash',x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)}],
 ['msft cost repriced to the base estimate',x=>{row(x,'microsoft-decision-1-r2').cost.usd_per_1000=0.03143}],
 ['msft cost kind estimate',x=>{row(x,'microsoft-decision-1-r2').cost.kind='estimate'}],
 ['msft n 1,500',x=>{row(x,'microsoft-decision-1-r2').status.rows=1500}],
 ['msft topics',x=>{x.categories.systems['microsoft-decision-1-r2'].topics={x:{n:20,competence:1}}}],
])expectReject(name,fn);
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1715ForBoard(root)!==null)throw Error('PENDING leak');
console.log(`PASS ${b.previous.artifact.systems.length} carried rows/cells (${b.previous.artifact.systems.length-6} fully equal incl. ranks; the 6 rows of the 27 Oct draw differ only in their pinned not_ranked_because note), unchanged order lists, 1 exact UNRANKED new hosted row (n 1,493, tariff), all ${DRAW_KEYS.length} rows of the draw unranked with the exact note, draw not equated (offset 0), standing-GO approval binding; ${rejected} bundle negatives and ${gateRejected} row-gate negatives rejected (no row of the draw can be ranked or in any order list); predecessor v1.7.14 PASS; v1.7.15 ${b.manifest.review.verdict} ${b.manifest.review.verdict==='PENDING'?'hidden':''}`);
