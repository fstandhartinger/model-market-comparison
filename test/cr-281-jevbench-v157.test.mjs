import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readJevbenchV156Release, readJevbenchV157Release} from '../lib/jevbench-v15-release.mjs';
import {readCurrentJevbench, CURRENT_JEVBENCH_PAGE} from '../lib/jevbench-current.mjs';
import {jevClassRows} from '../lib/jevbench-jev-class.mjs';
import {jevbenchCategoryView} from '../lib/jevbench-categories.mjs';
import {baseModelFor} from '../lib/jev-base-model.mjs';
const read = p => JSON.parse(readFileSync(new URL(p,import.meta.url)));
const {artifact:old,sha256} = await readJevbenchV156Release();
const {artifact:a} = await readJevbenchV157Release();
const keys=['open-jev-zefan-27b-v1.1'];
const rows=keys.map(k=>a.systems.find(r=>r.key===k));
test('CR-281 adds exactly one measured row and preserves all prior values and protocol',async()=>{
 assert.deepEqual(a.parent_release,{revision:'v1.5.6',sha256});
 assert.deepEqual(a.systems.map(r=>r.key),[...old.systems.map(r=>r.key),...keys]);
 assert.deepEqual(a.not_measured,old.not_measured);
 for(const r of old.systems){const now=a.systems.find(s=>s.key===r.key);for(const f of Object.keys(r).filter(f=>!['rank','ranks'].includes(f)))assert.deepEqual(now[f],r[f],`${r.key}.${f}`);}
 assert.equal(a.G_med,old.G_med);assert.equal(a.n_ranked,old.n_ranked+1);
 assert.equal((await readCurrentJevbench()).artifact.revision,'v1.6.2');assert.equal(CURRENT_JEVBENCH_PAGE,'/jev-models/v1.6.2');
});
test('CR-281 exact ranks, eligibility, source hashes and unchanged top fives',()=>{
 assert.deepEqual(rows.map(r=>r.ranks),[{A:76,B:75,C:74}]);
 assert.equal(rows[0].scores.A,2.926978075888752);
 for(const o of 'ABC')for(const r of rows)assert.equal(a.board[o].order.indexOf(r.key)+1,r.ranks[o]);
 const c=jevClassRows(a.systems.filter(r=>r.ranked));
 assert.equal(c.rows.find(r=>r.row.key===keys[0]).inClass,false);
 const top=read('../ops/jevbench-v157-cr281/TOP-FIVE.json');assert.deepEqual(top.changed,{A:false,B:false,C:false,Capability:false});
 assert.deepEqual(top['after_v1.5.7'],top['before_v1.5.6']);assert.equal(a.board.C.order[4],'spark-s1-4b-v6');
 assert.equal(top.rule,'No top-five change; not a paid fast-lane run; no Florian GO needed (AGENTS rule)');
 for(const r of rows){assert.equal(r.status.answered_ok,1624);assert.match(r.provenance.raw_sha256,/^[a-f0-9]{64}$/);assert.doesNotMatch(JSON.stringify(r),/task_id|"prompt"|"answer"|28 Sep/);}
 assert.match(rows[0].endpoint_condition,/LOWER BOUND/);assert.match(rows[0].model_pin,/3308a15ccd7eea1df7a37d6ddc39b023b801ba16/);assert.doesNotMatch(rows[0].model_pin,/WEIGHT DIGESTS|temperature/);
});
test('CR-281 Open-Jev retains its disclosed base reference',()=>{
 assert.equal(baseModelFor('jevbench',keys[0]).label,'Qwen/Qwen3.8-27B');
 assert.match(rows[0].cost.basis,/USD 0\.42\/M input, 3\.00\/M output/);
});
test('CR-281 radars retain prior systems and verify all 24 split/type/tier cells of each new row',()=>{
 const cats=read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-categories.json');const prior=read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.6-categories.json');
 for(const k of Object.keys(prior.systems))assert.deepEqual(cats.systems[k],prior.systems[k]);
 const proof=read('../ops/jevbench-v157-cr281/CATEGORY-VERIFICATION.json');for(const k of keys){assert.equal(proof[k].verified_per_type_cells,24);for(const d of ['topics','usecases'])assert.ok(Object.keys(cats.systems[k][d]).length>0);}
 const v=jevbenchCategoryView('v1.5.7',keys);for(const k of keys)assert.ok(JSON.stringify(v).includes(k));
});
