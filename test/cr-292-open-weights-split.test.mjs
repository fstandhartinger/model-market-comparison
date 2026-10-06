import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import {
  JEV_REFERENCE_KEY, JEV_SCOPE_LISTING, isJevApiOffering, jevApiOfferingKeys, jevbenchScopeArtifact, jevbenchScopeCarry, jevRowScope, jevScopeClassifier,
} from '../lib/jevbench-scope.mjs';

// CR-292 (Florian, 5 Oct 2026): /jev-models = open weights + Jev reference + "Show API offerings";
// /jev-models/api = API-provider leaderboard. Scores never change; ranks are the published order per scope.

const load = async () => {
  const release = await readCurrentJevbench();
  const previous = await readJevbenchV157Release();
  const isApi = jevScopeClassifier(release.artifact.systems, release.carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  return { release, isApi };
};

test('the API rule follows the measurement lane, flag or hosted endpoint', () => {
  assert.equal(isJevApiOffering({ key: 'x', v16: { lane: 'api' } }), true);
  assert.equal(isJevApiOffering({ key: 'x', v16: { lane: 'selfhosted' }, api_flag: true }), false);
  assert.equal(isJevApiOffering({ key: 'x', api_flag: true }), true);
  assert.equal(isJevApiOffering({ key: 'x', endpoint_kind: 'demo' }), true);
  assert.equal(isJevApiOffering({ key: 'x', endpoint_kind: 'gpu', api_flag: false }), false);
  assert.equal(jevRowScope({ key: JEV_REFERENCE_KEY, v16: { lane: 'api' } }), 'reference');
});

test('open scope: every system stays, API offerings and Jev are unranked, open weights re-numbered without gaps', async () => {
  const { release, isApi } = await load();
  const a = release.artifact;
  const open = jevbenchScopeArtifact(a, 'open', isApi);
  assert.equal(open.systems.length, a.systems.length);
  const ranked = open.systems.filter((s) => s.ranked).sort((x, y) => x.rank - y.rank);
  assert.ok(ranked.every((s) => s.v16.lane === 'selfhosted'));
  assert.deepEqual(ranked.map((s) => s.rank), ranked.map((_, i) => i + 1));
  assert.equal(open.n_ranked, ranked.length);
  assert.deepEqual(open.board[a.headline].order, ranked.map((s) => s.key));
  const jev = open.systems.find((s) => s.key === JEV_REFERENCE_KEY);
  assert.equal(jev.ranked, false);
  assert.equal(jev.listing, JEV_SCOPE_LISTING.reference);
  for (const s of open.systems.filter((s) => s.v16.lane === 'api' && s.key !== JEV_REFERENCE_KEY && a.systems.find((o) => o.key === s.key).ranked)) {
    assert.equal(s.listing, JEV_SCOPE_LISTING.api, s.key);
    assert.equal(s.rank, null, s.key);
  }
  // Scores are untouched.
  for (const s of open.systems) assert.equal(s.jevbench_score, a.systems.find((o) => o.key === s.key).jevbench_score);
  // Relative order of the open-weights systems is the published one.
  const published = a.board[a.headline].order.filter((k) => ranked.some((s) => s.key === k));
  assert.deepEqual(open.board[a.headline].order, published);
});

test('api scope: only hosted offerings plus Jev, ranked among themselves', async () => {
  const { release, isApi } = await load();
  const api = jevbenchScopeArtifact(release.artifact, 'api', isApi);
  assert.ok(api.systems.length > 0);
  assert.ok(api.systems.every((s) => s.v16.lane === 'api'));
  assert.ok(api.systems.some((s) => s.key === JEV_REFERENCE_KEY && s.ranked));
  const ranked = api.systems.filter((s) => s.ranked).sort((x, y) => x.rank - y.rank);
  assert.deepEqual(ranked.map((s) => s.rank), ranked.map((_, i) => i + 1));
  assert.ok(api.not_measured.every((r) => isApi(r)));
  const carry = jevbenchScopeCarry(release.carry, 'api', isApi);
  assert.ok(carry.rows.length > 0 && carry.rows.every((r) => isApi(r)));
  assert.equal(jevbenchScopeArtifact(release.artifact, 'all', isApi), release.artifact);
});

test('toggle keys cover every API row once and never the Jev reference', async () => {
  const { release, isApi } = await load();
  const keys = jevApiOfferingKeys([...release.artifact.systems, ...release.artifact.not_measured, ...release.carry.rows], isApi);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes(JEV_REFERENCE_KEY));
  for (const k of ['wity-1', 'sage-1.3.0', 'fastino-gliner-2-5-decide', 'vansa-3.4']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('quyet-1-0-large'));
});

test('pages: /jev-models keeps its canonical and renders the open scope; /jev-models/api has its own canonical; sitemap and llms.txt list it', () => {
  const live = readFileSync('app/jev-models/page.tsx', 'utf8');
  assert.match(live, /canonical: '\/jev-models'/);
  assert.match(live, /scope="open"/);
  const api = readFileSync('app/jev-models/api/page.tsx', 'utf8');
  assert.match(api, /canonical: '\/jev-models\/api'/);
  assert.match(api, /scope="api"/);
  assert.match(readFileSync('app/sitemap.ts', 'utf8'), /"\/jev-models\/api"/);
  assert.match(readFileSync('app/llms.txt/route.ts', 'utf8'), /\/jev-models\/api/);
  const toggle = readFileSync('components/JevApiOfferingsToggle.tsx', 'utf8');
  assert.doesNotMatch(toggle, /searchParams|history\.(push|replace)State|location\.hash/, 'the toggle is UI state only');
  assert.match(readFileSync('components/JevBenchV16Board.tsx', 'utf8'), /v1\.7\.0/);
});

test('CR-292: the main board says in one line that Jev is the only API model kept, as the reference (#10601)', () => {
  const route = readFileSync('components/JevBenchV16ReleaseRoute.tsx', 'utf8');
  assert.match(route, /Jev 1\.13\.0<\/b> \(TypeSafe\) is the only API model kept on this board, as the unranked reference row/);
});

test('CR-292: the API toggle pill never shrinks on narrow screens', () => {
  const src = readFileSync('components/JevApiOfferingsToggle.tsx', 'utf8');
  assert.match(src, /relative inline-block h-5 w-9 shrink-0 rounded-full/);
});
