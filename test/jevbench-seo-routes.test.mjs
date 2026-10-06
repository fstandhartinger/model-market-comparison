import {jevSystemPath} from '../lib/jev-system-slug.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {readJevbenchSeoData,readJevbenchSeoUrls} from '../lib/jevbench-seo.mjs';
import {importSeoModule,renderSeo,parseJsonLd} from './jevbench-seo-render.mjs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const data=await readJevbenchSeoData();
test('SEO consumers do not import a frozen results reader',()=>{
 for(const p of ['app/jev-models/alternatives/page.tsx','app/jev-models/open-source-jev/page.tsx','app/jev-models/how-to-choose/page.tsx','components/JevComparisonPage.tsx','components/JevBenchSeoBlocks.tsx','components/JevBenchRelatedLinks.tsx','app/sitemap.ts']) assert.doesNotMatch(read(p),/from ['"][^'"]*jevbench-v1422/);
});
test('the system page resolves the current release before any older reader',()=>{
 // The [system] page keeps the v1.4.2.2/v1.5.7 readers only as a fallback for keys the current release does not list.
 const page=read('app/jev-models/[system]/page.tsx');const d=page.slice(page.indexOf('export default async function'));
 assert.ok(d.indexOf('data.systems.find')>=0&&d.indexOf('data.systems.find')<d.indexOf('findV142Row('));
});
test('every comparison route renders current reference and valid matching FAQ/Breadcrumb',async()=>{
 for(const pair of data.comparisons){
  const page=await importSeoModule(`app/jev-models/${pair.slug}/page.tsx`);
  // React does not await nested server functions outside Next; invoke the actual shared server component.
  const element=page.default();const html=renderSeo(await element.type(element.props));
  assert.ok(html.includes(data.artifact.revision));assert.ok(html.includes(pair.label));
  if(!pair.inCurrentRelease){assert.match(html,/Not in the current release/);assert.ok(html.includes(pair.rival.last_measured_on));}
  const graph=parseJsonLd(html)[0]['@graph'];assert.ok(graph.some(g=>g['@type']==='BreadcrumbList'));
  assert.equal(graph.find(g=>g['@type']==='BreadcrumbList').itemListElement.at(-1).name,`Jev vs ${pair.label}`);
  const faq=graph.find(g=>g['@type']==='FAQPage');assert.ok(faq.mainEntity.length);
  for(const q of faq.mainEntity)assert.ok(html.includes(q.name.replace(/&/g,'&amp;')));
 }
});
test('landing metadata and visible data stamp follow the release date; top 15 are visible',async()=>{
 for(const slug of ['alternatives','open-source-jev','how-to-choose']){
  const page=await importSeoModule(`app/jev-models/${slug}/page.tsx`);const metadata=await page.generateMetadata();
  assert.ok(metadata.title.includes(data.month));assert.ok(metadata.description.includes(data.month));
  const html=renderSeo(await page.default());assert.ok(html.includes(data.artifact.revision));assert.ok(html.includes(data.date.slice(0,10)));
  assert.ok(!html.includes('v1.4.2.2'));assert.ok(parseJsonLd(html).length);
  if(slug==='alternatives')for(const row of data.ranked.slice(0,15))assert.ok(html.includes(row.key));
 }
});
test('current model page renders SoftwareApplication/Breadcrumb and sanitized public fields',async()=>{
 const page=await importSeoModule('app/jev-models/[system]/page.tsx');
 for(const row of [data.ranked[0],data.systems.find(r=>r.key==='wity-1')].filter(Boolean)){
  const html=renderSeo(await page.default({params:Promise.resolve({system:row.key})}));
  const graph=parseJsonLd(html)[0]['@graph'];assert.deepEqual(graph.map(g=>g['@type']),['SoftwareApplication','BreadcrumbList']);
  assert.equal(graph[0].applicationCategory,'AI model');assert.ok(html.includes(row.last_measured_on ?? 'date not published'));
  if(row.cost?.kind==='estimate')assert.ok(!graph[0].offers);
  if(row.key==='wity-1')assert.doesNotMatch(html,/Qwen3\.8.*27B|Qwen3\.8-27B/i);
 }
});
test('sitemap URL helper covers all current models, comparisons and guides, excludes private and llms-full',async()=>{
 const {urls,date}=await readJevbenchSeoUrls();assert.equal(date,data.date);
 for(const pair of data.comparisons)assert.ok(urls.includes(`/jev-models/${pair.slug}`));
 for(const row of data.systems)assert.ok(urls.includes(jevSystemPath(row.key)));
 assert.ok(!urls.some(u=>u.includes('djev')||u.includes('llms-full')));
});
test('IndexNow key and script are prepared without sending a ping',()=>{
 const keys=readdirSync(new URL('../public/',import.meta.url)).filter(n=>/^[0-9a-f]{32}\.txt$/.test(n));assert.ok(keys.length);
 for(const file of keys)assert.equal(read(`public/${file}`).trim(),file.slice(0,-4));
 assert.match(read('scripts/indexnow-ping.mjs'),/api\.indexnow\.org\/indexnow/);
 assert.match(read('scripts/indexnow-ping.mjs'),/--dry-run/);
});
