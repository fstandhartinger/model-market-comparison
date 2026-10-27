// Wording-only self-hosted cost disclosures on v1.7.11; numeric row data is unchanged.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV1711Release } from './jevbench-v1711-release.mjs';
import { apiFullAddendumCategoryBounds, withRowPoolCategoryRows } from './jevbench-api-full-addenda.mjs';
export const V1712_ROOT = 'data/raw/benchmarks/jevbench/v1.7';
export const V1712_MANIFEST = `${V1712_ROOT}/jevbench-v1.7.12-publication.json`;
export const V1712_FILE_KEYS = ["results", "categories", "carry", "proof", "history", "history-carry"];
export const V1712_EXPECTED_HASHES = {"carry": "271d1fc77a136a04a1eb6deb5480c52d4211eb2b66b2ac8bb31e80867e69003a", "categories": "709c48f9051750afb7fd4efd3e986f9456029444962ed6d6fd6e64f3a7b84e39", "history": "5cd8c1332226ea9c179883d2285c0d8b8cc593ae38f2645197364a7ddd9c83c1", "history-carry": "334e851944e92383ab3071e52b3012040c7023d0fe236395953169ebee8f0459", "proof": "e60299657d211ca6dba9bf774a36951088edfa188eaf311314bff41d78a4a55d", "results": "19a6a6562cb7375fa25611364a317ca010fa4084e0ffeb310299a943ac07bde5"};
export const V1712_TEXT_BASIS_SHA256 = {"d1a-gemma4-e2b": "4d786286a47ca3103d3aa4a50dde80eea78f7f2df4b3679739277289c4fb9a00", "d1a-gemma4-e4b": "daaf1426688ecbc88034880d426e7ef887b334c00b1d1fa87171f4c7097219a4", "jez-large-1.0.0": "071279aabb18b8bddeccfa62f85c854d7533fa37eaa9c1461feca6931669a9cb", "jez-small-1.0.0": "348c6e211355b356c75b5b095dffd5a48748e3f5622c8bfcddf2ccdf93bcdbdb"};
const hash = b => createHash('sha256').update(b).digest('hex');
const fail = m => { throw new Error(`JevBench v1.7.12: ${m}`); };
const same = (a,b,m) => { if (!isDeepStrictEqual(a,b)) fail(m); };
const hex = s => /^[a-f0-9]{64}$/.test(s ?? '');
const textKeys = Object.keys(V1712_TEXT_BASIS_SHA256).sort();
function publicOnly(v) {
 if (!v || typeof v !== 'object') return;
 for (const [k,x] of Object.entries(v)) {
  if (/^(task_id|opaque_id|item_text|question_text|predictions|per_item|item_results|raw_response|password|secret)$/i.test(k)) fail('private field');
  publicOnly(x);
 }
}
export function validateJevbenchV1712Bundle({manifest,artifact,categories,carry,proof,previous,previousManifestSha256}, {candidate=false}={}) {
 for (const v of [manifest,artifact,categories,carry,proof]) publicOnly(v);
 if (manifest.revision !== 'v1.7.12' || manifest.schema_version !== 1 || manifest.status !== 'published' || manifest.provisional !== false) fail('manifest identity');
 if (!candidate && (manifest.review?.verdict !== 'PASS' || !manifest.review.engine || manifest.review.engine === 'PENDING' || !hex(manifest.review.receipt_sha256))) fail('independent review PENDING');
 same(manifest.predecessor, {revision:'v1.7.11',publication_sha256:previousManifestSha256}, 'predecessor binding');
 if (previous?.artifact.revision !== 'v1.7.11' || previous.manifest.review.verdict !== 'PASS') fail('validated predecessor');
 for (const f of V1712_FILE_KEYS) {
  same(manifest.files[f]?.path, `${V1712_ROOT}/jevbench-v1.7.12-${f}.json`, 'file path '+f);
  same(manifest.files[f]?.sha256, V1712_EXPECTED_HASHES[f], 'pinned bytes '+f);
 }
 for (const f of ['history','history-carry','carry']) same(manifest.files[f].sha256, previous.manifest.files[f].sha256, 'immutable '+f);
 const before=previous.artifact, oldRows=new Map(before.systems.map(row=>[row.key,row])), rows=new Map(artifact.systems.map(row=>[row.key,row]));
 same([...rows.keys()].sort(), [...oldRows.keys()].sort(), 'roster');
 if (artifact.revision!=='v1.7.12' || artifact.run_kind!=='same-draw-addendum' || artifact.provisional!==false) fail('artifact identity');
 same(artifact.method,before.method,'method'); same(artifact.G_med,before.G_med,'G_med');
 same(artifact.board,before.board,'ranked order'); same(artifact.n_ranked,before.n_ranked,'ranked count');
 same(artifact.roster_count,before.roster_count,'roster count');
 for (const [key,oldRow] of oldRows) {
  const row=rows.get(key);
  if (textKeys.includes(key)) {
   if (hash(Buffer.from(row.cost?.basis ?? ''))!==V1712_TEXT_BASIS_SHA256[key]) fail('cost wording pin '+key);
   const oldComparable=structuredClone(oldRow), newComparable=structuredClone(row);
   oldComparable.cost.basis=newComparable.cost.basis;
   same(newComparable,oldComparable,'text-only row '+key);
  } else same(row,oldRow,'unchanged row '+key);
  same(categories.systems[key],previous.categories.systems[key],'category cells '+key);
  same(categories.lanes[key],previous.categories.lanes[key],'category lane '+key);
 }
 same(artifact.addendum.text_only_keys,textKeys,'text-only roster');
 same(artifact.addendum.repriced_keys,[],'no cost changes');
 same(proof.revision,'v1.7.12','proof identity');
 same(proof.predecessor,manifest.predecessor,'proof predecessor');
 same(proof.text_only_rows && Object.keys(proof.text_only_rows).sort(),textKeys,'proof text roster');
 for (const key of textKeys) {
  same(proof.text_only_rows[key].after_basis_sha256,V1712_TEXT_BASIS_SHA256[key],'proof basis hash '+key);
  if (!hex(proof.text_only_rows[key].before_basis_sha256)) fail('prior basis hash '+key);
 }
 same(proof.topfive_diff_sha256,proof.publication_approval.top_five_preview_sha256,'top-five receipt binding');
 same(proof.publication_approval.top_five_effect,'unchanged','top-five status');
 if (categories.revision!=='v1.7.12'||categories.results_sha256!==manifest.files.results.sha256) fail('category binding');
 same(proof.carried_rows,before.systems.length,'carried count');
 same(proof.carried_rows_equal_except,['cost.basis on four keys'],'carry exception');
 return true;
}
async function load(p,root) { const bytes=await readFile(`${root}/${p}`); return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)}; }
export async function readOptionalJevbenchV1712Release(root=process.cwd()) {
 let publication; try { publication=await load(V1712_MANIFEST,root); } catch(e) { if(e.code==='ENOENT') return null; throw e; }
 const previous=await readOptionalJevbenchV1711Release(root);
 const predecessor=await load(`${V1712_ROOT}/jevbench-v1.7.11-publication.json`,root);
 const bundle=Object.fromEntries(await Promise.all(V1712_FILE_KEYS.map(async k=>[k,await load(`${V1712_ROOT}/jevbench-v1.7.12-${k}.json`,root)])));
 for(const [k,v] of Object.entries(bundle)) if(v.sha256!==publication.value.files[k]?.sha256) fail('bytes hash '+k);
 for(const k of ['history','history-carry','carry']) if(bundle[k].sha256!==previous.manifest.files[k].sha256) fail('immutable '+k+' bytes');
 validateJevbenchV1712Bundle({manifest:publication.value,artifact:bundle.results.value,categories:bundle.categories.value,carry:bundle.carry.value,proof:bundle.proof.value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:bundle.results.value,bytes:bundle.results.bytes,sha256:bundle.results.sha256,categories:bundle.categories.value,categoriesSha256:bundle.categories.sha256,carry:bundle.carry.value,carrySha256:bundle.carry.sha256,proof:bundle.proof.value,manifest:publication.value,historical:previous.historical};
}
export async function readJevbenchV1712ForBoard(root=process.cwd()) {
 let p; try { p=(await load(V1712_MANIFEST,root)).value; } catch(e) { if(e.code==='ENOENT') return null; throw e; }
 if (p?.review?.verdict!=='PASS') return null;
 return readOptionalJevbenchV1712Release(root);
}
export async function hasPublishedJevbenchV1712Release(root=process.cwd(),log=console.error) {
 try { return Boolean(await readJevbenchV1712ForBoard(root)); } catch { log('JevBench v1.7.12 navigation omitted: publication validation failed'); return false; }
}
export function v1712BoardInput(release) { return {artifact:release.artifact,categories:release.categories}; }
export function withV1712Addendum(chain,release) {
 const bounds={...apiFullAddendumCategoryBounds(chain.categories)};
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,restated_by:'v1.7.12',v1712_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.12',systems:{}},release.categories.systems,bounds);
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
