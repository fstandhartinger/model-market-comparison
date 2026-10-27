import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
export async function bundle(root=process.cwd()){
 const imp=p=>import(pathToFileURL(path.join(root,p)));
 const {readOptionalJevbenchV1710Release}=await imp('lib/jevbench-v1710-release.mjs');
 const load=n=>JSON.parse(readFileSync(path.join(root,`data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.11-${n}.json`)));
 return {manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous:await readOptionalJevbenchV1710Release(root),previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.10-publication.json'))).digest('hex')};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const root=process.argv[2]??process.cwd();const {validateJevbenchV1711Bundle,readJevbenchV1711ForBoard}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1711-release.mjs')));
 const b=await bundle(root);validateJevbenchV1711Bundle(b,{candidate:true});
 if(b.manifest.review.verdict==='PENDING'&&await readJevbenchV1711ForBoard(root)!==null)throw Error('PENDING leak');
 console.log('PASS immutable non-cost fields, exact four corrections, unchanged cells/carry/method, ranks, provenance and PENDING visibility');
}
