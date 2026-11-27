import test from 'node:test';
import assert from 'node:assert/strict';
import {chainCategoryBoundsAt,apiFullAddendumCategoryBounds,withRowPoolCategoryRows,CATEGORY_BOUND_KEY_REUSE} from '../lib/jevbench-api-full-addenda.mjs';
import {jevbenchCategoryView} from '../lib/jevbench-categories.mjs';
import {readJevbenchV1810ForBoard,v1810BoardInput} from '../lib/jevbench-v1810-release.mjs';
import {readJevbenchV1821ForBoard,v1821BoardInput} from '../lib/jevbench-v1821-release.mjs';
import {readJevbenchV1822ForBoard,v1822BoardInput,V1822_NEW_ROW_BOUNDS} from '../lib/jevbench-v1822-release.mjs';

// PR #726 build failure (26 Nov): v1.8.22 measured Mica v0.1 4B on d1122 under its old key. The live chain then carried the
// d1122 pool bounds for that key, and every older release page (v1.8.10-v1.8.21) checked its own v1.6-era Mica cells against them.
test('chainCategoryBoundsAt drops a re-used key only for releases before the re-use',()=>{
 assert.deepEqual(CATEGORY_BOUND_KEY_REUSE,{'mica-v01-4b':'v1.8.22'});
 const bounds={'mica-v01-4b':{usecases:{advertising:51}},'other-row':{usecases:{advertising:40}}};
 const a=withRowPoolCategoryRows({revision:'x',systems:{}},{},bounds);
 assert.deepEqual(chainCategoryBoundsAt(a,'v1.8.21'),{'other-row':bounds['other-row']});
 assert.deepEqual(chainCategoryBoundsAt(a,'v1.7.0'),{'other-row':bounds['other-row']});
 assert.equal(chainCategoryBoundsAt(a,'v1.8.22'),apiFullAddendumCategoryBounds(a));
 assert.equal(chainCategoryBoundsAt(a,'v1.8.100'),apiFullAddendumCategoryBounds(a));
 assert.equal(chainCategoryBoundsAt({systems:{}},'v1.8.10'),undefined);
 assert.throws(()=>chainCategoryBoundsAt(a,'v1.8'));
});
test('older release pages keep their own Mica cells; v1.8.22 keeps the d1122 bounds',async()=>{
 // A minimal stand-in for the live chain: only its row-pool bounds are read by the BoardInputs below.
 const mica='mica-v01-4b',nb=V1822_NEW_ROW_BOUNDS[mica];
 const chain={categories:withRowPoolCategoryRows({revision:'v1.6.1',systems:{}},{},{[mica]:nb})};
 // Validate one row of an artifact under the bounds it was given (or would be given).
 const only=(categories,bound)=>{const a=withRowPoolCategoryRows({...categories,systems:{}},{[mica]:categories.systems[mica]},bound?{[mica]:bound}:{});return jevbenchCategoryView(a.revision,[mica],{artifact:a});};
 for(const [read,input] of [[readJevbenchV1810ForBoard,v1810BoardInput],[readJevbenchV1821ForBoard,v1821BoardInput]]){
  const release=await read();const {categories}=input(release,chain);
  assert.ok(categories.systems[mica],'older page still lists its Mica cells');
  assert.equal((apiFullAddendumCategoryBounds(categories)??{})[mica],undefined);
  assert.ok(only(categories,undefined).systems[mica]);
  // Inheriting the d1122 bounds is exactly what broke the PR #726 build.
  assert.throws(()=>only(categories,nb),new RegExp(`${mica}\\.[a-z]+\\.[a-z_]+: cell`));
 }
 const {categories}=v1822BoardInput(await readJevbenchV1822ForBoard(),chain);
 assert.deepEqual(apiFullAddendumCategoryBounds(categories)[mica],nb);
 assert.ok(only(categories,nb).systems[mica]);
});
