import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {register} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateJevbenchV1723Bundle,readJevbenchV1723ForBoard,V1723_PUBLIC_LEAK,V1723_HISTORY_NOTE} from '../lib/jevbench-v1723-release.mjs';
import {readV1722ForV1723} from '../r198/v1723/prev_v1723.mjs';
register('./tsx-loader-hooks.mjs',import.meta.url);
const D='data/raw/benchmarks/jevbench/v1.7/';
const load=n=>JSON.parse(readFileSync(`${D}jevbench-v1.7.23-${n}.json`));
const previous=await readV1722ForV1723();
const b={manifest:load('publication'),artifact:load('results'),categories:load('categories'),carry:load('carry'),proof:load('proof'),history:load('history'),historyCarry:load('history-carry'),previous,previousManifestSha256:createHash('sha256').update(readFileSync(D+'jevbench-v1.7.22-publication.json')).digest('hex')};
const row=(x,k)=>x.artifact.systems.find(s=>s.key===k);
const fails=fn=>{const y=structuredClone(b);fn(y);assert.throws(()=>validateJevbenchV1723Bundle(y,{candidate:true}));};
test('v1.7.23 candidate validates against the pinned predecessor',()=>assert.equal(validateJevbenchV1723Bundle(b,{candidate:true}),true));
test('carried rows equal v1.7.22 except the pinned text fields; numbers and cells are byte-equal',()=>{
 const textPaths=new Set(b.proof.exceptions.filter(c=>c.path.startsWith('results.systems[')).map(c=>c.row_or_note));
 let changed=0;
 for(const r of previous.artifact.systems){
  const n=row(b,r.key);assert.deepEqual(b.categories.systems[r.key],previous.categories.systems[r.key]);
  const strip=o=>JSON.parse(JSON.stringify(o,(k,v)=>typeof v==='string'?'':v));
  assert.deepEqual(strip(n),strip(r),r.key);
  if(JSON.stringify(n)!==JSON.stringify(r)){changed++;assert.ok(textPaths.has(r.key),r.key);}
 }
 assert.ok(changed>0);
 assert.deepEqual(b.artifact.board,previous.artifact.board);assert.equal(b.artifact.n_ranked,previous.artifact.n_ranked);
});
test('no internal process reference remains in any rendered text',()=>{
 for(const v of [b.artifact,b.carry,b.history,b.historyCarry])assert.doesNotMatch(JSON.stringify(v),V1723_PUBLIC_LEAK);
 assert.match(JSON.stringify(previous.artifact),V1723_PUBLIC_LEAK,'the predecessor still has them, so the scan is not vacuous');
});
test('KnowLine, DecisionNode and drex-max corrections',()=>{
 for(const k of ['knowline-4b-gen5.5','knowline-26b-a4b-gen2.5']){const d=row(b,k).disclosure;assert.match(d,/no earlier version of this exact model is on the board/);assert.doesNotMatch(d,/earlier-generation|this \.5 serving|serving version \./);}
 for(const k of ['decisionnode-flash-0.9.1-rc1','decisionnode-main-0.9.1-rc1'])assert.match(row(b,k).cost.basis,/Token usage on the fixed 1,489-item cost set: 471,195 input, 0 output \(473,406 input on all 1,495 answered items\)\./);
 const d=row(b,'drex-max');assert.ok(d.underlying.endsWith(`The vendor has since updated the model behind this API id; this result is from ${d.last_measured_on}.`));
 assert.doesNotMatch(row(b,'iota-decide-4b-v0.3').author+row(b,'iota-decide-4b-v0.3').disclosure,/[0-9a-f]{8}/);
});
test('history sentence and What-changed slice show exactly this release',()=>{
 const notes=b.artifact.measurement_notes;assert.equal(notes.at(-1),V1723_HISTORY_NOTE);assert.equal(notes.length,previous.artifact.measurement_notes.length+1);
 const page=readFileSync('app/jev-models/v1.7.23/page.tsx','utf8');assert.match(page,/measurement_notes\.slice\(-1\)/);assert.match(page,/href="\/jev-models\/v1\.7\.22">Previous v1\.7\.22/);
});
test('validator rejects a reappearing leak, a changed number and old wording',()=>{
 fails(y=>{y.artifact.measurement_notes[0]+=' (board #11 / #10132)'});
 fails(y=>{row(y,'strike-1').scores.A+=0.01});
 fails(y=>{const s=row(y,'knowline-4b-gen5.5');s.disclosure=s.disclosure.replace('no earlier version of this exact model is on the board','no earlier-generation KnowLine row exists on the board')});
 fails(y=>{const s=row(y,'decisionnode-main-0.9.1-rc1');s.cost.basis=s.cost.basis.replace('Token usage on the fixed','Token usage: 471,195 input, 0 output on the answered items. Usage on the fixed')});
});
test('PENDING is hidden from the board',async()=>{const r=await readJevbenchV1723ForBoard();if(b.manifest.review.verdict==='PENDING')assert.equal(r,null);else assert.equal(r.artifact.revision,'v1.7.23');});
test('site fix: over-limit count says answered without error',async()=>{
 const cell=await import('../components/JevDecisionLimitCell.tsx');
 const slow={key:'x',method:'v1.7',axes:{},decision_limit:{limit_s:10,n:1500,n_over_limit:212,n_over_limit_answered_ok:140,p50_raw_s:1,p95_raw_s:31.4}};
 const src=readFileSync('components/JevDecisionLimitCell.tsx','utf8');
 assert.match(src,/answered without error, counted as wrong/);assert.doesNotMatch(src,/answered correctly/);
 const html=renderToStaticMarkup(React.createElement(cell.JevDecisionLimitDetail,{row:slow}));
 assert.match(html,/140 of them answered without error, counted as wrong/);
 assert.doesNotMatch(html,/answered correctly/);
});
test('site fix: over-cap rows are labelled on the system page, not "Not ranked"',()=>{
 const src=readFileSync('app/jev-models/[system]/page.tsx','utf8');
 assert.match(src,/\(row\.listing as string\) === 'ranked_over_cap' \? 'Ranked outside the official caps \(no Capability rank\)' : row\.rank == null \? 'Not ranked in the current release'/);
});

test('current release-history catalog has no internal process references',async()=>{
 const {JEVBENCH_RELEASES}=await import('../lib/jevbench-releases.mjs');
 assert.doesNotMatch(JEVBENCH_RELEASES.map(r=>r.text).join('\n'),V1723_PUBLIC_LEAK);
});

test('current architecture disclosure overlay has no internal process references',()=>{
 const arch=JSON.parse(readFileSync('data/jevbench-architecture.json','utf8'));
 assert.doesNotMatch(JSON.stringify(arch.benchmarks.jevbench),V1723_PUBLIC_LEAK);
});
