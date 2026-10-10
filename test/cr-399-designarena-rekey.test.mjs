// CR-399 (10 Oct 2026): the 00:41 and 01:13 daily runs published nothing because DesignArena moved
// Inkling from the serving id `camellia` to `inkling`. The registry recorded the move itself
// (`camellia` active:false, `inkling` active:true for agon_webapps, same display name and provider)
// and the new row continued the old counters. These tests pin that exactly this re-key shape is
// accepted, and that every near miss still lands on the D255 review path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, cp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { findBoardRekeys } from '../lib/live-source.mjs';

const entry = (displayName, active, agents, provider = 'thinkingmachines') => ({ displayName, provider, active, openSource: true, arenas: { agents } });
const REGISTRY = {
  models: {
    keeper: entry('Keeper', true, ['agon_webapps', 'fullstack'], 'lab'),
    camellia: entry('Inkling', false, ['agon_webapps', 'agon_godot']),
    inkling: entry('Inkling', true, ['agon_webapps']),
  },
};
const row = (modelId, wins, losses, elo) => ({ modelId, wins, losses, battles: wins + losses, winRate: 48, elo, btStdErr: null, avgGenerationTimeMs: null });
const PRIOR = [row('keeper', 600, 400, 1300), row('camellia', 551, 594, 1186)];
const CURRENT = [row('keeper', 640, 420, 1302), row('inkling', 587, 620, 1189)];

test('the observed camellia -> inkling move is a re-key', () => {
  const { rekeyed, remaining } = findBoardRekeys(['camellia'], PRIOR, CURRENT, REGISTRY, 'agon_webapps');
  assert.deepEqual(remaining, []);
  assert.equal(rekeyed.length, 1);
  assert.equal(rekeyed[0].from, 'camellia');
  assert.equal(rekeyed[0].to, 'inkling');
  assert.deepEqual(rekeyed[0].prior, { wins: 551, losses: 594, battles: 1145 });
  assert.deepEqual(rekeyed[0].current, { wins: 587, losses: 620, battles: 1207 });
});

test('near misses are not re-keys', () => {
  const variants = {
    'old id still active': { ...REGISTRY.models, camellia: entry('Inkling', true, ['agon_webapps']) },
    'new id not active': { ...REGISTRY.models, inkling: entry('Inkling', false, ['agon_webapps']) },
    'new id not on this board': { ...REGISTRY.models, inkling: entry('Inkling', true, ['agon_godot']) },
    'different display name': { ...REGISTRY.models, inkling: entry('Inkling 2', true, ['agon_webapps']) },
    'different provider': { ...REGISTRY.models, inkling: entry('Inkling', true, ['agon_webapps'], 'other') },
    'old id gone from registry': { keeper: REGISTRY.models.keeper, inkling: REGISTRY.models.inkling },
  };
  for (const [label, models] of Object.entries(variants)) {
    const { rekeyed, remaining } = findBoardRekeys(['camellia'], PRIOR, CURRENT, { models }, 'agon_webapps');
    assert.equal(rekeyed.length, 0, label);
    assert.deepEqual(remaining, ['camellia'], label);
  }
  // Two equally plausible successors: ambiguous, so not a re-key.
  const twin = { models: { ...REGISTRY.models, inkling2: entry('Inkling', true, ['agon_webapps']) } };
  assert.equal(findBoardRekeys(['camellia'], PRIOR, [...CURRENT, row('inkling2', 700, 700, 1180)], twin, 'agon_webapps').rekeyed.length, 0);
  // A counter going backwards is a different row, not a continuation.
  assert.equal(findBoardRekeys(['camellia'], PRIOR, [row('keeper', 640, 420, 1302), row('inkling', 500, 620, 1189)], REGISTRY, 'agon_webapps').rekeyed.length, 0);
  // A successor that was already on the prior board is not new.
  assert.equal(findBoardRekeys(['camellia'], [...PRIOR, row('inkling', 10, 10, 1100)], CURRENT, REGISTRY, 'agon_webapps').rekeyed.length, 0);
});

/** A disposable checkout with a synthetic DesignArena, so no test touches the live source. */
async function collectorFixture({ boards, registry = REGISTRY, priorBoards }) {
  const directory = await mkdtemp(join(tmpdir(), 'bh-cr399-'));
  await cp('lib', join(directory, 'lib'), { recursive: true });
  await mkdir(join(directory, 'scripts'));
  for (const file of ['fetch-live.mjs', 'fetch-aa-efficiency.mjs']) await cp(join('scripts', file), join(directory, 'scripts', file));
  await mkdir(join(directory, 'data/raw'), { recursive: true });
  await cp('data/source-policies.json', join(directory, 'data/source-policies.json'));
  const prior = {
    source: 'fixture', collected_at: '2026-10-09', model_registry: {},
    leaderboards: Object.fromEntries(Object.entries(priorBoards).map(([key, rows]) => [key, { request: {}, data: rows }])),
  };
  await writeFile(join(directory, 'data/raw/designarena.json'), JSON.stringify(prior, null, 2) + '\n');
  const hook = join(directory, 'synthetic-fetch.mjs');
  await writeFile(hook, `const boards=${JSON.stringify(boards)};const registry=${JSON.stringify(registry)};
globalThis.fetch=async(url,opts={})=>{url=String(url);
if(url.endsWith('/api/registry'))return Response.json(registry);
const body=JSON.parse(opts.body||'{}');const rows=boards[body.category];
if(!rows)return new Response('no such board',{status:404});
return Response.json({success:true,data:rows,metadata:{lastUpdateTime:'2026-10-10T00:08:45Z',totalVotes:83965}});};`);
  const evidence = join(directory, 'evidence');
  await mkdir(evidence);
  const result = spawnSync(process.execPath, ['--import', hook, join(directory, 'scripts/fetch-live.mjs'), 'da'],
    { cwd: directory, encoding: 'utf8', timeout: 30000, env: { ...process.env, BH_EVIDENCE_DIR: evidence } });
  return { directory, evidence, result, before: JSON.stringify(prior, null, 2) + '\n' };
}

test('a recorded re-key publishes the board under the new id and leaves a receipt', async () => {
  const fixture = await collectorFixture({
    priorBoards: { frontend: PRIOR, fullstack: [row('keeper', 500, 300, 1290)] },
    boards: { agon_webapps: CURRENT, fullstack: [row('keeper', 520, 310, 1291)] },
  });
  try {
    assert.equal(fixture.result.status, 0, fixture.result.stdout + fixture.result.stderr);
    assert.match(fixture.result.stdout, /camellia re-keyed to inkling/);
    const written = JSON.parse(await readFile(join(fixture.directory, 'data/raw/designarena.json'), 'utf8'));
    assert.deepEqual(written.leaderboards.frontend.data.map((r) => r.modelId), ['keeper', 'inkling']);
    assert.equal(written.model_registry.inkling.display_name, 'Inkling');
    assert.equal(written.model_registry.camellia, undefined);
    const receipt = JSON.parse(await readFile(join(fixture.evidence, 'designarena-rekeys.json'), 'utf8'));
    assert.deepEqual(receipt.rekeys.map((r) => [r.board, r.from, r.to]), [['frontend', 'camellia', 'inkling']]);
  } finally { await rm(fixture.directory, { recursive: true, force: true }); }
});

test('a re-key beside a corroborated withdrawal still fails closed and leaves the board untouched', async () => {
  const registry = { models: { ...REGISTRY.models, retired: entry('Retired', false, ['agon_webapps'], 'lab') } };
  const fixture = await collectorFixture({
    registry,
    priorBoards: { frontend: [...PRIOR, row('retired', 100, 100, 1100)], fullstack: [row('keeper', 500, 300, 1290)] },
    boards: { agon_webapps: CURRENT, fullstack: [row('keeper', 520, 310, 1291)] },
  });
  try {
    assert.equal(fixture.result.status, 1);
    assert.match(fixture.result.stderr, /partial response or removal requiring review/);
    assert.equal(await readFile(join(fixture.directory, 'data/raw/designarena.json'), 'utf8'), fixture.before);
  } finally { await rm(fixture.directory, { recursive: true, force: true }); }
});
