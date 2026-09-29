// D255 (29 Sep 2026): the 00:41 run published nothing because two rows vanished from the two
// DesignArena agentic boards while the source's own registry still served them as active for those
// categories. `assertIdentityCoverage` cannot tell a withdrawal from a partial response — but for a
// board that ships its own model registry, the source's record of itself decides. These tests pin
// both directions: the contradicted case is withheld and everything else publishes; a corroborated
// withdrawal, a malformed response and a tampered sidecar still fail the run closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, cp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { BOARD_REGISTRY_INCONSISTENT, absentIdentities, classifyBoardAbsence } from '../lib/live-source.mjs';
import { readDesignArenaInconsistency } from '../ops/daily/daily.mjs';

const REGISTRY = {
  models: {
    keeper: { displayName: 'Keeper', provider: 'lab', active: true, openSource: false, arenas: { agents: ['agon_webapps'] } },
    // Absent from the board, yet still served as active for this category: the source contradicts itself.
    vanished: { displayName: 'Vanished 1.0', provider: 'lab', active: true, openSource: false, arenas: { agents: ['agon_webapps', 'fullstack'] } },
    // A retirement the source records in its own registry.
    retired: { displayName: 'Retired 1.0', provider: 'lab', active: false, openSource: false, arenas: { agents: ['agon_webapps'] } },
    // Still active, but no longer offered for this board.
    moved: { displayName: 'Moved 1.0', provider: 'lab', active: true, openSource: false, arenas: { agents: ['fullstack'] } },
  },
};

test('an absent row is classified against the source registry, not guessed', () => {
  const missing = absentIdentities([{ modelId: 'keeper' }, { modelId: 'vanished' }], [{ modelId: 'keeper' }], (r) => r.modelId);
  assert.deepEqual(missing, ['vanished']);

  const contradicted = classifyBoardAbsence(['vanished'], REGISTRY, 'agon_webapps');
  assert.deepEqual(contradicted.contradicted.map((c) => c.id), ['vanished']);
  assert.equal(contradicted.corroborated.length, 0);

  // Every other shape is a withdrawal the collector still refuses on its own and hands to review.
  for (const id of ['retired', 'moved', 'never-heard-of-it']) {
    const classified = classifyBoardAbsence([id], REGISTRY, 'agon_webapps');
    assert.equal(classified.contradicted.length, 0, id);
    assert.deepEqual(classified.corroborated.map((c) => c.id), [id]);
  }
  // A registry that lists the category under `models` rather than `agents` still corroborates presence.
  assert.equal(classifyBoardAbsence(['x'], { models: { x: { active: true, arenas: { models: ['website'] } } } }, 'website').contradicted.length, 1);
});

/** A disposable checkout with a synthetic DesignArena, so no test touches the live source. */
async function collectorFixture({ boards, registry = REGISTRY, priorBoards }) {
  const directory = await mkdtemp(join(tmpdir(), 'bh-d255-'));
  await cp('lib', join(directory, 'lib'), { recursive: true });
  await mkdir(join(directory, 'scripts'));
  for (const file of ['fetch-live.mjs', 'fetch-aa-efficiency.mjs']) await cp(join('scripts', file), join(directory, 'scripts', file));
  await mkdir(join(directory, 'data/raw'), { recursive: true });
  await cp('data/source-policies.json', join(directory, 'data/source-policies.json'));
  const prior = {
    source: 'fixture', collected_at: '2026-09-28', model_registry: {},
    leaderboards: Object.fromEntries(Object.entries(priorBoards).map(([key, rows]) => [key, { request: {}, data: rows }])),
  };
  await writeFile(join(directory, 'data/raw/designarena.json'), JSON.stringify(prior, null, 2) + '\n');
  const hook = join(directory, 'synthetic-fetch.mjs');
  await writeFile(hook, `const boards=${JSON.stringify(boards)};const registry=${JSON.stringify(registry)};
globalThis.fetch=async(url,opts={})=>{url=String(url);
if(url.endsWith('/api/registry'))return Response.json(registry);
const body=JSON.parse(opts.body||'{}');const rows=boards[body.category];
if(!rows)return new Response('no such board',{status:404});
return Response.json({success:true,data:rows,metadata:{lastUpdateTime:'2026-09-29T00:47:36Z',totalVotes:79970}});};`);
  const evidence = join(directory, 'evidence');
  await mkdir(evidence);
  const result = spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'da'],
    { cwd: directory, encoding: 'utf8', timeout: 30000, env: { ...process.env, BH_EVIDENCE_DIR: evidence } });
  return { directory, evidence, result, before: JSON.stringify(prior, null, 2) + '\n' };
}

const row = (id, elo, battles) => ({ modelId: id, wins: Math.round(battles / 2), losses: battles - Math.round(battles / 2), winRate: 50, elo, battles, btStdErr: 8.1, avgGenerationTimeMs: null });

test('a board contradicting the source registry is withheld with a sidecar, and the published board is untouched', async () => {
  const fixture = await collectorFixture({
    priorBoards: { frontend: [row('keeper', 1300, 900), row('vanished', 1325, 1005)], fullstack: [row('keeper', 1290, 800), row('vanished', 1310, 541)] },
    boards: { agon_webapps: [row('keeper', 1305, 700)], fullstack: [row('keeper', 1295, 640)] },
  });
  try {
    assert.equal(fixture.result.status, 1, fixture.result.stdout + fixture.result.stderr);
    assert.match(fixture.result.stderr, new RegExp(BOARD_REGISTRY_INCONSISTENT));
    assert.match(fixture.result.stderr, /frontend:vanished/);
    // The snapshot is written atomically at the end, so the previously published board survives byte-for-byte.
    assert.equal(await readFile(join(fixture.directory, 'data/raw/designarena.json'), 'utf8'), fixture.before);

    const record = JSON.parse(await readFile(join(fixture.evidence, 'designarena-board-inconsistency.json'), 'utf8'));
    assert.equal(record.determination, BOARD_REGISTRY_INCONSISTENT);
    assert.equal(record.retained_collected_at, '2026-09-28');
    assert.deepEqual(record.boards.map((b) => b.board), ['frontend', 'fullstack']);
    assert.deepEqual(record.boards[0].contradicted.map((c) => c.id), ['vanished']);
    assert.equal(record.boards[0].prior_count, 2);
    assert.equal(record.boards[0].current_count, 1);
  } finally { await rm(fixture.directory, { recursive: true, force: true }); }
});

test('a withdrawal the registry corroborates still fails closed with no sidecar', async () => {
  const fixture = await collectorFixture({
    priorBoards: { frontend: [row('keeper', 1300, 900), row('retired', 1200, 500)], fullstack: [row('keeper', 1290, 800)] },
    boards: { agon_webapps: [row('keeper', 1305, 700)], fullstack: [row('keeper', 1295, 640)] },
  });
  try {
    assert.equal(fixture.result.status, 1);
    assert.match(fixture.result.stderr, /partial response or removal requiring review/);
    assert.doesNotMatch(fixture.result.stderr, new RegExp(BOARD_REGISTRY_INCONSISTENT));
    assert.equal(await readFile(join(fixture.evidence, 'designarena-board-inconsistency.json'), 'utf8').catch(() => null), null);
  } finally { await rm(fixture.directory, { recursive: true, force: true }); }
});

test('one corroborated withdrawal beside a contradicted one keeps the whole capture on the review path', async () => {
  const fixture = await collectorFixture({
    priorBoards: { frontend: [row('keeper', 1300, 900), row('vanished', 1325, 1005), row('retired', 1200, 500)], fullstack: [row('keeper', 1290, 800)] },
    boards: { agon_webapps: [row('keeper', 1305, 700)], fullstack: [row('keeper', 1295, 640)] },
  });
  try {
    assert.equal(fixture.result.status, 1);
    assert.doesNotMatch(fixture.result.stderr, new RegExp(BOARD_REGISTRY_INCONSISTENT));
  } finally { await rm(fixture.directory, { recursive: true, force: true }); }
});

test('an unchanged board still publishes normally', async () => {
  const fixture = await collectorFixture({
    priorBoards: { frontend: [row('keeper', 1300, 900)], fullstack: [row('keeper', 1290, 800)] },
    boards: { agon_webapps: [row('keeper', 1305, 700)], fullstack: [row('keeper', 1295, 640)] },
  });
  try {
    assert.equal(fixture.result.status, 0, fixture.result.stdout + fixture.result.stderr);
    const written = JSON.parse(await readFile(join(fixture.directory, 'data/raw/designarena.json'), 'utf8'));
    assert.equal(written.collected_at, new Date().toISOString().slice(0, 10));
    assert.equal(written.leaderboards.frontend.data[0].elo, 1305);
    assert.equal(written.model_registry.keeper.display_name, 'Keeper');
  } finally { await rm(fixture.directory, { recursive: true, force: true }); }
});

// The daily's half of the contract: three things must hold together or the run fails closed.
test('the daily withholds only on the marker, its own sidecar, and an unchanged board file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-d255-daily-'));
  try {
    const sourcesDir = join(directory, 'sources'), work = join(directory, 'work'), runDir = directory;
    await mkdir(join(work, 'data/raw'), { recursive: true });
    await mkdir(join(runDir, 'before/raw'), { recursive: true });
    await mkdir(sourcesDir, { recursive: true });
    const published = '{"collected_at":"2026-09-28"}\n';
    await writeFile(join(runDir, 'before/raw/designarena.json'), published);
    await writeFile(join(work, 'data/raw/designarena.json'), published);
    const record = {
      source: 'designarena', determination: BOARD_REGISTRY_INCONSISTENT, retained_collected_at: '2026-09-28',
      boards: [{ board: 'frontend', category: 'agon_webapps', contradicted: [{ id: 'vanished', active: true }] }],
    };
    await writeFile(join(sourcesDir, 'designarena-board-inconsistency.json'), JSON.stringify(record));
    const error = new Error(`fetch-da FAILED: ${BOARD_REGISTRY_INCONSISTENT} DesignArena: frontend:vanished absent …`);

    const retained = await readDesignArenaInconsistency({ sourcesDir, runDir, work, error });
    assert.ok(retained, 'the reviewed determination is recognised');
    assert.match(retained.reason, /frontend:vanished/);
    assert.match(retained.reason, /2026-09-28/);

    // Any other failure of the same step is not this determination.
    assert.equal(await readDesignArenaInconsistency({ sourcesDir, runDir, work, error: new Error('fetch-da FAILED: HTTP 503') }), null);
    // A sidecar without a contradicted identity proves nothing.
    await writeFile(join(sourcesDir, 'designarena-board-inconsistency.json'), JSON.stringify({ ...record, boards: [{ board: 'frontend', contradicted: [] }] }));
    assert.equal(await readDesignArenaInconsistency({ sourcesDir, runDir, work, error }), null);
    await writeFile(join(sourcesDir, 'designarena-board-inconsistency.json'), JSON.stringify(record));
    // The decisive check: if today's capture did land, it is not a withheld capture.
    await writeFile(join(work, 'data/raw/designarena.json'), '{"collected_at":"2026-09-29"}\n');
    assert.equal(await readDesignArenaInconsistency({ sourcesDir, runDir, work, error }), null);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
