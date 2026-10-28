// The v1.7.15 bundle v1.7.16 is validated against: v1.7.15 is PASS (flipped and sealed, 7541cf0a), so this is exactly the public
// reader. Used by validate_v1716.mjs and test/jevbench-v1716-release.test.mjs only, never by the site.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export async function readV1715ForV1716(root=process.cwd()){
 const {readOptionalJevbenchV1715Release}=await import(pathToFileURL(path.join(root,'lib/jevbench-v1715-release.mjs')).href);
 const r=await readOptionalJevbenchV1715Release(root);
 if(!r||r.manifest.review.verdict!=='PASS')throw Error('v1.7.15 must be PASS');
 return {...r,candidate:false};
}
