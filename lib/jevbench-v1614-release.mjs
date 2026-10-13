// Same-draw addition: seven v1.6.13 rows retained exactly; one key-pinned, unranked A2 measurement.
// The validated predecessor supplies all regular/full-coverage rules. No general subset exception is added.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { readOptionalJevbenchV1613Release, V1613_ROOT } from './jevbench-v1613-release.mjs';
import { validateJevbenchV16Release, mentionsPrivateSystem } from './jevbench-v16-release.mjs';
import { JEV_PRELIMINARY_LISTING } from './jevbench-scope.mjs';
export const V1614_ROOT = V1613_ROOT;
export const V1614_MANIFEST = `${V1614_ROOT}/jevbench-v1.6.14-publication.json`;
export const V1614_FILE_KEYS = ['results', 'categories', 'proof', 'history', 'history-carry'];
export const V1614_NEW_KEYS = ['microsoft-decision-1-a2-20261012'];
export const V1614_A2_LABEL = 'PRELIMINARY — API supplement A2 (300 sealed + 300 public), not the S1200 full set; equating pool 4 of 6';
export const V1614_SCORED_ROW_SHA256 = 'ee0eae99e10f9c9863c44ca3b24bf732fb2eb34391ca985c5b3755ce0d9d4d82';
const files = Object.fromEntries(V1614_FILE_KEYS.map(k => [k, `${V1614_ROOT}/jevbench-v1.6.14-${k}.json`]));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hex = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const fail = m => { throw new Error(`JevBench v1.6.14: ${m}`); };
const same = (a, b, m) => { if (!isDeepStrictEqual(a, b)) fail(m); };
const sort = v => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v;
const forbidden = /^(?:item_ids?|item_text|question(?:_text)?|golds?|expected|predictions?|predicted|per_item|item_results|prompt|task_id|input_text|item_state|raw_response|raw_inputs|seed_value|secret|token|password)$/i;
function publicOnly(v) {
  if (Array.isArray(v)) return v.forEach(publicOnly);
  if (!v || typeof v !== 'object') return;
  for (const [k, x] of Object.entries(v)) { if (forbidden.test(k)) fail(`private/item-level field ${k}`); publicOnly(x); }
}
const addedFields = ['canonical_system_key', 'not_ranked_because', 'preliminary', 'repo', 'provider', 'measured_in',
  'last_measured_on', 'measurement_date_status', 'endpoint_condition', 'class', 'open', 'licence'];

export function validateJevbenchV1614Bundle({ manifest, artifact, categories, proof, previous, previousManifestSha256 }) {
  for (const v of [manifest, artifact, categories, proof]) {
    publicOnly(v); if (mentionsPrivateSystem(JSON.stringify(v))) fail('private-only system');
  }
  if (!previous || previous.manifest?.revision !== 'v1.6.13') fail('validated predecessor required');
  if (manifest.schema_version !== 1 || manifest.revision !== 'v1.6.14' || manifest.status !== 'published' || manifest.provisional !== false) fail('publication status');
  if (manifest.review?.verdict !== 'PASS' || manifest.review.engine !== 'claude' || !hex(manifest.review.receipt_sha256)) fail('independent release review');
  same(manifest.predecessor, { revision: 'v1.6.13', publication_sha256: previousManifestSha256 }, 'predecessor binding');
  for (const k of ['historical_revision', 'historical_results_sha256', 'historical_carry_sha256']) same(manifest[k], previous.manifest[k], `historical binding ${k}`);
  for (const [k, path] of Object.entries(files)) if (manifest.files?.[k]?.path !== path || !hex(manifest.files[k].sha256)) fail(`file binding ${k}`);
  if (artifact.revision !== 'v1.6.14' || artifact.run_kind !== 'regular-queue') fail('regular-queue identity');
  validateJevbenchV16Release({ ...artifact, revision: 'v1.6.1', run_kind: 'scheduled-refresh' }, 'v1.6.1');
  const key = V1614_NEW_KEYS[0];
  const row = artifact.systems.find(s => s.key === key);
  if (!row || artifact.systems.length !== previous.artifact.systems.length + 1) fail('exact key-pinned A2 supplement');
  // Remove only the authorized addition and metadata changes. All ranks, scores, boards, CIs and regular coverage
  // must match the already validated v1.6.13 source, including the full-set Attest API row.
  const inherited = { ...artifact, revision: 'v1.6.13', systems: artifact.systems.filter(s => s.key !== key),
    roster_count: artifact.roster_count - 1, label: previous.artifact.label, measurement_notes: previous.artifact.measurement_notes };
  same(inherited, previous.artifact, 'every inherited row/board/rank and regular coverage unchanged');
  same(artifact.measurement_notes?.slice(0, previous.artifact.measurement_notes.length), previous.artifact.measurement_notes, 'inherited measurement notes unchanged');
  if (!Array.isArray(artifact.measurement_notes) || !artifact.measurement_notes.some(n => n.includes('four of six') && n.includes('HTTP 422'))) fail('A2 disclosure');
  if (row.canonical_system_key !== 'microsoft-decision-1' || row.display !== 'Microsoft-Decision-1 (Azure Foundry) — A2 re-run'
      || row.ranked !== false || row.rank !== null || row.listing !== JEV_PRELIMINARY_LISTING) fail('unranked canonical measurement identity');
  same(row.ranks, { A: null, B: null, C: null, capability: null }, 'null A2 ranks');
  if (row.api_flag !== true || row.endpoint_kind !== 'api' || row.v16?.lane !== 'api' || row.api_subset !== true
      || row.v16.api_subset_tag !== 'A2' || row.v16.set !== 'A2+P' || row.v16.full_set_api !== false
      || row.v16.n_items !== 600 || row.v16.n_sealed_side !== 300 || row.v16.n_public !== 300
      || row.status?.rows !== 600 || row.status.answered_ok !== 593 || row.status.status !== 'complete') fail('A2 API coverage');
  same(row.preliminary, { label: V1614_A2_LABEL, scope: 'API supplement A2', measured_on: '2026-10-12', n_items: 600, n_ok: 593, equating_pool_size: 4, equating_pool_target: 6 }, 'exact A2 preliminary scope/label');
  if (row.preliminary?.label !== V1614_A2_LABEL || row.preliminary.scope !== 'API supplement A2'
      || row.preliminary.equating_pool_size !== 4 || row.preliminary.equating_pool_target !== 6) fail('A2 preliminary scope/label');
  if (row.provider !== 'microsoft' || row.repo !== 'https://commandline.microsoft.com/microsoft-decision-1-model-foundry/'
      || row.measured_in !== 'v1.6.14' || row.last_measured_on !== '2026-10-12' || row.measurement_date_status !== 'measured') fail('A2 provider/provenance');
  if (row.cost?.kind !== 'tariff' || !(row.cost.usd_per_1000 > 0 && row.cost.usd_per_1000 <= 0.06459465517241379)) fail('A2 cost cap');
  if (proof.revision !== 'v1.6.14' || proof.a2_supplement?.key !== key || proof.a2_supplement.canonical_system_key !== row.canonical_system_key
      || proof.a2_supplement.scored_row_sha256 !== V1614_SCORED_ROW_SHA256) fail('A2 scorer binding');
  for (const k of ['row_for_site_sha256', 'registry_sha256', 'raw_sha256', 'scorer_sha256', 'wrapper_sha256']) if (!hex(proof.a2_supplement[k])) fail(`A2 provenance ${k}`);
  // Restore scorer presentation only, then verify ALL numerical and non-presentation leaves against the pinned row.
  const scored = { ...row };
  for (const k of addedFields) delete scored[k];
  same(proof.a2_supplement.original_presentation, { key: 'microsoft-decision-1', display: 'Microsoft-Decision-1 (submitted by Microsoft)',
    listing: 'ranked', ranked: true, rank: 1, ranks: { A: 1, B: 1, C: 1, capability: 3 } }, 'original scorer presentation');
  Object.assign(scored, proof.a2_supplement.original_presentation);
  if (hash(JSON.stringify(sort(scored))) !== V1614_SCORED_ROW_SHA256) fail('A2 numeric/scored row mapping');
  const inheritedProof = { ...proof, revision: 'v1.6.13', authority: previous.proof.authority };
  delete inheritedProof.a2_supplement;
  same(inheritedProof, previous.proof, 'inherited proof unchanged');
  same({ ...categories, revision: 'v1.6.13', results_sha256: previous.categories.results_sha256 }, previous.categories, 'inherited categories unchanged; no A2 cells');
  if (categories.revision !== 'v1.6.14' || categories.results_sha256 !== manifest.files.results.sha256) fail('category source binding');
  return { artifact, categories, proof, manifest };
}
async function load(path, root) {
  const bytes = await readFile(`${root}/${path}`);
  return { value: JSON.parse(bytes.toString('utf8')), bytes, sha256: hash(bytes) };
}
export async function readOptionalJevbenchV1614Release(root = process.cwd()) {
  let publication;
  try { publication = await load(V1614_MANIFEST, root); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  const previous = await readOptionalJevbenchV1613Release(root);
  if (!previous) fail('validated v1.6.13 predecessor required');
  const predecessorManifest = await load(`${V1614_ROOT}/jevbench-v1.6.13-publication.json`, root);
  const bundle = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k, path]) => [k, await load(path, root)])));
  for (const [k, v] of Object.entries(bundle)) if (publication.value.files?.[k]?.sha256 !== v.sha256) fail(`bytes hash ${k}`);
  same(bundle.history.sha256, previous.historical.sha256, 'immutable history bytes');
  same(bundle['history-carry'].sha256, previous.historical.carrySha256, 'immutable carry bytes');
  validateJevbenchV1614Bundle({ manifest: publication.value, artifact: bundle.results.value, categories: bundle.categories.value,
    proof: bundle.proof.value, previous, previousManifestSha256: predecessorManifest.sha256 });
  return { artifact: bundle.results.value, bytes: bundle.results.bytes, sha256: bundle.results.sha256, categories: bundle.categories.value,
    categoriesSha256: bundle.categories.sha256, proof: bundle.proof.value, proofSha256: bundle.proof.sha256, manifest: publication.value, historical: previous.historical };
}
export async function hasPublishedJevbenchV1614Release(root = process.cwd(), log = console.error) {
  try { return Boolean(await readOptionalJevbenchV1614Release(root)); }
  catch { log('JevBench v1.6.14 navigation omitted: publication validation failed'); return false; }
}
export function v1614BoardInput(release) { return { artifact: release.artifact, categories: release.categories }; }
