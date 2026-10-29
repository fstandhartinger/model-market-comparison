import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText,checkUnrankedRow,ROW_KEYS,DRAW_KEYS} from './row_gates_v1722.mjs';
import {readV1721ForV1722} from './prev_v1722.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=path.resolve(process.argv[2]??process.cwd()),imp=p=>import(pathToFileURL(path.join(root,p)));
const {validateJevbenchV1722Bundle,readJevbenchV1722ForBoard,V1722_NEW_KEYS,V1722_DRAW_KEYS}=await imp('lib/jevbench-v1722-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-${n}.json`)));
const previous=await readV1721ForV1722(root);
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.21-publication.json'))).digest('hex')};
if(JSON.stringify(V1722_NEW_KEYS)!==JSON.stringify(ROW_KEYS)||JSON.stringify(b.artifact.addendum.new_keys)!==JSON.stringify(ROW_KEYS)||JSON.stringify([...V1722_DRAW_KEYS,...V1722_NEW_KEYS].sort())!==JSON.stringify(DRAW_KEYS))throw Error('key sets');
const J=new URL('.',import.meta.url).pathname;
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
for(const k of ROW_KEYS){checkNewRowText(row(b,k));const d=JSON.parse(readFileSync(path.join(J,'src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({key:k,cost:d[mode].cost});}
validateJevbenchV1722Bundle(b,{candidate:true});
for(const k of DRAW_KEYS)checkUnrankedRow(row(b,k),b.artifact.board);
// Negative tests, for EVERY row of the draw (new and carried): it can never be ranked or placed in an order list, and its note is exact.
let rejected=0,gateRejected=0;
const expectReject=(name,fn)=>{const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1722Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+name);rejected++;};
for(const K of DRAW_KEYS){
 const neg=[
  ...(K==='umpire-35b-a3b' ? [['old weaker-anchor note',x=>{row(x,K).not_ranked_because=row(x,'jeff_1_1_large').not_ranked_because}]] : []),
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
const ST=ROW_KEYS[0];
for(const [name,fn] of [
 ['carried row changed',x=>{row(x,'strike-1').scores.A+=0.01}],
 ['new cost all items',x=>{const s=row(x,ST);s.cost.usd_per_1000=s.cost.common_basis.usd_per_1000_all_items}],
 ['nominal output',x=>{x.proof.new_rows[ST].cost.output_tokens=1495}],
 ['1495 denominator',x=>{row(x,ST).status.rows=1495}],
 ['disclosure missing',x=>{row(x,ST).disclosure=row(x,ST).disclosure.replace('training data were not inspected','')}],
 ['common basis no freeze',x=>{delete x.proof.cost_basis.frozen_at}],
 ['common basis old intersection',x=>{x.proof.cost_basis.rule='recompute every row intersection'}],
 ['common set size',x=>{x.proof.cost_basis.n_items=1488}],
 ['common set hash',x=>{x.proof.cost_basis.set_sha256='b'.repeat(64)}],
 ['common roster',x=>{delete x.proof.cost_basis.per_row_membership[ST]}],
 ['paid',x=>{row(x,ST).paid_fast_lane=true}],
 ['old weaker than this row note',x=>{row(x,ST).not_ranked_because=row(x,'jeff_1_1_large').not_ranked_because}],
 ['top five effect',x=>{x.proof.publication_approval.top_five_effect='changed'}],
 ['predecessor hash',x=>{x.manifest.predecessor.publication_sha256='c'.repeat(64)}],
 ['carried exceptions added',x=>{x.proof.exceptions={x:{}}}],
 ['repriced roster added',x=>{x.artifact.addendum.repriced_keys=['strike-1']}],
])expectReject(name,fn);
for(const part of ['training data were not inspected','49 of 50','16,384-token input limit','output tokens reported as 0','CC BY-NC 4.0','dequantized','KERNEL PATH']){
 const s=structuredClone(row(b,ST));s.disclosure=s.disclosure.replace(part,'');let threw=false;try{checkNewRowText(s)}catch{threw=true}if(!threw)throw Error('missing disclosure accepted');gateRejected++;
}
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1722ForBoard(root)!==null)throw Error('PENDING leak');
console.log(`PASS ${previous.artifact.systems.length} carried rows fully equal; exact unranked new row, frozen common basis, ${rejected} bundle negatives and ${gateRejected} row-gate negatives rejected`);
