import {privateTokenHits} from './private-token-check.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const key='starlord-27b-v2-0-preview';
const load=p=>readFileSync(p,'utf8');
const model=load(`.next/server/app/jev-models/${key}.html`);
for(const term of ['Starlord-27B-v2.0-preview','xsdfasfgsa','RTX PRO 6000','--network none','BF16','candidate-logit','bidirectional','131,072','422','next review','public JevBench split was used for evaluation and tuning, not training','Qwen/Qwen3.8-27B'])assert.ok(model.includes(term),term);
assert.ok(Object.values(privateTokenHits(model)).every(n=>n===0),'no private identifiers');
assert.ok(!/fastlane-native|raw\.jsonl|"visibility"/.test(model),'no internal fields');
for(const p of ['jev-models.html','jev-models/all.html','jev-models/v1.8.12.html']){
 const html=load('.next/server/app/'+p);assert.ok(html.includes('Starlord-27B-v2.0-preview'),p+' new row visible');
 assert.ok(html.includes('Breakdown values are shown for cells with at least 30 scored items; more items are being added.'),p+' neutral note');
 for(const section of ['jev16-languages','jev16-method'])assert.ok(html.includes(section),p+' '+section);
}
const snapshot=JSON.parse(load('data/jevbench-v1.8.12-alldata.json'));let shown=0;
for(const dims of Object.values(snapshot.categoryView.systems))for(const cells of Object.values(dims))for(const v of Object.values(cells)){assert.ok(v[1]>=30);shown++;}
assert.equal(snapshot.artifact.systems.find(s=>s.key===key).ranked,false);
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
assert.equal(board.published.restated_by, 'v1.8.12');
checkRows(board.published, 'live board');
for (const version of ['board-all', 'board-open', 'board-api', 'v1.8.12']) {
 const input = await readJevAllDataInput(version);
 assert.ok(input, `${version}: published input exists`);
 checkRows(input.artifact, version);
}
writeFileSync('r198/v1812/receipts/BUILT-CHECK.json',JSON.stringify({status:'PASS',model_page:true,main_all_release_pages:true,category_cells:shown,new_row_unranked:true,row_breakdown_surfaces:rowBreakdownSurfaces},null,1)+'\n');
console.log('PASS built main/all/release/model pages, precomputed category floor and all display JSON row-breakdown floors');
