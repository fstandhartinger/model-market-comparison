import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  radarValue, plottable, radarRadius, categoryCell, radarShape, RADAR_MIN_N, DENSE_SPOKES,
  fullLabelLayout, labelCollisions, radarLabelMode, endsLayout, ENDS_PROFILES,
} from '../lib/radar-shape.mjs';
import { jevbenchCategoryView, withLiveCategoryCells } from '../lib/jevbench-categories.mjs';
import jevV161 from '../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-categories.json' with { type: 'json' };

// Radar display fix (lead job jevbench-radar-full-areas-20261009, 9 Oct 2026): a missing, non-finite or under-30 cell is never a
// zero-valued marker or vertex; dense radars (20 use-case spokes) use numbered spokes and a key instead of overlapping labels.
const require = createRequire(import.meta.url);
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const lines = (label) => label.split(' ').reduce((ls, w) => (ls.length && (ls[ls.length - 1] + ' ' + w).length <= 13 ? [...ls.slice(0, -1), `${ls[ls.length - 1]} ${w}`] : [...ls, w]), []);

test('radarValue: null, undefined, NaN, ±Infinity and non-numbers are missing; a measured 0 and a negative value stay', () => {
  for (const v of [null, undefined, NaN, Infinity, -Infinity, '5', '', [], {}]) assert.equal(radarValue(v), null, String(v));
  assert.equal(radarValue(0), 0);
  assert.equal(radarValue(-0.4), -0.4);
  assert.equal(radarValue(100), 100);
  // The old clamp turned a null competence into a 0 vertex:
  assert.equal(Math.max(0, Math.min(100, null)), 0, 'documents the bug the helpers prevent');
});

test('plottable: thin (under the per-spoke minimum) or missing is never drawn; a measured 0 is drawn', () => {
  assert.equal(plottable(0, false), true);
  assert.equal(plottable(-12, false), true, 'below chance draws at the centre and prints its number');
  assert.equal(plottable(55, true), false);
  assert.equal(plottable(null, false), false);
  assert.equal(plottable(NaN, false), false);
  assert.equal(plottable(undefined, false), false);
  assert.equal(radarRadius(-12), 0);
  assert.equal(radarRadius(140), 100);
  assert.throws(() => radarRadius(null), /not a finite value/, 'a missing value can never be turned into a radius');
});

test('categoryCell keeps the >= 30 answered per-spoke rule (completed n when published) and never invents a value', () => {
  assert.equal(RADAR_MIN_N, 30);
  assert.deepEqual(categoryCell(null), { value: null, thin: false, n: null, text: '—' });
  assert.deepEqual(categoryCell(undefined), { value: null, thin: false, n: null, text: '—' });
  assert.deepEqual(categoryCell([null, 40]), { value: null, thin: false, n: 40, text: 'n/a' });
  assert.deepEqual(categoryCell([NaN, 40]), { value: null, thin: false, n: 40, text: 'n/a' });
  assert.deepEqual(categoryCell([Infinity, 40]), { value: null, thin: false, n: 40, text: 'n/a' });
  assert.deepEqual(categoryCell([0, 16, 16]), { value: 0, thin: true, n: 16, text: 'n=16' }, 'decisio demand forecasting: a 0 under 30 is not drawn');
  assert.deepEqual(categoryCell([21.2, 83, 16]), { value: 21.2, thin: true, n: 16, text: 'n=16' }, 'completed n (third slot) decides, not scored n');
  assert.deepEqual(categoryCell([50, 29]), { value: 50, thin: true, n: 29, text: 'n=29' });
  assert.deepEqual(categoryCell([50, 30]), { value: 50, thin: false, n: 30, text: '50.0' }, '30 answered is enough');
  assert.deepEqual(categoryCell([50, null]), { value: 50, thin: true, n: null, text: 'n unknown' });
  assert.deepEqual(categoryCell([0, 94, 94]), { value: 0, thin: false, n: 94, text: '0.0' }, 'a measured 0 is a value');
  assert.deepEqual(categoryCell([-3.5, 94]), { value: -3.5, thin: false, n: 94, text: '-3.5' }, 'signed artifacts keep their sign');
  for (const cell of [null, [null, 90], [NaN, 90], [40, 10], [40, NaN]]) {
    const c = categoryCell(cell);
    assert.equal(plottable(c.value, c.thin), false, JSON.stringify(cell));
  }
});

// The original screenshot row (decisio v0.8.0 on gemma-4-31B-it) completed its supplements (CR-398) and so did its 12B sibling
// (CR-412). swanOne (weights currently unreachable, HTTP 401) keeps the same original-pool S+P gaps, so it carries this regression.
test('the screenshot pattern (H2O Lightning 4B vs an S+P-only row, swanOne): gaps stay gaps, the points-only series stays points', () => {
  const view = jevbenchCategoryView('v1.6.1', ['h2o-lightning-4b', 'swanone'], { supplement: true });
  const uc = view.dims.find((d) => d.key === 'usecases');
  const spoke = (key) => ['h2o-lightning-4b', 'swanone'].map((s) => categoryCell(view.systems[s].usecases[key] ?? null, view.radarMinN));
  const [gA, gB] = spoke('gaming'), [dA, dB] = spoke('demand_forecasting'), [rA, rB] = spoke('recruiting');
  assert.deepEqual([gA.text, gB.text], ['18.3', '—']);
  assert.deepEqual([dA.text, dB.text], ['21.2', 'n=16']);
  assert.deepEqual([rA.text, rB.text], ['21.7', '—']);
  assert.ok(plottable(gA.value, gA.thin) && plottable(dA.value, dA.thin) && plottable(rA.value, rA.thin), 'A has real values ~20: drawn at their radius');
  for (const c of [gB, dB, rB]) assert.equal(plottable(c.value, c.thin), false, 'B: no marker, no vertex');
  const present = uc.cats.filter((c) => c.plotted).map((c) => { const x = categoryCell(view.systems['swanone'].usecases[c.key] ?? null, view.radarMinN); return plottable(x.value, x.thin); });
  assert.equal(present.filter(Boolean).length, 9, 'swanOne has >= 30 answered items on 9 of 20 use-case spokes');
  assert.equal(radarShape(present).kind, 'points', 'drawn as points, no fake polygon');
  const full = jevbenchCategoryView('v1.6.1', ['decisio-gemma-4-31b-v080'], { supplement: true });
  const drawn = full.dims.find((d) => d.key === 'usecases').cats.filter((c) => c.plotted).map((c) => { const x = categoryCell(full.systems['decisio-gemma-4-31b-v080'].usecases[c.key] ?? null, full.radarMinN); return plottable(x.value, x.thin); });
  assert.equal(drawn.filter(Boolean).length, 20, 'the completed 31B row draws every use-case spoke');
});

test('every live cell: under-30 or non-finite cells are never plottable; measured zeros remain drawable values', () => {
  const live = withLiveCategoryCells(jevV161);
  const view = jevbenchCategoryView('v1.6.1', Object.keys(live.systems), { supplement: true });
  let thinCells = 0, zeros = 0;
  for (const row of Object.values(view.systems)) for (const dim of view.dims) for (const cell of Object.values(row[dim.key] ?? {})) {
    const c = categoryCell(cell, view.radarMinN);
    const completed = cell[2] ?? cell[1];
    if (completed < RADAR_MIN_N) { thinCells++; assert.equal(plottable(c.value, c.thin), false); }
    if (c.value === 0 && !c.thin) zeros++;
  }
  assert.ok(thinCells > 0, 'the live data has under-30 cells to guard');
  assert.ok(zeros > 0, 'the live (clipped) v1.6 cells contain measured zeros, which stay plottable');
  assert.match(view.metric, /clipped/, 'the live metric states that below-chance means are clipped to 0 upstream');
});

test('layout A (Florian #16968): dense radars keep horizontal labels at the spoke ends; no overlap, nothing off-canvas or over the plot, up to 30 spokes', () => {
  const live = withLiveCategoryCells(jevV161).usecases.map((c) => c.label);
  const synthetic = (n) => Array.from({ length: n }, (_, i) => `Category number ${i}`);
  const cases = [live, ...Array.from({ length: 30 - DENSE_SPOKES }, (_, k) => synthetic(DENSE_SPOKES + 1 + k))];
  assert.equal(live.length, 20);
  for (const names of cases) {
    assert.equal(radarLabelMode(names.map((nm) => ({ lines: lines(nm), value: '88.8 · n=16' })), { w: 500, h: 400, r: 112 }), 'ends', `${names.length} spokes`);
    for (const [pname, profile] of Object.entries(ENDS_PROFILES)) {
      const lay = endsLayout(names.map((name) => ({ name, value: '100.0 · 100.0' })), profile);
      assert.deepEqual(labelCollisions(lay.items, lay.w, lay.h), { overlaps: [], outside: [] }, `${pname} ${names.length} spokes`);
      for (const it of lay.items) {
        assert.ok(it.lines.join(' ').length >= 1 && it.lines.every((l) => l.length <= Math.max(profile.wrap, ...l.split(' ').map((w) => w.length))), 'names wrap, never truncate');
        // The label box never reaches into the plot: its nearest point to the centre lies outside the 100 ring.
        const nx = Math.max(it.box.x0, Math.min(lay.cx, it.box.x1)), ny = Math.max(it.box.y0, Math.min(lay.cy, it.box.y1));
        assert.ok(Math.hypot(nx - lay.cx, ny - lay.cy) >= lay.r, `${pname} ${names.length}: ${it.lines.join(' ')} clear of the plot`);
      }
    }
  }
  // Desktop: labels stay at their spoke ends for the live 20 use cases; few need a leader.
  const desk = endsLayout(live.map((name) => ({ name, value: '100.0 · 100.0' })), ENDS_PROFILES.desktop);
  assert.ok(desk.items.filter((it) => it.leader).length <= 10);
  assert.ok(desk.items.every((it) => it.lines.length <= 2), 'desktop prints every use-case name on at most two lines');
});

test('the 20 use-case labels at the old size overlap (the reported bug); full labels are kept only where they fit', () => {
  const live = withLiveCategoryCells(jevV161);
  const cats = live.usecases.map((c) => ({ lines: lines(c.label.length > 18 ? c.label.split(' ').slice(0, 2).join(' ') : c.label), value: '21.2 · n=16' }));
  const old = labelCollisions(fullLabelLayout(cats, { w: 500, h: 400, r: 112 }), 500, 400);
  assert.ok(old.overlaps.length > 0 || old.outside.length > 0, 'full labels on 20 spokes collide');
  // The sparse radars that keep full labels: score axes, request types, tiers, the seven subject topics — with real-width values.
  const cases = [
    [['Intelligence', 'Calibration', 'Speed', 'Cost'], { w: 420, h: 320, r: 96 }, '72.3 · 64.1'],
    [['Choice · open', 'Choice · sealed', 'Noul · open', 'Noul · sealed', 'Score · open', 'Score · sealed'], { w: 440, h: 340, r: 100 }, '100.0 · 100.0'],
    [['Easy', 'Standard', 'Judge', 'Hard'], { w: 440, h: 340, r: 100 }, '100.0 · n/a'],
    [['Rules & law', 'Coding', 'Math & dates', 'Finance & commerce', 'Support work', 'Everyday language', 'Safety & security'], { w: 500, h: 400, r: 112 }, '100.0 · n=29'],
  ];
  for (const [names, size, value] of cases) {
    const L = names.map((nm) => ({ lines: lines(nm), value }));
    assert.equal(radarLabelMode(L, size), 'full', names.join(','));
    assert.deepEqual(labelCollisions(fullLabelLayout(L, size), size.w, size.h), { overlaps: [], outside: [] }, names.join(','));
  }
  // A full label that would leave the canvas falls back to layout A on a fitted canvas rather than clipping or overlapping.
  const wide = ['Intelligence', 'Calibration', 'Speed', 'Cost'].map((nm) => ({ lines: [nm], value: 'none (0 in score) · none (0 in score)' }));
  assert.equal(radarLabelMode(wide, { w: 420, h: 320, r: 96 }), 'ends');
});

async function loadRadar() {
  const url = new URL('../components/JevRadars.tsx', import.meta.url);
  const stub = `data:text/javascript;base64,${Buffer.from('export const JEV_TYPE_LABEL = {}; export const jevRowArch = (r) => r.cls; export const jevTypeVarName = (c) => `--t-${c}`;'.replace('`--t-${c}`', '"--t-" + c')).toString('base64')}`;
  async function moduleUrl(file) {
    let code = ts.transpileModule(await readFile(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    for (const [whole, q, spec] of [...code.matchAll(/\bfrom\s*(["'])([^"']+)\1/g)]) {
      const resolved = spec === './jevTypes' ? stub : spec === './TopicRadar' ? await moduleUrl(new URL('TopicRadar.tsx', file)) : spec === '../lib/version-label' ? await moduleUrl(new URL('../lib/version-label.ts', file)) : spec.startsWith('.') ? new URL(spec, file).href : `file://${require.resolve(spec)}`;
      code = code.replace(whole, `from ${q}${resolved}${q}`);
    }
    return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  }
  return import(await moduleUrl(url));
}

test('rendered Radar: missing, NaN and thin cells produce no marker; 20 spokes render layout A labels with every value', async () => {
  const { Radar } = await loadRadar();
  const series = [{ name: 'A', stroke: 'red', dashed: false, square: false }, { name: 'B', stroke: 'blue', dashed: true, square: true }];
  const spokes = Array.from({ length: 20 }, (_, i) => ({
    key: `c${i}`, lines: lines(`Category ${i}`), tip: `Definition ${i}. 90 items.`,
    values: [i === 3 ? 0 : 40 + i, i % 4 === 0 ? null : i % 4 === 1 ? NaN : i % 4 === 2 ? 0 : 70],
    thin: [false, i % 4 === 2], texts: [i === 3 ? '0.0' : `${40 + i}.0`, i % 4 === 0 ? '—' : i % 4 === 1 ? 'n/a' : i % 4 === 2 ? 'n=16' : '70.0'],
  }));
  const html = renderToStaticMarkup(React.createElement(Radar, { spokes, series, size: { w: 500, h: 400, r: 112 }, id: 't', title: 'Use cases', desc: 'd' }));
  assert.match(html, /data-bh-radar-label-mode="ends"/);
  assert.match(html, /data-bh-radar-variant="desktop"[^>]*>.*data-bh-radar-profile="desktop"/s);
  assert.match(html, /data-bh-radar-variant="phone"[^>]*>.*data-bh-radar-profile="phone"/s);
  const desktop = html.split('data-bh-radar-variant="phone"')[0];
  const b = desktop.split('data-bh-jev12-radar-series="b"')[1].split('</g>')[0];
  assert.equal((b.match(/<rect /g) ?? []).length, 5, 'B: only the 5 spokes with a finite, well-measured value get a marker');
  assert.match(b, /data-bh-radar-shape="points"/, 'B is under half: points, no polygon');
  assert.doesNotMatch(html, /NaN/, 'no NaN coordinate or text reaches the SVG');
  const a = desktop.split('data-bh-jev12-radar-series="a"')[1].split('</g>')[0];
  assert.match(a, /<polygon /, 'A, complete, keeps its filled polygon — including its measured 0 vertex');
  assert.equal((a.match(/<circle /g) ?? []).length, 20);
  assert.equal((desktop.match(/data-bh-jev12-radar-spoke=/g) ?? []).length, 20, 'one label per spoke');
  assert.doesNotMatch(html, /data-bh-radar-key=|data-bh-radar-spoke-number=/, 'no numbered badges or key any more');
  assert.match(desktop, /Definition 7\. 90 items\./, 'definition and item count stay reachable from the label');
  assert.match(desktop, /data-bh-jev12-radar-value="b:c2"[^>]*>(?:<tspan[^>]*> · <\/tspan>)?n=16/, 'thin cell prints n=16 at its spoke end');
  assert.match(desktop, /data-bh-jev12-radar-value="b:c0"[^>]*>(?:<tspan[^>]*> · <\/tspan>)?n\/a/, 'missing cell prints n/a at its spoke end');
  const four = renderToStaticMarkup(React.createElement(Radar, { spokes: spokes.slice(0, 4).map((s) => ({ ...s, values: [s.values[0], null], texts: [s.texts[0], '—'] })), series, size: { w: 420, h: 320, r: 96 }, id: 'u', title: 'Axes', desc: 'd' }));
  assert.match(four, /data-bh-radar-label-mode="full"/);
  assert.doesNotMatch(four, /data-bh-radar-variant=/, 'sparse radars keep their single full-label canvas');
  assert.doesNotMatch(four.split('data-bh-jev12-radar-series="b"')[1].split('</g>')[0], /<rect /, 'all-null series draws nothing');
});

test('the shared components route every value through the helpers (no clamp-to-0 or ?? 0 on a missing value)', () => {
  const radar = src('components/JevRadars.tsx'), v15 = src('components/JevCompareV15.tsx'), v14 = src('components/JevCompareV14.tsx');
  assert.match(radar, /plottable\(s\.values\[k\], s\.thin\[k\]\)/);
  assert.match(radar, /radarLabelMode\(/);
  assert.match(v15, /categoryCell\(cats\.systems\[r\.key\]/);
  assert.doesNotMatch(v15, /Math\.max\(0, Math\.min\(100, v\[0\]\)\)/);
  assert.doesNotMatch(radar, /r\.axes\[k\] \?\? 0/);
  assert.doesNotMatch(v14, /r\.axes\?\.\[k\] \?\? 0/);
  assert.match(v15, /data-bh-radar-zero-note="clipped"/, 'a drawn 0 on a clipped artifact is explained as a measured value');
});
