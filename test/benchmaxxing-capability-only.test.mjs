// CR-64 (Florian 2026-09-16): cost and efficiency boards never enter the Benchmaxxing analysis or radar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';
import { groupedRadarProfile, scoreBenchmaxxing, benchmaxxingFamilySignals, bottomDecileTags, isCapabilityAxis } from '../lib/benchmax.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const ds = read('data/dataset.json');
const taxonomy = read('data/benchmark-taxonomy.json');
const view = buildBenchmarkView(ds);
const key = (a) => String(a.benchmarkId).split('::')[0];

test('every benchmark has an explicit kind in the taxonomy, and every cost board is marked', () => {
  const kinds = taxonomy.benchmark_kinds;
  for (const axis of [...view.axes, ...(view.indexAxes ?? [])]) {
    assert.ok(['capability', 'cost', 'efficiency'].includes(kinds[key(axis)]), `${key(axis)} has a kind`);
    assert.equal(axis.kind, kinds[key(axis)]);
  }
  for (const b of ds.benchmark_results.registry) assert.ok(kinds[key({ benchmarkId: b.id })], `${b.id} has a kind`);
  for (const axis of view.axes) if (axis.unit === 'USD' && /cost/i.test(axis.name)) assert.notEqual(axis.kind, 'capability', axis.name);
  for (const axis of view.axes) if (axis.category === 'Efficiency') assert.notEqual(axis.kind, 'capability', axis.name);
});

test('no cost or efficiency axis reaches a profile, a signal or the decile tags', () => {
  const nonCapability = new Set(view.axes.filter((a) => !isCapabilityAxis(a)).map((a) => a.id));
  assert.ok(nonCapability.size >= 12);
  for (const m of view.models) {
    const profile = groupedRadarProfile(view, m.id);
    assert.ok(profile.axes.every((a) => !nonCapability.has(a.id)), m.id);
  }
  const { reports } = benchmaxxingFamilySignals(view);
  for (const [, r] of reports) assert.ok(r.profile.axes.every((a) => !nonCapability.has(a.id)) && r.topicGaps.every((t) => t.category !== 'Efficiency'));
  const deciles = bottomDecileTags(view);
  assert.ok(deciles.perAxis.size > 0);
  for (const axisId of deciles.perAxis.keys()) assert.ok(!nonCapability.has(axisId), axisId);
});

test('the Claude Fable 5.1 report no longer carries the Vals cost-per-test spike', () => {
  const fable = view.models.find((m) => m.id.startsWith('claude-fable-5.1'));
  const report = scoreBenchmaxxing(view, fable.id);
  assert.ok(!report.profile.axes.some((a) => a.id.startsWith('vals-index-cost::')));
  assert.ok(!report.profile.axes.some((a) => a.category === 'Efficiency'));
});
