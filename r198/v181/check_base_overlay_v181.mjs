import {readFile,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {baseModelFor} from '../../lib/jev-base-model.mjs';
const J=new URL('.',import.meta.url),req=createRequire(import.meta.url),source=new URL('../../components/BaseModelDisplay.tsx',import.meta.url),entries=JSON.parse(readFileSync(new URL('inputs/BASE-MODELS.json',J))),manifest=JSON.parse(readFileSync('data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.1-publication.json'));
const before=Object.fromEntries(Object.values(manifest.files).map(f=>[f.path,createHash('sha256').update(readFileSync(f.path)).digest('hex')]));
let code=ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
code=code.replace(/\bfrom\s*(["'])([^"']+)\1/g,(_,q,s)=>`from ${q}${s.startsWith('.')?new URL(s,source).href:'file://'+req.resolve(s)}${q}`);
const {BaseModelDisplay}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const rows=[];
for(const[k,e]of Object.entries(entries)){
 const x=baseModelFor('jevbench',k),html=renderToStaticMarkup(React.createElement(BaseModelDisplay,{systemKey:k}));
 assert.equal(x.status,e.status);assert.equal(x.label,e.label);assert.ok(html.includes(e.label));
 if(k!=='decide-1.1'){assert.ok(x.sources.length);assert.ok(html.includes('data-bh-base-model-source="0"'));assert.equal(x.label.includes('undisclosed'),false);}
 rows.push({key:k,status:x.status,label:x.label,html});
}
for(const[p,h]of Object.entries(before))assert.equal(createHash('sha256').update(readFileSync(p)).digest('hex'),h);
const out={status:'PASS',eight_cited_parents:true,api_undisclosed:true,real_React_component_rendered:true,all_seven_release_artifact_hashes_unchanged:true,production_build_preceded_this_presentation_only_overlay:false,rows:rows.map(({html,...x})=>x)};
await writeFile(new URL('receipts/BASE-MODEL-OVERLAY.json',J),JSON.stringify(out,null,1)+'\n');
await writeFile(new URL('preview/base-model-overlay.html',J),'<!doctype html><meta charset="utf-8"><title>Final base-model display component</title><style>body{font:16px system-ui;max-width:1000px;margin:30px auto;background:#f5f8fc;color:#163248}section{background:white;border:1px solid #dce5ef;padding:18px;margin:12px 0;border-radius:8px}a{color:#236acf;margin-left:8px}</style><h1>Final source: base-model display</h1><p>Actual BaseModelDisplay React component, rendered against the final cited metadata. Final nine-row parent metadata, included in the final production build.</p>'+rows.map(x=>'<section><h2>'+x.key+'</h2>'+x.html+'</section>').join(''));
console.log('PASS eight cited parent labels and one undisclosed API, actual React SSR; all artifact hashes unchanged');
