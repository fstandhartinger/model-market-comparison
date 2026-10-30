import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
// Evaluate the actual exported function after TypeScript compilation. React/UI imports
// are irrelevant to this pure label resolver, so their bindings are inert here.
const source=readFileSync('components/JevBenchSeoBlocks.tsx','utf8');
const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const context={exports:{},require:()=>({})};vm.runInNewContext(output,context);
test('public API tariffs render as public list price and other evidence labels stay exact',()=>{
 const label=context.exports.costBasisLabel;
 assert.equal(label('tariff'),'public list price');
 assert.equal(label('estimate'),'estimated');assert.equal(label('measured'),'measured');
 assert.equal(label('announced'),'self-reported announced price');assert.equal(label(null),'not published');
});

test('German public API tariffs render as öffentlicher Listenpreis',()=>{
 const german=readFileSync('components/JevBenchSeoDe.ts','utf8');
 const compiled=ts.transpileModule(german,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const de={exports:{}};vm.runInNewContext(compiled,de);
 const label=de.exports.costBasisLabelDe;
 assert.equal(label('tariff'),'öffentlicher Listenpreis');
 assert.equal(label('estimate'),'geschätzt');assert.equal(label('measured'),'gemessen');
 assert.equal(label('announced'),'selbst angegebener Listenpreis');
 assert.equal(label(null),'nicht veröffentlicht');assert.equal(label('unknown'),'nicht veröffentlicht');
});
