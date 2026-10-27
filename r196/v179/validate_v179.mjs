import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
// Public identity and template gates also run independently for negative fixtures.
export function checkNewRowText(row) {
 const repo=row.repo.replace(/^https:\/\/huggingface.co\//,'').replace(/\/$/,'');
 const pin=row.model_pin??'';
 if(repo!=='knowledgator/gliclass-v4-9b'||!pin.startsWith(repo+'@14d11a92b5e0bab4a166e1fce4cc0777cac27182'))throw Error('model_pin must match pinned repo and revision');
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(row)))throw Error('public text contains template token');
 const prose=['display','author','licence','disclosure','code_revision','endpoint_condition','cost_basis'].map(f=>row[f]??'').join(' ')+' '+(row.cost?.basis??'');
 if(/\/home\/|workers\/|board\s*#|custody|#\d{4,}|Florian|release.owner|the lead|\brank(?:ed|ing)?\b|\bpod\b|\bVM\b|(?:item|task)[ _-]?(?:id|position)\s*[:#]/i.test(prose))throw Error('internal public text');
}
if(process.argv[2]==='--check-row-json') {
 checkNewRowText(JSON.parse(readFileSync(process.argv[3])));
 console.log('PASS new row pin and template gates');
 process.exit(0);
}
const root=process.argv[2]??process.cwd();
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {readOptionalJevbenchV178Release}=await imp('lib/jevbench-v178-release.mjs');
const {validateJevbenchV179Bundle,readJevbenchV179ForBoard}=await imp('lib/jevbench-v179-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.9-${n}.json`)));
const sha=p=>createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex');
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous:await readOptionalJevbenchV178Release(root),previousManifestSha256:sha('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.8-publication.json')};
for(const p of ['r196/v179/src/inputs.json','r196/v179/inputs/ENTRY-GLICLASS9B.json']) {
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(JSON.parse(readFileSync(path.join(root,p))))))throw Error(p+': source text contains template token');
}
for(const key of b.artifact.addendum.new_keys){checkNewRowText(b.artifact.systems.find(row=>row.key===key));const entry=JSON.parse(readFileSync(path.join(root,'r196/v179/inputs/ENTRY-GLICLASS9B.json')))[key].entry;checkNewRowText({...entry,model_pin:entry.repo.replace('https://huggingface.co/','')+'@'+entry.revision});for(const mode of ['frozen','v17-off','v17-share']){const d=JSON.parse(readFileSync(path.join(root,'r196/v179/src/inputs.json')))[key];checkNewRowText({...d[mode],repo:entry.repo,model_pin:d.model_pin});}}
validateJevbenchV179Bundle(b,{candidate:true});
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV179ForBoard(root)!==null)throw Error('PENDING leaked');
console.log('PASS candidate row validator: 293 carried rows equal except placements; 3 exact reprice/link exceptions; all 296 carried cells unchanged, 1 self-hosted row, immutable carry, method, pricing, scorer, ranks; PENDING hidden');
