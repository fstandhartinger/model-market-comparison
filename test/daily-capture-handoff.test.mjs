import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { refreshBenchmarks } from '../ops/daily/refresh-benchmarks.mjs';
import { loadCaptureState } from '../ops/daily/capture-state.mjs';
const hash = (b) => createHash('sha256').update(b).digest('hex');

test('capture-only persists guarded receipts before reviews, reuses once, and rejects changed handoffs', async (t) => {
  const original = process.cwd(), dir = await mkdtemp(join(tmpdir(), 'bh-capture-handoff-'));
  try {
    process.chdir(dir);
    const root = 'data/raw/benchmarks', runDir = resolve('run');
    await mkdir(root, {recursive:true}); await mkdir(join(runDir, 'reports'), {recursive:true});
    const inputs = {registry:{entries:[{id:'fixture',primary_url:'https://fixture.invalid/board'}]},plan:{entries:[]},vendor:{observations:[]}};
    const originals = {'registry.json':inputs.registry,'collection-plan.json':inputs.plan,'vendor-candidates.json':inputs.vendor,
      'public-observations.json':{observations:[{id:'retained',value:7,retrieved_at:'2026-01-01'}]},'aa-observed-fields.json':{},'ingestion-lock.json':{},'score-approvals.json':{rows:[]}};
    for (const [name,value] of Object.entries(originals)) await writeFile(join(root,name),JSON.stringify(value));
    let calls=0;
    const captureRunner = async (file,args) => {
      assert.equal(file,'python3'); assert.equal(args[0],'scripts/capture-benchmark-sources.py');
      assert.deepEqual(JSON.parse(await readFile(args[1],'utf8')),['https://fixture.invalid/board']);
      calls++;
      const body = Buffer.from('primary source'), bodyFile=join(args[2],'body.gz');
      await writeFile(bodyFile,gzipSync(body));
      await writeFile(join(args[2],'manifest.json'),JSON.stringify([{url:'https://fixture.invalid/board',status:200,file:bodyFile,sha256:hash(body),retrieved_at:'2026-09-29T01:00:00Z'},
        {url:'https://fixture.invalid/held',status:429,reason:'rate limit'}]));
      return {stdout:'guarded fixture',stderr:''};
    };
    const review = () => {throw new Error('capture cannot call reviewers');};
    const result=await refreshBenchmarks({runDir,captureOnly:true,captureRunner,review,runner:review});
    assert.equal(result.capture_only,true); assert.equal(result.receipts,2); assert.equal(calls,1);
    await refreshBenchmarks({runDir,captureOnly:true,captureRunner,review,runner:review});
    assert.equal(calls,1,'a second phase never refetches');
    for (const [name,value] of Object.entries(originals)) assert.deepEqual(JSON.parse(await readFile(join(root,name),'utf8')),value,'published dates/values/approvals unchanged');
    const state=await loadCaptureState({runDir,inputs});
    assert.equal(state.receipts[0].retrieved_at,'2026-09-29T01:00:00Z'); assert.equal(state.receipts[1].status,429);
    await t.test('different collection inputs cannot inherit captures',async()=>{
      await assert.rejects(loadCaptureState({runDir,inputs:{...inputs,vendor:{observations:[{id:'changed'}]}}}),/different inputs or run/);
    });
    await t.test('a copied receipt cannot be reused by a different transaction',async()=>{
      const other=resolve('other');await mkdir(join(other,'reports'),{recursive:true});
      await cp(join(runDir,'reports/benchmark-captures.json'),join(other,'reports/benchmark-captures.json'));
      await assert.rejects(loadCaptureState({runDir:other,inputs}),/different inputs or run/);
    });
    await t.test('modified compressed bytes fail closed instead of fetching again',async()=>{
      await writeFile(state.receipts[0].file,gzipSync('changed'));
      await assert.rejects(refreshBenchmarks({runDir,captureOnly:true,captureRunner,review,runner:review}),/hash changed/);
      assert.equal(calls,1);
    });
  } finally {process.chdir(original);await rm(dir,{recursive:true,force:true});}
});
