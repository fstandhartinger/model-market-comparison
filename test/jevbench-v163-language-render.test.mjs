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
 apiRowProps:()=>({}),nameLabel:s=>s,laneTag:()=> 'self-hosted',coverageOf:()=> 'S+P',spokeReason:()=>null,exposureNote:()=>null,
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
