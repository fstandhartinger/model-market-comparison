import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bundle} from '../r198/v1718/validate_v1718.mjs';
import {validateJevbenchV1718Bundle,readJevbenchV1718ForBoard} from '../lib/jevbench-v1718-release.mjs';
import {validateKnowlineDecisiveness,knowlineDiagnosticUnavailable} from '../lib/jevbench-knowline-diagnostic.mjs';
test('v1.7.18 aggregate-only candidate and all negative release gates',()=>assert.equal(validateJevbenchV1718Bundle(bundle,{candidate:true}),true));
test('26B unavailable diagnostic remains native supported and renders explicitly unavailable',()=>{
 const row=bundle.artifact.systems.find(s=>s.key==='knowline-26b-a4b-gen2.5');assert.equal(validateKnowlineDecisiveness(row),true);assert.equal(knowlineDiagnosticUnavailable(row),true);
 const jsx=readFileSync('components/JevBenchV16Board.tsx','utf8');assert.equal((jsx.match(/title=\{unavailableReason\}>unavailable/g)||[]).length,2);
 for(const key of ['knowline-4b-gen5.5','knowline-31b-gen1'])assert.throws(()=>validateKnowlineDecisiveness({...row,key}));
});
test('both lost-raw rows have only recorded topic/use-case omissions',()=>{
 const entries=JSON.parse(readFileSync('data/jevbench-breakdown-exceptions.json')).entries;
 for(const k of bundle.artifact.addendum.new_keys){assert.deepEqual(entries.find(x=>x.key===k).dims,['topics','usecases']);assert.match(entries.find(x=>x.key===k).decision,/knowline-r8c-lost-raw-omissions/);assert.equal(bundle.categories.systems[k].topics,undefined);assert.equal(bundle.categories.systems[k].usecases,undefined);}
});
test('PENDING is hidden and synthetic PASS exposes v1.7.18',async()=>{const r=await readJevbenchV1718ForBoard();assert.equal(r?.artifact.revision??null,bundle.manifest.review.verdict==='PASS'?'v1.7.18':null)});

test('v1.7.18 generated page preserves the complete predecessor navigation and draw-specific prose',()=>{
 const page=readFileSync('app/jev-models/v1.7.18/page.tsx','utf8');
 assert.match(page, /href="\/jev-models\/v1\.7\.17">Previous v1\.7\.17<\/a>/);
 assert.doesNotMatch(page, /Previous v1\.7\.16|27 Oct|anchor runs/);
 for(const version of ['v1.7.16','v1.7.17','v1.7.18']){
  assert.ok(readFileSync('components/JevBenchReleaseVersionNav.tsx','utf8').includes(version));
  assert.ok(readFileSync('lib/jevbench-releases.mjs','utf8').includes("version: '"+version+"'"));
 }
 assert.ok(page.includes('measurement_notes.slice(-3)'));
 assert.ok(bundle.artifact.measurement_notes.slice(-3).every(note=>!(/27 Oct|anchor/i.test(note))));
 assert.match(readFileSync('app/jev-models/v1.7.17/page.tsx','utf8'), /Previous v1\.7\.16/);
});
