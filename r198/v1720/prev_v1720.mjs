import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function readV1719ForV1720(root=process.cwd()){
 const {validateJevbenchV1719Bundle}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1719-release.mjs')));
 const {readV1718ForV1719}=await import(pathToFileURL(path.join(root,'r198/v1719/prev_v1719.mjs')));
 const previous=await readV1718ForV1719(root);
 const p='data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.19-';
 const load=n=>JSON.parse(readFileSync(path.join(root,p+n+'.json')));
 const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.18-publication.json'))).digest('hex')};
 for(const [n,f] of Object.entries(b.manifest.files))if(createHash('sha256').update(readFileSync(path.join(root,f.path))).digest('hex')!==f.sha256)throw Error('predecessor bytes '+n);
 validateJevbenchV1719Bundle(b,{candidate:true});
 return {...b,sha256:createHash('sha256').update(readFileSync(path.join(root,p+'results.json'))).digest('hex'),historical:previous.historical};
}
