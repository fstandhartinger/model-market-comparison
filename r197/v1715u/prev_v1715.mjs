// The v1.7.14 bundle v1.7.15 is validated against: v1.7.14 is PASS (flipped and sealed, 7541cf0a), so this is exactly the public
// reader. Used by validate_v1715.mjs and test/jevbench-v1715-release.test.mjs only, never by the site.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function readV1714ForV1715(root=process.cwd()){
 const {readOptionalJevbenchV1714Release}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1714-release.mjs')).href);
 const r=await readOptionalJevbenchV1714Release(root);
 if(!r||r.manifest.review.verdict!=='PASS')throw Error('v1.7.14 must be PASS');
 return {...r,candidate:false};
}
