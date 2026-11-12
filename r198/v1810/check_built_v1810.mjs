import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire(import.meta.url),root=process.cwd(),J='r198/v1810/',load=p=>JSON.parse(readFileSync(p)),d='data/raw/benchmarks/jevbench/v1.8/';
const feed=await(await require(path.join(root,'.next/server/app/api/jevbench/latest/route.js')).routeModule.userland.GET()).json();
const old=load(d+'jevbench-v1.8.9-results.json'),a=load(d+'jevbench-v1.8.10-results.json'),by=new Map(feed.systems.map(s=>[s.key,s])),ranked=a.addendum.ranked_keys,unranked=a.addendum.unranked_keys;
assert.equal(feed.latest_release,'v1.8.10');assert.equal(feed.systems.length,old.systems.length);
assert.equal(feed.capability_policy.cost_cap_usd_per_1000,.06459465517241379);assert.equal(feed.capability_policy.median_latency_cap_s,1.2329566404223442);
for(const k of ranked){const s=by.get(k),r=a.systems.find(s=>s.key===k);assert.ok(s,k);assert.equal(s.ranked,true,k);assert.equal(s.rank,r.rank,k);assert.ok(!s.not_ranked_because,k);assert.equal(s.price.usd_per_1000_decisions,r.cost.usd_per_1000);}
for(const k of unranked){const s=by.get(k),r=a.systems.find(s=>s.key===k);assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.not_ranked_because,r.not_ranked_because);}
for(const r of old.systems)assert.equal(by.get(r.key).price.usd_per_1000_decisions,r.cost.usd_per_1000,'carried cost '+r.key);
assert.equal(feed.systems.filter(s=>s.ranked).length,a.n_ranked);
const allData=await(await require(path.join(root,'.next/server/app/api/jevbench-alldata/[version]/route.js')).routeModule.userland.GET(undefined,{params:Promise.resolve({version:'v1.8.10'})})).json();
assert.equal(allData.artifact.revision,'v1.8.10');assert.equal(allData.artifact.n_ranked,a.n_ranked);
const html=p=>readFileSync(p,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
for(const p of ['.next/server/app/jev-models.html','.next/server/app/jev-models/all.html']){const t=html(p);assert.equal([...t.matchAll(/href="\/jev-models\/v1\.8\.10"/g)].length,1);}
const page=html('.next/server/app/jev-models/v1.8.10.html').replace(/<[^>]*>/g,' ');assert.ok(page.includes('four strong anchor systems'));assert.ok(page.includes('ranked 31 of its rows'));assert.ok(page.includes('four stay unranked'));assert.ok(page.includes('AutoTrust-Decider-Pro-27B'));
for(const s of feed.systems)assert.ok(!/not yet equated|until (that|the) draw is equated|stronger anchor|first anchor runs/i.test(s.not_ranked_because??''),'stale reason '+s.key);
const board=html('.next/server/app/jev-models.html');assert.equal(feed.systems.find(s=>s.key==='jev-27b-autotrust').name,'AutoTrust-Decider-Pro-27B (AutoTrust, Qwen3.8-27B)');assert.ok(!feed.systems.some(s=>/^JEV-(9B|27B)/.test(s.display)));
for(const k of a.addendum.held_keys){const s=by.get(k);assert.equal(s.ranked,false);assert.equal(s.not_ranked_because,a.systems.find(x=>x.key===k).not_ranked_because);}
for(const k of ['Torchcast Decision 31B v1.0','Karpo-Decision-31B','decide-1.1'])assert.ok(board.includes(k),'ranked row on the board html '+k);
writeFileSync(J+'receipts/BUILT-LINKS.json',JSON.stringify({status:'PASS',source:'production-compiled latest API, All-data route and static HTML of the synthetic PASS tree',rows:feed.systems.length,ranked_rows_in_feed:feed.systems.filter(s=>s.ranked).length,newly_ranked:ranked.length,unranked_kept:unranked,carried_costs_unchanged:true,caps_unchanged:true,single_history_entry:true,release_page_equated_wording:true,no_stale_unranked_reason_in_feed:true,newly_ranked_rows_on_board_html:true},null,1)+'\n');
console.log('PASS compiled API, ranked/unranked rows, carried costs, caps, single history entry, release page wording and no stale unranked reason in the feed');
