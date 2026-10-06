import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  readJevbenchV161Release, readJevbenchV162Release, JEVBENCH_V161_RELEASE_RESULTS, JEVBENCH_V161_RELEASE_CATEGORIES,
  JEVBENCH_V162_RELEASE_RESULTS, JEVBENCH_V162_RELEASE_CATEGORIES, JEVBENCH_V162_RELEASE_CARRY, JEVBENCH_V16_RELEASE_CARRY,
  JEVBENCH_V16_EXCLUDED_KEYS, mentionsPrivateSystem,
} from '../lib/jevbench-v16-release.mjs';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from '../lib/jevbench-current.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { jevApiOfferingKeys, jevbenchScopeArtifact, jevScopeClassifier } from '../lib/jevbench-scope.mjs';

// v1.6.2 (6 Oct 2026): v1.6.1 plus one new hosted-API row, Liquid AI d1, measured on the full set under the v1.6.1 rules.
const D1 = 'liquid-d1';
const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const v162 = await readJevbenchV162Release();
const v161 = await readJevbenchV161Release();
const a = v162.artifact;
const d1 = a.systems.find((s) => s.key === D1);

test('v1.6.2 is the live release; v1.6.1 stays reachable and its files are unchanged', async () => {
  assert.equal(CURRENT_JEVBENCH_PAGE, '/jev-models/v1.6.2');
  assert.equal((await readCurrentJevbench()).artifact.revision, 'v1.6.2');
  assert.equal(v161.artifact.revision, 'v1.6.1');
  assert.equal(JEVBENCH_V162_RELEASE_CARRY, JEVBENCH_V16_RELEASE_CARRY, 'the dated-carry file is shared and unchanged');
  assert.equal(sha(await read(JEVBENCH_V161_RELEASE_RESULTS)), '5d4567d5e5acd945d17dd082adbbd6188d38174ca523b0fa6b3b02c6cc2dc5b1', 'v1.6.1 results keep the bytes merged in PR #161 (b5638d00)');
  assert.equal(sha(await read(JEVBENCH_V161_RELEASE_CATEGORIES)), 'db333c130a7b16beae0aacc153d3dd69cf8e54f277e790dad41769208570d6db', 'v1.6.1 categories keep the bytes merged in PR #161');
  assert.match(await read('app/api/jevbench/v1.6.1/route.ts'), /readJevbenchV161Release/);
  assert.match(await read('app/api/jevbench/v1.6.2/route.ts'), /readJevbenchV162Release/);
  assert.match(await read('app/jev-models/v1.6.1/page.tsx'), /canonical: '\/jev-models\/v1\.6\.1'/);
  assert.match(await read('app/jev-models/v1.6.2/page.tsx'), /canonical: '\/jev-models\/v1\.6\.2'/);
  assert.match(await read('app/sitemap.ts'), /"\/jev-models\/v1\.6\.1", "\/jev-models\/v1\.6\.2"/);
  const nav = await read('components/JevBenchReleaseVersionNav.tsx');
  assert.match(nav, /version: 'v1\.6\.2', href: '\/jev-models'/);
  assert.match(nav, /version: 'v1\.6\.1', href: '\/jev-models\/v1\.6\.1'/);
  const { feed } = await readJevbenchAgentFeed();
  assert.equal(feed.revision, 'v1.6.2');
  assert.equal(feed.source.artifact, '/api/jevbench/v1.6.2');
  assert.equal(feed.source.frozen_page, '/jev-models/v1.6.2');
});

test('every v1.6.1 row is unchanged except ranks; only liquid-d1 is new', () => {
  const old = new Map(v161.artifact.systems.map((s) => [s.key, s]));
  assert.deepEqual(a.systems.map((s) => s.key).filter((k) => !old.has(k)), [D1]);
  assert.equal(a.systems.length, v161.artifact.systems.length + 1);
  assert.equal(a.roster_count, v161.artifact.roster_count + 1);
  assert.equal(a.n_ranked, v161.artifact.n_ranked + 1);
  assert.deepEqual(a.not_measured, v161.artifact.not_measured);
  for (const s of a.systems) {
    if (s.key === D1) continue;
    const o = old.get(s.key);
    for (const f of Object.keys(o).filter((f) => !['rank', 'ranks'].includes(f))) assert.deepEqual(s[f], o[f], `${s.key}.${f}`);
  }
  for (const f of ['G_med', 'options', 'tier_weights', 'types', 'headline']) assert.deepEqual(a[f], v161.artifact[f], f);
  for (const [k, cells] of Object.entries(v161.categories.systems)) assert.deepEqual(v162.categories.systems[k], cells, k);
  assert.deepEqual(Object.keys(v162.categories.systems).filter((k) => !(k in v161.categories.systems)), [D1]);
});

test('liquid-d1: hosted API on the full set, tariff cost on the common basis, real category cells', () => {
  assert.ok(d1);
  assert.equal(d1.display, 'd1 (Liquid AI)');
  assert.equal(d1.author, 'Liquid AI');
  assert.equal(d1.v16.lane, 'api');
  assert.equal(d1.v16.full_set_api, true);
  assert.equal(d1.status.rows, 1500);
  assert.ok(!d1.v16.equated && !d1.v16.api_subset && !d1.v16.api_subset_tag && !d1.v16.equating_offset);
  assert.equal(d1.ranked, true);
  assert.equal(d1.open, 'no');
  assert.equal(d1.licence, 'proprietary hosted API');
  assert.equal(d1.class, 'decision-api');
  assert.equal(d1.repo, 'https://www.liquid.ai/blog/d1-decision-model');
  assert.match(d1.model_pin, /model id "d1"/);
  assert.match(d1.endpoint_condition, /https:\/\/api\.liquid\.ai\/decisions\/v1\/systemone/);
  assert.match(d1.endpoint_condition, /context 65,536/);
  assert.equal(d1.measured_in, 'v1.6.2');
  assert.equal(d1.last_measured_on, '2026-10-06');
  assert.match(d1.cost.basis, /USD 0\.04 per 1M input tokens, no output tokens/);
  assert.match(d1.cost.basis, /https:\/\/vercel\.com\/ai-gateway\/models\/d1/);
  assert.equal(d1.cost.common_basis.n_items, 1477);
  assert.ok(Math.abs(d1.cost.usd_per_1000 - 0.0173) < 0.00005);
  assert.ok(a.v16.full_set_api_rows.includes(D1));
  assert.equal(a.overnight.exposure[D1].sealed_items_exposed, 1200);
  const cells = v162.categories.systems[D1];
  assert.equal(v162.categories.lanes[D1], 'api');
  for (const dim of ['topics', 'usecases', 'families', 'languages']) assert.ok(Object.keys(cells[dim]).length >= 3, dim);
  assert.ok(Object.keys(cells.topics).length >= 6, 'radar has real topic values');
  assert.ok(cells.languages.en.n > 1000, 'language cells come from the full set');
  const view = jevbenchCategoryView('v1.6.2', [D1, 'jev-1.13.0']);
  assert.equal(view.revision, 'v1.6.2');
  assert.ok(view.systems[D1] && view.systems['jev-1.13.0']);
});

test('liquid-d1 is on the API leaderboard and not on the open-weights main board', async () => {
  const previous = await readJevbenchV157Release();
  const isApi = jevScopeClassifier(a.systems, v162.carry.rows, previous.artifact.systems, previous.artifact.not_measured);
  const api = jevbenchScopeArtifact(a, 'api', isApi);
  const apiRow = api.systems.find((s) => s.key === D1);
  assert.ok(apiRow?.ranked, 'ranked on /jev-models/api');
  assert.ok(api.board[a.headline].order.includes(D1));
  const open = jevbenchScopeArtifact(a, 'open', isApi);
  const openRow = open.systems.find((s) => s.key === D1);
  assert.equal(openRow.ranked, false);
  assert.equal(openRow.rank, null);
  assert.equal(openRow.listing, 'api_offering');
  for (const o of Object.keys(open.board)) assert.ok(!open.board[o].order.includes(D1), `not in open board ${o}`);
  const hidden = jevApiOfferingKeys([...a.systems, ...a.not_measured, ...v162.carry.rows], isApi);
  assert.ok(hidden.includes(D1), 'hidden on the main board until "Show API offerings" is on');
  const arch = JSON.parse(await read('data/jevbench-architecture.json'));
  assert.equal(arch.benchmarks.jevbench[D1].arch, 'closed-api');
  assert.equal(arch.benchmarks.jevbench[D1].evidence[0].url, 'https://www.liquid.ai/blog/d1-decision-model');
});

test('ranks and board orders are recomputed on the published roster', () => {
  const ranked = a.systems.filter((s) => s.ranked);
  for (const o of ['A', 'B', 'C']) {
    const order = [...ranked].sort((x, y) => y.scores[o] - x.scores[o] || x.key.localeCompare(y.key)).map((s) => s.key);
    assert.deepEqual(a.board[o].order, order, o);
    for (const s of ranked) assert.equal(s.ranks[o], order.indexOf(s.key) + 1, `${s.key}.${o}`);
  }
  const cap = [...ranked].sort((x, y) => y.capability - x.capability || x.key.localeCompare(y.key)).map((s) => s.key);
  for (const s of ranked) assert.equal(s.ranks.capability, cap.indexOf(s.key) + 1, `${s.key}.capability`);
});

test('amendment, revision history and safety scans', async () => {
  const last = a.amendments.at(-1);
  assert.equal(last.revision, 'v1.6.2');
  assert.equal(last.date, '2026-10-06');
  assert.equal(last.text, "6 Oct 2026, v1.6.2: Liquid AI d1 added at Florian's request; hosted API measured on the full set under the v1.6.1 rules (full set + common cost basis); no other row changed.");
  assert.deepEqual(a.amendments.slice(0, -1), v161.artifact.amendments);
  assert.deepEqual(a.revision_history.map((r) => r.revision), ['v1.6.2', 'v1.6.1', 'v1.6.0']);
  for (const file of [JEVBENCH_V162_RELEASE_RESULTS, JEVBENCH_V162_RELEASE_CATEGORIES]) {
    const text = await read(file);
    for (const key of [...JEVBENCH_V16_EXCLUDED_KEYS, 'drex-v1.5', 'decider-12b', 'decider-12b-v1', 'h2o-lightning-4b', 'janus-4b', 'evalengine-decision-4b']) assert.ok(!text.includes(`"${key}"`), `${file} lists ${key}`);
    assert.equal(mentionsPrivateSystem(text), false);
    assert.doesNotMatch(text, /"(?:item_id|item_text|question_text|gold|prediction|prompt)"\s*:/i);
  }
});
