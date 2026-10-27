import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {projectJevbenchFeed} from '../lib/jevbench-agent-feed.mjs';
import {jevApiRoster} from '../lib/jevbench-scope.mjs';
const load=n=>JSON.parse(readFileSync(`data/raw/benchmarks/jevbench/v1.7/jevbench-${n}.json`));
const artifact=load('v1.7.10-results'),previous=load('v1.7.9-results');
const keys=['singularity-super-decider','singularity-super-decider-thinking'];
const url='https://singularitycompute.com/super-decider';
test('v1.7.10 Super Decider changes exactly repo besides ranks, preserving source and provenance',()=>{
 for(const key of keys){const a=structuredClone(artifact.systems.find(s=>s.key===key)),b=structuredClone(previous.systems.find(s=>s.key===key));
  assert.equal(a.repo,url);assert.equal(a.source_url,url);assert.match(b.repo,/huggingface.co/);
  for(const s of [a,b]){delete s.rank;delete s.ranks;delete s.repo;}
  assert.deepEqual(a,b);
 }
 assert.deepEqual(artifact.addendum.link_fixed_keys,keys);
});
test('v1.7.10 latest feed projection uses vendor links for both API rows',()=>{
 const feed=projectJevbenchFeed(artifact,'fixture',{latestRelease:'v1.7.10'});
 for(const key of keys){const row=feed.systems.find(s=>s.key===key);assert.equal(row.source_url,url);assert.equal(row.board,'api');assert.doesNotMatch(JSON.stringify(row),/huggingface.co/);}
});
test('v1.7.10 actual API roster JSX renders vendor hrefs for both rows',()=>{
 // Compile the real roster and its formatting helpers in isolation. Unrelated latency cells are stubbed.
 const src=readFileSync('components/JevBenchV16Board.tsx','utf8'),ast=ts.createSourceFile('board.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=new Set(['one','usd','rosterCapability','ENDPOINT_TAG','basisLine','costCell','rosterStatus','ApiRoster']);
 const parts=ast.statements.filter(n=>names.has(n.name?.text)||n.declarationList?.declarations.some(d=>names.has(d.name.text))).map(n=>n.getText(ast));
 assert.equal(parts.length,names.size);
 const code=ts.transpileModule(parts.join('\n'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const ApiRoster=new Function('React','jevApiRoster','JevLatencyValue','JevLatencyLegend','NOT_RANKED','PUBLIC_SET',code+'\nreturn ApiRoster;')(React,jevApiRoster,()=>null,()=>null,{},new Map());
 const rows=artifact.systems.filter(s=>keys.includes(s.key));
 const html=renderToStaticMarkup(React.createElement(ApiRoster,{a:{...artifact,systems:rows},carry:{rows:[]},listed:[],eligibility:new Map()}));
 for(const key of keys)assert.match(html,new RegExp(`<a[^>]+href="${url}"[^>]+data-bh-jev-api-roster-row="${key}"`));
 assert.doesNotMatch(html,/huggingface.co/);
});
