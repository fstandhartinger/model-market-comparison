import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  readJevbenchV16Release, readJevbenchV161Release, JEVBENCH_V16_RELEASE_RESULTS, JEVBENCH_V16_RELEASE_CATEGORIES,
  JEVBENCH_V16_RELEASE_CARRY, JEVBENCH_V161_RELEASE_RESULTS, JEVBENCH_V161_RELEASE_CATEGORIES, JEVBENCH_V161_RELEASE_CARRY,
  JEVBENCH_V16_EXCLUDED_KEYS, mentionsPrivateSystem,
} from '../lib/jevbench-v16-release.mjs';
import { readCurrentJevbench, CURRENT_JEVBENCH_PAGE } from '../lib/jevbench-current.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';
import { readJevbenchAgentFeed } from '../lib/jevbench-agent-feed.mjs';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
const v161 = await readJevbenchV161Release();
const v160 = await readJevbenchV16Release();
const a = v161.artifact;
const api = a.systems.filter((s) => s.v16.lane === 'api');
// A dry-run packaging of a scorer round that does not yet carry every hosted API sets packaging_partial. The release gate
// (JEVBENCH_V161_FINAL=1, used by the release job) requires every hosted API row on the full set.
const final = process.env.JEVBENCH_V161_FINAL === '1';

test('v1.6.1 is the live release, v1.6.0 stays reachable unchanged', async () => {
  assert.equal(CURRENT_JEVBENCH_PAGE, '/jev-models/v1.6.1');
  assert.equal((await readCurrentJevbench()).artifact.revision, 'v1.6.1');
  assert.equal(v160.artifact.revision, 'v1.6.0');
  assert.equal(v160.artifact.systems.find((s) => s.key === 'jev-1.13.0').status.rows, 600);
  assert.equal(JEVBENCH_V161_RELEASE_CARRY, JEVBENCH_V16_RELEASE_CARRY, 'the dated-carry file is shared and unchanged');
  assert.equal(v161.carry.revision, 'v1.6.0');
  assert.match(await read('app/api/jevbench/v1.6.0/route.ts'), /readJevbenchV16Release/);
  assert.match(await read('app/api/jevbench/v1.6.1/route.ts'), /readJevbenchV161Release/);
  assert.match(await read('app/jev-models/v1.6.0/page.tsx'), /readJevbenchV16Release\(\)/);
  assert.match(await read('app/jev-models/v1.6.1/page.tsx'), /canonical: '\/jev-models\/v1\.6\.1'/);
  assert.match(await read('app/sitemap.ts'), /"\/jev-models\/v1\.6\.0", "\/jev-models\/v1\.6\.1"/);
  const nav = await read('components/JevBenchReleaseVersionNav.tsx');
  assert.match(nav, /version: 'v1\.6\.1', href: '\/jev-models'/);
  assert.match(nav, /version: 'v1\.6\.0', href: '\/jev-models\/v1\.6\.0'/);
});

test('self-hosted rows are identical to v1.6.0 (scores, axes, intelligence, calibration, cost, speed)', () => {
  const old = new Map(v160.artifact.systems.map((s) => [s.key, s]));
  // rows appended by scripts/jevbench-add-rows.py (same pool, later measured) are covered by test/jevbench-add-rows.test.mjs
  const added = new Set((a.additions ?? []).flatMap((x) => x.keys));
  const selfHosted = a.systems.filter((s) => s.v16.lane === 'selfhosted' && !added.has(s.key));
  assert.ok(selfHosted.length > 80);
  for (const s of selfHosted) {
    const o = old.get(s.key);
    assert.ok(o, `${s.key} exists in v1.6.0`);
    // Part A2 cost rule: token-priced rows (the two deck rows) are re-priced on the common cost basis, which moves cost and the composites only
    const repriced = Boolean(s.cost.common_basis);
    const fields = repriced ? ['capability', 'intelligence', 'calibration', 'speed', 'status'] : ['axes', 'scores', 'capability', 'intelligence', 'calibration', 'speed', 'status', 'composite_ci95'];
    for (const f of fields) assert.deepEqual(s[f], o[f], `${s.key}.${f}`);
    if (!repriced) assert.deepEqual({ ...s.cost, common_basis: null }, { ...o.cost, common_basis: null }, `${s.key}.cost (only common_basis may be added)`);
    else assert.equal(s.cost.common_basis.n_items, 1477, s.key);
  }
  assert.equal(a.G_med, v160.artifact.G_med);
  assert.deepEqual(v161.categories.systems['quyet-1-0-large'], v160.categories.systems['quyet-1-0-large']);
});

test('hosted APIs on the full set are not equated and show real category and language values', () => {
  const full = api.filter((s) => s.v16.full_set_api === true);
  assert.ok(full.length >= 1);
  assert.ok(full.some((s) => s.key === 'jev-1.13.0'));
  for (const s of full) {
    assert.equal(s.status.rows, 1500, s.key);
    assert.equal(s.v16.set, 'S+P', s.key);
    assert.match(s.v16.metric_basis, /^S u P \(full set/, s.key);
    assert.ok(!s.v16.equated && !s.v16.api_subset && !s.v16.api_subset_tag && !s.v16.equating_offset, `${s.key} carries no equating fields`);
    assert.equal(s.measured_in, 'v1.6.1');
    const cells = v161.categories.systems[s.key];
    assert.ok(cells, `${s.key} has category cells`);
    for (const dim of ['topics', 'usecases', 'families', 'languages']) assert.ok(Object.keys(cells[dim]).length >= 3, `${s.key}.${dim}`);
    assert.ok(Object.keys(cells.topics).length >= 6, `${s.key} radar has real topic values`);
    assert.ok(cells.languages.en.n > 1000, `${s.key} language cells come from the full set`);
  }
  assert.equal(a.v16.packaging_partial === true, !(api.length === full.length));
  if (final) {
    assert.equal(a.v16.packaging_partial, false, 'release requires every hosted API on the full set');
    assert.equal(full.length, api.length);
    assert.equal(a.v16.counts.api_input, 1500);
    assert.equal(a.v16.full_set_api_missing, undefined);
  }
});

test('method amendment and revision history are published; the ledger consequence is stated', () => {
  const text = 'hosted/API systems now answer the same full item set as self-hosted systems (1,200 sealed + 300 public)';
  assert.equal(a.amendments.length, 2);
  assert.match(a.amendments[0].text, /^5 Oct 2026, v1\.6\.1 \(Florian's decision\): /);
  assert.ok(a.amendments[0].text.includes(text));
  assert.match(a.amendments[0].text, /only the missing sealed items were sent; every item was logged in the exposure ledger before it was sent\. API rows are no longer equated\./);
  assert.match(a.amendments[0].text, /the whole v1\.6\.0 sealed draw is retired for future releases; v1\.6\.2 onward draws fresh items from the reserve\.$/);
  const costNote = a.amendments[1].text;
  assert.match(costNote, /^5 Oct 2026, v1\.6\.1 cost rule \(Florian's decision\): cost per 1,000 decisions is now measured on one common item set for every system: all items except the 23 very long items/);
  assert.match(costNote, /Effect: Sage 1\.3\.0 USD 0\.0247 per 1,000 decisions on the common set \(0\.0650 on all 1,500 items\); Jev 1\.13\.0 0\.0323 \(unchanged\)\.$/);
  assert.deepEqual(a.revision_history.map((r) => r.revision), ['v1.6.1', 'v1.6.0']);
  assert.ok(a.overnight.notes.every((n) => !/equated to the self-hosted scale; under the exposure rule/.test(n)));
});

test('exclusions, wity base model, Sage common cost basis and frozen caps are unchanged', async () => {
  for (const file of [JEVBENCH_V161_RELEASE_RESULTS, JEVBENCH_V161_RELEASE_CATEGORIES]) {
    const text = await read(file);
    // h2o-lightning-4b v1.1 is published as addendum a8 (v1.7.14, CR-324); the other internal candidates stay out.
    for (const key of [...JEVBENCH_V16_EXCLUDED_KEYS, 'drex-v1.5', 'decider-12b', 'decider-12b-v1', 'janus-4b', 'evalengine-decision-4b']) assert.ok(!text.includes(`"${key}"`), `${file} lists ${key}`);
    assert.equal(mentionsPrivateSystem(text), false);
    assert.doesNotMatch(text, /"(?:item_id|item_text|question_text|gold|prediction|prompt)"\s*:/i);
  }
  for (const k of ['wity-1', 'wity-1-off', 'wity-1-always']) assert.equal(a.systems.find((s) => s.key === k).underlying, 'Base model: undisclosed (author request)');
  const sage = a.systems.find((s) => s.key === 'sage-1.3.0');
  assert.ok(sage);
  assert.ok(Math.abs(sage.cost.usd_per_1000 - 0.0247) < 0.00005, 'Sage cost on the common basis');
  assert.equal(sage.cost.common_basis.n_items, 1477);
  assert.ok(Math.abs(sage.cost.common_basis.usd_per_1000_all_items - 0.0650) < 0.00005);
  assert.ok(Math.abs(a.systems.find((s) => s.key === 'jev-1.13.0').cost.usd_per_1000 - 0.0323) < 0.00005);
  const jevClass = await read('lib/jevbench-jev-class.mjs');
  assert.match(jevClass, /0\.032297327586206896/);
  assert.equal(sha(await read(JEVBENCH_V16_RELEASE_RESULTS)), v160.sha256, 'v1.6.0 results are unchanged on disk');
});

test('category view, agent feed and the v1.6.1 board describe the release', async () => {
  const keys = a.systems.filter((s) => s.ranked).map((s) => s.key);
  const view = jevbenchCategoryView('v1.6.1', keys);
  assert.equal(view.revision, 'v1.6.1');
  for (const k of keys) assert.ok(view.systems[k], `${k} has a radar record`);
  const { feed } = await readJevbenchAgentFeed();
  assert.equal(feed.revision, 'v1.6.1');
  assert.equal(feed.source.artifact, '/api/jevbench/v1.6.1');
  assert.equal(feed.source.frozen_page, '/jev-models/v1.6.1');
  const board = await read('components/JevBenchV16Board.tsx');
  assert.match(board, /data-bh-jev16-amendments/);
  assert.match(board, /data-bh-jev16-revision-history/);
  assert.match(board, /Hosted APIs \(not equated since v1\.6\.1\)/);
  const route = await read('components/JevBenchV16ReleaseRoute.tsx');
  assert.match(route, /JevBenchReleaseVersionNav active=\{revision\}/);
  assert.match(route, /\/api\/jevbench\/\$\{revision\}/);
});
