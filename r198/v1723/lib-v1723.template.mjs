// Text-only correction release. All numeric values, order lists and category cells are inherited unchanged.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {readOptionalJevbenchV1722Release} from './jevbench-v1722-release.mjs';
import {apiFullAddendumCategoryBounds,withRowPoolCategoryRows} from './jevbench-api-full-addenda.mjs';
export const V1723_ROOT='data/raw/benchmarks/jevbench/v1.7';
export const V1723_MANIFEST=`${V1723_ROOT}/jevbench-v1.7.23-publication.json`;
export const V1723_FILE_KEYS=['results','categories','carry','proof','history','history-carry'];
export const V1723_EXPECTED_HASHES=/*HASHES*/;
export const V1723_TEXT_EXCEPTIONS=/*EXCEPTIONS*/;
export const V1723_HISTORY_NOTE=/*HIST*/;
const hash=v=>createHash('sha256').update(v).digest('hex');
const same=(a,b,n)=>{if(!isDeepStrictEqual(a,b))throw Error('v1.7.23 '+n);};
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const V1723_PUBLIC_LEAK=/Florian|(?:agent )?board\s*#|#\d{4,}|jevbench-[\w-]*20\d{6}|(?:claude|codex):|release[ -]lane|deputy|custodian|chief.of.staff|\bCoS\b|release[ -]owner|\b(?:this|our) job\b|drafting worker|lead[ -](?:decision|reported|amendment)|\border\s+(?:id\s+)?[0-9a-f]{8}\b|\/home\/flori\//i;
function scan(v){if(typeof v==='string'&&V1723_PUBLIC_LEAK.test(v))throw Error('v1.7.23 public text leak');if(v&&typeof v==='object')for(const x of Object.values(v))scan(x);}
export function validateJevbenchV1723Bundle({manifest,artifact,categories,carry,proof,history,historyCarry,previous,previousManifestSha256},{candidate=false}={}){
 same(manifest.revision,'v1.7.23','manifest identity');same(manifest.status,'published','status');same(manifest.provisional,false,'provisional');
 if(!candidate&&(manifest.review?.verdict!=='PASS'||!manifest.review.engine||manifest.review.engine==='PENDING'||!hex(manifest.review.receipt_sha256)))throw Error('v1.7.23 independent review PENDING');
 same(manifest.predecessor,{revision:'v1.7.22',publication_sha256:previousManifestSha256},'predecessor binding');same(previous.artifact.revision,'v1.7.22','validated predecessor');
 if(!candidate)same(previous.manifest.review.verdict,'PASS','predecessor review');
 for(const f of V1723_FILE_KEYS){same(manifest.files[f]?.path,`${V1723_ROOT}/jevbench-v1.7.23-${f}.json`,'file path');same(manifest.files[f]?.sha256,V1723_EXPECTED_HASHES[f],'pinned '+f);}
 same(artifact.revision,'v1.7.23','artifact identity');same(artifact.systems.length,previous.artifact.systems.length,'row count');
 const expected=structuredClone(previous.artifact.systems);
 for(const c of V1723_TEXT_EXCEPTIONS.filter(c=>c.path.startsWith('results.systems['))){
  if(c.old!==null&&typeof c.old!=='string'||typeof c.new!=='string')throw Error('v1.7.23 non-text exception');
  const parts=c.path.replace('results.systems','').replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean);const field=parts.pop();const row=parts.reduce((v,k)=>v[k],expected);
  same(row[field]??null,c.old,'before exception '+c.path);row[field]=c.new;
 }
 same(artifact.systems,expected,'carried rows except pinned text');same(artifact.board,previous.artifact.board,'order lists');same(artifact.n_ranked,previous.artifact.n_ranked,'rank count');same(artifact.G_med,previous.artifact.G_med,'median');same(artifact.method,previous.artifact.method,'method');
 same(categories.systems,previous.categories.systems,'all cells');same(categories.lanes,previous.categories.lanes,'all lanes');same(categories.results_sha256,manifest.files.results.sha256,'category binding');
 same(proof.exceptions,V1723_TEXT_EXCEPTIONS,'pinned text proof');same(proof.predecessor,manifest.predecessor,'proof predecessor');same(proof.carried_rows,expected.length,'carried count');
 for(const n of ['new_rows','remeasured_rows','repriced_rows'])same(proof[n],{},'no '+n);
 same(proof.scorers,previous.proof.scorers,'scorer pins');same(proof.pricing_module_sha256,previous.proof.pricing_module_sha256,'pricing pin');same(proof.cost_basis,previous.proof.cost_basis,'cost basis');
 same(artifact.addendum.new_keys,[],'no additions');same(artifact.addendum.repriced_keys,[],'no repricing');same(artifact.measurement_notes.at(-1),V1723_HISTORY_NOTE,'history sentence');
 same(proof.publication_approval.status,'GO (standing; no top-five change)','approval');same(proof.publication_approval.top_five_effect,'unchanged','top-five effect');
 for(const v of [artifact,carry,history,historyCarry])scan(v);
 return true;
}
async function load(p,root){const bytes=await readFile(`${root}/${p}`);return {bytes,value:JSON.parse(bytes),sha256:hash(bytes)};}
export async function readOptionalJevbenchV1723Release(root=process.cwd()){
 let publication;try{publication=await load(V1723_MANIFEST,root);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 const previous=await readOptionalJevbenchV1722Release(root);if(!previous)throw Error('v1.7.23 validated predecessor');
 const predecessor=await load(`${V1723_ROOT}/jevbench-v1.7.22-publication.json`,root);
 const b=Object.fromEntries(await Promise.all(V1723_FILE_KEYS.map(async k=>[k,await load(`${V1723_ROOT}/jevbench-v1.7.23-${k}.json`,root)])));
 for(const [k,v]of Object.entries(b))same(v.sha256,publication.value.files[k]?.sha256,'bytes '+k);
 validateJevbenchV1723Bundle({manifest:publication.value,artifact:b.results.value,categories:b.categories.value,carry:b.carry.value,proof:b.proof.value,history:b.history.value,historyCarry:b['history-carry'].value,previous,previousManifestSha256:predecessor.sha256});
 return {artifact:b.results.value,bytes:b.results.bytes,sha256:b.results.sha256,categories:b.categories.value,categoriesSha256:b.categories.sha256,carry:b.carry.value,carrySha256:b.carry.sha256,proof:b.proof.value,manifest:publication.value,historical:{...previous.historical,artifact:b.history.value,carry:b['history-carry'].value}};
}
export async function readJevbenchV1723ForBoard(root=process.cwd()){
 let p;try{p=(await load(V1723_MANIFEST,root)).value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(p?.review?.verdict!=='PASS')return null;return readOptionalJevbenchV1723Release(root);
}
export async function hasPublishedJevbenchV1723Release(root=process.cwd(),log=console.error){try{return Boolean(await readJevbenchV1723ForBoard(root));}catch{log('JevBench v1.7.23 navigation omitted: publication validation failed');return false;}}
export function v1723BoardInput(release){return {artifact:release.artifact,categories:release.categories};}
export function withV1723Addendum(chain,release){
 const update=a=>({...a,systems:release.artifact.systems,board:release.artifact.board,n_ranked:release.artifact.n_ranked,roster_count:release.artifact.roster_count,measurement_notes:release.artifact.measurement_notes,amendments:release.artifact.amendments,restated_by:'v1.7.23',v1723_sha256:release.sha256});
 const categories=withRowPoolCategoryRows({...release.categories,revision:chain.published.revision,restated_by:'v1.7.23',systems:{}},release.categories.systems,apiFullAddendumCategoryBounds(chain.categories));
 return {...chain,published:update(chain.published),merged:update(chain.merged),categories,publishedCarry:release.carry};
}
