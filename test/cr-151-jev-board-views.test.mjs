import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// CR-151 (Florian 25 Sep 2026): heat-shaded axis cells, sortable/filterable chart and table, a "View by" switch, and the
// axes table moved below the compare view.
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [board, shared, client, page, css] = await Promise.all([read('../components/JevModelsV14.tsx'), read('../components/JevBoardShared.tsx'), read('../components/JevBoardInteractive.tsx'), read('../app/jev-models/page.tsx'), read('../app/globals.css')]);

test('axis cells are shaded by their standing in the column; price and latency count lower as better', () => {
  assert.match(shared, /usd: \{ get: \(r\) => r\.cost\?\.usd_per_1000, lowerIsBetter: true, log: true \}/);
  assert.match(shared, /latency: \{ get: \(r\) => r\.speed\?\.p50_s_raw, lowerIsBetter: true, log: true \}/);
  for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) assert.match(shared, new RegExp(`${axis}: \\{ get: \\(r\\) => r\\.axes\\?\\.${axis} \\}`));
  assert.match(shared, /return HEAT_COLUMNS\[column\]\.lowerIsBetter \? 1 - clamped : clamped/);
  assert.match(shared, /data-bh-jev-heat-legend/);
  assert.match(css, /\.bh-heat \{ background-color: rgb\(var\(--heat\) \/ calc\(var\(--heat-min\) \+ var\(--h, 0\) \* var\(--heat-span\)\)\); \}/);
  assert.match(css, /\[data-theme="light"\] \{ --heat:/);
});

test('the chart offers View by and sortable, keyboard-reachable headings; the table sorts with aria-sort', () => {
  for (const view of ['overall', 'intelligence', 'calibration', 'speed', 'cost']) assert.match(client, new RegExp(`\\['${view}', '`));
  assert.match(client, /data-bh-jev-view="capability"/);
  assert.match(client, /aria-pressed=\{view === v\}/);
  assert.match(client, /<button type="button" className=\{`bh-sort-btn/);
  assert.match(client, /aria-sort=\{active \? \(sort\.dir === 'asc' \? 'ascending' : 'descending'\) : 'none'\}/);
  assert.match(client, /usd: 'asc'/, '$/1k sorts cheapest first');
  assert.match(client, /Not the official order/);
  assert.match(client, /# is still the official JevBench rank/);
});

test('both views filter by name, type, openness, API flag and new-in-release', () => {
  for (const f of ['q', 'type', 'open', 'api', 'new']) assert.match(client, new RegExp(`data-bh-jev-filter="${f}"`));
  assert.match(client, /<FilterBar[^>]*idPrefix="chart"/);
  assert.match(client, /<FilterBar[^>]*idPrefix="table"/);
  assert.match(board, /isNew: previousKeys !== null && !previousKeys\.has\(row\.key\)/);
  assert.match(page, /previous=\{previous\}/);
});

test('the fairness sentence compares within the top five and the axes table follows the compare view', () => {
  assert.match(board, /const topFive = ranked\.slice\(0, 5\)/);
  assert.match(client, /Among the top five/);
  const compare = board.indexOf('<JevCompareV14 ');
  const table = board.indexOf('id="jev14-table"');
  assert.ok(compare > 0 && table > compare, 'Axes, accuracy, latency and cost sits after Compare two systems');
  assert.ok(board.indexOf('<JevScoreChart') < compare);
});
