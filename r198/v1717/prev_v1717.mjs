import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function readV1716ForV1717(root=process.cwd()){
 const {validateJevbenchV1716Bundle}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1716-release.mjs')));
 const {readOptionalJevbenchV1715Release}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1715-release.mjs')));
 const previous=await readOptionalJevbenchV1715Release(root);
 const p='data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-';
 const load=n=>JSON.parse(readFileSync(path.join(root,p+n+'.json')));
 const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.15-publication.json'))).digest('hex')};
 for(const [n,f] of Object.entries(b.manifest.files))if(createHash('sha256').update(readFileSync(path.join(root,f.path))).digest('hex')!==f.sha256)throw Error('predecessor bytes '+n);
 validateJevbenchV1716Bundle(b,{candidate:true});
 return {...b,sha256:createHash('sha256').update(readFileSync(path.join(root,p+'results.json'))).digest('hex'),historical:previous.historical};
}
