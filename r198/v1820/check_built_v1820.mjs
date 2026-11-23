import {privateTokenHits} from '../v1812/private-token-check.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=p=>readFileSync(p,'utf8');
const pageFor=key=>load(`.next/server/app/jev-models/${key}.html`);
const baseLabel=html=>html.match(/data-bh-base-model-label="true">([^<]+)/)?.[1];
for(const key of ['starlord-4b-v2.0-preview']){
 const model=pageFor(key);for(const term of [key,'serve_systemone.py','next review','Not yet equated','0.801','131,072'])assert.ok(model.includes(term),key+' '+term);
 assert.equal(baseLabel(model),'Qwen/Qwen3.5-4B');
 assert.ok(Object.values(privateTokenHits(model)).every(n=>n===0));
 for(const p of ['jev-models.html','jev-models/all.html','jev-models/v1.8.20.html'])assert.ok(load('.next/server/app/'+p).includes(key),p+' new row visible');
}
const snapshot=JSON.parse(load('data/jevbench-v1.8.20-alldata.json'));let shown=0;
for(const dims of Object.values(snapshot.categoryView.systems))for(const cells of Object.values(dims))for(const v of Object.values(cells)){assert.ok(v[1]>=30);shown++;}
for(const key of ['starlord-4b-v2.0-preview']){
 const newRow=snapshot.artifact.systems.find(s=>s.key===key);assert.equal(newRow.ranked,false);assert.equal(newRow.author,'xsdfasfgsa (Hugging Face)');
 assert.ok(Object.keys(snapshot.categoryView.systems[key].usecases).length,key+' usecases');
}
const karpo=snapshot.artifact.systems.find(s=>s.key==='karpo_decision_31b');assert.equal(karpo.publication_scope,undefined);
assert.ok(Object.keys(snapshot.categoryView.systems.karpo_decision_31b.usecases).length,'Karpo usecases');
const karpoPage=load('.next/server/app/jev-models/karpo_decision_31b.html');
for(const text of ['No per-category values are published for this system','As agreed for this evaluation, this row shows the standard scores only'])assert.ok(!karpoPage.includes(text),'Karpo scope clause removed');
// Languages are a separate server-rendered table, not a categoryView radar dimension.
const storedCategories=JSON.parse(load('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.20-categories.json'));
const languageLabels=new Map(storedCategories.languages.map(l=>[l.key,l.label]));
const languageCells={};
for(const page of ['jev-models.html','jev-models/all.html','jev-models/v1.8.20.html']){
 const html=load('.next/server/app/'+page);languageCells[page]={};
 for(const key of ['starlord-4b-v2.0-preview','karpo_decision_31b']){
  const start=html.indexOf('<tr data-bh-jev16-language-row="'+key+'"');assert.ok(start>=0,page+' '+key+' language row');
  const row=html.slice(start,html.indexOf('</tr>',start)+5);let visible=0;
  for(const[lang,cell]of Object.entries(storedCategories.systems[key].languages)){
   const prefix=languageLabels.get(lang)+': ';assert.ok(languageLabels.has(lang),'known language label');
   if(cell.n>=30&&(cell.coverage_n??cell.n)>=30){
    const title=prefix+cell.competence.toFixed(1)+' over '+cell.n+' scored observations; '+(cell.coverage_n??cell.n)+' completed responses';
    assert.ok(row.includes(title),page+' '+key+' '+lang+' exact scored cell');visible++;
   }else assert.ok(!row.includes('title="'+prefix+cell.competence.toFixed(1)+' over '),page+' '+key+' '+lang+' small cell hidden');
  }
  for(const match of row.matchAll(/over (\d+) scored observations; (\d+) completed responses/g)){assert.ok(Number(match[1])>=30&&Number(match[2])>=30,page+' '+key+' rendered language floor');}
  assert.ok(visible>0);languageCells[page][key]=visible;
 }
}
const rowBreakdownSurfaces = {};
function checkRows(artifact, surface) {
 let cells = 0;
 function walk(value, path, inBreakdowns = false) {
  if (!value || typeof value !== 'object') return;
  if (inBreakdowns && Number.isInteger(value.n)) {
   assert.ok(value.n >= 30, `${surface}: ${path.join('.')}: n=${value.n}`);
   cells++;
  }
  for (const [name, child] of Object.entries(value)) walk(child, [...path, name], inBreakdowns || name === 'breakdowns');
 }
 for (const row of artifact.systems) walk(row, [row.key]);
 rowBreakdownSurfaces[surface] = {cells, under30: 0};
}
checkRows(snapshot.artifact, 'snapshot');
const {readJevbenchV161Release} = await import('../../lib/jevbench-v16-release.mjs');
const {readJevbenchV157Release} = await import('../../lib/jevbench-v15-release.mjs');
const {assembleJevBoard} = await import('../../lib/jevbench-live-board.mjs');
const {readJevAllDataInput} = await import('../../lib/jevbench-alldata-input.mjs');
const [release, previous] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release()]);
const apiA4 = JSON.parse(load('data/jevbench-api-a4-equated.json'));
const board = await assembleJevBoard({release, previous, apiA4, live: true});
assert.equal(board.published.restated_by, 'v1.8.20');
checkRows(board.published, 'live board');
for (const version of ['board-all', 'board-open', 'board-api', 'v1.8.20']) {
 const input = await readJevAllDataInput(version);
 assert.ok(input, `${version}: published input exists`);
 checkRows(input.artifact, version);
}
writeFileSync('r198/v1820/receipts/BUILT-CHECK.json',JSON.stringify({status:'PASS',model_page:true,main_all_release_pages:true,category_cells:shown,language_cells:languageCells,new_row_unranked:true,row_breakdown_surfaces:rowBreakdownSurfaces},null,1)+'\n');
console.log('PASS built main/all/release/model pages, precomputed category floor and all display JSON row-breakdown floors');
