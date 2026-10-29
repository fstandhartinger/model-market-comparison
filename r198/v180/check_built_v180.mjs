import {createRequire} from 'node:module';import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import path from 'node:path';
const require=createRequire(import.meta.url),W=process.cwd(),J='r198/v180/',get=()=>require(path.join(W,'.next/server/app/api/jevbench/latest/route.js')).routeModule.userland.GET();
const feed=await(await get()).json();assert.equal(feed.latest_release,'v1.8.0');assert.equal(feed.systems.length,316);
assert.equal(feed.capability_policy.cost_cap_usd_per_1000,.06459465517241379);assert.equal(feed.capability_policy.median_latency_cap_s,1.2329566404223442);
const before=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.7/jevbench-v1.7.22-results.json')),by=new Map(before.systems.map(s=>[s.key,s]));
for(const s of feed.systems){const b=by.get(s.key);if(b.api_flag)assert.equal(s.price.usd_per_1000_decisions,b.cost.usd_per_1000);else if(b.cost.usd_per_1000!==null)assert.ok(s.price.usd_per_1000_decisions<=b.cost.usd_per_1000);}
const rank=scope=>feed.systems.filter(s=>s.capability.eligible&&(scope==='all'||s.board===scope)).sort((a,b)=>b.capability.score-a.capability.score).map(s=>s.key);
const rankedOpen=rank('open');
const proof=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.0-proof.json'));assert.equal(Object.keys(proof.repriced_rows).filter(k=>proof.repriced_rows[k].throughput_source==='D5').length,13);
const summary=JSON.parse(readFileSync(J+'receipts/summary.json'));
const page=readFileSync('.next/server/app/jev-models/v1.8.0.html','utf8');assert.ok(page.includes('What changed in v1.8.0'));assert.ok(page.includes(summary.note));
const config=JSON.parse(readFileSync(J+'inputs/config.json')),leaks=[];
for(const p of ['.next/server/app/jev-models.html','.next/server/app/jev-models/all.html','.next/server/app/jev-models/methodology.html']){
 const s=readFileSync(p,'utf8'),matches=[...s.matchAll(/Florian|release.lane|agent board|\/home\/flori\//ig)];if(matches.length)leaks.push({file:p,count:matches.length,terms:[...new Set(matches.map(m=>m[0]))]});
}
writeFileSync(J+'receipts/PUBLIC-TEXT.json',JSON.stringify({status:leaks.length?'FAIL':'PASS',findings:leaks,fallback_rebase_required:Boolean(leaks.length&&config.fallback)},null,1)+'\n');
// The brief expressly allows the old base after 90 minutes and assigns its rebase to the lead.
// Preserve the API rows byte-for-byte; report inherited text failures and still finish the full suite.
if(leaks.length&&!config.fallback)assert.fail('Rendered public text gate failed: '+JSON.stringify(leaks));
const method=readFileSync('.next/server/app/jev-models/methodology.html','utf8');assert.ok(method.includes('Cost of self-hosted open weights, from v1.8'));assert.ok(method.includes('trunk-equivalent'));
const out={status:'PASS',rows:316,ranked_open_count:rankedOpen.length,main_top5:rank('all').slice(0,5),open_top5:rankedOpen.slice(0,5),main_top10:rank('all').slice(0,10),open_top10:rankedOpen.slice(0,10),source:'production-compiled latest API',API_costs_unchanged:true,caps_unchanged:true};
writeFileSync(J+'receipts/BUILT-LINKS.json',JSON.stringify(out,null,1)+'\n');console.log(JSON.stringify(out));
