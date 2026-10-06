import test from 'node:test';
import assert from 'node:assert/strict';
import {readCurrentJevbench} from '../lib/jevbench-current.mjs';
import {readJevbenchAgentFeed} from '../lib/jevbench-agent-feed.mjs';
import {readJevbenchSeoData,currentComparisonPairs,JEV_LEGACY_COMPARISONS,isOpenWeightJevRow} from '../lib/jevbench-seo.mjs';
import {jevbenchLlmsFull} from '../lib/jevbench-llms-full.mjs';
import {isJevbenchV16ExcludedKey} from '../lib/jevbench-v16-public-scope.mjs';
import {importSeoModule,renderSeo,parseJsonLd} from './jevbench-seo-render.mjs';

const data = await readJevbenchSeoData();
test('SEO headline ranks match the open-weights board in the current public feed, not artifact-wide ranks',async()=>{
 const {feed}=await readJevbenchAgentFeed();const {artifact}=await readCurrentJevbench();
 assert.equal(data.artifact.revision,artifact.revision);
 assert.deepEqual(data.ranked.map(r=>[r.key,r.rank,r.capability]),feed.systems.filter(r=>r.capability.open_board_rank!=null).sort((a,b)=>a.capability.open_board_rank-b.capability.open_board_rank).map(r=>[r.key,r.capability.open_board_rank,r.capability.score]));
 assert.ok(data.systems.some(r=>r.key==='jev-1.13.0'));
 assert.ok(Number.isFinite(Date.parse(data.date)));
});
test('comparisons preserve legacy slugs and derive current top-eight rivals',()=>{
 // Pairs still follow the combined Capability order (sitemap unchanged); page ranks use the open board.
 const combined=data.systems.filter(r=>r.capability_eligible&&r.ranked&&r.listing==='ranked').sort((a,b)=>a.combined_rank-b.combined_rank);
 assert.deepEqual(data.comparisons.map(p=>p.slug),currentComparisonPairs(combined).map(p=>p.slug));
 for(const pair of JEV_LEGACY_COMPARISONS) assert.ok(data.comparisons.some(p=>p.slug===pair.slug));
 for(const row of combined.slice(0,8).filter(r=>r.key!=='jev-1.13.0'))assert.ok(data.comparisons.some(p=>p.key===row.key));
 for(const pair of data.comparisons.filter(p=>!p.inCurrentRelease))assert.ok(pair.rival.last_measured_on);
});
test('picks and open-weight classification use current measured evidence',()=>{
 assert.equal(data.winners.mostAccurate.key,[...data.ranked].sort((a,b)=>b.axes.intelligence-a.axes.intelligence)[0].key);
 assert.equal(data.winners.fastest.key,[...data.ranked].sort((a,b)=>b.axes.speed-a.axes.speed)[0].key);
 assert.equal(data.winners.cheapest.key,[...data.ranked].filter(r=>Number.isFinite(r.cost?.usd_per_1000)).sort((a,b)=>a.cost.usd_per_1000-b.cost.usd_per_1000)[0].key);
 assert.deepEqual(data.openWeightAlternatives.map(r=>r.key).sort(),data.systems.filter(isOpenWeightJevRow).map(r=>r.key).sort());
});
test('main server JSON-LD renders valid Dataset, Breadcrumb and visible matching FAQ',async()=>{
 const component=await importSeoModule('components/JevBenchJsonLd.tsx');
 const html=renderSeo(await component.JevBenchMainJsonLd());const [json]=parseJsonLd(html);
 assert.deepEqual(json['@graph'].map(g=>g['@type']),['Dataset','BreadcrumbList','FAQPage']);
 assert.equal(json['@graph'][0].name,'JevBench');assert.equal(json['@graph'][0].dateModified,data.date);
 assert.ok(json['@graph'][0].distribution.contentUrl.endsWith('/api/jevbench/latest'));
 for(const q of json['@graph'][2].mainEntity){assert.ok(html.includes(q.name.replace(/&/g,'&amp;')));assert.ok(q.acceptedAnswer.text);}
 assert.equal(json['@graph'][2].mainEntity.length,4);
});
test('static model params include every current and historical public system; private keys never escape',async()=>{
 const page=await importSeoModule('app/jev-models/[system]/page.tsx');const params=await page.generateStaticParams();
 const {jevSystemSlug}=await import('../lib/jev-system-slug.mjs');
 for(const key of data.modelKeys)assert.ok(params.some(p=>p.system===jevSystemSlug(key)),key);
 for(const row of data.systems)assert.ok(params.some(p=>p.system===jevSystemSlug(row.key)),row.key);
 assert.ok(params.every(p=>!isJevbenchV16ExcludedKey(p.system)));
 const text=await jevbenchLlmsFull();
 for(const row of data.systems.filter(r=>r.ranked))assert.ok(text.includes(`| ${row.key} |`),row.key);
 for(const key of ['djev','djev-thinking'])assert.ok(!text.includes(key));
});
