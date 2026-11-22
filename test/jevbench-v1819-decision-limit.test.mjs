import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {jevDecisionLimitView} from '../lib/jev-decision-limit.mjs';

const load=p=>JSON.parse(readFileSync(p));
const root='data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.19-';
const artifact=load(root+'results.json');
const proof=load(root+'proof.json');
const receipts=load('r198/v1819/receipts/NEW-ROWS.json');
const snapshot=load('data/jevbench-v1.8.19-alldata.json');
const scored=load('r198/v1819/src/scored.json');
const keys=['bison-1','groundhog-1'];

test('both hosted rows retain measured decision-limit aggregates on every release surface',()=>{
 for(const key of keys){
  const expected={limit_s:10,n_over_limit:key==='bison-1'?5:0,n_over_limit_answered_ok:key==='bison-1'?5:0,rule:'latency_s > limit -> failed',speed_basis:'all decisions given (lane items in the raw), measured latency_s',speed_n:1500,treatment:'share'};
  for(const row of [scored[key]['v17-share'],artifact.systems.find(s=>s.key===key),proof.new_rows[key],receipts[key],snapshot.artifact.systems.find(s=>s.key===key)])assert.deepEqual(row.decision_limit,expected,key);
  const view=jevDecisionLimitView(receipts[key]);
  assert.equal(view.countText,`${expected.n_over_limit} of 1,500 over 10 s`);
  assert.equal(view.nOverOk,expected.n_over_limit_answered_ok);
 }
});

test('timeout cell and detail render the measured counts and the correct over marker',async()=>{
 const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react');
 const {renderToStaticMarkup}=require('react-dom/server');
 const src=readFileSync('components/JevDecisionLimitCell.tsx','utf8');
 const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText
  .replace('"react/jsx-runtime"',JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href))
  .replace("'../lib/jev-decision-limit.mjs'",JSON.stringify(pathToFileURL(resolve('lib/jev-decision-limit.mjs')).href));
 const {JevDecisionLimitCell,JevDecisionLimitDetail}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
 for(const key of keys){
  const row=snapshot.artifact.systems.find(s=>s.key===key),over=key==='bison-1';
  const cell=renderToStaticMarkup(React.createElement(JevDecisionLimitCell,{row}));
  const detail=renderToStaticMarkup(React.createElement(JevDecisionLimitDetail,{row}));
  assert.ok(cell.includes(`data-bh-jev-limit-cell="${over?'over':'clean'}"`),key);
  assert.ok(cell.includes(`${over?5:0} of 1,500 over 10 s`),key);
  assert.ok(detail.includes(over?'5 decisions over 10 s (5 of them answered without error, counted as wrong).':'0 decisions over 10 s.'),key);
 }
});
