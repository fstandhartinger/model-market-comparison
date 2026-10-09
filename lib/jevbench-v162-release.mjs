import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validateJevbenchV16Release, mentionsPrivateSystem, validateJevbenchV16Carry, JEVBENCH_V16_EXCLUDED_KEYS } from './jevbench-v16-release.mjs';
import { readJevbenchV157Release } from './jevbench-v15-release.mjs';
import { validateCategoryArtifact } from './jevbench-categories.mjs';

export const V162_ROOT = 'data/raw/benchmarks/jevbench/v1.6';
// Source pins of the unmodified published artifacts at the preparation commit.
export const V162_HISTORY_SHA256 = '5cd8c1332226ea9c179883d2285c0d8b8cc593ae38f2645197364a7ddd9c83c1';
export const V162_CARRY_SHA256 = '334e851944e92383ab3071e52b3012040c7023d0fe236395953169ebee8f0459';
export const V162_MANIFEST = `${V162_ROOT}/jevbench-v1.6.2-publication.json`;
const files = Object.fromEntries(['results', 'categories', 'proof', 'history', 'history-carry'].map(k => [k, `${V162_ROOT}/jevbench-v1.6.2-${k}.json`]));
const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function excluded(text) {
  if (JEVBENCH_V16_EXCLUDED_KEYS.some(key => text.includes(JSON.stringify(key))) || mentionsPrivateSystem(text)) fail('private-only system');
}
const finite = v => typeof v === 'number' && Number.isFinite(v);
const fail = message => { throw new Error(`JevBench v1.6.2: ${message}`); };
const forbidden = /^(?:item_ids?|item_text|question(?:_text)?|golds?|expected|predictions?|predicted|per_item|item_results|prompt|task_id|input_text|item_state|raw_response|raw_inputs|seed_value|secret|token|password)$/i;
function publicOnly(value) {
  if (Array.isArray(value)) return value.forEach(publicOnly);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.test(key)) fail(`private/item-level field ${key}`);
    publicOnly(child);
  }
}
export function validateJevbenchV162Bundle({ manifest, artifact, categories, proof, historicalSha256 }) {
  for (const value of [manifest, artifact, categories, proof]) {
    publicOnly(value);
    excluded(JSON.stringify(value));
  }
  if (manifest?.schema_version !== 1 || manifest.revision !== 'v1.6.2' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  if (manifest.historical_revision !== 'v1.6.1' || manifest.historical_results_sha256 !== historicalSha256 || historicalSha256 !== V162_HISTORY_SHA256 || manifest.historical_carry_sha256 !== V162_CARRY_SHA256) fail('historical source binding');
  for (const [key, path] of Object.entries(files)) if (manifest.files?.[key]?.path !== path || !hex(manifest.files[key].sha256)) fail(`file binding ${key}`);
  // Existing score reproduction remains authoritative; only the release identity/run kind differs.
  if (artifact?.revision !== 'v1.6.2' || artifact.run_kind !== 'paid-fast-lane' || artifact.noul_method?.applied !== 'O1S') fail('fresh native identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  if (artifact.bootstrap?.B !== 1000 || artifact.bootstrap.bootstrap_seed !== 16 || artifact.bootstrap.g_med_fixed !== true) fail('artifact bootstrap');
  if (artifact.not_measured.length || artifact.systems.some(s => s.v16.lane !== 'selfhosted' || s.status?.rows !== 1500 || s.measured_in !== 'v1.6.2')) fail('native full cohort');
  if (artifact.sample?.open !== 300 || artifact.sample.sealed !== 1200 || artifact.sample.total !== 1500) fail('scoring denominator');
  const ranked = artifact.systems.filter(s => s.ranked).map(s => s.key).sort();
  for (const o of ['A', 'B', 'C']) if (JSON.stringify([...artifact.board[o].order].sort()) !== JSON.stringify(ranked)) fail(`board membership ${o}`);
  if (artifact.v16.counts.S !== 1200 || artifact.v16.counts.P !== 300 || artifact.v16.counts.selfhosted_input !== 1500) fail('fresh input counts');
  if (proof?.schema_version !== 1 || proof.revision !== 'v1.6.2' || proof.method !== 'jevbench::v1.6' || proof.noul_method !== 'O1S' || proof.bootstrap?.B !== 1000 || proof.bootstrap.seed !== 16) fail('method proof');
  if (!hex(proof.freeze_manifest_sha256) || !hex(proof.seed_commitment_sha256) || !hex(proof.source_sha256) || proof.source_sha256 !== artifact.source_sha256 || !/^v1\.6-[a-z0-9-]+$/.test(proof.draw_release)) fail('draw/source proof');
  if (artifact.v16.draw_release !== proof.draw_release || artifact.v16.freeze_manifest_sha256 !== proof.freeze_manifest_sha256) fail('cohort binding');
  const rows = proof.systems;
  if (!Array.isArray(rows) || new Set(rows.map(s => s.key)).size !== artifact.systems.length || rows.length !== artifact.systems.length) fail('system proof coverage');
  for (const s of artifact.systems) {
    const p = rows.find(p => p.key === s.key);
    if (!p || p.rows !== 1500 || p.admission !== 'ACCEPTED' || !hex(p.admission_sha256) || !hex(p.raw_sha256) || !hex(p.source_review_sha256) || !/^[a-f0-9]{40}$/.test(p.model_commit) || !/^[a-f0-9]{40}$/.test(p.code_commit) || typeof p.completed_at !== 'string' || !Number.isFinite(Date.parse(p.completed_at))) fail(`system proof ${s.key}`);
    if (!s.ranked && !['wrapper', 'subsidized', 'listed'].includes(s.listing)) fail(`unranked listing ${s.key}`);
  }
  const rankedKeys = artifact.systems.filter(s => s.ranked).map(s => s.key).sort();
  const gaps = proof.field_median?.members;
  if (!Array.isArray(gaps) || JSON.stringify(gaps.map(p => p.key).sort()) !== JSON.stringify(rankedKeys) || !gaps.every(p => finite(p.gap) && artifact.systems.find(s => s.key === p.key)?.intelligence?.gap === p.gap)) fail('field median cohort');
  const numbers = gaps.map(p => p.gap).sort((a,b) => a-b);
  if (!numbers.length) fail('empty field median');
  const median = numbers.length % 2 ? numbers[(numbers.length-1)/2] : (numbers[numbers.length/2-1]+numbers[numbers.length/2])/2;
  if (!finite(artifact.G_med) || Math.abs(artifact.G_med - median) > 1e-9 || proof.field_median.G_med !== artifact.G_med) fail('completed cohort G_med');
  if (categories?.revision !== 'v1.6.2' || categories.provisional !== false || categories.source_results_sha256 !== artifact.source_sha256 || categories.draw_release !== proof.draw_release || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  validateFreshCategories(categories, artifact);
  validateCategoryArtifact(categories, ['topics', 'usecases', 'languages']);
  if (Object.keys(categories.systems).sort().join('\0') !== artifact.systems.map(s => s.key).sort().join('\0')) fail('category cohort');
  for (const s of artifact.systems) for (const dim of ['topics', 'usecases', 'languages']) {
    if (!categories[dim].every(c => c.n === 0 || categories.systems[s.key]?.[dim]?.[c.key])) fail(`missing category ${s.key}.${dim}`);
  }
  return { artifact, categories, proof, manifest };
}
function validateFreshCategories(categories, artifact) {
  for (const field of ['live_category_cells', 'supplement', 'language_cells', 'unavailable']) if (field in categories) fail(`historical category overlay ${field}`);
  for (const field of ['lane_note', 'metric', 'labelling']) if (typeof categories[field] !== 'string' || !categories[field].trim()) fail(`category field ${field}`);
  if (!Array.isArray(categories.rules) || !categories.rules.length || !categories.rules.every(s => typeof s === 'string' && s.trim())) fail('category rules');
  const keys = artifact.systems.map(s => s.key).sort();
  if (!categories.lanes || Object.keys(categories.lanes).sort().join('\0') !== keys.join('\0') || !Object.values(categories.lanes).every(l => l === 'selfhosted')) fail('category lanes');
  for (const dim of ['topics', 'usecases', 'languages']) {
    if (!Array.isArray(categories[dim])) fail(`category descriptors ${dim}`);
    for (const c of categories[dim]) {
      if (typeof c.key !== 'string' || !c.key || !Number.isInteger(c.n) || c.n < 0 || !Number.isInteger(c.open) || c.open < 0 || c.open > 300 || !Number.isInteger(c.sealed) || c.sealed < 0 || c.sealed > 1200 || c.n !== c.open + c.sealed || typeof c.low_n !== 'boolean' || c.low_n !== (c.n < 30)) fail(`category descriptor ${dim}.${c.key}`);
    }
  }
  if (categories.languages.reduce((n,c) => n+c.n,0) !== 1500 || categories.languages.reduce((n,c) => n+c.open,0) !== 300 || categories.languages.reduce((n,c) => n+c.sealed,0) !== 1200) fail('category language denominator');
}
async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  const text = bytes.toString('utf8'); excluded(text);
  return { value: JSON.parse(text), bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}
/** Missing publication manifest means the version is unavailable; invalid published evidence fails closed. */
export async function readOptionalJevbenchV162Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V162_MANIFEST, root); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const [results, categories, proof, history, carry, previous] = await Promise.all([load(files.results, root), load(files.categories, root), load(files.proof, root), load(files.history, root), load(files['history-carry'], root), readJevbenchV157Release(root)]);
  publicOnly(history.value);
  if (mentionsPrivateSystem(JSON.stringify(history.value))) fail('private historical system');
  validateJevbenchV16Release(history.value, 'v1.6.1');
  if (history.sha256 !== V162_HISTORY_SHA256 || carry.sha256 !== V162_CARRY_SHA256) fail('immutable historical source hash');
  if (history.value.systems.some(s => s.measured_in === 'v1.6.2')) fail('fresh row in history');
  const measured = new Set(history.value.systems.map(s => s.key));
  const checkedCarry = validateJevbenchV16Carry(carry.value, measured, previous.artifact, previous.sha256);
  const historical = { artifact: history.value, bytes: history.bytes, sha256: history.sha256, carry: checkedCarry, carrySha256: carry.sha256 };
  for (const [key, value] of Object.entries({ results, categories, proof, history, 'history-carry': carry })) if (publication.value.files?.[key]?.sha256 !== value.sha256) fail(`bytes hash ${key}`);
  validateJevbenchV162Bundle({ manifest: publication.value, artifact: results.value, categories: categories.value, proof: proof.value, historicalSha256: historical.sha256 });
  return { artifact: results.value, bytes: results.bytes, sha256: results.sha256, categories: categories.value, categoriesSha256: categories.sha256, proof: proof.value, proofSha256: proof.sha256, manifest: publication.value, historical };
}

/** Optional navigation must never make an older board depend on fresh publication health. */
export async function hasPublishedJevbenchV162Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV162Release(root)); }
  catch (error) { log('JevBench v1.6.2 navigation omitted: publication validation failed'); return false; }
}

/** Carried rows replace only their explicit not-measured placeholder, never a measured row. */
export function historicalCatalogue(artifact, carry) {
  const measured = new Map(artifact.systems.map(row => [row.key, row]));
  const pending = new Map(artifact.not_measured.map(row => [row.key, row]));
  const carried = new Map();
  for (const row of carry.rows) {
    if (measured.has(row.key) || carried.has(row.key) || !pending.has(row.key)) fail(`historical duplicate/source join ${row.key}`);
    carried.set(row.key, row);
  }
  return [...measured.values(), ...[...pending.values()].map(row => carried.get(row.key) ?? row)]
    .sort((a,b) => Number(['wrapper','subsidized'].includes(a.listing ?? '')) - Number(['wrapper','subsidized'].includes(b.listing ?? '')));
}
