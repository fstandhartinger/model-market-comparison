// Public synthetic test of the actual LanguageView function; no prospective release artifacts are created.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {JEV_SCOPE_LISTING} from '../lib/jevbench-scope.mjs';
import {freshJevbenchCategoryRows} from '../lib/jevbench-categories.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript'), React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const board=readFileSync(new URL('../components/JevBenchV16Board.tsx',import.meta.url),'utf8');
// Transpile the real function bytes. External display helpers are public deterministic stubs;
// row selection, ordering, actual stored language cells, suppression and wrapper heading remain real Source.
const functionSource=board.slice(board.indexOf('function LanguageView('),board.indexOf('\nfunction DatedCarry('));
const actualRowHelpers = board.slice(board.indexOf('const listedRow ='),board.indexOf('function apiRowProps('));
// Real languageNoteOf Source (upstream row-scoped coverage note), sliced through its closing brace. An older Board
// may predate it; then LanguageView must not reference it. Fail closed if referenced but not extractable.
const noteStart=board.indexOf('\nfunction languageNoteOf(');
const noteEnd=noteStart<0?-1:board.indexOf('\n}\n',noteStart);
const actualNoteHelper=noteStart<0||noteEnd<0?'':board.slice(noteStart+1,noteEnd+3);
if (/\blanguageNoteOf\b/.test(functionSource)) assert.ok(/^function languageNoteOf\(/.test(actualNoteHelper),'LanguageView references languageNoteOf but its actual Source could not be extracted');
const code=ts.transpileModule(actualRowHelpers+actualNoteHelper+functionSource+'\nexport {LanguageView};', {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
runInNewContext(code,{module,exports:module.exports,require,Fragment:React.Fragment,freshJevbenchCategoryRows,
 JEV_SCOPE_LISTING,
 apiRowProps:()=>({}),nameLabel:s=>s,laneTag:()=> 'self-hosted',coverageOf:()=> 'S+P',spokeReason:key=>key==='compact-test'?'Some radar categories still need more observations.':null,
 exposureNote:key=>key==='compact-test'?'L3 items were reviewed by an OpenAI model; headline scores do not use L3.':null,
 completedLanguageN:c=>c.coverage_n??c.n,heat:()=>({}),languagePoolNote:()=>'',
},{filename:'actual-LanguageView.tsx'});
const {LanguageView}=module.exports;
const keys=['RYO','D','12B','J','W','M'];
function fixture(revision) {
 const systems=keys.map((key,i)=>({key,display:key,ranked:!['RYO','12B'].includes(key),rank:({J:1,M:2,W:3,D:4})[key]??null,listing:['RYO','12B'].includes(key)?'wrapper':undefined,v16:{lane:'selfhosted'}}));
 const categories={min_n:1,languages:[{key:'en',label:'English',n:40,open:8,sealed:32}],systems:Object.fromEntries(keys.map((key,i)=>[key,{languages:{en:{n:40,coverage_n:40,competence:51+i}}}]))};
 return {a:{revision,systems,v16:{counts:{S:1200,P:300}},not_measured:[]},categories,hiddenApi:new Set(),scope:'all',carry:{rows:[]}};
}
test('actual LanguageView renders four native rows followed by both wrappers with their stored cells',()=>{
 const html=renderToStaticMarkup(React.createElement(LanguageView,fixture('v1.6.3')));
 assert.deepEqual([...html.matchAll(/data-bh-jev16-language-row="([^"]+)"/g)].map(m=>m[1]),['J','M','W','D','RYO','12B']);
 for (const [i,key] of keys.entries()) assert.match(html,new RegExp(`data-bh-jev16-language-row="${key}"[\\s\\S]*?English: ${51+i}\\.0 over 40 scored observations; 40 completed responses`));
 assert.match(html,/Wrappers and subsidized systems \(listed, never ranked\)/);
 assert.equal((html.match(/data-bh-jev16-language-suppressed/g)??[]).length,0);
});
test('actual v162 LanguageView keeps its previous ranked-only row order and excludes wrappers',()=>{
 const html=renderToStaticMarkup(React.createElement(LanguageView,fixture('v1.6.2')));
 assert.deepEqual([...html.matchAll(/data-bh-jev16-language-row="([^"]+)"/g)].map(m=>m[1]),['J','M','W','D']);
 assert.doesNotMatch(html,/Wrappers \(listed, never ranked\)/);
});

test('actual LanguageView labels a mixed subsidized/wrapper lower group exactly once',()=>{
 const f=fixture('v1.6.3');
 f.a.systems.push({key:'subsidized',display:'Subsidized',listing:'subsidized',ranked:false,rank:null,jevbench_score:999,v16:{lane:'selfhosted'}});
 f.categories.systems.subsidized={languages:{en:{n:40,coverage_n:40,competence:77}}};
 const html=renderToStaticMarkup(React.createElement(LanguageView,f));
 assert.deepEqual([...html.matchAll(/data-bh-jev16-language-row="([^"]+)"/g)].map(m=>m[1]),['J','M','W','D','subsidized','RYO','12B']);
 assert.equal((html.match(/Wrappers and subsidized systems \(listed, never ranked\)/g)??[]).length,1);
 assert.ok(html.indexOf('Wrappers and subsidized systems')<html.indexOf('data-bh-jev16-language-row="subsidized"'));
 assert.match(html,/English: 77\.0 over 40 scored observations; 40 completed responses/);
});


test('compact language headers and every measured or pending cell retain full row remarks',()=>{
 const f=fixture('v1.6.3');
 const display='A very long model name with its exact original revision and configuration';
 f.a.systems[0]={...f.a.systems[0],key:'compact-test',display,language_listing_note:'Historical headline · measured language cells'};
 f.categories.supplement={};
 f.categories.min_n=15;
 f.categories.languages.push({key:'fr',label:'French',n:40,open:8,sealed:32},{key:'de',label:'German',n:40,open:8,sealed:32});
 f.categories.systems.J.languages.fr={n:40,coverage_n:40,competence:42};
 f.categories.systems.J.languages.de={n:40,coverage_n:40,competence:43};
 f.categories.systems['compact-test']={
  language_coverage_note:'Measured on the original stored pools; the supplement is partial and missing items remain unanswered.',
  languages:{en:{n:40,coverage_n:40,competence:54},fr:{n:20,coverage_n:9,competence:20}},
 };
 const before=JSON.stringify(f);
 const html=renderToStaticMarkup(React.createElement(LanguageView,f));
 assert.equal(JSON.stringify(f),before,'rendering must not alter rows or measurements');
 const row=html.match(/<tr data-bh-jev16-language-row="compact-test"[\s\S]*?<\/tr>/)[0];
 const remarks=[display,'Measured item pools: S+P','Some radar categories still need more observations.',
  'Historical headline · measured language cells','L3 items were reviewed by an OpenAI model; headline scores do not use L3.',
  f.categories.systems['compact-test'].language_coverage_note];
 const titles=[...row.matchAll(/<(?:th|td)\b[^>]*title="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(titles.length,4,'row header and every language cell have tooltips');
 for(const title of titles)for(const remark of remarks)assert.ok(title.includes(remark),remark);
 assert.match(row,/block w-56 truncate/,'long labels have a bounded column width on all screens');
 assert.doesNotMatch(row,/whitespace-normal|sm:w-auto/,'remarks cannot widen the sticky column');
 for(const marker of ['radar-spoke-exception','language-listing','l3-exposure-note','language-coverage-note']) {
  assert.match(row,new RegExp(`class="sr-only" data-bh-${marker}`),'full remarks remain accessible without tall rows');
 }
 assert.match(row,/English: 54\.0 over 40 scored observations; 40 completed responses/);
 assert.match(row,/French: 9 completed responses; below the 15-item reporting minimum/);
 assert.match(row,/German: Not plotted; fewer than 15 answered items/);
 assert.equal((row.match(/data-bh-jev16-language-suppressed/g)??[]).length,2);
 const headers=html.match(/<thead>[\s\S]*?<\/thead>/)[0];
 assert.equal((headers.match(/title="[^"]+"/g)??[]).length,4,'every column header has a tooltip');
 assert.match(headers,/French: 40 items \(8 public, 32 sealed\)/);
});
