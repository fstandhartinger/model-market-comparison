import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir, mkdtemp, mkdir, symlink, rm} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {buildV1811AllDataView} from '../scripts/build-jevbench-v1811-alldata.mjs';

test('v1.8.11 precomputed All-data bytes reproduce on its published release chain', async()=>{
  // A newer live addendum contributes its own row-pool bounds. Freeze this historical
  // regeneration at v1.8.11, without changing any archived source or artifact bytes.
  const root=await mkdtemp(join(tmpdir(),'v1811-chain-'));
  const hidden=['data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.12-publication.json','data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.13-publication.json','data/raw/benchmarks/jevbench/v1.8/jevbench-v1.8.14-publication.json'];
  async function mirror(rel=''){
    for(const e of await readdir(resolve(rel||'.'),{withFileTypes:true})){
      if(['.git','.next','.heavy-run','node_modules'].includes(e.name))continue;
      const path=rel?`${rel}/${e.name}`:e.name;
      if(hidden.includes(path))continue;
      if(hidden.some(h=>h.startsWith(path+'/'))){await mkdir(join(root,path));await mirror(path);}
      else await symlink(resolve(path),join(root,path));
    }
  }
  try{
    await mirror();
    assert.equal(JSON.stringify(await buildV1811AllDataView(root))+'\n',await readFile('data/jevbench-v1.8.11-alldata.json','utf8'));
  }finally{await rm(root,{recursive:true,force:true});}
});
