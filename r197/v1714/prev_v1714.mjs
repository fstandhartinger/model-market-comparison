// The v1.7.13 bundle v1.7.14 is validated against. Once v1.7.13 is PASS, this is exactly the public reader
// (readOptionalJevbenchV1713Release); while it is still PENDING, its bundle is validated in candidate mode against its own
// (PASS) predecessor. Used by validate_v1714.mjs and test/jevbench-v1714-release.test.mjs only, never by the site.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function readV1713ForV1714(root=process.cwd()){
 const imp=p=>import(pathToFileURL(path.join(root,p)).href);
 const V=path.join(root,'data/raw/benchmarks/jevbench/v1.7'),load=async n=>JSON.parse(await readFile(path.join(V,`jevbench-v1.7.13-${n}.json`)));
 const manifest=await load('publication');
 const {readOptionalJevbenchV1713Release,validateJevbenchV1713Bundle}=await imp('lib/jevbench-v1713-release.mjs');
 if(manifest.review.verdict==='PASS')return {...await readOptionalJevbenchV1713Release(root),candidate:false};
 const {readOptionalJevbenchV1712Release}=await imp('lib/jevbench-v1712-release.mjs');
 const b={manifest,artifact:await load('results'),categories:await load('categories'),carry:await load('carry'),proof:await load('proof'),previous:await readOptionalJevbenchV1712Release(root),previousManifestSha256:sha(await readFile(path.join(V,'jevbench-v1.7.12-publication.json')))};
 validateJevbenchV1713Bundle(b,{candidate:true});
 return {artifact:b.artifact,categories:b.categories,carry:b.carry,proof:b.proof,manifest,candidate:true};
}
