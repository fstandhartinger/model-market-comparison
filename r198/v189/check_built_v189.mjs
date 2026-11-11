import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {validateV189PublicText} from '../../lib/jevbench-v189-release.mjs';
const require=createRequire(import.meta.url),root=process.cwd(),J='r198/v189/',load=p=>JSON.parse(readFileSync(p)),d='data/raw/benchmarks/jevbench/v1.8/';
const feed=await(await require(path.join(root,'.next/server/app/api/jevbench/latest/route.js')).routeModule.userland.GET()).json();
const old=load(d+'jevbench-v1.8.8-results.json'),a=load(d+'jevbench-v1.8.9-results.json'),fresh=a.addendum.new_keys,by=new Map(feed.systems.map(s=>[s.key,s]));
assert.equal(feed.latest_release,'v1.8.9');assert.equal(feed.systems.length,old.systems.length+fresh.length);
assert.equal(feed.capability_policy.cost_cap_usd_per_1000,.06459465517241379);assert.equal(feed.capability_policy.median_latency_cap_s,1.2329566404223442);
for(const k of fresh){const s=by.get(k),r=a.systems.find(s=>s.key===k);assert.ok(s);assert.equal(s.ranked,false);assert.equal(s.rank,null);assert.equal(s.capability.rank,null);assert.equal(s.not_ranked_because,r.not_ranked_because);assert.equal(s.price.usd_per_1000_decisions,r.cost.usd_per_1000);assert.equal(Object.hasOwn(s.latency,'n'),false,'compiled feed withholds latency count');}
const allData=await(await require(path.join(root,'.next/server/app/api/jevbench-alldata/[version]/route.js')).routeModule.userland.GET(undefined,{params:Promise.resolve({version:'v1.8.9'})})).json();
for(const k of fresh){const row=allData.artifact.systems.find(r=>r.key===k);assert.ok(row,'compiled All-data row');validateV189PublicText(row);assert.equal(allData.categoryView?.systems?.[k],undefined,'compiled All-data missing cells');}
for(const r of old.systems)assert.equal(by.get(r.key).price.usd_per_1000_decisions,r.cost.usd_per_1000,'carried cost '+r.key);
const slug=k=>k;
const html=p=>readFileSync(p,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
for(const p of ['.next/server/app/jev-models.html','.next/server/app/jev-models/all.html']){const t=html(p);assert.ok(t.includes('method v1.8 (10 s rule, GPU-time cost basis)'));assert.equal([...t.matchAll(/href="\/jev-models\/v1\.8\.9"/g)].length,1);}
for(const k of fresh){const page=html(`.next/server/app/jev-models/${k}.html`);for(const term of ['Karpo-Decision-31B','RTX PRO 6000','25c38826','bf16','fp32','no generation','per-category breakdowns are not published','Failed or unanswered requests count as wrong answers.'])assert.ok(page.includes(term),'visible fact '+term);
 assert.ok(!/1,495|32,768|HTTP 422|1,500 items|1500 items/i.test(page),'restricted model-page disclosure');assert.match(page.replace(/<[^>]*>/g,''),/published\s*2026-11-11/,'publication date');assert.ok(page.includes('2026-11-10'),'measurement date preserved');
}
const method=html('.next/server/app/jev-models/methodology.html');assert.ok(method.includes('methodology — JevBench v1.8.9'));assert.ok(method.includes('Artifact anchor (original scoring release)'));assert.ok(method.includes('Published release <b>v1.8.9</b>'));
writeFileSync(J+'receipts/BUILT-LINKS.json',JSON.stringify({status:'PASS',source:'production-compiled latest API and static HTML',rows:feed.systems.length,new_rows:fresh,all_new_unranked:true,carried_costs_unchanged:true,caps_unchanged:true,method_labels:true,single_history_entry:true,methodology_current_release_and_separate_anchor:true,new_base_model_disclosure_correct:true,compiled_alldata_missing_breakdowns:true,compiled_feed_withheld_counts_absent:true},null,1)+'\n');
console.log('PASS compiled API, new unranked rows, carried costs, caps, board labels, single history entry and methodology anchor');
