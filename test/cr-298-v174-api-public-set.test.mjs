import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';

// CR-298 v1.7.4 (Florian, 6 Oct 2026 ~18:00 Berlin): every reachable API offering without a v1.6 measurement gets a dated
// public-set figure (300 public v1.6 items, no sealed items) on /jev-models/api, with anchors; nothing is ranked or re-scored.
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const data = JSON.parse(src('data/jevbench-api-public-set.json'));

test('1: public-set rows are complete, dated and above the answer floor; anchors are ranked v1.6.1 API rows', async () => {
  const { artifact, carry } = await readCurrentJevbench();
  const carried = new Set(carry.rows.map((r) => r.key));
  const ranked = new Map(artifact.systems.filter((s) => s.ranked).map((s) => [s.key, s]));
  assert.ok(data.rows.length >= 4, 'anchors plus at least one re-run row');
  for (const r of data.rows) {
    assert.match(r.measured_on, /^2026-\d\d-\d\d$/, `${r.key} has a date`);
    assert.equal(r.n_items, 300, `${r.key} is scored on the 300 public items`);
    assert.ok(r.n_ok >= data.min_answered && r.n_ok <= 300, `${r.key} answered enough items`);
    for (const f of ['intelligence', 'calibration', 'capability']) assert.ok(r[f] >= 0 && r[f] <= 100, `${r.key}.${f} in range`);
    assert.ok(Math.abs(r.capability - (r.intelligence + r.calibration) / 2) < 1e-9, `${r.key} capability = mean(I, C)`);
    if (r.role === 'anchor') assert.ok(ranked.has(r.key) && ranked.get(r.key).endpoint_kind === 'api', `${r.key} anchor is a ranked API row`);
    else if (r.role === 'wrapper') assert.equal(r.key, 'classifier-dev-fast', 'only the classifier.dev wrapper is listed this way');
    else assert.ok(carried.has(r.key), `${r.key} is a carried row of the current release`);
  }
  const anchors = data.rows.filter((r) => r.role === 'anchor').map((r) => r.key).sort();
  assert.deepEqual(anchors, ['jev-1.13.0', 'sage-1.3.0', 'wity-1']);
});

test('2: anchors use the published Intelligence on public items (I_open) of the release', async () => {
  const { artifact } = await readCurrentJevbench();
  for (const r of data.rows.filter((x) => x.role === 'anchor')) {
    const s = artifact.systems.find((x) => x.key === r.key);
    assert.ok(Math.abs(s.intelligence.I_open - r.intelligence) < 0.01, `${r.key}: ${r.intelligence} vs I_open ${s.intelligence.I_open}`);
  }
});

test('3: shown only on the API board, unranked, linked from carried roster rows; ranking code does not read it', () => {
  const board = src('components/JevBenchV16Board.tsx');
  assert.match(board, /\{scope === 'api' && <ApiPublicSet \/>\}/);
  assert.match(board, /not comparable with the 1,500-item rankings above/);
  assert.match(board, /data-bh-jev-api-roster-public=\{r\.key\}/);
  assert.match(board, /version: 'v1\.7\.4'/);
  for (const f of ['lib/jevbench-scope.mjs', 'components/JevBoardInteractive.tsx', 'lib/jevbench-current.mjs']) {
    assert.doesNotMatch(src(f), /jevbench-api-public-set/, `${f} must not use public-set figures`);
  }
});

test('4: demo endpoints use the rankings cost basis and x2 latency adjustment; pending rows are named', async () => {
  const { carry } = await readCurrentJevbench();
  const byKey = new Map(carry.rows.map((r) => [r.key, r]));
  for (const r of data.rows.filter((x) => byKey.get(x.key)?.endpoint_kind === 'demo')) {
    assert.equal(r.cost_kind, 'estimate', `${r.key} cost basis`);
    assert.equal(r.usd_per_1000, byKey.get(r.key).cost.usd_per_1000, `${r.key} uses the documented ranking cost`);
    assert.ok(Math.abs(r.p50_s_adjusted - 2 * r.p50_s) < 1e-9, `${r.key} latency adjusted x2`);
  }
  const shown = new Set(data.rows.map((r) => r.key));
  for (const p of data.pending) assert.ok(!shown.has(p.key) && p.reason, `${p.key} pending with a reason`);
});
