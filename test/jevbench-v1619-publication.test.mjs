import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateJevbenchV1619Bundle, readOptionalJevbenchV1619Release, hasPublishedJevbenchV1619Release, V1619_CORE_NEW_KEYS } from '../lib/jevbench-v1619-release.mjs';
import { readOptionalJevbenchV1618Release } from '../lib/jevbench-v1618-release.mjs';
import { jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';
import { jevClassRows, JEV_V16_CLASS_OPTIONS } from '../lib/jevbench-jev-class.mjs';
const root = 'data/raw/benchmarks/jevbench/v1.6/';
const read = async k => JSON.parse(await readFile(`${root}jevbench-v1.6.19-${k}.json`, 'utf8'));
async function fixture() {
  const previous = await readOptionalJevbenchV1618Release();
  const [manifest, artifact, categories, proof, bytes] = await Promise.all([read('publication'), read('results'), read('categories'), read('proof'), readFile(`${root}jevbench-v1.6.18-publication.json`)]);
  manifest.review = { engine: 'claude', verdict: 'PASS', receipt_sha256: 'a'.repeat(64) };
  return { manifest, artifact, categories, proof, previous, previousManifestSha256: createHash('sha256').update(bytes).digest('hex') };
}
const row = (b,k) => b.artifact.systems.find(s => s.key === k);
const noteEdit = (b,k,edit) => { b.artifact.measurement_notes = b.artifact.measurement_notes.map(n => n.startsWith(`${k}: `) ? edit(n) : n); };
test('v1.6.19 adds Ventus-2B; preserves all 21 carried points and category cells', async () => {
  const b = await fixture(); validateJevbenchV1619Bundle(b);
  assert.deepEqual(b.artifact.systems.filter(s => s.measured_in === 'v1.6.19').map(s => s.key), V1619_CORE_NEW_KEYS);
  assert.equal(b.artifact.roster_count, 23); assert.equal(b.artifact.n_ranked, 17);
  assert.equal(b.artifact.G_med, 9.839526770355711);
  for (const p of b.previous.artifact.systems) {
    for (const f of ['scores','axes','capability','cost','speed','noul_decisive','display','model_pin','endpoint_condition','not_ranked_because']) assert.deepEqual(row(b,p.key)[f],p[f], `${p.key}.${f}`);
    if (b.previous.categories.systems[p.key]) assert.deepEqual(b.categories.systems[p.key], b.previous.categories.systems[p.key]);
  }
  assert.ok(b.proof.authority.startsWith(b.previous.proof.authority + ' NEW in v1.6.19:'));
  assert.deepEqual(row(b, 'microsoft-decision-1-a2-20261012'), b.previous.artifact.systems.find(s => s.key === 'microsoft-decision-1-a2-20261012'));
});
for(const [name,edit] of [
  ['carried point',b=>{row(b,'krino-2b').scores.A+=0.1;}],
  ['carried Cost',b=>{row(b,'krino-2b').cost.usd_per_1000*=2;}],
  ['carried unpriced treatment',b=>{row(b,'subq-snap-preview').scores.C=99;}],
  ['carried category',b=>{b.categories.systems['krino-2b'].languages.en.competence++;}],
  ['carried A2',b=>{row(b,'microsoft-decision-1-a2-20261012').axes.speed++;}],
  ['carried note',b=>{b.artifact.measurement_notes[0]+=' ';}],
  ['carried authority',b=>{b.proof.authority=b.proof.authority.replace('4d9fef10','wrong');}],
  ['new authority',b=>{b.proof.authority=b.proof.authority.replaceAll('No SubQ re-price','SubQ re-price');}],
  ['new row missing',b=>{b.artifact.systems=b.artifact.systems.filter(s=>s.key!=='ventus-2b');}],
  ['unknown extra row',b=>{b.artifact.systems.push({...row(b,'nimble-v4'),key:'extra'});}],
  ['interval outside point',b=>{row(b,'krino-2b').composite_ci95.A=[0,1];}],
  ['moved interval not named',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.map(n=>n.startsWith('v1.6.19 ADDS')?n.replaceAll('vllm-sr-d3','unknown'):n);}],
  ['new capability CI outside point',b=>{row(b,'ventus-2b').v16.ci95.capability=[0,1];}],
  ['board effect missing',b=>{b.artifact.measurement_notes=b.artifact.measurement_notes.slice(0,b.previous.artifact.measurement_notes.length).concat(b.artifact.measurement_notes.slice(b.previous.artifact.measurement_notes.length).filter(n=>!n.startsWith('Board effect')));}],
  ['provisional board note',b=>{b.artifact.measurement_notes.push('Board effect PROVISIONAL-TOPFIVE');b.artifact.measurement_notes=b.artifact.measurement_notes.filter(n=>!n.startsWith('Board effect')||n.includes('PROVISIONAL'));}],
  ['frozen median',b=>{b.artifact.G_med=1;}],
  ['PENDING review',b=>{b.manifest.review.verdict='PENDING';}],
  ['wrong predecessor',b=>{b.manifest.predecessor.revision='v1.6.16';}],
  ['wrong predecessor hash',b=>{b.manifest.predecessor.publication_sha256='b'.repeat(64);}],
  ['item-level field',b=>{row(b,'nimble-v4').item_text='private';}],
]) test(`v1.6.19 rejects ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV1619Bundle(b));});
test('PENDING v1.6.19 is hidden until independent review',async()=>{
  if((await read('publication')).review.verdict==='PASS')return;
  await assert.rejects(readOptionalJevbenchV1619Release(),/independent release review/);
  assert.equal(await hasPublishedJevbenchV1619Release(process.cwd(),()=>{}),false);
});


const ATTR='Ventus-2B by Ethan Xie (https://github.com/XieShaocong33Ethan/Ventus-2B)';
test('Ventus attribution is visible in the release page and retained in row metadata',async()=>{
 const b=await fixture();validateJevbenchV1619Bundle(b);
 for(const file of ['app/jev-models/v1.6.19/page.tsx','app/jev-models/ventus-2b/page.tsx']) { const page=await readFile(file,'utf8'); assert.ok(page.includes(ATTR)); assert.match(page,/readOptionalJevbenchV1619Release/); }
 assert.match(await readFile('app/jev-models/ventus-2b/page.tsx','utf8'),/row\.licence/);
 assert.ok(row(b,'ventus-2b').licence.includes(ATTR));assert.ok(row(b,'ventus-2b')._artifact_note.includes('no longer resolves'));
 for(const key of ['nimble-v4','nimble-v4-max'])assert.ok(Object.values(row(b,key).views).every(v=>v===null));
 assert.equal(row(b,'subq-snap-preview').ranked,false);
});
for(const [name,edit] of [
 ['missing required attribution line',b=>{row(b,'ventus-2b').licence=row(b,'ventus-2b').licence.replace(ATTR,'');noteEdit(b,'ventus-2b',n=>n.replaceAll(ATTR,''));}],
 ['artifact note removed',b=>{delete row(b,'ventus-2b')._artifact_note;}],
 ['licence changed',b=>{row(b,'ventus-2b').licence='Apache-2.0';}],
 ['endpoint changed',b=>{row(b,'ventus-2b').endpoint_condition+=' ';}],
 ['cost basis changed',b=>{row(b,'ventus-2b').cost.basis+=' ';}],
 ['pin changed',b=>{row(b,'ventus-2b').model_pin='Ethan33X/Ventus-2B@'+'0'.repeat(40);}],
 ['wrong completeness',b=>{row(b,'ventus-2b').status.answered_ok=1500;}],
 ['wrong refusal counts',b=>{b.proof.new_rows['ventus-2b'].status_counts={'200':1485,'400':15};}],
 ['wrong input tokens',b=>{b.proof.new_rows['ventus-2b'].input_tokens++;}],
 ['wrong output tokens',b=>{b.proof.new_rows['ventus-2b'].output_tokens++;}],
 ['raw latency changed',b=>{row(b,'ventus-2b').speed.p50_s_raw++;}],
 ['adjusted latency changed',b=>{row(b,'ventus-2b').speed.p50_s_adjusted++;}],
 ['pricing hash changed',b=>{b.proof.pricing_module_sha256='0'.repeat(64);}],
 ['load disclosure removed',b=>noteEdit(b,'ventus-2b',n=>n.replaceAll('36.16','36'))],
 ['carried Nimble preset restored',b=>{row(b,'nimble-v4').views['Intelligence only']=50;}],
 ['SubQ repriced',b=>{row(b,'subq-snap-preview').ranked=true;}],
])test(`v1.6.19 rejects ${name}`,async()=>{const b=await fixture();edit(b);assert.throws(()=>validateJevbenchV1619Bundle(b));});
for(const metric of ['A','B','C','capability'])test(`v1.6.19 rejects altered ${metric} membership`,async()=>{const b=await fixture();b.artifact.board[metric].order.pop();assert.throws(()=>validateJevbenchV1619Bundle(b));});
