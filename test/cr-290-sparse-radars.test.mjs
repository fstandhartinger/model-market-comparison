import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { radarShape, presentRuns } from '../lib/radar-shape.mjs';
import { jevbenchCategoryView, imageJevCategoryView, RADAR_MIN_N } from '../lib/jevbench-categories.mjs';

// CR-290 radar correction (Florian 5 Oct 2026 ~20:30, correction to CR-290 item 6): radar spokes only for well-measured categories
// (n >= 30); low-n categories in a table below; a sparse series is points only, never a line through gaps.
const src = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const P = (s) => [...s].map((c) => c === '1');

test('radarShape: complete = polygon, sparse = points, half with a run of 3 = lines along the run only', () => {
  assert.equal(radarShape(P('1111')).kind, 'polygon');
  assert.equal(radarShape(P('0000')).kind, 'none');
  assert.equal(radarShape(P('11100000')).kind, 'points', '3 of 8 is under half');
  assert.equal(radarShape(P('10101010')).kind, 'points', 'half, but no three adjacent');
  assert.equal(radarShape(P('1100')).kind, 'points', 'two adjacent of four');
  assert.equal(radarShape(P('101010')).kind, 'points', 'open-only cells on the request-type radar');
  assert.deepEqual(radarShape(P('1111000')), { kind: 'runs', runs: [[0, 1, 2, 3]] });
  assert.deepEqual(radarShape(P('1101111')), { kind: 'runs', runs: [[3, 4, 5, 6, 0, 1]] }, 'runs wrap around the circle');
  assert.deepEqual(radarShape(P('11101100')), { kind: 'runs', runs: [[0, 1, 2]] }, 'the pair 4-5 stays two loose points');
});

test('presentRuns finds maximal circular runs', () => {
  assert.deepEqual(presentRuns(P('1001')), [[3, 0]]);
  assert.deepEqual(presentRuns(P('0110110')), [[1, 2], [4, 5]]);
});

test('category radars plot only categories with at least 30 items; the rest are low-sample rows, "Other" never', () => {
  assert.equal(RADAR_MIN_N, 30);
  const jev = jevbenchCategoryView('v1.6.0', ['jev-1.13.0']);
  const img = imageJevCategoryView('v0.1.5', []);
  for (const view of [jev, img]) {
    assert.equal(view.radarMinN, 30);
    for (const dim of view.dims) {
      for (const c of dim.cats) {
        assert.equal(c.plotted, c.n >= 30 && c.key !== 'other', `${dim.key}.${c.key}`);
        assert.equal(c.lowSample, c.n > 0 && c.n < 30 && c.key !== 'other', `${dim.key}.${c.key}`);
      }
      assert.ok(dim.cats.filter((c) => c.plotted).length >= 3, `${dim.key}: at least three spokes`);
    }
  }
  const uc = jev.dims.find((d) => d.key === 'usecases').cats;
  for (const key of ['code_linting', 'demand_forecasting']) {
    const c = uc.find((x) => x.key === key);
    assert.ok(c.lowSample && !c.plotted, `${key} (n=${c.n}) is a table row, not a spoke`);
  }
});

test('Jev 1.13.0 on the v1.6.0 use-case radar is points only (values on under half the spokes)', () => {
  const view = jevbenchCategoryView('v1.6.0', ['jev-1.13.0']);
  const dim = view.dims.find((d) => d.key === 'usecases');
  const present = dim.cats.filter((c) => c.plotted).map((c) => (view.systems['jev-1.13.0'].usecases[c.key]?.[1] ?? 0) >= view.radarMinN);
  assert.equal(radarShape(present).kind, 'points');
});

test('the compare view wires the rules: cell threshold, low-sample table, one-line note, no bridging', () => {
  const compare = src('components/JevCompareV15.tsx'), radar = src('components/JevRadars.tsx');
  assert.match(compare, /v\[1\] < cats\.radarMinN/);
  assert.match(compare, /<LowSampleTable dim=\{f\.dim\}/);
  assert.match(compare, /Low sample, n &lt; \{cats\.radarMinN\} — indicative only/);
  assert.match(compare, /full radar after the next re-measure/);
  assert.match(radar, /shape\.runs\.map\(\(run\) => <polyline/);
  assert.doesNotMatch(radar, /byIndex\[\(i \+ 1\) % byIndex\.length\]/, 'no neighbour-pair segments any more');
});
