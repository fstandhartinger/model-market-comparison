import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchSeoData} from '../lib/jevbench-seo.mjs';
import {importSeoModule,renderSeo,parseJsonLd} from './jevbench-seo-render.mjs';
const read=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const data=await readJevbenchSeoData();
const SITE='https://benchmarkheaven.com';
const de=await importSeoModule('app/de/jev-models/alternativen/page.tsx');
const en=await importSeoModule('app/jev-models/alternatives/page.tsx');
const html=renderSeo(await de.default());
test('German page renders with German H1, lang wrapper and every top-15 key',()=>{
 assert.match(html,/<h1[^>]*>Jev-Alternativen im Vergleich \([^)]*20\d\d\)<\/h1>/);
 assert.ok(html.includes('lang="de"'));
 for(const row of data.ranked.slice(0,15))assert.ok(html.includes(row.key));
 for(const h of ['Intelligenz','Kalibrierung','Offene Gewichte','Worauf sollten Sie','Häufige Fragen','Datenschutz','Lizenz','Hardware','Latenz'])assert.ok(html.includes(h),h);
 assert.doesNotMatch(html,/system1models/);
});
test('numbers use de-DE formatting',()=>{
 assert.match(html,/\d,\d/);
 assert.ok(!/<td class="p-2">\d+\.\d<\/td>/.test(html));
});
test('hreflang pair is reciprocal with x-default',async()=>{
 const m=await de.generateMetadata();const e=await en.generateMetadata();
 const want={en:`${SITE}/jev-models/alternatives`,de:`${SITE}/de/jev-models/alternativen`,'x-default':`${SITE}/jev-models/alternatives`};
 assert.deepEqual(m.alternates.languages,want);assert.deepEqual(e.alternates.languages,want);
 assert.equal(m.alternates.canonical,want.de);assert.equal(e.alternates.canonical,want.en);
 assert.equal(m.openGraph.locale,'de_DE');assert.ok(m.title.includes('Jev-Alternativen'));
 assert.match(renderSeo(await en.default()),/href="\/de\/jev-models\/alternativen"[^>]*>Deutsche Version/);
});
test('JSON-LD is valid German FAQPage/BreadcrumbList/Dataset',()=>{
 const blocks=parseJsonLd(html);assert.equal(blocks.length,1);const g=blocks[0]['@graph'];
 assert.deepEqual(g.map(x=>x['@type']),['Dataset','BreadcrumbList','FAQPage']);
 assert.equal(g[0].inLanguage,'de');assert.equal(g[2].inLanguage,'de');assert.equal(g[2].mainEntity.length,4);
 assert.equal(g[1].itemListElement.at(-1).item,`${SITE}/de/jev-models/alternativen`);
 for(const q of g[2].mainEntity)assert.ok(html.includes(q.name));
});
test('sitemap and llms.txt carry the German page',()=>{
 const s=read('app/sitemap.ts');assert.ok(s.includes('"/de/jev-models/alternativen"'));assert.ok(s.includes("de: `${SITE_URL}/de/jev-models/alternativen`"));
 assert.ok(read('app/llms.txt/route.ts').includes('/de/jev-models/alternativen'));
});
