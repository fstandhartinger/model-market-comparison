import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  radarRadius, radarScale, ringLabelPoint, ringLabelText, plottable, radarShape, categoryCell,
  RADAR_DEFAULT_DOMAIN, RADAR_SIGNED_DOMAIN,
} from '../lib/radar-shape.mjs';

// Signed category-competence axis (lead job jevbench-radar-full-areas-20261009, 9 Oct 2026): category radars in JevCompareV15 run
// linearly from -100 (centre) through 0 (bold ring, half radius) to 100 (rim), so a complete series of measured zeros is a full
// polygon and a negative ImageJevBench cell keeps its own radius. Every other radar keeps the legacy 0-100 default.
const require = createRequire(import.meta.url);
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('signed domain: -100 is the centre, 0 is half the radius, 100 is the rim (linear in between)', () => {
  assert.deepEqual([...RADAR_SIGNED_DOMAIN], [-100, 100]);
  assert.equal(radarRadius(-100, RADAR_SIGNED_DOMAIN), 0);
  assert.equal(radarRadius(0, RADAR_SIGNED_DOMAIN), 50);
  assert.equal(radarRadius(100, RADAR_SIGNED_DOMAIN), 100);
  assert.equal(radarRadius(-50, RADAR_SIGNED_DOMAIN), 25);
  assert.equal(radarRadius(50, RADAR_SIGNED_DOMAIN), 75);
  // The real ImageJevBench v0.3 low (data/imagejev-v03.json) and nearby negatives are distinct, finite radii inside the 0 ring.
  const negs = [-58.33, -12, -0.4].map((v) => radarRadius(v, RADAR_SIGNED_DOMAIN));
  assert.ok(Math.abs(negs[0] - 20.835) < 1e-9);
  assert.equal(new Set(negs).size, 3, 'distinct negative values never collapse onto one point');
  assert.ok(negs.every((r) => r > 0 && r < 50), 'between the centre and the 0 ring');
  assert.ok(radarRadius(-0.4, RADAR_SIGNED_DOMAIN) < radarRadius(0, RADAR_SIGNED_DOMAIN), 'a tiny negative is still inside the 0 ring');
  assert.equal(radarRadius(-140, RADAR_SIGNED_DOMAIN), 0, 'outside the domain: centre, printed value unchanged elsewhere');
  assert.throws(() => radarRadius(null, RADAR_SIGNED_DOMAIN), /not a finite value/);
  assert.throws(() => radarRadius(NaN, RADAR_SIGNED_DOMAIN), /not a finite value/);
  assert.throws(() => radarRadius(10, [100, 100]), /lo < hi/);
});

test('legacy default stays 0-100: same radii, same five rings and the 50/100 labels', () => {
  assert.deepEqual([...RADAR_DEFAULT_DOMAIN], [0, 100]);
  for (const [v, r] of [[-12, 0], [0, 0], [37.5, 37.5], [100, 100], [140, 100]]) {
    assert.equal(radarRadius(v), r);
    assert.equal(radarRadius(v, RADAR_DEFAULT_DOMAIN), r);
  }
  assert.deepEqual(radarScale(), { signed: false, rings: [20, 40, 60, 80, 100], zero: null, labels: [50, 100] });
  assert.deepEqual(radarScale(RADAR_SIGNED_DOMAIN), { signed: true, rings: [-50, 0, 50, 100], zero: 0, labels: [-100, 0, 100] });
  assert.deepEqual([-100, 0, 100].map(ringLabelText), ['−100', '0', '100']);
});

test('ring label coordinates: half-step angle, apothem minus 3, never past the centre', () => {
  const geo = { cx: 220, cy: 174, R: 100, n: 4 };
  const close = (p, x, y) => assert.ok(Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9, `${JSON.stringify(p)} vs ${x},${y}`);
  const old = (v) => { const a = -Math.PI / 2 + Math.PI / 4; const d = (100 * v / 100) * Math.cos(Math.PI / 4) - 3; return [220 + d * Math.cos(a), 174 + d * Math.sin(a)]; };
  close(ringLabelPoint(50, geo), ...old(50));   // legacy placement is unchanged
  close(ringLabelPoint(100, geo), ...old(100));
  const h = Math.SQRT1_2;                       // cos(pi/4) = sin(pi/4)
  close(ringLabelPoint(0, geo, RADAR_SIGNED_DOMAIN), 220 + (50 * h - 3) * h, 174 - (50 * h - 3) * h);
  close(ringLabelPoint(100, geo, RADAR_SIGNED_DOMAIN), 220 + (100 * h - 3) * h, 174 - (100 * h - 3) * h);
  close(ringLabelPoint(-100, geo, RADAR_SIGNED_DOMAIN), 220, 174);
  close(ringLabelPoint(0, geo, RADAR_SIGNED_DOMAIN), ...old(50));
});

async function loadRadar() {
  const url = new URL('../components/JevRadars.tsx', import.meta.url);
  const stub = `data:text/javascript;base64,${Buffer.from('export const JEV_TYPE_LABEL = {}; export const jevRowArch = (r) => r.cls; export const jevTypeVarName = (c) => "--t-" + c;').toString('base64')}`;
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

const series = [{ name: 'A', stroke: 'red', dashed: false, square: false }, { name: 'B', stroke: 'blue', dashed: true, square: true }];
const size = { w: 440, h: 340, r: 100 };
// size → cx = 220, cy = 174, R = 100 in full-label mode; spoke 0 points straight up.
const spokes = (a, b, thinB = [false, false, false, false], textsB) => ['Easy', 'Standard', 'Judge', 'Hard'].map((label, i) => ({
  key: `s${i}`, lines: [label], tip: '', values: [a[i], b[i]], thin: [false, thinB[i]],
  texts: [Number.isFinite(a[i]) ? a[i].toFixed(1) : '—', textsB?.[i] ?? (Number.isFinite(b[i]) ? b[i].toFixed(1) : '—')],
}));
const seriesHtml = (html, k) => html.split(`data-bh-jev12-radar-series="${k}"`)[1].split('</g>')[0];

test('rendered signed Radar: a complete all-zero series is a full polygon on the 0 ring; a sparse series keeps its gaps', async () => {
  const { Radar } = await loadRadar();
  // A: measured 0.0 on every spoke (n >= 30). B: one finite negative, one measured value, one missing, one under-30 cell.
  const html = renderToStaticMarkup(React.createElement(Radar, {
    spokes: spokes([0, 0, 0, 0], [-58.33, 40, null, 12], [false, false, false, true], [undefined, undefined, '—', 'n=16']),
    series, size, id: 'sg', title: 'Use cases', desc: 'd', domain: RADAR_SIGNED_DOMAIN,
  }));
  assert.match(html, /data-bh-radar-label-mode="full"/);
  assert.match(html, /data-bh-radar-domain="signed"/);
  const a = seriesHtml(html, 'a');
  assert.match(a, /data-bh-radar-shape="polygon"/);
  assert.match(a, /<polygon points="220,124 270,174 220,224 170,174"/, 'all-zero series: a full polygon at half radius, not a point');
  const b = seriesHtml(html, 'b');
  assert.equal((b.match(/<rect /g) ?? []).length, 2, 'B: only the two plottable cells get markers (no fake vertex for missing / n=16)');
  assert.doesNotMatch(b, /<polygon /, 'no fill for a series with gaps');
  assert.match(b, /<rect x="216\.5" y="149\.665"/, '-58.33 at radius 20.835 on the top spoke (marker centre 220,153.165 → x-3.5, y-3.5)');
  assert.match(b, /<rect x="286\.5" y="170\.5"/, '40 at radius 70 on the right spoke');
  assert.match(html, /data-bh-radar-zero-ring=""/, 'the 0 ring is drawn and marked');
  assert.match(html, /stroke-width="1\.8"[^>]*data-bh-radar-zero-ring/, 'the 0 ring is the prominent one');
  assert.deepEqual([...html.matchAll(/data-radar-ring="true">([^<]+)</g)].map((m) => m[1]), ['−100', '0', '100']);
  assert.match(html, /<desc id="sg-d">d Linear signed scale: −100 at the centre, 0 on the bold middle ring, 100 at the rim\.<\/desc>/);
  assert.match(html, /data-bh-radar-scale="signed">Linear signed scale/);
  assert.match(html, />-58\.3</, 'the label prints the value text');
  assert.match(html, /aria-label="B, Easy: -58\.3"/, 'the hit target / tooltip keeps the true printed value');
  assert.doesNotMatch(html, /NaN/);
  // The polygon-vs-points decision is unchanged: it depends on which cells are plottable, not on the domain.
  const present = [-58.33, 40, null, 12].map((v, i) => plottable(v, i === 3));
  assert.deepEqual(present, [true, true, false, false]);
  assert.notEqual(radarShape(present).kind, 'polygon');
  assert.equal(radarShape([0, 0, 0, 0].map((v) => plottable(v, false))).kind, 'polygon');
  assert.deepEqual(categoryCell([0, 94, 94]), { value: 0, thin: false, n: 94, text: '0.0' }, 'value and n are untouched');
});

test('rendered default Radar is the legacy 0-100 scale: zeros collapse to the centre as before, 20-100 rings, 50/100 labels', async () => {
  const { Radar } = await loadRadar();
  const html = renderToStaticMarkup(React.createElement(Radar, { spokes: spokes([0, 0, 0, 0], [50, 50, 50, 50]), series, size, id: 'lg', title: 'Axes', desc: 'd' }));
  assert.doesNotMatch(html, /data-bh-radar-domain|data-bh-radar-zero-ring|data-bh-radar-scale/);
  assert.match(seriesHtml(html, 'a'), /<polygon points="220,174 220,174 220,174 220,174"/);
  assert.match(seriesHtml(html, 'b'), /<polygon points="220,124 270,174 220,224 170,174"/, '50 at half radius on 0-100');
  assert.deepEqual([...html.matchAll(/data-radar-ring="true">([^<]+)</g)].map((m) => m[1]), ['50', '100']);
  assert.equal((html.match(/<polygon points="[^"]*" fill="none"/g) ?? []).length, 5, 'five grid rings');
  assert.match(html, /<desc id="lg-d">d<\/desc>/);
});

test('only the category figures in JevCompareV15 pass the signed domain; V14, ImageJev four-axis and topic radars keep the default', () => {
  const v15 = src('components/JevCompareV15.tsx');
  assert.match(v15, /spokes, domain: RADAR_SIGNED_DOMAIN as RadarDomain, missing:/, 'set on categoryFigures');
  assert.equal((v15.match(/RADAR_SIGNED_DOMAIN/g) ?? []).length, 2, 'imported once, used once (category figures only)');
  assert.match(v15, /domain=\{f\.domain\}/);
  const fixed = v15.match(/const figures:[\s\S]*?\]\.filter/)?.[0] ?? '';
  assert.ok(fixed && !/domain:/.test(fixed.split('}[] = [')[1]), 'axes, types and tier figures carry no domain (legacy 0-100)');
  assert.match(v15, /0 = at or below chance; negative averages are reported as 0/, 'a clipped metric never calls 0 exact chance');
  assert.match(v15, /data-bh-radar-zero-note="clipped">A point on the bold 0 ring/);
  for (const f of ['components/JevCompareV14.tsx', 'components/ImageJevRadar.tsx', 'components/JevHistoricalSupplement.tsx']) {
    assert.doesNotMatch(src(f), /RADAR_SIGNED_DOMAIN|domain=/, f);
  }
  const radars = src('components/JevRadars.tsx');
  assert.match(radars, /domain = RADAR_DEFAULT_DOMAIN/, 'the Radar default is 0-100');
  assert.doesNotMatch(radars, /<Radar [^>]*domain=/, 'the hub axis/topic radars and JevPairRadar pass no domain');
  assert.doesNotMatch(v15 + radars, /Math\.min\(\.\.\.|Math\.max\(\.\.\.[^)]*values/, 'no data-driven domain');
});
