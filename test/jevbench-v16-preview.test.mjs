import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV16Preview, JEVBENCH_V16_PREVIEW_RESULTS, JEVBENCH_V16_PREVIEW_CATEGORIES, JEVBENCH_V16_PREVIEW_CARRY, JEVBENCH_V16_EXCLUDED_KEYS, mentionsPrivateSystem } from '../lib/jevbench-v16-preview.mjs';
import { jevbenchCategoryView } from '../lib/jevbench-categories.mjs';

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const preview = await readJevbenchV16Preview();

test('v1.6.0 preview files are provisional and list no excluded system', async () => {
  assert.equal(preview.artifact.provisional, true);
  assert.equal(preview.artifact.status, 'preview-not-published');
  assert.equal(preview.categories.provisional, true);
  assert.equal(preview.carry.provisional, true);
  for (const path of [JEVBENCH_V16_PREVIEW_RESULTS, JEVBENCH_V16_PREVIEW_CATEGORIES, JEVBENCH_V16_PREVIEW_CARRY]) {
    const text = await read(path);
    for (const key of JEVBENCH_V16_EXCLUDED_KEYS) assert.ok(!text.includes(`"${key}"`), `${path} lists ${key}`);
    assert.ok(!mentionsPrivateSystem(text), `${path} lists a private-only system`);
  }
});

test('v1.6.0 preview: measured rows use the v1.6 item counts and every ranked row has topic and use-case values', () => {
  const ranked = preview.artifact.systems.filter((s) => s.ranked);
  assert.equal(ranked.length, preview.artifact.n_ranked);
  for (const s of ranked) assert.equal(s.status.rows, s.v16.lane === 'api' ? 600 : 1500, s.key);
  const view = jevbenchCategoryView('v1.6.0', ranked.map((s) => s.key));
  // Self-hosted rows (S 1,200 + P 300) cover every plotted spoke. Hosted APIs answered only A 300 + P 300, so small use-case
  // categories fall under min_n and print as "—" (not drawn) rather than being estimated; topics stay complete.
  for (const s of ranked) for (const dim of view.dims) {
    const plotted = dim.cats.filter((c) => c.plotted);
    const present = plotted.filter((c) => view.systems[s.key][dim.key][c.key]);
    if (s.v16.lane === 'selfhosted' || dim.key === 'topics') assert.equal(present.length, plotted.length, `${s.key} ${dim.key}`);
    else assert.ok(present.length >= 4, `${s.key} ${dim.key}: ${present.length} spokes`);
  }
});

test('v1.6.0 preview: carried rows are separate, dated by the first publishing release, and include Surogate Rune', () => {
  const measured = new Set(preview.artifact.systems.map((s) => s.key));
  const days = new Map(preview.carry.releases.map((r) => [r.revision, r.published_on]));
  assert.deepEqual([...days], [['v1.5.0', '2026-09-28'], ['v1.5.1', '2026-09-29'], ['v1.5.2', '2026-09-29'], ['v1.5.3', '2026-09-29'], ['v1.5.4', '2026-09-29'], ['v1.5.5', '2026-10-02']]);
  for (const r of preview.carry.rows) {
    assert.ok(!measured.has(r.key), r.key);
    assert.equal(r.measured_label, `measured on ${r.measured_revision} (${days.get(r.measured_revision)})`);
  }
  assert.ok(preview.carry.rows.some((r) => r.key === 'surogate-rune-26b-a4b-v3-rtxpro6000-a2'));
});

test('v1.6.0 preview route is noindex and stays out of sitemap, robots and nav', async () => {
  const page = await read('app/wip-jevbench-v16-7c3e9a/page.tsx');
  assert.match(page, /robots: \{ index: false/);
  assert.match(page, /v1\.6\.0 preview, provisional/);
  for (const p of ['app/sitemap.ts', 'app/robots.ts', 'components/Nav.tsx']) assert.doesNotMatch(await read(p), /wip-jevbench-v16/);
  const board = await read('components/JevBenchV16Preview.tsx');
  for (const marker of ['<JevCapabilityRanking', '<JevBubbleCharts', '<JevScoreChart', '<JevCompareV15', '<LanguageView', '<NoulAndGate', '<JevV15AllDataGrid', '<DatedCarry', '<Method']) assert.ok(board.includes(marker), marker);
});

test('v1.6.0 preview: method option B (O1S) is applied and every row has a Noul decisive diagnostic', () => {
  assert.equal(preview.artifact.noul_method?.applied, 'O1S');
  for (const s of preview.artifact.systems) {
    assert.ok(s.noul_decisive, s.key);
    if (s.noul_decisive.supported) assert.ok(s.noul_decisive.decisive_rate >= 0 && s.noul_decisive.decisive_rate <= 1, s.key);
  }
});
