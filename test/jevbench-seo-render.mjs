import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require = createRequire(import.meta.url);
const cache = new Map();
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const link = dataUrl(`import {createElement} from ${JSON.stringify(`file://${require.resolve('react')}`)};export default function Link({children,...p}){return createElement('a',p,children)}`);
/** Compile the actual server TSX and resolve its imports; only browser interaction/Next navigation is stubbed. */
export async function compileSeoModule(path) {
  const url = new URL(`../${path}`,import.meta.url);
  if (cache.has(url.href)) return cache.get(url.href);
  let source = await readFile(url,'utf8');
  let code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const imports = [...code.matchAll(/from\s*(['"])([^'"]+)\1/g)];
  for (const [,quote,spec] of imports) {
    let target;
    if (spec === 'next/link') target=link;
    else if (spec === 'next/navigation') target=dataUrl('export function notFound(){throw new Error("NOT_FOUND")}');
    else if (spec.endsWith('/JevCompareV15')) target=dataUrl('export function JevCompareV15(){return null}');
    else if (spec.endsWith('/JevBenchRelatedLinks')) target=dataUrl('export function JevBenchRelatedLinks(){return null}');
    else if (/\/(JevV141SystemDetail|JevV15SystemDetail|JevRadars|JevSystemCharts|JevArchitecture)$/.test(spec)) target=dataUrl('export const JevV141SystemDetail=()=>null,JevV15SystemDetail=()=>null,JevPairRadar=()=>null,JevAxisBand=()=>null,JevScoreStrip=()=>null,JevArchitectureBadge=()=>null,typeColour=()=>"",JEV_TYPE_LABEL={}');
    else if (spec.endsWith('/JevBoardGuides')) target=dataUrl('export function JevBoardGuides(){return null}');
    else if (spec.startsWith('.') && !spec.endsWith('.mjs')) {
      const resolved = new URL(`${spec}.tsx`,url);
      let file = resolved;
      try {await readFile(file);} catch {file=new URL(`${spec}.ts`,url);}
      target=await compileSeoModule(file.pathname.replace(new URL('../',import.meta.url).pathname,''));
    } else target=spec.startsWith('.') ? new URL(spec,url).href : `file://${require.resolve(spec)}`;
    code=code.replace(`from ${quote}${spec}${quote}`,`from ${JSON.stringify(target)}`);
  }
  const result=dataUrl(code);cache.set(url.href,result);return result;
}
export async function importSeoModule(path){return import(await compileSeoModule(path));}
export const renderSeo = (element) => renderToStaticMarkup(element);
export function parseJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m)=>JSON.parse(m[1]));
}
