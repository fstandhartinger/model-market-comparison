import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {checkNewRowText} from './row_gates_v1710.mjs';
if(process.argv[2]==='--check-row-json'){checkNewRowText(JSON.parse(readFileSync(process.argv[3])));console.log('PASS row gates');process.exit(0)}
const root=process.argv[2]??process.cwd(),imp=p=>import(pathToFileURL(path.join(root,p)));
const {readOptionalJevbenchV179Release}=await imp('lib/jevbench-v179-release.mjs');
const {validateJevbenchV1710Bundle,readJevbenchV1710ForBoard}=await imp('lib/jevbench-v1710-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-${n}.json`)));
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous:await readOptionalJevbenchV179Release(root),previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.9-publication.json'))).digest('hex')};
for(const k of b.artifact.addendum.new_keys){checkNewRowText(b.artifact.systems.find(s=>s.key===k));const d=JSON.parse(readFileSync(path.join(root,'r196/v1710/src/inputs.json')))[k];for(const mode of ['frozen','v17-off','v17-share'])checkNewRowText({...d[mode],model_pin:d.model_pin});}
validateJevbenchV1710Bundle(b,{candidate:true});
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1710ForBoard(root)!==null)throw Error('PENDING leak');
console.log('PASS 297 carried rows/cells, three exact new rows, immutable method/carry, rank order, pins, public text, estimate costs, FAIR and paid public binding; PENDING hidden');
