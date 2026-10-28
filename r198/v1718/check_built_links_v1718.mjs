import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=process.cwd();
const compiled=require(root+'/.next/server/app/api/jevbench/latest/route.js');
const feed=await(await compiled.routeModule.userland.GET()).json();assert.equal(feed.latest_release,'v1.7.18');
const page=readFileSync('.next/server/app/jev-models/v1.7.18.html','utf8');
for(const key of ['knowline-26b-a4b-gen2.5','knowline-4b-gen5.5']){const r=feed.systems.find(s=>s.key===key);assert.ok(r?.ranked);assert.ok(Number.isInteger(r.rank));assert.ok(page.includes(r.display)||page.includes(key));}
assert.ok(page.includes('unavailable'));assert.ok(page.includes('which timed-out answers were decisive'));assert.ok(page.includes('/jev-models/v1.7.17'));assert.ok(page.includes('The answer file was lost on 26 Oct 2026 after scoring.'));
writeFileSync('r198/v1718/receipts/BUILT-LINKS.json',JSON.stringify({status:'PASS',latest:feed.latest_release,feed_rows:feed.systems.length,page_has_both_new_rows:true,page_unavailable_diagnostic:true,loss_disclosures:true,previous_link:true},null,1)+'\n');
console.log('PASS compiled latest GET and prerendered release page, new ranked rows, unavailable diagnostic and disclosures');
