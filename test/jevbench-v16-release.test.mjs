import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  readJevbenchV16Release, JEVBENCH_V16_RELEASE_RESULTS,
  JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY,
  JEVBENCH_V16_EXCLUDED_KEYS, mentionsPrivateSystem,
} from '../lib/jevbench-v16-release.mjs';
import { JEVBENCH_V157_RELEASE_ARTIFACT } from '../lib/jevbench-v15-release.mjs';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const release = await readJevbenchV16Release();
const previous = JSON.parse(await read('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.7-results.json'));

function keysOf(rows) { return new Set(rows.map((row) => row.key)); }

test('v1.6.0 artifacts are publishable aggregates and contain no excluded or item-level data', async () => {
  assert.equal(release.artifact.provisional, false);
  assert.equal(release.artifact.status, 'published');
  assert.equal(release.artifact.run_kind, 'scheduled-refresh');
  assert.equal(release.artifact.n_ranked, release.artifact.systems.filter((row) => row.ranked).length);
  for (const file of [JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY]) {
    const text = await read(file);
    for (const key of JEVBENCH_V16_EXCLUDED_KEYS) assert.ok(!text.includes(`"${key}"`), `${file} lists ${key}`);
    assert.equal(mentionsPrivateSystem(text), false, `${file} names a private-only system`);
    assert.doesNotMatch(text, /"(?:item_id|item_text|question_text|gold|prediction|prompt)"\s*:/i, `${file} includes item-level data`);
  }
});

test('release excludes private orders and unpublished internal candidates from every artifact and exposure table', async () => {
  const excluded = ['drex-v1.5', 'decider-12b', 'decider-12b-v1', 'h2o-lightning-4b', 'janus-4b', 'evalengine-decision-4b'];
  for (const file of [JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY]) {
    const text = await read(file);
    for (const key of excluded) assert.ok(!text.toLowerCase().includes(key), `${file} leaks ${key}`);
    assert.doesNotMatch(text, /Drex|H2O.Lightning|janus|EvalEngine|decider-12b/i);
  }
  const main = release.artifact.systems.find(s => s.key === 'wity-1');
  assert.ok(main?.ranked);
  for (const key of ['wity-1-off', 'wity-1-always']) {
    const variant = release.artifact.systems.find(s => s.key === key);
    assert.ok(variant && !variant.ranked && variant.rank == null);
    assert.equal(variant.repo, 'https://wity.alphanimble.com/');
    for (const o of ['A', 'B', 'C']) assert.ok(!release.artifact.board[o].order.includes(key));
  }
  assert.equal(main.repo, 'https://wity.alphanimble.com/');
  for (const row of [...release.artifact.systems, ...release.artifact.not_measured]) assert.match(row.repo, /^https:\/\//, row.key);
  for (const row of release.carry.rows) {
    assert.equal(row.carried_from, 'v1.5.7');
    assert.match(row.source_url ?? row.repo, /^https:\/\//, row.key);
  }
});

test('release route preserves every public v1.5.7 model as measured, dated carry, or not measured', () => {
  const current = keysOf([...release.artifact.systems, ...release.artifact.not_measured, ...release.carry.rows]);
  const missing = [...previous.systems, ...previous.not_measured].filter((row) => ![...JEVBENCH_V16_EXCLUDED_KEYS, 'drex-v1.5', 'decider-12b', 'decider-12b-v1', 'h2o-lightning-4b', 'janus-4b', 'evalengine-decision-4b'].includes(row.key) && !current.has(row.key));
  assert.deepEqual(missing, []);
  assert.equal(release.artifact.roster_count, release.artifact.systems.length + release.artifact.not_measured.length);
  for (const key of ['jobe-qwen3.5-4b', 'mica-v01-4b', 'openjev-razorback16']) {
    assert.ok(release.artifact.not_measured.some((row) => row.key === key), `${key} stays visible without an official score`);
  }
});

test('Vansa keeps its original v1.5.6 measurement while carried from v1.5.7 under the API exposure cadence', () => {
  const row = release.carry.rows.find((entry) => entry.key === 'vansa-3.4');
  assert.ok(row);
  assert.equal(row.measured_revision, 'v1.5.6');
  assert.equal(row.v156_rank, previous.systems.find(s => s.key === 'vansa-3.4').rank);
  assert.equal(row.api_flag, true);
  assert.match(row.note, /three-refresh exposure cadence/);
  assert.ok(release.artifact.not_measured.some((entry) => entry.key === 'vansa-3.4'));
  assert.equal(release.carry.carried_from.revision, 'v1.5.7');
});

test('category aggregates are bound to the exact scorer source and keep the complete language taxonomy', () => {
  assert.equal(release.categories.source_results_sha256, release.artifact.source_sha256);
  assert.equal(release.categories.languages.length, 23);
  assert.equal(release.categories.languages.filter((row) => row.key !== 'mixed').length, 22);
  assert.deepEqual(release.categories.languages.map((row) => row.key).sort(), ['ar','cs','da','de','el','en','es','fi','fr','hi','id','it','ja','ko','mixed','nl','no','pl','pt','sv','tr','uk','zh'].sort());
});

test('loader rejects categories from a different scorer source', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jevbench-v16-bind-'));
  try {
    for (const rel of [JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY, JEVBENCH_V157_RELEASE_ARTIFACT]) {
      const target = path.join(root, rel);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await read(rel));
    }
    const categoryPath = path.join(root, JEVBENCH_V16_RELEASE_CATEGORIES);
    const categories = JSON.parse(await readFile(categoryPath, 'utf8'));
    categories.source_results_sha256 = '0'.repeat(64);
    await writeFile(categoryPath, JSON.stringify(categories));
    await assert.rejects(() => readJevbenchV16Release(root), /category results source hash/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('loader binds every dated carry value and source hash to the v1.5.7 release', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jevbench-v16-carry-bind-'));
  try {
    for (const rel of [JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY, JEVBENCH_V157_RELEASE_ARTIFACT]) {
      const target = path.join(root, rel);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await read(rel));
    }
    const carryPath = path.join(root, JEVBENCH_V16_RELEASE_CARRY);
    const carry = JSON.parse(await readFile(carryPath, 'utf8'));
    carry.rows[0].composite_v15 += 1;
    await writeFile(carryPath, JSON.stringify(carry));
    await assert.rejects(() => readJevbenchV16Release(root), /carry source value composite_v15/);
    carry.rows[0].composite_v15 -= 1;
    carry.carried_from.sha256 = '0'.repeat(64);
    await writeFile(carryPath, JSON.stringify(carry));
    await assert.rejects(() => readJevbenchV16Release(root), /carry source release hash/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('finalizer refuses caller-supplied JSON as a release GO source', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jevbench-v16-go-'));
  try {
    const receipt = path.join(root, 'date-deferral.json');
    await writeFile(receipt, JSON.stringify({
      schema: 'jevbench-v16-release-go/v1', preview_card_id: 16238, reply_id: 16243,
      reply_text: "let's release 1.6.0 not before monday", decision: 'GO',
      received_at: '2026-10-03T12:34:51Z', results_source_sha256: '9ac0853fc8ee333f232eccc62930639eb37226198d06580ce717de8cb7cbc7ec',
    }));
    const result = spawnSync('python3', ['scripts/finalize-jevbench-v16-release.py', '--release-go-ask-id', '16238', '--release-go-receipt', receipt], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unrecognized arguments: --release-go-receipt/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('trusted notify record for reply 16243 is not an explicit GO', () => {
  const source = `import importlib.util,datetime
s=importlib.util.spec_from_file_location('finalizer','scripts/finalize-jevbench-v16-release.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
row={'ask_id':16238,'channel':'telegram','status':'acknowledged','job_dir':str(m.JOB_DIR),
 'ack_at':1791030891.0,'matched_reply_id':16243,'matched_at':1791030890.718,
 'reply_text':"let's releae 1.6.0 not before monday",'ask_text':'JevBench v1.6.0 preview card #16238 source '+m.SOURCE_SHA256}
try: m.validate_release_go_record(row,16238,datetime.datetime(2026,10,5,tzinfo=datetime.timezone.utc))
except ValueError as e: assert 'no exact GO reply' in str(e)
else: raise AssertionError('timing deferral was accepted as release GO')`;
  const result = spawnSync('python3', ['-c', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('finalizer rejects the actual authenticated date-deferral reply in notify ledger', {
  skip: !existsSync('/home/flori/.notify/reply-actions.sqlite3'),
}, () => {
  const result = spawnSync('python3', ['scripts/finalize-jevbench-v16-release.py', '--release-go-ask-id', '16238'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /trusted notification record contains no exact GO reply/);
});

test('the live and archived pages use the approved full-page route and keep version navigation', async () => {
  const live = await read('app/jev-models/page.tsx');
  const archive = await read('app/jev-models/v1.6.0/page.tsx');
  const route = await read('components/JevBenchV16ReleaseRoute.tsx');
  const board = await read('components/JevBenchV16Board.tsx');
  const charts = await read('components/JevBenchV16Charts.tsx');
  assert.match(live, /const release = await readCurrentJevbench\(\)/);
  assert.match(live, /<JevBenchV16ReleaseRoute live release=\{release\} versionPath=\{CURRENT_JEVBENCH_PAGE\} \/>/);
  assert.match(archive, /canonical: '\/jev-models\/v1\.6\.0'/);
  assert.match(route, /readJevbenchV157Release/);
  assert.match(route, /missingPrevious/);
  const current = await read('lib/jevbench-current.mjs');
  assert.match(current, /CURRENT_JEVBENCH_PAGE = '\/jev-models\/v1\.6\.0'/);
  assert.match(current, /readCurrentJevbench = readJevbenchV16Release/);
  for (const marker of ['<JevBenchV16Charts', '<JevScoreChart', '<JevCompareV15', '<LanguageView', '<NoulAndGate', '<JevV15AllDataGrid', '<DatedCarry', '<Method']) assert.ok(board.includes(marker), marker);
  assert.match(board, /aria-label="low n: fewer than 30 answered items"/);
  assert.match(board, /Not plotted; fewer than \$\{categories\.min_n\} answered items/);
  assert.match(charts, /onCapsChange/);
  assert.match(charts, /latencyCap=\{selected\.latencyLimit\}/);
  assert.match(charts, /aria-expanded=\{show3d\}/);
});

test('release routes, sitemap and charts do not expose the WIP preview route', async () => {
  const sitemap = await read('app/sitemap.ts');
  const route = await read('components/JevBenchV16ReleaseRoute.tsx');
  const nav = await read('components/JevBenchReleaseVersionNav.tsx');
  assert.match(sitemap, /"\/jev-models\/v1\.6\.0"/);
  assert.doesNotMatch(sitemap, /wip-jevbench-v16/);
  assert.doesNotMatch(route, /wip-jevbench-v16|preview-not-published|provisional/);
  assert.match(nav, /v1\.5\.6/);
});

test('v1.6.0 Jev-class caps use the frozen v1.5 Jev reference limits', async () => {
  const { jevClassRows, JEV_V16_CLASS_OPTIONS } = await import('../lib/jevbench-jev-class.mjs');
  const { jevV15BoardSystem } = await import('../lib/jevbench-v15-board.mjs');
  assert.deepEqual({ ...JEV_V16_CLASS_OPTIONS.limits }, { cost: 0.06459465517241379, latency: 1.2329566404223442 });
  const liveJev = previous.systems.find((row) => row.key === 'jev-1.13.0');
  assert.equal(liveJev.cost.usd_per_1000 * 2, JEV_V16_CLASS_OPTIONS.limits.cost);
  const systems = release.artifact.systems.map(jevV15BoardSystem);
  const view = jevClassRows(systems, JEV_V16_CLASS_OPTIONS);
  assert.equal(view.limits.cost, 0.06459465517241379);
  assert.equal(view.limits.latency, 1.2329566404223442);
  const wity = view.rows.find((r) => r.row.key === 'wity-1');
  assert.ok(wity); assert.ok(wity.latency > 1.2329566404223442); assert.equal(wity.inClass, false);
  const direct = systems.filter((s) => s.ranked && s.cost?.usd_per_1000 != null && s.cost.usd_per_1000 <= 0.06459465517241379
    && s.speed?.p50_s_adjusted != null && s.speed.p50_s_adjusted <= 1.2329566404223442);
  const eligible = view.rows.filter((r) => r.inClass && r.row.ranked && r.latencyBasis === 'p50');
  assert.equal(eligible.length, direct.length);
  assert.equal(eligible.length, 63);
  assert.deepEqual(eligible.slice(0, 5).map(r => r.row.key), ['quyet-1-0-large', 'deck31b', 'jev-1.13.0', 'torchcast-decision-12b', 'jev-omni']);
  assert.deepEqual(release.artifact.board.A.order.slice(0, 5), ['quyet-1-0-large', 'jev-1.13.0', 'wity-1', 'torchcast-decision-12b', 'deck31b']);
  for (const key of ['deck31b', 'deck-4b-v1-0']) {
    const row = release.artifact.systems.find(r => r.key === key);
    assert.ok(row?.ranked); assert.equal(row.author, 'krishna765');
    assert.match(row.repo, /^https:\/\/github.com\/krishna-gogineni-765\/deck/);
  }
});

test('Sage uses strict full-run cost, stays outside the headline cap, and discloses retired A3', () => {
  const row = release.artifact.systems.find((s) => s.key === 'sage-1.3.0');
  assert.equal(row.display, 'Sage 1.3.0 (Levanto Labs)');
  assert.equal(row.cost.usd_per_1000, 0.07664458333333334);
  assert.equal(row.scores.A, 50.07295310117218);
  assert.ok(row.cost.usd_per_1000 > 2 * 0.032297327586206896);
  assert.equal(row.v16.api_subset_tag, 'A3');
  assert.equal(row.last_measured_on, '2026-10-05');
  assert.equal(row.provenance.equating_pool_n, 15);
  assert.match(release.artifact.overnight.a2_note, /A3.*TypeSafe and Levanto.*retired/);
  assert.equal(release.artifact.overnight.exposure['sage-1.3.0'].sealed_items_exposed, 300);
  const cell = release.categories.systems['sage-1.3.0'];
  // Public P300 cells must use the release's O1S Score baseline.
  assert.deepEqual(cell.topics.coding, { n: 62, competence: 79.6 });
  assert.deepEqual(cell.languages.en, { n: 220, competence: 69.9 });
  for (const dim of ['topics', 'usecases', 'families', 'languages']) {
    assert.ok(Object.values(cell[dim]).every((c) => c.n >= 15));
    assert.ok(Object.values(cell[dim]).reduce((sum, c) => sum + c.n, 0) <= 300, dim);
  }
  assert.deepEqual(Object.keys(cell.languages), ['en']);
});
