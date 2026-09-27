import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  JEVBENCH_V15_PREVIEW_ARTIFACT, JEVBENCH_V15_PREVIEW_ROUTE, jevV15Composite, readJevbenchV15Preview, validateJevbenchV15Preview,
  jevV15LeaderKeys, jevV15LeaderSentence, jevV15TieSummary,
} from '../lib/jevbench-v15-preview.mjs';
import { readJevbenchV142, JEVBENCH_V142_SHA256 } from '../lib/jevbench-v142.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');
const clone = (v) => JSON.parse(JSON.stringify(v));

test('v1.5 preview artifact validates: aggregate-only, composites reproduce, boards score-descending', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  assert.equal(artifact.status, 'preview-not-published');
  assert.ok(['diagnostic', 'official'].includes(artifact.run_kind));
  assert.equal(artifact.headline, 'A');
  assert.equal(artifact.systems.filter((s) => s.listing === 'ranked').length, artifact.n_ranked);
  for (const s of artifact.systems.filter((r) => r.listing === 'unpriced')) {
    assert.equal(s.cost.usd_per_1000, null, `${s.key} unpriced must not carry a price`);
    assert.equal(s.jevbench_score, null);
  }
  assert.doesNotMatch(read(JEVBENCH_V15_PREVIEW_ARTIFACT), /"(item_id|item_text|question_text|gold|golds|expected|prediction|predicted|per_item|item_results)"\s*:/);
});

test('validator rejects item-level fields, a changed score and a published status', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  const leak = clone(artifact); leak.systems[0].intelligence.gold = 'x';
  assert.throws(() => validateJevbenchV15Preview(leak), /item-level/);
  const tampered = clone(artifact); tampered.systems[0].scores.B += 1; tampered.systems[0].jevbench_score += 1;
  assert.throws(() => validateJevbenchV15Preview(tampered), /reproduce/);
  const published = clone(artifact); published.status = 'final';
  assert.throws(() => validateJevbenchV15Preview(published), /status/);
});

test('addendum rows carry a generic v1.5 roster label, including A2 without implying a release number', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  const ok = clone(artifact); ok.systems[0].addendum = { id: 'A2', release: 'v1.5', label: 'v1.5 roster addendum A2' };
  assert.doesNotThrow(() => validateJevbenchV15Preview(ok));
  const bad = clone(artifact); bad.systems[0].addendum = { id: 'A2', release: 'v1.5', label: 'v1.5.1 addendum A2' };
  assert.throws(() => validateJevbenchV15Preview(bad), /addendum/);
  assert.match(read('components/JevBenchV15Preview.tsx'), /row\.addendum\.label/);
});

test('option weights: B = 40/20/20/20 with floor 50; C floor 60', () => {
  const axes = { intelligence: 55, calibration: 80, speed: 90, cost: 70 };
  const b = jevV15Composite(axes, { intelligence: 40, calibration: 20, speed: 20, cost: 20 }, 50);
  const hm = 100 / (40 / 55 + 20 / 80 + 20 / 90 + 20 / 70);
  assert.ok(Math.abs(b - hm) < 1e-9);
  const c = jevV15Composite(axes, { intelligence: 25, calibration: 25, speed: 25, cost: 25 }, 60);
  const a = jevV15Composite(axes, { intelligence: 25, calibration: 25, speed: 25, cost: 25 }, 50);
  assert.ok(Math.abs(c - a * (55 / 60) ** 2) < 1e-9);
});

test('hidden route: noindex, banner, diagnostic label, not in sitemap, nav, robots or any public page', () => {
  assert.equal(JEVBENCH_V15_PREVIEW_ROUTE, '/wip-oiifi41ouv1f/jevbench-v15');
  const page = read('app/wip-oiifi41ouv1f/jevbench-v15/page.tsx');
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.match(page, /canonical: 'https:\/\/benchmarkheaven\.com\/wip-oiifi41ouv1f\/jevbench-v15'/);
  assert.match(page, /Unpublished preview — not released/);
  assert.match(page, /DIAGNOSTIC numbers/);
  assert.match(read('next.config.mjs'), /source: "\/wip-oiifi41ouv1f\/:path\*", headers: \[\{ key: "X-Robots-Tag", value: "noindex, nofollow/);
  for (const file of ['app/sitemap.ts', 'app/robots.ts', 'app/layout.tsx', 'app/jev-models/page.tsx', 'app/jev-models/v1.4.2/page.tsx', 'app/api/jevbench/route.ts']) {
    assert.doesNotMatch(read(file), /jevbench-v15|v1\.5\.0-preview|wip-oiifi41ouv1f/, `${file} must not reference the hidden v1.5 preview`);
  }
});

test('public JevBench pages still use the pinned v1.4.2 artifact', async () => {
  const { sha256 } = await readJevbenchV142(root);
  assert.equal(sha256, JEVBENCH_V142_SHA256);
  assert.match(read('app/jev-models/v1.4.2/page.tsx'), /readJevbenchV142WithFamilies/);
});

test('hidden What-If Lab: noindex, unlinked, aggregate-only; addendum rows listed apart from the ranking', () => {
  const html = readFileSync(new URL('../public/wip-oiifi41ouv1f/jevbench-v15-whatif.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.doesNotMatch(html, /"(task_id|item_id|gold|probs_as_returned)"\s*:/);
  const art = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.0-preview.json', import.meta.url), 'utf8'));
  const add = art.systems.filter((s) => s.listing === 'addendum');
  for (const s of add) {
    assert.equal(s.ranked, false);
    assert.ok(s.addendum && Number.isInteger(s.would_place_A) && Number.isInteger(s.would_place_B));
    assert.ok(Array.isArray(s.composite_ci95?.A) && Array.isArray(s.composite_ci95?.B));
    assert.ok(!art.board.A.order.includes(s.key));
  }
  assert.match(html, /<th>What-If #<\/th>/);
  assert.match(html, /What-If # can include measured addendum rows/);
  assert.match(html, /Before every release we review the leaderboard for anomalies and close loopholes with general, documented rules\./);
  const component = read('components/JevBenchV15Preview.tsx');
  // F-210 (pass 39): the two placements moved out of a sentence per row into a column per option. Both facts are still
  // stated for every addendum row — pinned at the heading that names the column and at the cell that prints the number.
  assert.match(component, /data-bh-jev15-addendum-table/);
  assert.match(component, />Would place \(A\)</);
  assert.match(component, />Would place \(B\)</);
  assert.match(component, /r\.would_place_A == null \? dash : `#\$\{r\.would_place_A\}`/);
  assert.match(component, /r\.would_place_B == null \? dash : `#\$\{r\.would_place_B\}`/);
  assert.match(component, /does not establish a tie/);
});

// F-206 — the v1.5 preview drops "~", the per-row ≈ and a bare "joint leaders" before the page is linked.
// These pin the derivation, not a rendered pixel: the component reads them and the live verifier reads the page.

const board = (order, markers, leader_wording = null) => ({ order, markers, leader_wording });
const tieM = (upper, lower, tie) => ({ upper, lower, tie, diff_ci95: tie ? [-1, 1] : [0.5, 2], p_upper_wins: tie ? 0.7 : 0.98 });

test('F-206: the tie count comes from the markers, and an empty marker list is not "0 of 0 ties"', () => {
  assert.deepEqual(jevV15TieSummary(board(['a', 'b', 'c'], [tieM('a', 'b', true), tieM('b', 'c', false)])), { ties: 1, pairs: 2 });
  assert.deepEqual(jevV15TieSummary(board(['a'], [])), { ties: 0, pairs: 0 });
  assert.deepEqual(jevV15TieSummary(null), { ties: 0, pairs: 0 });
});

test('F-206: the leader set is the rank 1/2 tie, extended to rank 3 only when rank 3 ties rank 2', () => {
  const two = jevV15LeaderKeys(board(['a', 'b', 'c'], [tieM('a', 'b', true), tieM('b', 'c', false)]));
  assert.deepEqual(two, { tie: true, keys: ['a', 'b'], runnerUp: null });
  const three = jevV15LeaderKeys(board(['a', 'b', 'c', 'd'], [tieM('a', 'b', true), tieM('b', 'c', true), tieM('c', 'd', true)]));
  assert.deepEqual(three, { tie: true, keys: ['a', 'b', 'c'], runnerUp: null }, 'a rank 3/4 tie does not reach the leader line');
  const alone = jevV15LeaderKeys(board(['a', 'b'], [tieM('a', 'b', false)]));
  assert.deepEqual(alone, { tie: false, keys: ['a'], runnerUp: 'b' });
  assert.equal(jevV15LeaderKeys(board(['a'], [])), null, 'a one-row board has no adjacent pair to report');
  assert.equal(jevV15LeaderKeys(board(['a', 'b'], [])), null, 'no marker for the top pair means nothing is claimed');
});

test('F-206: the leader sentence names its systems and never opens with a subjectless "joint leaders"', () => {
  const name = (k) => ({ a: 'Cygnet', b: 'Winnow-12B Q8', c: 'Jev 1.13.0' })[k] ?? k;
  const tied = jevV15LeaderSentence(board(['a', 'b', 'c'], [tieM('a', 'b', true), tieM('b', 'c', false)], 'joint leaders (statistical tie)'), name);
  assert.equal(tied, 'Cygnet and Winnow-12B Q8 are joint leaders (statistical tie).');
  assert.doesNotMatch(tied, /^joint leaders/i);
  assert.match(tied, /tie/i);
  const three = jevV15LeaderSentence(board(['a', 'b', 'c'], [tieM('a', 'b', true), tieM('b', 'c', true)], 'joint leaders (statistical tie)'), name);
  assert.equal(three, 'Cygnet, Winnow-12B Q8 and Jev 1.13.0 are joint leaders (statistical tie).');
  const alone = jevV15LeaderSentence(board(['a', 'b'], [tieM('a', 'b', false)]), name);
  assert.match(alone, /^Cygnet leads: .*not a statistical tie\.$/);
  assert.equal(jevV15LeaderSentence(board(['a'], []), name), null);
});

test("F-206: the artifact's leader_wording is appended only when it adds a word the sentence lacks", () => {
  const name = (k) => ({ a: 'Cygnet', b: 'Winnow-12B Q8' })[k] ?? k;
  const b = (wording) => board(['a', 'b'], [tieM('a', 'b', true)], wording);
  assert.equal(jevV15LeaderSentence(b('joint leaders (statistical tie)'), name),
    'Cygnet and Winnow-12B Q8 are joint leaders (statistical tie).', 'nothing new to say, so nothing is appended');
  assert.equal(jevV15LeaderSentence(b('Joint leaders after a paired bootstrap over 4,000 resamples'), name),
    'Cygnet and Winnow-12B Q8 are joint leaders (statistical tie). Joint leaders after a paired bootstrap over 4,000 resamples.');
});

test('F-206: on the real artifact every ranked bar has an A interval to draw and the top pair is a tie today', async () => {
  const { artifact } = await readJevbenchV15Preview(root);
  assert.equal(artifact.headline, 'A');
  const ranked = artifact.systems.filter((s) => s.listing === 'ranked');
  for (const s of ranked) {
    const ci = s.composite_ci95?.[artifact.headline];
    assert.ok(Array.isArray(ci) && ci.length === 2 && ci.every((v) => Number.isFinite(v)), `${s.key} has no ${artifact.headline} 95% interval for its whisker`);
    assert.ok(ci[0] <= ci[1], `${s.key} interval is inverted`);
  }
  const { ties, pairs } = jevV15TieSummary(artifact.board[artifact.headline]);
  assert.equal(pairs, ranked.length - 1, 'one marker per adjacent ranked pair');
  assert.ok(ties > 0 && ties <= pairs);
  const named = new Map(artifact.systems.map((s) => [s.key, s.display]));
  const sentence = jevV15LeaderSentence(artifact.board[artifact.headline], (k) => named.get(k) ?? k);
  assert.ok(sentence, 'the live board must produce a leader sentence');
  assert.doesNotMatch(sentence, /^joint leaders/i);
  assert.match(sentence, /tie/i);
  for (const key of jevV15LeaderKeys(artifact.board[artifact.headline]).keys) assert.ok(sentence.includes(named.get(key)), `${key} is not named in the leader line`);
});

test('v1.5 headline disclosure: A is equal-axis/equal-type, B is secondary, and owner method note is present', () => {
  const src = read('components/JevBenchV15Preview.tsx');
  assert.match(src, /const headline = a\.headline/);
  assert.match(src, /A is the official headline: equal 25\/25\/25\/25 axis weights/);
  assert.match(src, /B remains the secondary 40\/20\/20\/20 axis-weight view/);
  assert.match(src, /Choice, Noul and Score each receive one third/);
  assert.match(src, /Before every release we review the leaderboard for anomalies and close loopholes with general, documented rules\./);
  assert.match(src, /Benchmark Heaven owns its rules/);
  assert.doesNotMatch(src, /weights stay stable|What-If Lab will be public|special review of (our|own|affiliated)/i);
});

test('F-206: the preview component says the majority once and marks only the tariff exception', () => {
  const src = read('components/JevBenchV15Preview.tsx');
  assert.doesNotMatch(src, /est \? '~' : ''/, 'the tilde is gone from the cost cell');
  assert.match(src, /data-bh-jev15-cost-cell/);
  assert.match(src, /const COST_LEGEND = 'Costs are estimates \(est\.\) unless marked tariff\.';/);
  assert.equal(src.split('data-bh-jev15-cost-legend').length - 1, 2, 'the legend sits under the bars and under the axes table');
  assert.match(src, /data-bh-jev15-ci/);
  assert.doesNotMatch(src, /≈/, 'the per-row approximation marker is gone');
  assert.match(src, /<Th title="Cost per 1,000 decisions">\$\/1k decisions<\/Th>/);
  assert.match(src, /<Th title="Overfit multiplier on Intelligence">Penalty<\/Th>/, 'F-206(e): the Penalty column stays');
  const css = read('app/globals.css');
  assert.match(css, /\.bh-jevc-ci \{[^}]*background-color: var\(--muted\)/, 'the whisker takes --muted directly, not through rgb()');
  assert.doesNotMatch(css, /\.bh-jevc-ci[^}]*rgb\(var\(--muted\)\)/);
  assert.match(css, /\.bh-jevc-ci::before, \.bh-jevc-ci::after \{[^}]*height: 5px/, 'caps reach 2 px past the 1 px line on each side');
});
