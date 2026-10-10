// JevBench v1.6.3 fail-closed release infrastructure. SYNTHETIC fixtures only, written to temporary directories:
// they are not operational receipts, reviews or results, and no v1.6.3 data is created in the repository.
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm, readFile, copyFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { JEVBENCH_V157_RELEASE_ARTIFACT } from '../lib/jevbench-v15-release.mjs';
import { jevV15Composite } from '../lib/jevbench-v15-preview.mjs';
import { historicalCatalogue, readOptionalJevbenchV162Release, hasPublishedJevbenchV162Release } from '../lib/jevbench-v162-release.mjs';
import {
  validateJevbenchV163Bundle, readOptionalJevbenchV163Release, hasPublishedJevbenchV163Release, v163BoardInput,
  V163_FILES, V163_MANIFEST, V163_NATIVE, V163_WRAPPERS, V162_PUBLICATION_SHA256, V163_PREDECESSOR_COST_SHA256,
} from '../lib/jevbench-v163-release.mjs';

const BASE_DIR = 'data/raw/benchmarks/jevbench/v1.6/';
const V162 = Object.fromEntries(['results', 'categories', 'proof', 'history', 'history-carry', 'publication'].map(k => [k, `${BASE_DIR}jevbench-v1.6.2-${k}.json`]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
// Visibly synthetic hashes/commits: repeated nibbles, never operational receipts.
const syn = (c, n = 64) => c.repeat(n);
const supported = () => true;

async function predecessor() {
  const bytes = await readFile(V162.publication);
  return { manifest: JSON.parse(bytes), manifestSha256: digest(bytes), artifact: await json(V162.results), categories: await json(V162.categories), proof: await json(V162.proof) };
}

/** Python Source: public_proof.prepare_proof + public_result_scaffold.schema_check, run on the synthetic artifact. */
function sourceProof(input) {
  const script = `import json,sys
sys.path.insert(0,'ops/jevbench-v163/source')
import public_proof, public_result_scaffold as P
from pathlib import Path
d=json.load(sys.stdin)
P.schema_check(d['artifact'], json.loads(Path('ops/jevbench-v163/source/PUBLIC-SCHEMA-V162.json').read_text())['schema'])
print(json.dumps(public_proof.prepare_proof(d['previous'],d['artifact'],d['rows'],d['baseline'],d['source'],d['predecessor'],d['category_reference'])))`;
  const run = spawnSync('python3', ['-B', '-c', script], { input: JSON.stringify(input), encoding: 'utf8', env: { PATH: process.env.PATH, PYTHONDONTWRITEBYTECODE: '1' } });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
}

function rankBoard(artifact) {
  const ranked = artifact.systems.filter(s => s.ranked);
  for (const o of ['A', 'B', 'C', 'capability']) {
    const value = s => o === 'capability' ? s.capability : s.scores[o];
    artifact.board[o].order = ranked.toSorted((x, y) => value(y) - value(x)).map(s => s.key);
  }
  for (const s of ranked) {
    s.ranks = Object.fromEntries(['A', 'B', 'C', 'capability'].map(o => [o, artifact.board[o].order.indexOf(s.key) + 1]));
    s.rank = s.ranks[artifact.headline];
  }
}
function rescore(artifact, s) {
  for (const o of ['A', 'B', 'C']) s.scores[o] = jevV15Composite(s.axes, artifact.options[o].weights, artifact.options[o].intelligence_floor);
  s.jevbench_score = s.scores[artifact.headline];
  s.capability = (s.axes.intelligence + s.axes.calibration) / 2;
}

/** Complete synthetic six-system bundle derived from the actual published v1.6.2 predecessor. */
async function fixture(includeRyo = true) {
  const prev = await predecessor();
  const a = structuredClone(prev.artifact);
  a.revision = 'v1.6.3'; a.label = 'SYNTHETIC FIXTURE v1.6.3'; a.source_note = 'Synthetic test fixture; not a measurement.';
  a.source_sha256 = syn('5');
  const byKey = new Map(a.systems.map(s => [s.key, s]));
  const decisor = structuredClone(byKey.get('wald-4b-v2'));
  Object.assign(decisor, { key: 'decisor_4b', display: 'Synthetic Decisor', repo: 'https://example.invalid/synthetic-decisor', model_pin: syn('d', 40), measured_in: 'v1.6.3', last_measured_on: '2026-10-10' });
  decisor.axes = { ...decisor.axes, intelligence: decisor.axes.intelligence + 3 };
  decisor.intelligence = { ...decisor.intelligence, gap: 6.5 };
  const ryo = structuredClone(byKey.get('metask_jev_rain_12b'));
  Object.assign(ryo, { key: 'ryotide_qwen9', display: 'Synthetic RYOTIDE wrapper', repo: 'https://example.invalid/synthetic-ryotide', model_pin: syn('e', 40), measured_in: 'v1.6.3', last_measured_on: '2026-10-10' });
  a.systems.push(decisor, ...(includeRyo ? [ryo] : []));
  // Whole-field rescoring restates normalized values of an original row; its measurements stay unchanged.
  const jeff = byKey.get('jeff_1_0_large');
  jeff.axes = { ...jeff.axes, intelligence: jeff.axes.intelligence - 0.5 };
  for (const s of a.systems.filter(s => s.ranked)) rescore(a, s);
  a.G_med = (byKey.get('jeff_1_0_large').intelligence.gap + 6.5) / 2; // median of 2.79, 4.09, 6.5, 10.08
  for (const s of a.systems) s.v16.g_med_used = a.G_med;
  a.roster_count = a.systems.length; a.n_ranked = 4;
  a.v16.ranked_selfhosted = [...V163_NATIVE].sort();
  a.v16.equating.pool = a.systems.map(s => s.key).sort(); a.v16.equating.pool_n = a.systems.length;
  rankBoard(a);

  const resultBytes = JSON.stringify(a);
  const c = structuredClone(prev.categories);
  c.revision = 'v1.6.3'; c.G_med = a.G_med; c.results_sha256 = digest(resultBytes); c.source_results_sha256 = a.source_sha256;
  c.lane_note = `Synthetic fixture: ${a.systems.length} completed measurements cover the same fresh draw.`;
  c.systems.decisor_4b = structuredClone(c.systems['wald-4b-v2']);
  if (includeRyo) c.systems.ryotide_qwen9 = structuredClone(c.systems.metask_jev_rain_12b);
  c.lanes = Object.fromEntries(a.systems.map(s => [s.key, 'selfhosted']));
  const categoryBytes = JSON.stringify(c);

  const oldRows = new Map(prev.proof.systems.map(r => [r.key, r]));
  const rows = a.systems.map(s => oldRows.get(s.key) ?? {
    key: s.key, rows: 1500, admission: 'ACCEPTED', admission_sha256: syn(s.key === 'decisor_4b' ? '1' : '2'), raw_sha256: syn(s.key === 'decisor_4b' ? '3' : '4'),
    native_receipt_sha256: syn(s.key === 'decisor_4b' ? '6' : '7'), source_review_sha256: syn(s.key === 'decisor_4b' ? '8' : '9'),
    scoring_admission_sha256: syn(s.key === 'decisor_4b' ? 'a' : 'b'), source_pins_sha256: syn(s.key === 'decisor_4b' ? 'c' : '0'),
    model_commit: s.model_pin, code_commit: syn('f', 40), model_url: s.repo, code_url: `${s.repo}-code`,
    completed_at: '2026-10-10T08:00:00+00:00', disposition: V163_NATIVE.includes(s.key) ? 'native_ranked' : 'wrapper_unranked',
  });
  const category_reference = { ...structuredClone(prev.proof.category_reference), scope: 'synthetic_fixture_only', evidence_sha256: { categories: digest(categoryBytes), category_execution: syn('e') } };
  const proof = sourceProof({ previous: prev.proof, artifact: a, rows, baseline: syn('b'), source: a.source_sha256, predecessor: prev.manifestSha256, category_reference });
  const proofBytes = JSON.stringify(proof);

  const manifest = {
    schema_version: 1, revision: 'v1.6.3', status: 'published', provisional: false,
    review: { verdict: 'PASS', engine: 'claude', receipt_sha256: syn('a') },
    predecessor: { revision: 'v1.6.2', publication_sha256: prev.manifestSha256 },
    historical_revision: 'v1.6.1', historical_results_sha256: prev.manifest.historical_results_sha256, historical_carry_sha256: prev.manifest.historical_carry_sha256,
    files: {
      results: { path: V163_FILES.results, sha256: digest(resultBytes) }, categories: { path: V163_FILES.categories, sha256: digest(categoryBytes) },
      proof: { path: V163_FILES.proof, sha256: digest(proofBytes) },
      history: { path: V163_FILES.history, sha256: prev.manifest.files.history.sha256 }, 'history-carry': { path: V163_FILES['history-carry'], sha256: prev.manifest.files['history-carry'].sha256 },
    },
  };
  return { manifest, artifact: a, categories: c, proof, historicalSha256: manifest.historical_results_sha256, historicalCarrySha256: manifest.historical_carry_sha256, predecessor: prev };
}

async function diskBundle(t, edit = () => {}, includeRyo = true) {
  const root = await mkdtemp(join(tmpdir(), 'jev163-synthetic-'));
  t.after(() => rm(root, { recursive: true }));
  await mkdir(join(root, BASE_DIR), { recursive: true });
  await mkdir(dirname(join(root, JEVBENCH_V157_RELEASE_ARTIFACT)), { recursive: true });
  await copyFile(JEVBENCH_V157_RELEASE_ARTIFACT, join(root, JEVBENCH_V157_RELEASE_ARTIFACT));
  for (const path of Object.values(V162)) await copyFile(path, join(root, path));
  const b = await fixture(includeRyo);
  edit(b);
  const contents = { results: JSON.stringify(b.artifact), categories: JSON.stringify(b.categories), proof: JSON.stringify(b.proof), history: await readFile(V162.history), 'history-carry': await readFile(V162['history-carry']) };
  for (const [key, bytes] of Object.entries(contents)) await writeFile(join(root, V163_FILES[key]), bytes);
  await writeFile(join(root, V163_MANIFEST), JSON.stringify(b.manifest));
  return { root, b, path: key => join(root, key === 'publication' ? V163_MANIFEST : V163_FILES[key]) };
}

// ---- Actual repository: only an independently validated bundle becomes available; default stays unchanged.
test('actual repository availability follows its validated bundle and preserves the default', async () => {
  const release = await readOptionalJevbenchV163Release(); // malformed or incomplete manifest must throw
  const present = (await readdir(BASE_DIR)).filter(f => f.includes('1.6.3')).sort();
  if (release) {
    assert.deepEqual(present, [...Object.values(V163_FILES), V163_MANIFEST].map(p => p.slice(BASE_DIR.length)).sort());
    assert.equal(release.manifest.review.verdict, 'PASS');
    assert.equal(release.artifact.n_ranked, 4);
    assert.ok([5, 6].includes(release.artifact.systems.length));
    assert.equal(await hasPublishedJevbenchV163Release(), true);
    assert.equal(digest(release.bytes), release.manifest.files.results.sha256);
  } else {
    assert.deepEqual(present, []);
    assert.equal(await hasPublishedJevbenchV163Release(process.cwd(), () => assert.fail('no log for an absent release')), false);
  }
  assert.doesNotMatch(await readFile('app/jev-models/page.tsx', 'utf8'), /1\.6\.3|v163/);
  assert.doesNotMatch(await readFile('app/api/jevbench/latest/route.ts', 'utf8').catch(() => ''), /1\.6\.3|v163/);
  // Existing v1.6.2 publication stays byte-identical and is the pinned predecessor.
  assert.equal(digest(await readFile(V162.publication)), V162_PUBLICATION_SHA256);
  assert.equal((await json(V162.proof)).cost_basis_sha256, V163_PREDECESSOR_COST_SHA256);
  assert.ok(await readOptionalJevbenchV162Release());
});

test('actual published v1.6.2 rows carry the 1,479-item cost basis bound by the proof cost hash', async () => {
  const prev = await predecessor();
  assert.equal(prev.proof.cost_basis_sha256, V163_PREDECESSOR_COST_SHA256);
  for (const s of prev.artifact.systems) assert.deepEqual([s.status.rows, s.cost.common_basis.n_items, s.cost.common_basis.rule], [1500, 1479, 'common'], s.key);
});

// ---- Positive: complete six-system synthetic bundle, proof emitted by the actual Python Source.
test('complete synthetic six-system bundle validates with a prepare_proof-emitted proof', async () => {
  const b = await fixture();
  assert.ok(validateJevbenchV163Bundle(b));
  assert.deepEqual(b.proof.field_median.members.map(m => m.key).sort(), [...V163_NATIVE].sort());
  assert.equal(b.proof.cohort_roster.every(r => r.status === 'complete' && r.rows === 1500), true);
  assert.deepEqual(b.artifact.systems.filter(s => !s.ranked).map(s => [s.key, s.listing]).sort(), V163_WRAPPERS.map(k => [k, 'wrapper']).sort());
});

test('authenticated five-system Decisor addendum validates with pending RYOTIDE preserved', async () => {
  const b = await fixture(false);
  assert.ok(validateJevbenchV163Bundle(b));
  assert.equal(b.artifact.systems.length, 5);
  assert.deepEqual(b.proof.field_median.members.map(r => r.key).sort(), [...V163_NATIVE].sort());
  assert.equal(b.categories.systems.ryotide_qwen9, undefined);
  assert.equal(b.proof.systems.some(r => r.key === 'ryotide_qwen9'), false);
  assert.deepEqual(b.proof.cohort_roster.find(r => r.key === 'ryotide_qwen9'), b.predecessor.proof.cohort_roster.find(r => r.key === 'ryotide_qwen9'));
});
test('five-system proof refuses invented pending-wrapper completion or category cell', async () => {
  const b = await fixture(false);
  b.proof.cohort_roster.find(r => r.key === 'ryotide_qwen9').status = 'complete';
  assert.throws(() => validateJevbenchV163Bundle(b), /frozen six roster/);
  const c = await fixture(false); c.categories.systems.ryotide_qwen9 = structuredClone(c.categories.systems.metask_jev_rain_12b);
  assert.throws(() => validateJevbenchV163Bundle(c), /category cohort/);
});
test('on-disk synthetic bundle loads with immutable history/carry and v1.6.2 predecessor', async t => {
  const { root } = await diskBundle(t);
  const loaded = await readOptionalJevbenchV163Release(root, { genericSupport: supported });
  assert.equal(loaded.artifact.revision, 'v1.6.3');
  assert.equal(loaded.predecessorSha256, V162_PUBLICATION_SHA256);
  assert.equal(historicalCatalogue(loaded.historical.artifact, loaded.historical.carry).length, 173);
  assert.deepEqual(v163BoardInput(loaded, supported).categories, loaded.categories);
});

test('without generic v1.6.3 Board/category support a present publication fails closed', async t => {
  const { root } = await diskBundle(t);
  await assert.rejects(readOptionalJevbenchV163Release(root, { genericSupport: () => false }), /generic fresh Board\/category/);
  assert.throws(() => v163BoardInput({ artifact: { revision: 'v1.6.3' }, categories: { revision: 'v1.6.3' } }, () => false), /generic fresh/);
});

// ---- Negative validator cases.
const firstNew = b => b.artifact.systems.find(s => s.key === 'decisor_4b');
const wrapper = b => b.artifact.systems.find(s => s.key === 'ryotide_qwen9');
for (const [name, edit, error] of [
  ['unauthenticated five-system artifact with six-system pool/proof', b => { b.artifact.systems = b.artifact.systems.filter(s => s.key !== 'ryotide_qwen9'); b.artifact.roster_count = 5; }, /completed pool|proof coverage/],
  ['RYOTIDE-only five-system roster without Decisor', b => { b.artifact.systems = b.artifact.systems.filter(s => s.key !== 'decisor_4b'); b.artifact.roster_count = 5; }, /five-or-six/],
  ['wrapper finite but corrupted composite', b => { wrapper(b).scores.A += 1; }, /composite reproduction/],
  ['wrapper finite but corrupted capability', b => { wrapper(b).capability += 1; }, /headline\/capability/],
  ['wrapper ranked', b => { wrapper(b).ranked = true; }, /listing|disposition|n_ranked/],
  ['native moved to wrapper', b => { const s = firstNew(b); s.ranked = false; s.listing = 'wrapper'; }, /disposition|n_ranked/],
  ['wrong headline rank', b => { firstNew(b).rank = 9; }, /rank/],
  ['wrapper in field median', b => { b.proof.field_median.members.push({ key: 'ryotide_qwen9', gap: wrapper(b).intelligence.gap }); }, /field median/],
  ['median not of four natives', b => { b.artifact.G_med += 0.25; }, /G_med|g_med/i],
  ['cost item count change', b => { firstNew(b).cost.common_basis.n_items = 1480; }, /cost basis/],
  ['cost mask hash change', b => { b.proof.cost_basis_sha256 = syn('1'); }, /cost_basis_sha256|cost basis/],
  ['original row cost changed', b => { b.artifact.systems[0].cost.usd_per_1000 *= 2; }, /original measurement changed/],
  ['incomplete error-inclusive rows', b => { firstNew(b).status.rows = 1499; }, /complete rows|item count/],
  ['missing new-key category cell', b => { delete b.categories.systems.decisor_4b.topics[b.categories.topics[0].key]; }, /missing category/],
  ['missing new-key category system', b => { delete b.categories.systems.ryotide_qwen9; }, /category cohort/],
  ['coverage above n', b => { const cell = Object.values(b.categories.systems.decisor_4b.usecases)[0]; cell.coverage_n = cell.n + 1; }, /category cell/],
  ['fractional coverage', b => { Object.values(b.categories.systems.decisor_4b.languages)[0].coverage_n = 0.5; }, /category cell/],
  ['estimated cell for zero category', b => { b.categories.topics.push({ key: 'zero', label: 'Zero', covers: 'none', n: 0, open: 0, sealed: 0, low_n: true }); b.categories.systems.decisor_4b.topics.zero = { n: 1, competence: 50, coverage_n: 1 }; }, /category descriptors changed|fabricated/],
  ['old v1.6.2 categories', b => { b.categories.revision = 'v1.6.2'; }, /category identity/],
  ['historical overlay', b => { b.categories.supplement = {}; }, /category fields/],
  ['original category cells changed', b => { Object.values(b.categories.systems.jeff_1_0_large.topics)[0].competence += 1; }, /original category cells|breakdown/],
  ['predecessor receipt mutation', b => { b.proof.systems[0].raw_sha256 = syn('9'); }, /original measured provenance/],
  ['new row reuses old receipt', b => { b.proof.systems.find(r => r.key === 'decisor_4b').raw_sha256 = b.predecessor.proof.systems[0].raw_sha256; }, /reuses v1.6.2 receipt/],
  ['changed preregistration', b => { b.proof.cohort_preregistration_sha256 = syn('2'); }, /predecessor binding/],
  ['changed capability envelope', b => { b.proof.frozen_capability_envelope.factor = 3; }, /predecessor binding/],
  ['changed label provenance', b => { b.proof.category_reference.gold_sha256 = syn('3'); }, /provenance/],
  ['reused v1.6.2 category evidence', b => { b.proof.category_reference.evidence_sha256 = b.predecessor.proof.category_reference.evidence_sha256; }, /category evidence/],
  ['inherited v1.6.2 source hash', b => { b.proof.source_sha256 = b.predecessor.proof.source_sha256; }, /source binding/],
  ['inherited completed baseline', b => { b.proof.completed_baseline_sha256 = b.predecessor.proof.completed_baseline_sha256; }, /completed baseline/],
  ['predecessor publication hash mismatch', b => { b.manifest.predecessor.publication_sha256 = syn('4'); }, /predecessor publication/],
  ['history hash mismatch', b => { b.manifest.historical_results_sha256 = syn('4'); }, /historical/],
  ['fake peer engine', b => { b.manifest.review.engine = 'peer'; }, /independent release review/],
  ['unreviewed', b => { b.manifest.review.verdict = 'PENDING'; }, /independent release review/],
  ['reused v1.6.2 review receipt', b => { b.manifest.review.receipt_sha256 = b.predecessor.manifest.review.receipt_sha256; }, /reused/],
  ['provisional', b => { b.manifest.provisional = true; }, /publication status/],
  ['wrong method weights', b => { b.artifact.options.A.weights.cost = 30; }, /inherited method/],
  ['wrong bootstrap', b => { b.proof.bootstrap.B = 2000; }, /method proof/],
  ['API flagged native row', b => { firstNew(b).api_flag = true; }, /self-hosted lane/],
  ['non-hex source', b => { b.proof.source_sha256 = 'not-a-hash'; b.artifact.source_sha256 = 'not-a-hash'; }, /source binding/],
  ['nonfinite axis', b => { firstNew(b).axes.cost = Infinity; }, /nonfinite|finite/],
  ['item leak in proof', b => { b.proof.systems[0].task_id = 'x'; }, /private\/item-level/],
  ['item leak in results', b => { firstNew(b).gold = 'x'; }, /private\/item-level/],
  ['customer data', b => { b.proof.customer_email = 'x'; }, /private\/item-level/],
  ['private path', b => { firstNew(b).display = '/home/someone/raw'; }, /private path/],
  ['unknown proof field', b => { b.proof.extra = 1; }, /proof fields/],
  ['unknown proof row field', b => { b.proof.systems[0].note = 'x'; }, /exact measurement proof fields/],
  ['unknown results field', b => { firstNew(b).surprise = 1; }, /unknown nested public field/],
  ['result/proof model join', b => { b.proof.systems.find(r => r.key === 'decisor_4b').model_commit = syn('0', 40); }, /provenance join/],
]) test(`rejects ${name}`, async () => { const b = await fixture(); edit(b); assert.throws(() => validateJevbenchV163Bundle(b), error); });

// ---- Negative on-disk cases.
test('missing manifest is unavailable even with other v1.6.3 files present', async t => {
  const { root, path } = await diskBundle(t);
  await rm(path('publication'));
  assert.equal(await readOptionalJevbenchV163Release(root, { genericSupport: supported }), null);
});
for (const key of ['results', 'categories', 'proof', 'history', 'history-carry']) test(`rejects ${key} byte mismatch`, async t => {
  const { root, path } = await diskBundle(t);
  await writeFile(path(key), (await readFile(path(key), 'utf8')) + ' ');
  await assert.rejects(readOptionalJevbenchV163Release(root, { genericSupport: supported }), /hash/);
});
test('rejects mutated on-disk v1.6.2 predecessor manifest', async t => {
  const { root } = await diskBundle(t);
  await writeFile(join(root, V162.publication), (await readFile(V162.publication, 'utf8')) + '\n');
  await assert.rejects(readOptionalJevbenchV163Release(root, { genericSupport: supported }), /predecessor/);
});
test('rejects absent v1.6.2 predecessor', async t => {
  const { root } = await diskBundle(t);
  await rm(join(root, V162.publication));
  await assert.rejects(readOptionalJevbenchV163Release(root, { genericSupport: supported }), /predecessor v1.6.2 publication unavailable/);
});
test('internally valid replacement history cannot replace the pinned bundle', async t => {
  const { root, b, path } = await diskBundle(t);
  const edited = await json(path('history')); edited.label = 'replacement'; const bytes = JSON.stringify(edited);
  await writeFile(path('history'), bytes); b.manifest.files.history.sha256 = digest(bytes); await writeFile(path('publication'), JSON.stringify(b.manifest));
  await assert.rejects(readOptionalJevbenchV163Release(root, { genericSupport: supported }), /immutable historical source hash/);
});
for (const kind of ['malformed', 'manifest-only']) test(`${kind} publication fails closed`, async t => {
  const { root, path } = await diskBundle(t);
  if (kind === 'malformed') await writeFile(path('publication'), '{broken');
  else for (const key of ['results', 'categories', 'proof', 'history', 'history-carry']) await rm(path(key));
  await assert.rejects(readOptionalJevbenchV163Release(root, { genericSupport: supported }));
});

// ---- Route, page and navigation through the actual TS/TSX Source.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
async function compiled(path, substitutions) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  runInNewContext(output, { module, exports: module.exports, require: name => substitutions[name] ?? require(name), Response, Uint8Array }, { filename: path });
  return module.exports;
}
const absent = () => { throw new Error('NEXT_NOT_FOUND'); };
const loaderFor = root => ({ readOptionalJevbenchV163Release: () => readOptionalJevbenchV163Release(root, { genericSupport: supported }), v163BoardInput: r => v163BoardInput(r, supported) });
async function pageModule(root, read = loaderFor(root)) {
  return compiled('../app/jev-models/v1.6.3/page.tsx', {
    'next/navigation': { notFound: absent },
    '../../../lib/jevbench-v163-release.mjs': read,
    '../../../lib/jevbench-v162-release.mjs': { historicalCatalogue },
    '../../../lib/jevbench-v15-release.mjs': { withPublicAdapterIds: a => a },
    '../../../components/JevBenchV16Board': { JevBenchV16Board: props => React.createElement('div', { 'data-fixture-board': true, 'data-cohort-rows': props.artifact.systems.length, 'data-category-revision': props.categories.revision, 'data-carry-rows': props.carry.rows.length }) },
    '../../../components/JevBenchReleaseVersionNav': { JevBenchReleaseVersionNav: props => React.createElement('nav', { 'data-active': props.active }, 'version navigation') },
    '../../../components/JevHistoryLazy': { JevHistoryLazy: () => React.createElement('div', { 'data-history-lazy': true }) },
  });
}
test('actual repository: API and page follow the genuine validated bundle', async () => {
  const release = await readOptionalJevbenchV163Release();
  const api = await compiled('../app/api/jevbench/v1.6.3/route.ts', { '../../../../lib/jevbench-v163-release.mjs': { readOptionalJevbenchV163Release: () => readOptionalJevbenchV163Release() } });
  const response = await api.GET();
  const page = await pageModule(process.cwd(), { readOptionalJevbenchV163Release: () => readOptionalJevbenchV163Release(), v163BoardInput });
  if (release) {
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), release.bytes);
    assert.equal(response.headers.get('X-Content-SHA256'), release.sha256);
    const html = renderToStaticMarkup(await page.default());
    assert.match(html, /data-category-revision="v1.6.3"/);
    assert.equal((html.match(/data-bh-jev163-wrapper-row=/g) ?? []).length, release.artifact.systems.filter(r => !r.ranked).length);
    assert.ok(html.indexOf('data-fixture-board') < html.indexOf('data-bh-jev163-wrappers'));
    assert.ok(html.indexOf('data-bh-jev163-wrappers') < html.indexOf('data-bh-jev163-history'));
    assert.equal((html.match(/data-bh-jev163-historical-row=/g) ?? []).length, 173);
  } else {
    assert.equal(response.status, 404);
    await assert.rejects(page.default(), /NEXT_NOT_FOUND/);
  }
});
test('missing-manifest temporary root retains API404 and pageNotFound after publication', async t => {
  const root = await mkdtemp(join(tmpdir(), 'bh-v163-absent-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  assert.equal(await readOptionalJevbenchV163Release(root), null);
  const api = await compiled('../app/api/jevbench/v1.6.3/route.ts', { '../../../../lib/jevbench-v163-release.mjs': loaderFor(root) });
  assert.equal((await api.GET()).status, 404);
  await assert.rejects((await pageModule(root)).default(), /NEXT_NOT_FOUND/);
});
test('API serves exact synthetic result bytes with their SHA-256', async t => {
  const { root, path } = await diskBundle(t);
  const api = await compiled('../app/api/jevbench/v1.6.3/route.ts', { '../../../../lib/jevbench-v163-release.mjs': loaderFor(root) });
  const response = await api.GET(); const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200);
  assert.deepEqual(bytes, await readFile(path('results')));
  assert.equal(response.headers.get('X-Content-SHA256'), digest(bytes));
});
test('page keeps full Board, wrapper section below it and before all 173 historical rows', async t => {
  const { root, b } = await diskBundle(t);
  const html = renderToStaticMarkup(await (await pageModule(root)).default());
  assert.match(html, /data-active="v1.6.3"/);
  assert.match(html, /data-category-revision="v1.6.3"/); assert.match(html, /data-cohort-rows="6"/); assert.match(html, /data-carry-rows="0"/);
  const at = marker => { const i = html.indexOf(marker); assert.ok(i >= 0, marker); return i; };
  assert.ok(at('data-fixture-board') < at('data-bh-jev163-wrappers') && at('data-bh-jev163-wrappers') < at('data-bh-jev163-history') && at('data-bh-jev163-history') < at('data-history-lazy'));
  for (const key of V163_WRAPPERS) {
    const row = b.artifact.systems.find(s => s.key === key);
    assert.match(html, new RegExp(`data-bh-jev163-wrapper-row="${key}" data-capability="${row.capability}" data-composite="${row.jevbench_score}"`));
    assert.ok(html.includes(`href="${row.repo}"`), row.repo);
  }
  assert.equal((html.match(/data-bh-jev163-wrapper-row=/g) ?? []).length, 2);
  assert.match(html, /not ranked · excluded from G_med/);
  assert.equal((html.match(/data-bh-jev163-historical-row=/g) ?? []).length, 173);
  assert.match(html, /rescores the whole completed field/); assert.match(html, /original measurements/); assert.match(html, /restated/); assert.match(html, /not comparable one-to-one/);
});
test('five-system page renders one measured wrapper and truthful pending status before173history', async t => {
  const { root } = await diskBundle(t, () => {}, false);
  const html = renderToStaticMarkup(await (await pageModule(root)).default());
  assert.match(html, /data-cohort-rows="5"/);
  assert.equal((html.match(/data-bh-jev163-wrapper-row=/g) ?? []).length, 1);
  assert.match(html, /RYOTIDE remains pending/);
  assert.ok(!html.includes('data-bh-jev163-wrapper-row="ryotide_qwen9"'));
  assert.equal((html.match(/data-bh-jev163-historical-row=/g) ?? []).length, 173);
});
test('navigation shows v1.6.3 only for a validated publication and keeps older boards working', async t => {
  const { root, path } = await diskBundle(t);
  const logs = [];
  const nav = await compiled('../components/JevBenchReleaseVersionNav.tsx', {
    '../lib/jevbench-v162-release.mjs': { hasPublishedJevbenchV162Release: () => hasPublishedJevbenchV162Release(root, () => {}) },
    '../lib/jevbench-v163-release.mjs': { hasPublishedJevbenchV163Release: async () => { try { return Boolean(await readOptionalJevbenchV163Release(root, { genericSupport: supported })); } catch { logs.push('omitted'); return false; } } },
  });
  for (const active of ['v1.6.2', 'v1.6.1', 'v1.5.7']) assert.match(renderToStaticMarkup(await nav.JevBenchReleaseVersionNav({ active })), /href="\/jev-models\/v1.6.3"/);
  await writeFile(path('proof'), '{broken');
  const html = renderToStaticMarkup(await nav.JevBenchReleaseVersionNav({ active: 'v1.6.1' }));
  assert.ok(!html.includes('/jev-models/v1.6.3')); assert.match(html, /href="\/jev-models\/v1.6.2"/); assert.equal(logs.length, 1);
});
test('actual navigation follows validated publication and keeps v1.6.2', async () => {
  const release = await readOptionalJevbenchV163Release();
  const nav = await compiled('../components/JevBenchReleaseVersionNav.tsx', {});
  const html = renderToStaticMarkup(await nav.JevBenchReleaseVersionNav({ active: 'v1.6.1' }));
  assert.equal(html.includes('/jev-models/v1.6.3'), Boolean(release)); assert.match(html, /href="\/jev-models\/v1.6.2"/);
});
