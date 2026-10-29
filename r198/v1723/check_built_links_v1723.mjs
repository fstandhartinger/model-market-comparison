// Run in heavy_v1723.sh after the production build while the synthetic PASS manifest is in place (no authority).
// Checks the compiled /api/jevbench/latest route and the prerendered v1.7.23 page: latest = v1.7.23, no leaked process term in any
// rendered text, every row's rank/listing equals the v1.7.22 value, and the page shows exactly this release's note.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {V1723_PUBLIC_LEAK,V1723_HISTORY_NOTE} from '../../lib/jevbench-v1723-release.mjs';
const root=process.cwd(),require=createRequire(import.meta.url),J=path.join(root,'r198/v1723'),V='data/raw/benchmarks/jevbench/v1.7/';
const load=n=>JSON.parse(readFileSync(path.join(root,V+n)));
const res=load('jevbench-v1.7.23-results.json'),prev=load('jevbench-v1.7.22-results.json'),pby=new Map(prev.systems.map(s=>[s.key,s]));
const compiled=require(path.join(root,'.next/server/app/api/jevbench/latest/route.js'));
const feedText=JSON.stringify(await (await compiled.routeModule.userland.GET()).json());const feed=JSON.parse(feedText);
assert.equal(feed.latest_release,'v1.7.23');assert.equal(feed.systems.length,res.systems.length);
const leak=(t,name)=>{const m=t.match(V1723_PUBLIC_LEAK);assert.ok(!m,`leak in ${name}: ${m&&t.slice(Math.max(0,m.index-60),m.index+60)}`)};
leak(feedText,'latest feed');
for(const s of feed.systems){const p=pby.get(s.key);assert.ok(p,s.key);assert.equal(s.rank,p.rank??null,'rank '+s.key);assert.equal(s.listing,p.listing,'listing '+s.key);assert.equal(s.ranked,!!p.ranked);}
const htmlPaths=['.next/server/app/jev-models/v1.7.23.html','.next/server/app/jev-models.html'].map(p=>path.join(root,p));
assert.ok(existsSync(htmlPaths[0]),'prerendered v1.7.23 page');
const page=readFileSync(htmlPaths[0],'utf8');leak(page,'/jev-models/v1.7.23');
if(existsSync(htmlPaths[1]))leak(readFileSync(htmlPaths[1],'utf8'),'/jev-models');
assert.ok(page.includes('Previous v1.7.22'),'previous release link in compiled page');
assert.ok(page.includes(V1723_HISTORY_NOTE),'page shows the history sentence');
const whatChanged=page.match(/<section[^>]*data-bh-jev1723-method[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert.ok(whatChanged,'What changed section exists');
assert.deepEqual([...whatChanged.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m=>m[1]),[V1723_HISTORY_NOTE],'What changed shows exactly this release note');
assert.equal((page.match(/Text-only corrections: removed internal process references/g)??[]).length>=1,true);
writeFileSync(path.join(J,'receipts/BUILT-LINKS.json'),JSON.stringify({status:'PASS',compiled_route:'.next/server/app/api/jevbench/latest/route.js',synthetic_latest:feed.latest_release,feed_rows:feed.systems.length,rendered_leak_scan:{feed:'clean',v1723_page:'clean',board_page:existsSync(htmlPaths[1])?'clean':'absent'}},null,1)+'\n');
console.log('PASS built latest feed and v1.7.23 page: no leaked term, ranks/listings equal v1.7.22, page shows exactly this release note');
