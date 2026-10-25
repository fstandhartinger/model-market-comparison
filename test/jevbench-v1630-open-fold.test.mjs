import { hasPublishedJevbenchV175Release } from '../lib/jevbench-v175-release.mjs';
import { hasPublishedJevbenchV174Release } from '../lib/jevbench-v174-release.mjs';
import { hasPublishedJevbenchV173Release } from '../lib/jevbench-v173-release.mjs';
import { hasPublishedJevbenchV172Release } from '../lib/jevbench-v172-release.mjs';
import { hasPublishedJevbenchV171Release } from '../lib/jevbench-v171-release.mjs';
import test from 'node:test';
import { hasPublishedJevbenchV170Release } from '../lib/jevbench-v170-release.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { readJevbenchV161Release } from '../lib/jevbench-v16-release.mjs';
import { readJevbenchV157Release } from '../lib/jevbench-v15-release.mjs';
import { assembleJevBoard } from '../lib/jevbench-live-board.mjs';
import { jevV15BoardSystem, jevV15BoardRow, jevV15SliderPresets } from '../lib/jevbench-v15-board.mjs';
import { JEV_OPEN_REFERENCE_KEYS, JEV_SCOPE_LISTING, JEV_PRELIMINARY_LISTING, jevFoldWithPinned, jevScopeClassifier, jevScopeDisplayOrder, jevbenchScopeArtifact } from '../lib/jevbench-scope.mjs';
import { register } from 'node:module';
import { renderToStaticMarkup as renderSeo } from 'react-dom/server';

register('./tsx-loader-hooks.mjs', import.meta.url);

const root = process.cwd();
const { JevCapabilityRanking } = await import('../components/JevCapabilityRanking.tsx');
const { JevScoreChart } = await import('../components/JevBoardInteractive.tsx');
const { JEV_V16_CLASS_OPTIONS, JEV_V16_REFERENCE_LABEL } = await import('../lib/jevbench-jev-class.mjs');

const [release, prev, apiA4] = await Promise.all([readJevbenchV161Release(), readJevbenchV157Release(), readFile(`${root}/data/jevbench-api-a4-equated.json`, 'utf8').then(JSON.parse)]);
const { published, publishedCarry } = await assembleJevBoard({ release, previous: prev, live: true, apiA4 });
const isApi = jevScopeClassifier(published.systems, publishedCarry.rows, prev.artifact.systems, prev.artifact.not_measured);
const open = jevbenchScopeArtifact(published, 'open', isApi);
const listed = (s) => !!s.ranked || s.listing === JEV_SCOPE_LISTING.reference || s.listing === JEV_SCOPE_LISTING.api || s.listing === JEV_PRELIMINARY_LISTING;
const ranked = jevScopeDisplayOrder(open.systems.filter(listed));
const hiddenKeys = new Set(published.systems.filter((s) => isApi(s) && !JEV_OPEN_REFERENCE_KEYS.includes(s.key)).map((s) => s.key));
const visible = ranked.filter((s) => !hiddenKeys.has(s.key));

const renderCapability = (pinnedKeys, systems = visible) => renderSeo(React.createElement(JevCapabilityRanking, {
  systems: systems.map((s) => jevV15BoardSystem(s)), revision: 'board', officialHref: '#jev16-method', referenceLabel: JEV_V16_REFERENCE_LABEL,
  limits: JEV_V16_CLASS_OPTIONS.limits, nearCapPrecision: true, scopeLabel: 'open weights', pinnedKeys,
}));
const renderComposite = (pinnedKeys, systems = visible) => renderSeo(React.createElement(JevScoreChart, {
  revision: 'board', rows: systems.map((s) => jevV15BoardRow(s, { isNew: false, headline: open.headline })), rankedCount: open.n_ranked, newLabel: null, fairness: null,
  approvedNote: null, tieNote: null, capabilityHref: '#jev-capability', presets: jevV15SliderPresets(open), compactMobile: true, scoreKind: 'v15', pinnedKeys,
}));
const split = (html, marker) => { const at = html.indexOf(marker); assert.ok(at > 0, `${marker} present (the fold exists)`); return [html.slice(0, at), html.slice(at)]; };
const rowIds = (html, attr) => [...html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))].map((m) => m[1]);

test('jevFoldWithPinned: pinned rows keep their position above the fold, do not count toward the limit, and are moved up from below it', () => {
  const items = ['a', 'b', 'P1', 'c', 'd', 'e', 'P2', 'f'];
  const out = jevFoldWithPinned(items, 4, (x) => x.startsWith('P'));
  assert.deepEqual(out.head, ['a', 'b', 'P1', 'c', 'd', 'P2']);
  assert.deepEqual(out.rest, ['e', 'f']);
  const late = jevFoldWithPinned(['a', 'b', 'c', 'd', 'e', 'f', 'P1', 'g'], 3, (x) => x.startsWith('P'));
  assert.deepEqual(late.head, ['a', 'b', 'c', 'P1']);
  assert.deepEqual(late.rest, ['d', 'e', 'f', 'g']);
  assert.deepEqual(jevFoldWithPinned(items, 4, () => false), { head: items.slice(0, 4), rest: items.slice(4) });
  assert.deepEqual(jevFoldWithPinned(['P1', 'a'], 4, (x) => x.startsWith('P')), { head: ['P1', 'a'], rest: [] });
});

test('Delta 4: with the folds collapsed, Jev 1.13.0 and Jev 1.14.0 are rendered above the fold in the open-board Capability and Composite sections', async () => {
  assert.ok(visible.some((s) => s.key === 'jev-1.14.0') && visible.some((s) => s.key === 'jev-1.13.0'));
  const before = renderCapability(undefined);
  const [beforeHead] = split(before, 'data-bh-jev-class-more');
  assert.ok(!rowIds(beforeHead, 'data-bh-jev14-capability-row').includes('jev-1.14.0'),
    'without the pin, Jev 1.14.0 is behind the fold (the Delta 3 behaviour this fixes)');

  const cap = renderCapability(JEV_OPEN_REFERENCE_KEYS);
  const [capHead, capRest] = split(cap, 'data-bh-jev-class-more');
  const capHeadRows = rowIds(capHead, 'data-bh-jev14-capability-row');
  for (const key of JEV_OPEN_REFERENCE_KEYS) {
    assert.ok(capHeadRows.includes(key), `${key} above the Capability fold`);
    assert.ok(!rowIds(capRest, 'data-bh-jev14-capability-row').includes(key), `${key} not repeated inside the Capability fold`);
  }
  const numbered = (html) => [...html.matchAll(/data-bh-jev14-capability-row="([^"]+)"[\s\S]*?<span class="bh-muted tabular col-start-1 row-start-1 text-right">([^<]*)<\/span>/g)].map((m) => [m[1], m[2]]);
  const headNumbers = numbered(capHead);
  assert.equal(headNumbers.filter(([, n]) => n !== '–').length, 10, 'ten RANKED rows before the fold; the reference rows do not count');
  assert.deepEqual(headNumbers.filter(([, n]) => n !== '–').map(([, n]) => n), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], 'rank numbers unchanged');
  assert.deepEqual(headNumbers.filter(([, n]) => n === '–').map(([k]) => k).sort(), [...JEV_OPEN_REFERENCE_KEYS].sort(), 'only the two reference rows are unranked above the fold');
  const foldBody = capRest.slice(0, capRest.indexOf('</details>'));
  const folded = rowIds(foldBody, 'data-bh-jev14-capability-row').length;
  const summary = capRest.match(/Show all (\d+) Jev-class systems \((\d+) more\)/);
  assert.ok(summary, 'fold summary present');
  assert.equal(Number(summary[2]), folded, '"N more" counts exactly the rows inside the fold');
  assert.equal(Number(summary[1]), headNumbers.length + folded, 'the total counts every Jev-class row once');
  const nameOf = (html, key) => html.slice(html.indexOf(`data-bh-jev14-capability-row="${key}"`)).split('</li>')[0];
  assert.ok(!nameOf(cap, 'jev-1.14.0').includes('data-bh-jev-draw-tag'), 'no draw chip on the pinned reference row, so the name is not truncated');
  assert.match(nameOf(cap, 'jev-1.14.0'), />Jev 1\.14\.0<\/a>/);
  assert.ok(nameOf(cap, 'jev-1.14.0').includes('measured on the'), 'the draw stays in the name tooltip');
  assert.ok(nameOf(cap, 'jev-1.14.0').includes('data-bh-jev-capability-api'), 'API badge kept');

  const comp = renderComposite(JEV_OPEN_REFERENCE_KEYS);
  const [compHead, compRest] = split(comp, 'data-bh-jev14-bars-more');
  const barIds = (html) => rowIds(html, 'data-bh-jev14-bar');
  assert.ok(barIds(comp).length > 0, 'composite bars rendered');
  for (const key of JEV_OPEN_REFERENCE_KEYS) {
    assert.ok(barIds(compHead).includes(key), `${key} above the Composite fold`);
    assert.ok(!barIds(compRest).includes(key), `${key} not repeated inside the Composite fold`);
  }
  const compRanked = visible.filter((s) => s.ranked).map((s) => s.key);
  assert.deepEqual(barIds(compHead).filter((k) => compRanked.includes(k)), compRanked.slice(0, 20), 'the first 20 ranked rows are above the Composite fold, in rank order');
  assert.equal(barIds(compHead).length, 22);

  // v1.7.0 (10 s rule): once the PASS-reviewed release is published the board is restated and the v1.7.0 roster applies; before that the v1.6.39 roster.
  const frozen = JSON.parse(await readFile(`${root}/test/fixtures/jevbench-${(await hasPublishedJevbenchV175Release()) ? 'v175' : (await hasPublishedJevbenchV174Release()) ? 'v174' : (await hasPublishedJevbenchV173Release()) ? 'v173' : (await hasPublishedJevbenchV172Release()) ? 'v172' : (await hasPublishedJevbenchV171Release()) ? 'v171' : (await hasPublishedJevbenchV170Release()) ? 'v170' : 'v1643'}-ranks.json`, 'utf8'));
  assert.deepEqual(Object.fromEntries(open.systems.filter((s) => s.ranked).map((s) => [s.key, [s.rank, s.ranks.A, s.ranks.B, s.ranks.C, s.ranks.capability]])), frozen.views.open.ranks, 'every open-board rank matches the v1.6.31 roster fixture');
});
