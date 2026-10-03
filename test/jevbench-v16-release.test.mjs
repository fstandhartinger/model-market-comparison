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
import { JEVBENCH_V156_RELEASE_ARTIFACT } from '../lib/jevbench-v15-release.mjs';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const release = await readJevbenchV16Release();
const previous = JSON.parse(await read('data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.6-results.json'));

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

test('release route preserves every public v1.5.6 model as measured, dated carry, or not measured', () => {
  const current = keysOf([...release.artifact.systems, ...release.artifact.not_measured, ...release.carry.rows]);
  const missing = [...previous.systems, ...previous.not_measured].filter((row) => !JEVBENCH_V16_EXCLUDED_KEYS.includes(row.key) && !current.has(row.key));
  assert.deepEqual(missing, []);
  assert.equal(release.artifact.roster_count, release.artifact.systems.length + release.artifact.not_measured.length);
  for (const key of ['jobe-qwen3.5-4b', 'mica-v01-4b', 'openjev-razorback16']) {
    assert.ok(release.artifact.not_measured.some((row) => row.key === key), `${key} stays visible without an official score`);
  }
});

test('Vansa stays separately dated from v1.5.6 under the API exposure cadence', () => {
  const row = release.carry.rows.find((entry) => entry.key === 'vansa-3.4');
  assert.ok(row);
  assert.equal(row.measured_revision, 'v1.5.6');
  assert.equal(row.v156_rank, 5);
  assert.equal(row.api_flag, true);
  assert.match(row.note, /three-refresh exposure cadence/);
  assert.ok(release.artifact.not_measured.some((entry) => entry.key === 'vansa-3.4'));
  assert.equal(release.carry.carried_from.revision, 'v1.5.6');
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
    for (const rel of [JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY, JEVBENCH_V156_RELEASE_ARTIFACT]) {
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

test('loader binds every dated carry value and source hash to the v1.5.6 release', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jevbench-v16-carry-bind-'));
  try {
    for (const rel of [JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES, JEVBENCH_V16_RELEASE_CARRY, JEVBENCH_V156_RELEASE_ARTIFACT]) {
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
  assert.match(route, /readJevbenchV156Release/);
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
