import test from 'node:test';
import assert from 'node:assert/strict';
import { COST_AXIS, LABEL_LIMIT, SIMPLE_LIMIT, QUADRANT_NOTE, annotationBox, attractiveQuadrant, costAxisCaption, expandedCandidateFamilies, labelCandidates, placeLabels, topCandidates } from '../lib/value-map.mjs';

const offset = { left: 40, top: 20, width: 800, height: 400 };

test('x axis: cost is reversed so cheaper sits right, and every caption says so', () => {
  assert.equal(COST_AXIS.reversed, true);
  assert.equal(COST_AXIS.cheaper, 'right');
  assert.equal(COST_AXIS.capability, 'up');
  const caption = costAxisCaption('lowest Adjusted $/task');
  assert.match(caption, /← more expensive/);
  assert.match(caption, /cheaper →/);
  assert.ok(caption.indexOf('more expensive') < caption.indexOf('cheaper'), 'expensive on the left, cheaper on the right');
  assert.doesNotMatch(caption, /cheaper ←/);
});

test('the highlighted quadrant is exactly the top-right quarter of the plot', () => {
  assert.deepEqual(attractiveQuadrant(offset), { x: 440, y: 20, width: 400, height: 200 });
  assert.equal(attractiveQuadrant({ ...offset, width: 0 }), null);
  assert.equal(attractiveQuadrant(undefined), null);
});

test('the quadrant note sits in the top margin at the right, outside the data area', () => {
  const box = annotationBox(offset, 10);
  assert.equal(QUADRANT_NOTE, 'Most attractive quadrant');
  assert.ok(box.b <= offset.top, 'bottom edge above the plot');
  assert.ok(box.t >= 0, 'inside the SVG');
  assert.ok(box.r <= offset.left + offset.width && box.r > offset.left + offset.width - 10, 'right-aligned to the plot');
  assert.ok(box.l > offset.left + offset.width / 2, 'within the right half');
});

const grid = (n) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, name: `Model ${i}`, cx: 60 + (i % 8) * 95, cy: 40 + Math.floor(i / 8) * 70, y: 100 - i }));

test('at most 15 models are named, even when many more labels would fit', () => {
  const labels = grid(40);
  const placed = placeLabels({ labels, dots: labels, offset: { left: 0, top: 20, width: 1000, height: 600 }, frontier: new Set(), headroom: 20 });
  assert.equal(LABEL_LIMIT, 15);
  assert.equal(placed.length, 15);
  assert.deepEqual(placed.map((p) => p.key), labels.slice(0, 15).map((l) => l.id), 'priority order is kept');
});

test('labels never overlap each other or the quadrant note, and phones name only frontier members', () => {
  const o = { left: 0, top: 22, width: 1000, height: 600 };
  const labels = [{ id: 'top', name: 'Top right model name', cx: 990, cy: 22 }, ...grid(20)];
  const placed = placeLabels({ labels, dots: labels, offset: o, frontier: new Set(), headroom: 20 });
  const note = annotationBox(o);
  const rects = placed.map((p) => ({ l: p.x, r: p.x + p.text.length * 6, t: p.y - 10, b: p.y + 2 }));
  for (const r of rects) assert.ok(!(r.l < note.r && note.l < r.r && r.t < note.b && note.t < r.b), 'no overlap with the note');
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    assert.ok(!(a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b), 'no two labels overlap');
  }
  const narrow = placeLabels({ labels: grid(10).map((l, i) => ({ ...l, cx: 20 + i * 35 })), dots: [], offset: { left: 0, top: 22, width: 360, height: 200 }, frontier: new Set(['m1']) });
  assert.deepEqual(narrow.map((p) => p.key), ['m1']);
});

test('label priority: Pareto members first, then by score', () => {
  const pts = [{ id: 'a', y: 90 }, { id: 'b', y: 95 }, { id: 'c', y: 50 }];
  assert.deepEqual(labelCandidates(pts, new Set(['c'])).map((p) => p.id), ['c', 'b', 'a']);
});

const model = (id, family_key, aa, eci) => ({ id, family_key, scores: { aa_intelligence_index: aa ?? null, epoch_eci: eci ?? null } });

test('30 candidates by AA Intelligence Index, then Epoch ECI for families AA has not measured — scales never mixed', () => {
  const models = [
    ...Array.from({ length: 28 }, (_, i) => model(`aa${i}`, `fam-aa${i}`, 20 + i)),
    model('eci-high', 'fam-eci-high', null, 160), model('eci-low', 'fam-eci-low', null, 120), model('eci-mid', 'fam-eci-mid', null, 140),
    model('none', 'fam-none'),
  ];
  const ranked = expandedCandidateFamilies(models);
  assert.equal(SIMPLE_LIMIT, 30);
  assert.equal(ranked.length, 30);
  assert.equal(ranked[0], 'fam-aa27');
  assert.equal(ranked[27], 'fam-aa0', 'every AA-measured family ranks before any ECI-only family, even with ECI 160 > AA 47');
  assert.deepEqual(ranked.slice(28), ['fam-eci-high', 'fam-eci-mid']);
  assert.ok(!ranked.includes('fam-none'), 'no invented score');
  // A family counts once, with its best variant.
  assert.deepEqual(expandedCandidateFamilies([model('x::low', 'x', 10), model('x::max', 'x', 60), model('y', 'y', 50)]), ['x', 'y']);
});

test('the 30-model step only narrows the pool the user filters already produced', () => {
  const pool = Array.from({ length: 45 }, (_, i) => ({ m: { ...model(`m${i}`, `f${i}`, i), open_weights: i % 2 === 0 } }));
  const openOnly = pool.filter((x) => x.m.open_weights); // a user filter, applied before the step
  const kept = topCandidates(openOnly, (x) => x.m);
  assert.equal(kept.length, 23, 'fewer than 30 open models: all of them, none added');
  assert.ok(kept.every((x) => x.m.open_weights), 'the filter is preserved');
  const all = topCandidates(pool, (x) => x.m);
  assert.equal(all.length, 30);
  assert.deepEqual(all.slice(0, 3).map((x) => x.m.id), ['m44', 'm43', 'm42']);
  // Variants expanded: several rows per family still cap at 30 rows.
  const variants = pool.flatMap((x) => [x, { m: { ...x.m, id: `${x.m.id}::low` } }]);
  assert.equal(topCandidates(variants, (x) => x.m).length, 30);
});
