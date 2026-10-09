// Public synthetic test of the actual LanguageView function; no prospective release artifacts are created.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {freshJevbenchCategoryRows} from '../lib/jevbench-categories.mjs';
const require=createRequire(import.meta.url);
const ts=require('typescript'), React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const board=readFileSync(new URL('../components/JevBenchV16Board.tsx',import.meta.url),'utf8');
// Transpile the real function bytes. External display helpers are public deterministic stubs;
// row selection, ordering, actual stored language cells, suppression and wrapper heading remain real Source.
const functionSource=board.slice(board.indexOf('function LanguageView('),board.indexOf('\nfunction DatedCarry('));
const code=ts.transpileModule(functionSource+'\nexport {LanguageView};', {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};
runInNewContext(code,{module,exports:module.exports,require,Fragment:React.Fragment,freshJevbenchCategoryRows,
 listedRow:s=>!!s.ranked||s.listing==='reference'||s.listing==='api',byBoard:(x,y)=>(x.rank??999)-(y.rank??999),
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
 assert.match(html,/Wrappers \(listed, never ranked\)/);
 assert.equal((html.match(/data-bh-jev16-language-suppressed/g)??[]).length,0);
});
test('actual v162 LanguageView keeps its previous ranked-only row order and excludes wrappers',()=>{
 const html=renderToStaticMarkup(React.createElement(LanguageView,fixture('v1.6.2')));
 assert.deepEqual([...html.matchAll(/data-bh-jev16-language-row="([^"]+)"/g)].map(m=>m[1]),['J','M','W','D']);
 assert.doesNotMatch(html,/Wrappers \(listed, never ranked\)/);
});
