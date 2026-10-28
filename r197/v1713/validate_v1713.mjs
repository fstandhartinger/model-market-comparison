import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText,checkUnrankedRow} from './row_gates_v1713.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=process.argv[2]??process.cwd(),imp=p=>import(pathToFileURL(path.join(root,p)));
const {readOptionalJevbenchV1712Release}=await imp('lib/jevbench-v1712-release.mjs');
const {validateJevbenchV1713Bundle,readJevbenchV1713ForBoard}=await imp('lib/jevbench-v1713-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-${n}.json`)));
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous:await readOptionalJevbenchV1712Release(root),previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.12-publication.json'))).digest('hex')};
for(const k of b.artifact.addendum.new_keys){checkNewRowText(b.artifact.systems.find(s=>s.key===k));const d=JSON.parse(readFileSync(path.join(root,'r197/v1713/src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({...d[mode],key:k,model_pin:d.model_pin});}
// Unranked release: the real bundle validates directly (standing GO, no top-five change, SUSPICIOUS fairness bound as evidence).
validateJevbenchV1713Bundle(b,{candidate:true});
for(const k of b.artifact.addendum.new_keys)checkUnrankedRow(b.artifact.systems.find(s=>s.key===k),b.artifact.board);
// Negative tests: the row can never be ranked or placed in an order list, and the approval cannot claim a top-five change.
const K=b.artifact.addendum.new_keys[0],neg=[
 ['ranked true',x=>{const s=x.artifact.systems.find(s=>s.key===K);s.ranked=true;s.listing='ranked';s.rank=282;s.ranks={A:282,B:282,C:282,capability:282};x.artifact.n_ranked+=1}],
 ['rank only',x=>{x.artifact.systems.find(s=>s.key===K).rank=1}],
 ['ranks only',x=>{x.artifact.systems.find(s=>s.key===K).ranks.capability=50}],
 ['listing listed',x=>{x.artifact.systems.find(s=>s.key===K).listing='listed'}],
 ['reason changed',x=>{x.artifact.systems.find(s=>s.key===K).not_ranked_because='Not ranked.'}],
 ...['A','B','C','capability'].map(m=>['in order '+m,x=>{x.artifact.board[m].order.push(K)}]),
 ['in order A at the top',x=>{x.artifact.board.A.order.unshift(K)}],
 ['carried rank moved',x=>{const s=x.artifact.systems.find(s=>s.ranked&&s.rank===7);s.rank=8}],
 ['top-five changed claimed',x=>{x.proof.publication_approval.top_five_effect='changed'}],
 ['old approval status',x=>{x.proof.publication_approval.status='GO (paid public fast-lane order, automatic publication)'}],
 ['fairness evidence dropped',x=>{x.proof.publication_approval.fairness_check={verdict:'PENDING',sha256:null,path:'workers/r197-v1713-fair/RESULT.json'}}],
];
let rejected=0;
for(const [name,fn] of neg){const y=structuredClone(b);fn(y);let threw=false;try{validateJevbenchV1713Bundle(y,{candidate:true})}catch{threw=true}if(!threw)throw Error('negative accepted: '+name);rejected++;}
for(const [name,fn] of neg.slice(0,10)){const y=structuredClone(b);fn(y);let threw=false;try{checkUnrankedRow(y.artifact.systems.find(s=>s.key===K),y.artifact.board)}catch{threw=true}if(!threw)throw Error('row gate accepted: '+name);}
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1713ForBoard(root)!==null)throw Error('PENDING leak');
console.log('PASS 300 carried rows/cells fully equal (ranks included), unchanged order lists, one exact UNRANKED new row on the new draw, immutable method/carry, pins, public text, estimate cost, standing-GO approval binding; '+rejected+' negatives rejected (row cannot be ranked or in any order list); PENDING hidden');
