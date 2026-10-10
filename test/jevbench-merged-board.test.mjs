// Florian 10 Oct 2026: one merged JevBench board (cohort rows join with their draw, anchor offsets per draw).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCohortRows, jevWithCohortRows, equateCohortRow, jevComposite, readDrawEquating, jevLiveAllArtifact } from '../lib/jevbench-cohort-merge.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { isJevApiOffering } from '../lib/jevbench-scope.mjs';

test('every cohort system joins once, from its latest release, with its draw', async () => {
  const { rows } = await readCohortRows();
  const keys = rows.map((r) => r.row.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(rows.length, 16);
  assert.deepEqual([...new Set(rows.map((r) => r.draw.release))].sort(), ['v1.6.4', 'v1.6.7']);
  assert.ok(rows.every((r) => r.draw.id && r.draw.measured_on));
});

test('the composite port reproduces the published scores', async () => {
  const { artifact } = await readCurrentJevbench();
  for (const s of artifact.systems.filter((x) => x.scores?.A != null).slice(0, 40)) {
    for (const [o, { weights, intelligence_floor }] of Object.entries(artifact.options)) {
      const w = Object.fromEntries(Object.entries(weights).map(([a, v]) => [a, v / 100]));
      assert.ok(Math.abs(jevComposite(s.axes, w, intelligence_floor) - s.scores[o]) < 1e-6, `${s.key} ${o}`);
    }
  }
});

test('pending draws show the published numbers unchanged; an offset moves the axes and recomputes', async () => {
  const table = await readDrawEquating();
  assert.ok(table.draws.every((d) => d.status === 'equated' || (d.offset.I === 0 && d.offset.C === 0)));
  const { artifact } = await readCurrentJevbench();
  const { rows } = await readCohortRows();
  const row = rows.find((r) => r.row.key === 'jeff_1_0_large').row;
  assert.equal(equateCohortRow(row, { I: 0, C: 0 }, artifact.options), row);
  const moved = equateCohortRow(row, { I: 2, C: -1 }, artifact.options);
  assert.ok(Math.abs(moved.axes.intelligence - (row.axes.intelligence + 2)) < 1e-9);
  assert.ok(Math.abs(moved.capability - (row.capability + 0.5)) < 1e-9);
  assert.notEqual(moved.scores.A, row.scores.A);
});

test('merged board slots ranked cohort rows by score and keeps published rows in order', async () => {
  const { artifact } = await readCurrentJevbench();
  const merged = jevWithCohortRows(artifact, await readCohortRows());
  assert.equal(merged.systems.length, artifact.systems.length + 16);
  for (const o of Object.keys(artifact.board)) {
    const kept = merged.board[o].order.filter((k) => artifact.board[o].order.includes(k));
    assert.deepEqual(kept, artifact.board[o].order);
    const score = new Map(merged.systems.map((s) => [s.key, s.scores?.[o] ?? -Infinity]));
    const order = merged.board[o].order;
    for (let i = 1; i < order.length; i++) if (!artifact.board[o].order.includes(order[i])) assert.ok(score.get(order[i - 1]) >= score.get(order[i]), `${o}: ${order[i]}`);
  }
  const wrappers = merged.systems.filter((s) => s.draw && !s.ranked).map((s) => s.key).sort();
  assert.deepEqual(wrappers, ['metask_jev_rain_12b', 'ryotide_qwen9']);
  const all = jevLiveAllArtifact(merged, isJevApiOffering);
  const caps = all.systems.filter((s) => s.ranked && s.ranks.capability != null).map((s) => s.ranks.capability).sort((a, b) => a - b);
  assert.deepEqual(caps, caps.map((_, i) => i + 1));
});

test('live pages: filter presets, no version tabs, release history; archived pages keep their URLs', () => {
  const route = readFileSync(new URL('../components/JevBenchV16ReleaseRoute.tsx', import.meta.url), 'utf8');
  const live = route.slice(route.indexOf('if (live) return'), route.indexOf('\n  return <>'));
  assert.match(live, /<JevBoardFilterBar/); assert.match(live, /<JevReleaseHistory \/>/); assert.doesNotMatch(live, /JevBenchReleaseVersionNav/);
  assert.match(readFileSync(new URL('../components/JevBoardFilterBar.tsx', import.meta.url), 'utf8'), /href: '\/jev-models\/all'/);
  assert.match(readFileSync(new URL('../app/jev-models/all/page.tsx', import.meta.url), 'utf8'), /scope="all"/);
});
