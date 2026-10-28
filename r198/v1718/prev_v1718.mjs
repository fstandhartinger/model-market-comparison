import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function readV1717ForV1718(root=process.cwd()){
 const {validateJevbenchV1717Bundle}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1717-release.mjs')));
 const {readV1716ForV1717}=await import(pathToFileURL(path.join(root,'r198/v1717/prev_v1717.mjs')));
 const previous=await readV1716ForV1717(root);
 const p='data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.17-';
 const load=n=>JSON.parse(readFileSync(path.join(root,p+n+'.json')));
 const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-publication.json'))).digest('hex')};
 for(const [n,f] of Object.entries(b.manifest.files))if(createHash('sha256').update(readFileSync(path.join(root,f.path))).digest('hex')!==f.sha256)throw Error('predecessor bytes '+n);
 validateJevbenchV1717Bundle(b,{candidate:true});
 return {...b,sha256:createHash('sha256').update(readFileSync(path.join(root,p+'results.json'))).digest('hex'),historical:previous.historical};
}
