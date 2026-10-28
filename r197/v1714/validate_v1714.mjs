import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText,checkUnrankedRow,ROW_KEYS} from './row_gates_v1714.mjs';
import {readV1713ForV1714} from './prev_v1714.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=path.resolve(process.argv[2]??process.cwd()),imp=p=>import(pathToFileURL(path.join(root,p)));
const {validateJevbenchV1714Bundle,readJevbenchV1714ForBoard,V1714_NEW_KEYS}=await imp('lib/jevbench-v1714-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.14-${n}.json`)));
const previous=await readV1713ForV1714(root);
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json'))).digest('hex')};
if(JSON.stringify(V1714_NEW_KEYS)!==JSON.stringify(ROW_KEYS)||JSON.stringify(b.artifact.addendum.new_keys)!==JSON.stringify(ROW_KEYS))throw Error('new key set');
const J=new URL('.',import.meta.url).pathname;
for(const k of b.artifact.addendum.new_keys){checkNewRowText(b.artifact.systems.find(s=>s.key===k));const d=JSON.parse(readFileSync(path.join(J,'src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({...d[mode],key:k,model_pin:d.model_pin});}
validateJevbenchV1714Bundle(b,{candidate:true});
for(const k of b.artifact.addendum.new_keys)checkUnrankedRow(b.artifact.systems.find(s=>s.key===k),b.artifact.board);
// Negative tests, for EVERY new row: it can never be ranked or placed in an order list, and the approval cannot claim a top-five change.
let rejected=0,gateRejected=0;
for(const K of b.artifact.addendum.new_keys){
 const neg=[
  ['ranked true',x=>{const s=x.artifact.systems.find(s=>s.key===K);s.ranked=true;s.listing='ranked';s.rank=282;s.ranks={A:282,B:282,C:282,capability:282};x.artifact.n_ranked+=1}],
  ['rank only',x=>{x.artifact.systems.find(s=>s.key===K).rank=1}],
  ['ranks only',x=>{x.artifact.systems.find(s=>s.key===K).ranks.capability=50}],
  ['listing listed',x=>{x.artifact.systems.find(s=>s.key===K).listing='listed'}],
  ['reason changed',x=>{x.artifact.systems.find(s=>s.key===K).not_ranked_because='Not ranked.'}],
  ...['A','B','C','capability'].map(m=>['in order '+m,x=>{x.artifact.board[m].order.push(K)}]),
  ['in order A at the top',x=>{x.artifact.board.A.order.unshift(K)}],
 ];
 for(const [name,fn] of neg){const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1714Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+K+' '+name);rejected++;}
 for(const [name,fn] of neg){const y=structuredClone(b);fn(y);let threw=false;try{checkUnrankedRow(y.artifact.systems.find(s=>s.key===K),y.artifact.board)}catch{threw=true}if(!threw)throw Error('row gate accepted: '+K+' '+name);gateRejected++;}
}
for(const [name,fn] of [
 ['carried rank moved',x=>{const s=x.artifact.systems.find(s=>s.ranked&&s.rank===7);s.rank=8}],
 ['carried H2O row ranked',x=>{const s=x.artifact.systems.find(s=>s.key==='h2o-lightning-4b-v1.4.1');s.ranked=true}],
 ['top-five changed claimed',x=>{x.proof.publication_approval.top_five_effect='changed'}],
 ['old approval status',x=>{x.proof.publication_approval.status='GO (standing; no top-five change; paid public order)'}],
 ['unranked basis dropped',x=>{delete x.proof.publication_approval.unranked_basis}],
 ['paid row private',x=>{x.proof.publication_approval.paid_public.visibility='private'}],
 ['predecessor hash',x=>{x.manifest.predecessor.publication_sha256='b'.repeat(64)}],
 ['other draw',x=>{x.artifact.systems.find(s=>s.key===ROW_KEYS[0]).draw.status='equated'}],
]){const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1714Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+name);rejected++;}
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1714ForBoard(root)!==null)throw Error('PENDING leak');
console.log(`PASS ${b.previous.artifact.systems.length} carried rows/cells fully equal (ranks included), unchanged order lists, ${ROW_KEYS.length} exact UNRANKED new rows on the 27 Oct draw, immutable method/carry, pins, public text, estimate cost, standing-GO approval binding; ${rejected} bundle negatives and ${gateRejected} row-gate negatives rejected (no row can be ranked or in any order list); predecessor v1.7.13 ${b.previous.candidate?'PENDING (candidate-validated)':'PASS'}; v1.7.14 ${b.manifest.review.verdict} ${b.manifest.review.verdict==='PENDING'?'hidden':''}`);
