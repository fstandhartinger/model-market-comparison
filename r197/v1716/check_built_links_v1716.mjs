// Run inside postflip_build_v1716.sh, after the production build and BEFORE the restore: the worktree holds the synthetic PASS manifest
// (no authority). Checks the compiled /api/jevbench/latest route and the prerendered v1.7.16 page: all eight rows of the 27 Oct draw
// are served unranked with the exact note and their same-items cost, the new Strike-1 row is present, the round-1 Microsoft row is still ranked.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),require=createRequire(import.meta.url),J=path.join(root,'r197/v1716');
const res=JSON.parse(readFileSync(path.join(root,'data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.16-results.json')));const DK=[...res.addendum.new_keys,...res.addendum.repriced_keys].sort(),by=new Map(res.systems.map(s=>[s.key,s]));
const compiled=require(path.join(root,'.next/server/app/api/jevbench/latest/route.js'));
const feed=await (await compiled.routeModule.userland.GET()).json();
assert.equal(feed.latest_release,'v1.7.16');
const rows=feed.systems.filter(s=>DK.includes(s.key));assert.equal(rows.length,8);
for(const r of rows){assert.equal(r.ranked,false);assert.equal(r.listing,'unranked');assert.equal(r.rank,null);assert.equal(r.capability.rank,null);assert.equal(r.not_ranked_because,by.get(r.key).not_ranked_because);assert.ok(Math.abs(r.composite_score-by.get(r.key).scores.A)<1e-9,'same-items composite served '+r.key);}
const live=feed.systems.find(s=>s.key==='microsoft-decision-1');assert.ok(live&&live.ranked===true&&Number.isInteger(live.rank));
const html=['.next/server/app/jev-models/v1.7.16.html','.next/server/app/jev-models.html'].map(p=>path.join(root,p));
assert.ok(existsSync(html[0]),'prerendered v1.7.16 page');
const page=readFileSync(html[0],'utf8'),board=existsSync(html[1])?readFileSync(html[1],'utf8'):'';
const esc=s=>s.replace(/&/g,'&amp;').replace(/'/g,'&#x27;');
const K='strike-1';assert.ok(page.includes(esc(by.get(K).display))||page.includes(by.get(K).display),'v1.7.16 page shows the new row');
assert.ok(page.includes('costs on that draw now use the items every row answered'),'v1.7.16 page shows the history sentence');
const onBoard=board?DK.filter(k=>board.includes(esc(by.get(k).display))||board.includes(by.get(k).display)):[];
writeFileSync(path.join(J,'receipts/BUILT-LINKS.json'),JSON.stringify({status:'PASS',compiled_route:'.next/server/app/api/jevbench/latest/route.js',synthetic_latest:feed.latest_release,feed_rows:feed.systems.length,draw_rows_in_feed:rows.map(r=>({key:r.key,ranked:r.ranked,listing:r.listing,rank:r.rank,composite_score:r.composite_score,note_exact:r.not_ranked_because===by.get(r.key).not_ranked_because})),live_round1_rank:live.rank,v1716_page_shows_new_row:true,main_board_html_shows:onBoard},null,1)+'\n');
console.log('PASS built latest GET (synthetic PASS): latest v1.7.16, 8 draw rows unranked with the exact note and same-items composite, round-1 Microsoft row ranked; prerendered v1.7.16 page shows the new row; main board html shows',onBoard.length);
