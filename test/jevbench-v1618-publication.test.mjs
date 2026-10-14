import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateJevbenchV1618Bundle, readOptionalJevbenchV1618Release, hasPublishedJevbenchV1618Release, V1618_CORE_NEW_KEYS } from '../lib/jevbench-v1618-release.mjs';
import { readOptionalJevbenchV1617Release } from '../lib/jevbench-v1617-release.mjs';
import { jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
const root = 'data/raw/benchmarks/jevbench/v1.6/';
const read = async k => JSON.parse(await readFile(`${root}jevbench-v1.6.18-${k}.json`, 'utf8'));
async function fixture() {
  const previous = await readOptionalJevbenchV1617Release();
  const [manifest, artifact, categories, proof, bytes] = await Promise.all([read('publication'), read('results'), read('categories'), read('proof'), readFile(`${root}jevbench-v1.6.17-publication.json`)]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  return { manifest, artifact, categories, proof, previous, previousManifestSha256: createHash('sha256').update(bytes).digest('hex') };
}
const row = (b,k) => b.artifact.systems.find(s => s.key === k);
const noteEdit = (b,k,edit) => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${k}: `) ? edit(n) : n); };
test('v1.6.18 adds two unranked Nimble rows and ranked Span-02; preserves all 18 carried points and category cells', async () => {
  const b = await fixture(); validateJevbenchV1618Bundle(b);
  assert.deepEqual(b.artifact.systems.filter(s => s.measured_in === 'v1.6.18').map(s => s.key), V1618_CORE_NEW_KEYS);
  assert.equal(b.artifact.roster_count, 22); assert.equal(b.artifact.n_ranked, 16);
  assert.equal(b.artifact.G_med, 9.839526770355711);
  for (const p of b.previous.artifact.systems) {
    for (const f of ['scores','axes','capability','cost','speed','noul_decisive','display','model_pin','endpoint_condition','not_ranked_because']) assert.deepEqual(row(b,p.key)[f],p[f], `${p.key}.${f}`);
    if (b.previous.categories.systems[p.key]) assert.deepEqual(b.categories.systems[p.key], b.previous.categories.systems[p.key]);
  }
  assert.ok(b.proof.authority.startsWith(b.previous.proof.authority + ' NEW in v1.6.18:'));
  assert.deepEqual(row(b, 'microsoft-decision-1-a2-20261012'), b.previous.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'));
});
for (const key of ['nimble-v4','nimble-v4-max']) {
  test(`${key}: only measured I, Calibration, Capability and Speed; no cost/composite/rank in any scope`, async () => {
    const b=await fixture(); validateJevbenchV1618Bundle(b); const s=row(b,key);
    assert.equal(s.ranked,false); assert.equal(s.listing,'listed'); assert.equal(s.rank,null);
    assert.deepEqual(s.ranks,{A:null,B:null,C:null,capability:null});
    assert.equal(s.cost.kind,'unpriced'); assert.equal(s.cost.usd_per_1000,null); assert.equal(s.axes.cost,null);
    for (const o of ['A','B','C']) assert.equal(s.scores[o],null);
    assert.ok(Object.values(s.views).every(value=>value===null));
    for (const axis of ['intelligence','calibration','speed']) assert.ok(Number.isFinite(s.axes[axis]));
    assert.equal(s.status.answered_ok,1500); assert.match(s.not_ranked_because,/#19084/);
    for (const scope of ['all','open','api']) {
      const a=jevbenchScopeArtifact(b.artifact,scope);
      for (const o of ['A','B','C','capability']) assert.ok(!(a.board?.[o]?.order??[]).includes(key),`${scope}.${o}`);
      for (const opt of [{},{costFactor:Infinity,latencyFactor:Infinity},{costFactor:Infinity},{latencyFactor:Infinity}]) {
        const v=jevClassRows(a.systems.filter(r=>r.ranked),{...JEV_V16_CLASS_OPTIONS,...opt});
        assert.ok(!v.rows.some(r=>r.row.key===key));
      }
    }
  });
  for (const [name,edit] of [
    ...['Intelligence only','Balanced 33:33:33','injected preset'].map(view=>[`preset ${view}`,b=>{row(b,key).views[view]=50;}]),
    ['raw latency altered',b=>{row(b,key).speed.p50_s_raw+=1;}],
    ['ranked', b=>{row(b,key).ranked=true;}],
    ['headline rank', b=>{row(b,key).rank=1;}],
    ['secondary rank', b=>{row(b,key).ranks.capability=1;}],
    ['Cost', b=>{row(b,key).axes.cost=80;}],
    ['USD cost', b=>{row(b,key).cost.usd_per_1000=0.01;}],
    ['Composite A', b=>{row(b,key).scores.A=80;}],
    ['Composite B', b=>{row(b,key).scores.B=80;}],
    ['Composite C', b=>{row(b,key).scores.C=80;}],
    ['reason altered', b=>{row(b,key).not_ranked_because += ' ';}],
    ['cost basis altered', b=>{row(b,key).cost.basis += ' ';}],
    ['exposure condition altered', b=>{row(b,key).endpoint_condition += ' ';}],
    ['incomplete answers', b=>{row(b,key).status.answered_ok=1499;}],
    ['wrong input usage', b=>{b.proof.new_rows[key].input_tokens++;}],
    ['wrong output usage', b=>{b.proof.new_rows[key].output_tokens++;}],
    ['wrong HTTP counts', b=>{b.proof.new_rows[key].status_counts={'200':1499,'500':1};}],
    ['fake cost ratio', b=>{b.proof.new_rows[key].cost_cap_ratio=1;}],
    ['paid order claimed', b=>{b.proof.new_rows[key].paid_fast_lane=true;}],
    ['Capability invented', b=>{row(b,key).capability=99;}],
    ['API adjustment changed', b=>{row(b,key).speed.adjustment='x2 + 0.15 s (assumption, not measured)';}],
    ['missing new raw', b=>{delete b.proof.raw_sha256[key];}],
    ['note missing ruling', b=>noteEdit(b,key,n=>n.replaceAll('#19084','#0'))],
    ['note missing full count', b=>noteEdit(b,key,n=>n.replaceAll('1,500 of 1,500','1,499 of 1,500'))],
  ]) test(`v1.6.18 rejects ${key} ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV1618Bundle(b));});
  for (const metric of ['A','B','C','capability']) test(`v1.6.18 rejects ${key} in ${metric} order`,async()=>{const b=await fixture();b.artifact.board[metric].order.unshift(key);assert.throws(()=>validateJevbenchV1618Bundle(b));});
}
for(const [name,edit] of [
  ['carried point',b=>{row(b,'krino-2b').scores.A+=0.1;}],
  ['carried Cost',b=>{row(b,'krino-2b').cost.usd_per_1000*=2;}],
  ['carried unpriced treatment',b=>{row(b,'subq-snap-preview').scores.C=99;}],
  ['carried category',b=>{b.categories.systems['krino-2b'].languages.en.competence++;}],
  ['carried A2',b=>{row(b,'microsoft-decision-1-a2-20261012').axes.speed++;}],
  ['carried note',b=>{b.artifact.measurement_notes[0]+=' ';}],
  ['carried authority',b=>{b.proof.authority=b.proof.authority.replace('4d9fef10','wrong');}],
  ['new authority',b=>{b.proof.authority=b.proof.authority.replaceAll('#19084','#0');}],
  ['new row missing',b=>{b.artifact.systems=b.artifact.systems.filter(s=>s.key!=='nimble-v4');}],
  ['unknown extra row',b=>{b.artifact.systems.push({...row(b,'nimble-v4'),key:'extra'});}],
  ['interval outside point',b=>{row(b,'krino-2b').composite_ci95.A=[0,1];}],
  ['moved interval not named',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('v1.6.18 ADDS')?n.replaceAll('pjev-2b','unknown'):n);}],
  ['new capability CI outside point',b=>{row(b,'nimble-v4').v16.ci95.capability=[0,1];}],
  ['board effect missing',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.slice(0,b.previous.artifact.measurement_notes.length).concat(b.artifact.measurement_notes.slice(b.previous.artifact.measurement_notes.length).filter(n=>!n.startsWith('Board effect')));}],
  ['provisional board note',b=>{b.artifact.measurement_notes.push('Board effect PROVISIONAL-TOPFIVE');b.artifact.measurement_notes=b.artifact.measurement_notes.filter(n=>!n.startsWith('Board effect')||n.includes('PROVISIONAL'));}],
  ['frozen median',b=>{b.artifact.G_med=1;}],
  ['PENDING review',b=>{b.manifest.review.verdict='PENDING';}],
  ['wrong predecessor',b=>{b.manifest.predecessor.revision='v1.6.16';}],
  ['wrong predecessor hash',b=>{b.manifest.predecessor.publication_sha256='b'.repeat(64);}],
  ['item-level field',b=>{row(b,'nimble-v4').item_text='private';}],
]) test(`v1.6.18 rejects ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV1618Bundle(b));});
test('PENDING v1.6.18 is hidden until independent review',async()=>{
  if((await read('publication')).review.verdict==='PASS')return;
  await assert.rejects(readOptionalJevbenchV1618Release(),/independent release review/);
  assert.equal(await hasPublishedJevbenchV1618Release(process.cwd(),()=>{}),false);
});

test('Span-02 is ranked with disclosure, outside official-cost-cap views in all scopes', async () => {
  const b=await fixture(); validateJevbenchV1618Bundle(b);
  const s=row(b,'respan-span-02'); assert.equal(s.ranked,true); assert.equal(s.cost.usd_per_1000,0.0670592);
  for (const scope of ['all','open','api']) {
    const a=jevbenchScopeArtifact(b.artifact,scope);
    for (const opt of [{},{latencyFactor:Infinity}]) assert.ok(!jevClassRows(a.systems.filter(r=>r.ranked),{...JEV_V16_CLASS_OPTIONS,...opt}).rows.some(r=>r.row.key===s.key&&r.inClass));
  }
});
test('Span-02 mutation into official-caps view is rejected', async()=> {
  const b=await fixture(); row(b,'respan-span-02').cost.usd_per_1000=0.06;
  assert.ok(jevClassRows(b.artifact.systems.filter(r=>r.ranked),JEV_V16_CLASS_OPTIONS).rows.some(r=>r.row.key==='respan-span-02'&&r.inClass));
  assert.throws(()=>validateJevbenchV1618Bundle(b),/Span-02 measured frozen cost/);
});
for (const [name,edit] of [
 ['adjusted p50 altered',b=>{row(b,'respan-span-02').speed.p50_s_adjusted+=1;}],
 ['adjusted p95 altered',b=>{row(b,'respan-span-02').speed.p95_s_adjusted+=1;}],
 ['pricing hash altered',b=>{b.proof.pricing_module_sha256='0'.repeat(64);}],
 ['speed note removed',b=>noteEdit(b,'respan-span-02',n=>n.replaceAll('x2 + 0.15 s','adjustment'))],
 ['over-cap cost disclosure removed',b=>{row(b,'respan-span-02').cost.basis=row(b,'respan-span-02').cost.basis.replace('OVER THE OFFICIAL COST CAP','');}],
 ['over-cap note removed',b=>noteEdit(b,'respan-span-02',n=>n.replace('OVER THE OFFICIAL COST CAP',''))],
 ['hardware disclosure removed',b=>noteEdit(b,'respan-span-02',n=>n.replaceAll('RTX 5090','H100'))],
 ['invocation disclosure removed',b=>noteEdit(b,'respan-span-02',n=>n.replaceAll('launch.sh','launcher'))],
 ['wrong completeness',b=>{row(b,'respan-span-02').status.answered_ok=1500;}],
 ['wrong pre-registered tokens',b=>{b.proof.new_rows['respan-span-02'].input_tokens++;}],
 ['wrong refusals',b=>{b.proof.new_rows['respan-span-02'].status_counts={'200':1485,'422':15};}],
 ['wrong revision',b=>{row(b,'respan-span-02').model_pin='lihe07/span-02@'+'0'.repeat(40);}],
 ['custody authority removed',b=>{b.proof.authority=b.proof.authority.replaceAll('#19055','#0');}],
 ['moved carried rank absent from rank clause',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('v1.6.18 ADDS')?n.replace('uniphore-4b-decider A','unknown A'):n);}],
]) test(`v1.6.18 rejects Span-02 ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV1618Bundle(b));});
