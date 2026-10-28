// Run after production build. Synthetic PASS is confined to .pass; real release remains PENDING.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),require=createRequire(import.meta.url);
const compiled=require(path.join(root,'.next/server/app/api/jevbench/latest/route.js'));
const GET=compiled.routeModule.userland.GET;
const keys=['singularity-super-decider','singularity-super-decider-thinking'];
const url='https://singularitycompute.com/super-decider';
const manifestPath=path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.13-publication.json');
const before=readFileSync(manifestPath,'utf8');
assert.equal(JSON.parse(before).review.verdict,'PENDING');
const current=await (await GET()).json();
assert.equal(current.latest_release,'v1.7.12');
process.chdir(path.join(root,'r197/v1713/.pass'));
try{
 const candidate=await (await GET()).json();
 assert.equal(candidate.latest_release,'v1.7.13');
 const rows=candidate.systems.filter(s=>keys.includes(s.key));
 assert.equal(rows.length,2);
 for(const row of rows){assert.equal(row.source_url,url);assert.doesNotMatch(JSON.stringify(row),/huggingface.co/);}
 writeFileSync(path.join(root,'r197/v1713/receipts/BUILT-LINKS.json'),JSON.stringify({status:'PASS',compiled_route:'.next/server/app/api/jevbench/latest/route.js',real_pending_latest:current.latest_release,synthetic_candidate_latest:candidate.latest_release,rows,real_manifest_unchanged:true},null,1)+'\n');
 console.log('PASS built latest GET: real PENDING stays v1.7.12; isolated candidate v1.7.13 returns vendor URL for both rows, no HF URL');
}finally{process.chdir(root);assert.equal(readFileSync(manifestPath,'utf8'),before);}
