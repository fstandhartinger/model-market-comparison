// D255.2 (2026-09-29): D255 let the collector withhold a DesignArena capture that contradicts the
// source's own registry and keep the previously published board. The 2026-09-29 02:18 dry run showed
// the daily still died afterwards, at the live review: that phase re-derives every staged raw file
// from this run's capture, and a withheld board is deliberately yesterday's — `live-review: da
// frontend leaderboard rows mismatch`. The 05:17 run would have lost its second whole day to the
// same two rows, which is exactly what D255 exists to prevent.
//
// These tests pin the withheld path as a *proof*, not a bypass:
//   * the withholding is re-derived from the captured board and registry bytes, not read off the
//     collector's sidecar;
//   * one absence the registry corroborates is a withdrawal and still fails closed;
//   * a withheld board must equal the snapshot the run started from, byte for byte, with its own
//     older date — a withheld source may not contribute one new value and may not claim freshness;
//   * no board without a determination takes the withheld path at all.
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWithheldDa } from '../ops/daily/review-live.mjs';
import { BOARD_REGISTRY_INCONSISTENT } from '../lib/live-source.mjs';

const RUN_START = '2026-09-29T02:18:30.000Z';
const row = (modelId, elo) => ({ modelId, elo, battles: 100 });
const REQUEST = { arenaType: 'agents', category: 'agon_webapps', variationName: 'public' };

const publishedBoard = () => ({
  source: 'designarena',
  collected_at: '2026-09-28',
  model_registry: {},
  leaderboards: { frontend: { request: REQUEST, data: [row('gpt-6-astra', 1325), row('kimi-k3', 1300), row('qwen3.8-max', 1296)] } },
});

const registry = (overrides = {}) => ({
  models: {
    'gpt-6-astra': { displayName: 'GPT-6 Astra', active: true, arenas: { agents: ['agon_webapps'] } },
    'kimi-k3': { displayName: 'Kimi K3', active: true, arenas: { agents: ['agon_webapps'] } },
    'qwen3.8-max': { displayName: 'Qwen3.8 Max', active: true, arenas: { agents: ['agon_webapps'] } },
    ...overrides,
  },
});

const determination = (contradicted = ['gpt-6-astra'], extra = {}) => ({
  source: 'designarena',
  determination: BOARD_REGISTRY_INCONSISTENT,
  determined_at: '2026-09-29T02:18:51.280Z',
  retained_collected_at: '2026-09-28',
  boards: [{
    board: 'frontend', category: 'agon_webapps', prior_count: 3, current_count: 3 - contradicted.length,
    contradicted: contradicted.map((id) => ({ id, active: true, category: 'agon_webapps' })),
  }],
  ...extra,
});

/** A run directory with the two files the withheld path reads, plus a stubbed capture receipt. */
async function scene(t, { sidecar = determination(), published = publishedBoard(), capturedIds = ['qwen3.8-max'], reg = registry() } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'd255-2-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'sources'), { recursive: true });
  await mkdir(join(dir, 'before', 'raw'), { recursive: true });
  if (sidecar) await writeFile(join(dir, 'sources', 'designarena-board-inconsistency.json'), JSON.stringify(sidecar));
  await writeFile(join(dir, 'before', 'raw', 'designarena.json'), JSON.stringify(published));
  const captured = published.leaderboards.frontend.data.filter((r) => capturedIds.includes(r.modelId));
  const src = {
    runDir: dir,
    beforeDir: join(dir, 'before', 'raw'),
    requirePost: () => ({ url: 'https://www.designarena.ai/api/leaderboard', sha256: 'a'.repeat(64), fetched_at: RUN_START, body: JSON.stringify({ data: captured }) }),
  };
  return { dir, src, reg };
}

test('a withheld board is accepted only after the capture itself shows the contradiction', async (t) => {
  const { src, reg } = await scene(t, { sidecar: determination(['gpt-6-astra', 'kimi-k3']), capturedIds: ['qwen3.8-max'] });
  const result = await verifyWithheldDa({ staged: publishedBoard(), src, runStart: RUN_START, registryBody: reg });
  assert.equal(result.retained_collected_at, '2026-09-28');
  assert.deepEqual(result.boards.map((b) => b.board), ['frontend']);
  assert.deepEqual(result.boards[0].contradicted, ['gpt-6-astra', 'kimi-k3']);
  assert.equal(result.boards[0].retained_rows, 3);
  assert.equal(result.boards[0].source_rows, 1);
});

test('with no determination the withheld path is not taken at all', async (t) => {
  const { src, reg } = await scene(t, { sidecar: null });
  assert.equal(await verifyWithheldDa({ staged: publishedBoard(), src, runStart: RUN_START, registryBody: reg }), null);
});

test('a determination for another source or another finding is ignored', async (t) => {
  for (const sidecar of [{ ...determination(), source: 'epoch_eci' }, { ...determination(), determination: 'SOMETHING_ELSE' }]) {
    const { src, reg } = await scene(t, { sidecar });
    assert.equal(await verifyWithheldDa({ staged: publishedBoard(), src, runStart: RUN_START, registryBody: reg }), null);
  }
});

test('an absence the registry corroborates is a withdrawal and still fails closed', async (t) => {
  for (const [why, models] of [
    ['inactive', { 'gpt-6-astra': { active: false, arenas: { agents: ['agon_webapps'] } } }],
    ['dropped category', { 'gpt-6-astra': { active: true, arenas: { agents: ['fullstack'] } } }],
    ['gone from the registry', { 'gpt-6-astra': undefined }],
  ]) {
    const reg = registry(models);
    if (models['gpt-6-astra'] === undefined) delete reg.models['gpt-6-astra'];
    const { src } = await scene(t, { sidecar: determination(['gpt-6-astra']) });
    await assert.rejects(
      verifyWithheldDa({ staged: publishedBoard(), src, runStart: RUN_START, registryBody: reg }),
      /corroborates 1 absent identity/, `${why} must not be withheld`);
  }
});

test('a withheld board that differs from the published snapshot by one value fails closed', async (t) => {
  const { src, reg } = await scene(t);
  const edited = publishedBoard();
  edited.leaderboards.frontend.data[2].elo = 1297;
  await assert.rejects(verifyWithheldDa({ staged: edited, src, runStart: RUN_START, registryBody: reg }),
    /equals the snapshot this run started from/);
});

test('a withheld board redated to this run\'s day fails closed', async (t) => {
  // DesignArena's collected_at is a bare day, so it parses to midnight and assertRetainedDate alone
  // could never catch a same-day redate. Equality with the snapshot the run started from is what
  // actually binds it, and it catches the date as it catches any other byte.
  const { src, reg } = await scene(t, { sidecar: determination(['gpt-6-astra']), capturedIds: ['kimi-k3', 'qwen3.8-max'] });
  const staged = { ...publishedBoard(), collected_at: RUN_START.slice(0, 10) };
  await assert.rejects(verifyWithheldDa({ staged, src, runStart: RUN_START, registryBody: reg }),
    /equals the snapshot this run started from/);
});

test('a determination that names an identity the capture still shows fails closed', async (t) => {
  // `kimi-k3` is in the capture, so claiming it absent is an overclaim the bytes contradict.
  const { src, reg } = await scene(t, { sidecar: determination(['gpt-6-astra', 'kimi-k3']), capturedIds: ['kimi-k3', 'qwen3.8-max'] });
  await assert.rejects(verifyWithheldDa({ staged: publishedBoard(), src, runStart: RUN_START, registryBody: reg }),
    /withheld contradicted identities/);
});

test('a board with absences that the determination does not name fails closed', async (t) => {
  const published = publishedBoard();
  published.leaderboards.fullstack = { request: { ...REQUEST, category: 'fullstack' }, data: [row('gpt-6-sol', 1300)] };
  const { src, reg } = await scene(t, { published, sidecar: determination(['gpt-6-astra']), capturedIds: ['kimi-k3', 'qwen3.8-max'] });
  reg.models['gpt-6-sol'] = { active: true, arenas: { agents: ['fullstack'] } };
  // The stub returns the same (frontend) capture for every board, so `fullstack`'s row reads absent.
  await assert.rejects(verifyWithheldDa({ staged: published, src, runStart: RUN_START, registryBody: reg }),
    /the determination does not name/);
});

test('a determination naming a board whose capture is complete fails closed', async (t) => {
  const { src, reg } = await scene(t, { sidecar: determination(['gpt-6-astra']), capturedIds: ['gpt-6-astra', 'kimi-k3', 'qwen3.8-max'] });
  await assert.rejects(verifyWithheldDa({ staged: publishedBoard(), src, runStart: RUN_START, registryBody: reg }),
    /capture has every staged identity/);
});

test('the review names the withholding in its report, retained block and limitations', () => {
  const source = readFileSync(new URL('../ops/daily/review-live.mjs', import.meta.url), 'utf8');
  assert.match(source, /designarena_board: report\.datasets\.da\?\.withheld \?\? null/);
  assert.match(source, /if \(withheld\) return \{ da: \{ withheld \} \};/);
  assert.match(source, /A withheld DesignArena board \(retained\.designarena_board\) stages no new byte/);
});
