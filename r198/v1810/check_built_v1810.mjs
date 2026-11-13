import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire(import.meta.url),root=process.cwd(),J='r198/v1810/',load=p=>JSON.parse(readFileSync(p)),d='data/raw/benchmarks/jevbench/v1.8/';
const feed=await(await require(path.join(root,'.next/server/app/api/jevbench/latest/route.js')).routeModule.userland.GET()).json();
const old=load(d+'jevbench-v1.8.9-results.json'),a=load(d+'jevbench-v1.8.10-results.json'),by=new Map(feed.systems.map(s=>[s.key,s])),ranked=a.addendum.ranked_keys,unranked=a.addendum.unranked_keys;
const NEW=a.addendum.new_keys;assert.deepEqual(NEW,['gemini-decision-1']);
const REMOVED=a.addendum.removed_keys??[];assert.deepEqual(REMOVED,['microsoft-decision-1-a2-20261012']);for(const k of REMOVED)assert.ok(!by.has(k),'removed listing absent from the feed '+k);   // r278: the removed unranked A2 listing
assert.equal(feed.latest_release,'v1.8.10');assert.equal(feed.systems.length,old.systems.length+NEW.length-REMOVED.length);
assert.equal(feed.capability_policy.cost_cap_usd_per_1000,.06459465517241379);assert.equal(feed.capability_policy.median_latency_cap_s,1.2329566404223442);
for(const k of ranked){const s=by.get(k),r=a.systems.find(s=>s.key===k);assert.ok(s,k);assert.equal(s.ranked,true,k);assert.equal(s.rank,r.rank,k);assert.ok(!s.not_ranked_because,k);assert.equal(s.price.usd_per_1000_decisions,r.cost.usd_per_1000);}
for(const k of NEW){const s=by.get(k),r=a.systems.find(s=>s.key===k);assert.ok(s,k);assert.equal(s.ranked,true,k);assert.equal(s.rank,r.rank,k);assert.equal(s.price.usd_per_1000_decisions,r.cost.usd_per_1000,k);}
for(const k of unranked){const s=by.get(k),r=a.systems.find(s=>s.key===k);assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.not_ranked_because,r.not_ranked_because);}
for(const r of old.systems.filter(r=>!REMOVED.includes(r.key)))assert.equal(by.get(r.key).price.usd_per_1000_decisions,r.cost.usd_per_1000,'carried cost '+r.key);
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
// combined candidate: the added hosted-API row is on the API board (not the open-weights board), its detail page renders with its texts,
// the release page carries the history clause; the low-sample caveat of the compare view is back on the open-weights board
const api=html('.next/server/app/jev-models/api.html');assert.ok(api.includes('Gemini Decision 1'),'added row on the API board');
assert.ok(api.includes('data-bh-jev-api-roster-self-reported="gemini-decision-1"')&&api.replace(/&amp;/g,'&').includes('Google reports 92.2 %'),'self-reported figure beside the row on the API board');
const raw=p=>readFileSync(p,'utf8');const det=raw('.next/server/app/jev-models/gemini-decision-1.html'),detText=html('.next/server/app/jev-models/gemini-decision-1.html').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'");
for(const t of ['Gemini Decision 1','Google reports 92.2 %','86.3 %','ImageJevBench: requested, no date.','request-pinned','Google list price USD 0.10 per 1M input tokens'])assert.ok(detText.includes(t),'detail page text '+t);
assert.ok(page.includes('added Gemini Decision 1 (Google, hosted API) on the same draw'),'history clause on the release page');
// r278: low-sample cells are drawn as hollow, marked points (legend data-bh-jev15-low-sample-drawn) instead of listed in a table; the release
// page takes the artifact path too (critic C2), so no row with published cells says it has none.
const markers=(raw('.next/server/app/jev-models.html').match(/data-bh-jev15-low-sample-drawn=/g)||[]).length,lsNone=(raw('.next/server/app/jev-models.html').match(/data-bh-jev15-low-sample-none=/g)||[]).length;
assert.ok(markers>0,'low-sample cells drawn and marked on /jev-models');
assert.ok((raw('.next/server/app/jev-models/v1.8.10.html').match(/data-bh-jev15-low-sample-drawn=/g)||[]).length>0,'low-sample cells drawn and marked on /jev-models/v1.8.10');
assert.equal(html('.next/server/app/jev-models/v1.8.10.html').split('No per-category values are published for this system').length-1,0,'release page: no visible "no per-category values" text');
writeFileSync(J+'receipts/BUILT-LINKS.json',JSON.stringify({status:'PASS',added_rows:NEW,added_row_on_api_board_html:true,added_row_detail_page_texts:true,history_clause:true,lowsample_rows_on_open_board:markers,lowsample_none_notes_on_open_board:lsNone,source:'production-compiled latest API, All-data route and static HTML of the synthetic PASS tree',rows:feed.systems.length,ranked_rows_in_feed:feed.systems.filter(s=>s.ranked).length,newly_ranked:ranked.length,unranked_kept:unranked,carried_costs_unchanged:true,caps_unchanged:true,single_history_entry:true,release_page_equated_wording:true,no_stale_unranked_reason_in_feed:true,newly_ranked_rows_on_board_html:true},null,1)+'\n');
console.log('PASS (combined: added row in feed/API board/detail page; low-sample rows '+markers+') compiled API, ranked/unranked rows, carried costs, caps, single history entry, release page wording and no stale unranked reason in the feed');
