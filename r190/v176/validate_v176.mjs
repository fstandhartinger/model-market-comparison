import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
// Public identity and template gates also run independently for negative fixtures.
export function checkNewRowText(row) {
 const repo=row.repo.replace(/^https:\/\/huggingface.co\//,'').replace(/\/$/,'');
 const pin=row.model_pin??'';
 if(!pin.startsWith(repo+'@'))throw Error('model_pin must start with repo owner/name');
 if(row.key==='decisio-gemma-4-12b-tuned-commit' &&
    (!pin.includes('tachara-ai/Decisio-12b-tuned-commit@245e00dc') || /sthanika-ai|31B/i.test(pin) ||
     pin!=='tachara-ai/Decisio-12b-tuned-commit@245e00dc45abad14d693b1ebae4d4c7aa9cf72f1 + aminry/decisio@4f849ff2dbae10a53026e382ce3dd60b95780594'))throw Error('model_pin owner/revision or base family size mismatch');
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(row)))throw Error('public text contains template token');
}
if(process.argv[2]==='--check-row-json') {
 checkNewRowText(JSON.parse(readFileSync(process.argv[3])));
 console.log('PASS new row pin and template gates');
 process.exit(0);
}
const root=process.argv[2]??process.cwd();
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {readOptionalJevbenchV175Release}=await imp('lib/jevbench-v175-release.mjs');
const {validateJevbenchV176Bundle,readJevbenchV176ForBoard}=await imp('lib/jevbench-v176-release.mjs');
const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.6-${n}.json`)));
const sha=p=>createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex');
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous:await readOptionalJevbenchV175Release(root),previousManifestSha256:sha('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.5-publication.json')};
for(const p of ['r190/v176/src/inputs.json','r190/v176/inputs/ENTRY-DECISIO.json']) {
 if(/\{[A-Za-z_][A-Za-z0-9_]*\}/.test(JSON.stringify(JSON.parse(readFileSync(path.join(root,p))))))throw Error(p+': source text contains template token');
}
for(const key of b.artifact.addendum.new_keys)checkNewRowText(b.artifact.systems.find(row=>row.key===key));
validateJevbenchV176Bundle(b,{candidate:true});
if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV176ForBoard(root)!==null)throw Error('PENDING leaked');
console.log('PASS candidate row validator: 292 carried rows/cells equal except placements, 1 self-hosted row, immutable carry, method, pricing, scorer, ranks; PENDING hidden');
