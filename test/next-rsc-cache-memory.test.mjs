import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import config from '../next.config.mjs';

const require=createRequire(import.meta.url);
const FileSystemCache=require('next/dist/server/lib/incremental-cache/file-system-cache.js').default;
const {defaultConfig}=require('next/dist/server/config-shared.js');
const {IncrementalCacheKind}=require('next/dist/server/response-cache/types.js');

function fixture(){
  const state={jsonExpansions:0,rscReads:0,html:'<main>published JevBench</main>',rsc:Buffer.from('published RSC payload')};
  const fs={
    async readFile(path){
      if(path.endsWith('.html'))return state.html;
      if(path.endsWith('.meta'))return JSON.stringify({status:200,headers:{'x-fixture':'published'}});
      if(path.endsWith('.rsc')){
        state.rscReads++;
        const result=Buffer.from(state.rsc);
        const toJSON=result.toJSON.bind(result);
        result.toJSON=()=>{state.jsonExpansions++;return toJSON();};
        return result;
      }
      throw Object.assign(new Error('fixture path absent'),{code:'ENOENT'});
    },
    async stat(){return {mtime:new Date('2026-11-05T00:00:00Z')};},
  };
  // Each test owns this Next.js module instance. Avoid any prior test's singleton.
  FileSystemCache.memoryCache=undefined;
  const cache=new FileSystemCache({fs,flushToDisk:false,serverDistDir:'/fixture/.next/server',revalidatedTags:[],maxMemoryCacheSize:config.cacheMaxMemorySize??defaultConfig.cacheMaxMemorySize});
  return {state,cache};
}

test('serving a prerendered App Router page does not expand its RSC Buffer into a JSON byte array',async()=>{
  const {state,cache}=fixture();
  const entry=await cache.get('jev-models',{kind:IncrementalCacheKind.APP_PAGE});
  assert.equal(state.jsonExpansions,0,'Next memory-cache sizing must not JSON.stringify the complete RSC Buffer');
  assert.equal(entry.value.html,state.html);
  assert.equal(entry.value.rscData.toString(),state.rsc.toString());
  assert.equal(entry.value.status,200);
  assert.equal(entry.value.headers['x-fixture'],'published');
});

test('the disk-backed Next cache still serves the complete published page on successive reads',async()=>{
  const {state,cache}=fixture();
  const before=await cache.get('jev-models',{kind:IncrementalCacheKind.APP_PAGE});
  state.html='<main>next published page</main>';
  state.rsc=Buffer.from('next published RSC payload');
  const after=await cache.get('jev-models',{kind:IncrementalCacheKind.APP_PAGE});
  assert.equal(before.value.html,'<main>published JevBench</main>');
  assert.equal(after.value.html,state.html);
  assert.equal(after.value.rscData.toString(),state.rsc.toString());
  assert.equal(state.rscReads,2);
  assert.equal(state.jsonExpansions,0);
});
