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
writeFileSync('r198/v1811/receipts/BUILT-CHECK.json',JSON.stringify({status:'PASS',model_page:true,main_all_release_pages:true,category_cells:shown,new_row_unranked:true},null,1)+'\n');
console.log('PASS built main/all/release/model pages and precomputed category floor');
