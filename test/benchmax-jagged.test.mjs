import test from 'node:test';
import assert from 'node:assert/strict';
import { groupedRadarProfile, scoreBenchmaxxing } from '../lib/benchmax.mjs';

const axis = (id, category, values) => ({
  id, benchmarkId: id, name: id, category, family: category, version: 'v1', cohort: 'published',
  unit: 'points', higherBetter: true, scores: Object.entries(values).map(([modelId, value]) => ({ modelId, value, basis: 'measured', lowSample: false })),
});
const view = (axes) => ({
  models: [{ id: 'smooth', name: 'Smooth', org: 'Test' }, { id: 'jagged', name: 'Jagged', org: 'Test' }], axes,
});

test('groupedRadarProfile keeps semantic topic neighbors adjacent and leaves missing scores as gaps', () => {
  const v = view([
    axis('write', 'Writing', { smooth: 50, jagged: 50 }),
    axis('code-b', 'Coding', { smooth: 90, jagged: 20 }),
    axis('math', 'Math', { smooth: 45, jagged: 45 }),
    axis('code-a', 'Coding', { smooth: 88, jagged: 95 }),
    axis('missing', 'Coding', { smooth: 86 }),
  ]);
  const profile = groupedRadarProfile(v, 'jagged');
  assert.deepEqual(profile.axes.filter((a) => a.category === 'Coding').map((a) => a.id), ['code-a', 'code-b', 'missing']);
  assert.equal(profile.axes.find((a) => a.id === 'missing').value, null, 'no invented zero for missing score');
  assert.equal(profile.axes.find((a) => a.id === 'missing').missing, true);
});

test('scoreBenchmaxxing gives within-topic zig-zags more signal than smooth domain specialization', () => {
  const peers = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`p${i}`, i * 10]));
  const a = (id, category, smooth, jagged) => axis(id, category, { ...peers, smooth, jagged });
  const v = {
    models: [{ id: 'smooth', name: 'Smooth', org: 'Test' }, { id: 'jagged', name: 'Jagged', org: 'Test' }],
    axes: [
      a('code-a', 'Coding', 90, 95), a('code-b', 'Coding', 88, 20), a('code-c', 'Coding', 86, 92),
      a('writing-a', 'Writing', 30, 50), a('writing-b', 'Writing', 32, 48), a('writing-c', 'Writing', 31, 52),
    ],
  };
  const smooth = scoreBenchmaxxing(v, 'smooth');
  const jagged = scoreBenchmaxxing(v, 'jagged');
  assert.equal(smooth.status, 'scored');
  assert.equal(jagged.status, 'scored');
  assert.ok(jagged.score > smooth.score, 'within-topic oscillation outranks smooth cross-domain specialization');
  assert.ok(smooth.domainSpecialization > 0, 'specialization remains disclosed, not folded into anomaly score');
});

test('scoreBenchmaxxing reports insufficient coverage instead of synthesizing a score', () => {
  const v = view([
    axis('code-a', 'Coding', { smooth: 90, jagged: 95 }),
    axis('code-b', 'Coding', { smooth: 88 }),
    axis('code-c', 'Coding', { smooth: 86 }),
    axis('writing-a', 'Writing', { smooth: 30 }),
  ]);
  const out = scoreBenchmaxxing(v, 'jagged');
  assert.equal(out.status, 'insufficient-coverage');
  assert.equal(out.score, null);
});
