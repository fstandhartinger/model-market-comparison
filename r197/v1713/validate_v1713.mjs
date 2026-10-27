import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText} from './row_gates_v1713.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=process.argv[2]??process.cwd(),imp=p=>import(pathToFileURL(path.join(root,p)));
const {readOptionalJevbenchV1712Release}=await imp('lib/jevbench-v1712-release.mjs');
const {validateJevbenchV1713Bundle,readJevbenchV1713ForBoard}=await imp('lib/jevbench-v1713-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-${n}.json`)));
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous:await readOptionalJevbenchV1712Release(root),previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.12-publication.json'))).digest('hex')};
for(const k of b.artifact.addendum.new_keys){checkNewRowText(b.artifact.systems.find(s=>s.key===k));const d=JSON.parse(readFileSync(path.join(root,'r197/v1713/src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({...d[mode],key:k,model_pin:d.model_pin});}
const a=b.proof.publication_approval,fairPending=a.top_five_effect==='changed'&&a.fairness_check.verdict!=='FAIR';
if(fairPending){let refused=false;try{validateJevbenchV1713Bundle(b,{candidate:true})}catch(e){refused=/bound FAIR/.test(e.message)}if(!refused)throw Error('PENDING fairness accepted for a top-five change');
 const y=structuredClone(b);y.proof.publication_approval.fairness_check={verdict:'FAIR',sha256:'c'.repeat(64),path:'workers/r197-v1713-fair/RESULT.json'};validateJevbenchV1713Bundle(y,{candidate:true});}
else validateJevbenchV1713Bundle(b,{candidate:true});
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1713ForBoard(root)!==null)throw Error('PENDING leak');
console.log((fairPending?'PASS (fairness PENDING refused fail-closed; all other gates on a FAIR-bound copy) ':'PASS ')+'300 carried rows/cells, one exact new row on the new draw, immutable method/carry, rank order, pins, public text, estimate cost, approval binding; PENDING hidden');
