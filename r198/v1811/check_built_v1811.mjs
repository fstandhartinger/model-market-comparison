import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const key='minimodels-decision-1.0-candy-cane';
const load=p=>readFileSync(p,'utf8');
const model=load(`.next/server/app/jev-models/${key}.html`);
for(const term of ['Minimodels Decision 1.0','minimodels-ai','RTX PRO 6000','--network none','bf16','LoRA','scratchpad','compression','next review','google/gemma-4-31B-it'])assert.ok(model.includes(term),term);
assert.ok(!/fastlane-native|raw\.jsonl|"visibility"/.test(model),'no internal identifiers');
for(const p of ['jev-models.html','jev-models/all.html','jev-models/v1.8.11.html']){
 const html=load('.next/server/app/'+p);assert.ok(html.includes('Minimodels Decision 1.0'),p+' new row visible');
 assert.ok(html.includes('Breakdown values are shown for cells with at least 30 scored items; more items are being added.'),p+' neutral note');
 for(const section of ['jev16-languages','jev16-method'])assert.ok(html.includes(section),p+' '+section);
}
const snapshot=JSON.parse(load('data/jevbench-v1.8.11-alldata.json'));let shown=0;
for(const dims of Object.values(snapshot.categoryView.systems))for(const cells of Object.values(dims))for(const v of Object.values(cells)){assert.ok(v[1]>=30);shown++;}
assert.equal(snapshot.artifact.systems.find(s=>s.key===key).ranked,false);
const rowBreakdownSurfaces = {};
function checkRows(artifact, surface) {
 let cells = 0;
 for (const row of artifact.systems) for (const [dimension, values] of Object.entries(row.v16?.breakdowns ?? {})) {
  if (!values || typeof values !== 'object') continue;
  for (const [name, cell] of Object.entries(values)) {
   if (!cell || typeof cell !== 'object' || !Number.isInteger(cell.n)) continue;
   assert.ok(cell.n >= 30, `${surface}: ${row.key}.${dimension}.${name}: n=${cell.n}`);
   cells++;
  }
 }
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
assert.equal(board.published.restated_by, 'v1.8.11');
checkRows(board.published, 'live board');
for (const version of ['board-all', 'board-open', 'board-api', 'v1.8.11']) {
 const input = await readJevAllDataInput(version);
 assert.ok(input, `${version}: published input exists`);
 checkRows(input.artifact, version);
}
writeFileSync('r198/v1811/receipts/BUILT-CHECK.json',JSON.stringify({status:'PASS',model_page:true,main_all_release_pages:true,category_cells:shown,new_row_unranked:true,row_breakdown_surfaces:rowBreakdownSurfaces},null,1)+'\n');
console.log('PASS built main/all/release/model pages, precomputed category floor and all display JSON row-breakdown floors');
