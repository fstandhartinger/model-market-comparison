// Run inside postflip_build_v1714.sh, after the production build and BEFORE the restore: the worktree holds the synthetic PASS
// files (no authority). Checks the compiled /api/jevbench/latest route and the prerendered v1.7.14 page: all five rows are served,
// unranked, with their reason; no rank anywhere; the v1.7.13 row is still there.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),require=createRequire(import.meta.url),J=path.join(root,'r197/v1714');
const KEYS=Object.keys(JSON.parse(readFileSync(path.join(J,'src/inputs.json')))).sort();
const spec=JSON.parse(readFileSync(path.join(J,'receipts/NEW-ROW-SPEC.json')));
const compiled=require(path.join(root,'.next/server/app/api/jevbench/latest/route.js'));
const feed=await (await compiled.routeModule.userland.GET()).json();
assert.equal(feed.latest_release,'v1.7.14');
const rows=feed.systems.filter(s=>KEYS.includes(s.key));assert.equal(rows.length,5);
for(const r of rows){assert.equal(r.ranked,false);assert.equal(r.listing,'unranked');assert.equal(r.rank,null);assert.equal(r.capability.rank,null);assert.equal(r.not_ranked_because,spec[r.key].not_ranked_because);}
assert.ok(feed.systems.some(s=>s.key==='h2o-lightning-4b-v1.4.1'));
const html=['.next/server/app/jev-models/v1.7.14.html','.next/server/app/jev-models.html'].map(p=>path.join(root,p));
assert.ok(existsSync(html[0]),'prerendered v1.7.14 page');
const page=readFileSync(html[0],'utf8'),board=existsSync(html[1])?readFileSync(html[1],'utf8'):'';
const esc=s=>s.replace(/&/g,'&amp;').replace(/'/g,'&#x27;');
for(const k of KEYS)assert.ok(page.includes(esc(spec[k].display))||page.includes(spec[k].display),'v1.7.14 page shows '+k);
const onBoard=board?KEYS.filter(k=>board.includes(esc(spec[k].display))||board.includes(spec[k].display)):[];
writeFileSync(path.join(J,'receipts/BUILT-LINKS.json'),JSON.stringify({status:'PASS',compiled_route:'.next/server/app/api/jevbench/latest/route.js',synthetic_latest:feed.latest_release,feed_rows:feed.systems.length,new_rows_in_feed:rows.map(r=>({key:r.key,ranked:r.ranked,listing:r.listing,rank:r.rank,composite_score:r.composite_score})),v1714_page_shows_all_five:true,main_board_html_shows:onBoard},null,1)+'\n');
console.log('PASS built latest GET (synthetic PASS): latest v1.7.14, 5 rows unranked with reason, v1.7.13 row present; prerendered v1.7.14 page shows all five; main board html shows',onBoard.length);
