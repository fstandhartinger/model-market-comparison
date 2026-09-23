// F-165(a) (2026-09-23): a vendor's launch number and the board's own measured run fell through to
// the same default cohort, so a model page printed two rows reading "Terminal-Bench 4.0" that a
// reader could only tell apart by the basis marker on the cell. The cohort of a launch row now names
// the vendor that produced it.
//
// This suite pins the three things that can go wrong: the extraction rule widening past launch posts,
// a launch row losing its runner, and the display collision coming back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBenchmarkView, cohortOf, cohortSubLabel, vendorRunner } from '../lib/benchmark-view.mjs';
import { humanVersion, versionSuffix } from '../lib/version-label.ts';

const ds = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const view = buildBenchmarkView(ds);
const observations = ds.benchmark_results.observations;
const launch = observations.filter((o) => vendorRunner(o.protocol));

test('the rule selects launch posts only, never board submissions', () => {
  // Measured on the live dataset when the rule was written: 97 of the 839 self-reported observations.
  // The count may grow with a new launch ingest; what must not change is that every match is a
  // self-reported row and that the rule leaves the board submissions alone.
  assert.ok(launch.length >= 97, `expected at least the 97 launch rows the rule was measured on, got ${launch.length}`);
  assert.deepEqual([...new Set(launch.map((o) => o.basis))], ['self_reported']);
  const selfReported = observations.filter((o) => o.basis === 'self_reported');
  assert.ok(selfReported.length - launch.length > 500,
    'the other self-reported rows are board submissions; if that population collapsed, the rule widened');
  // The runners are vendors, not harnesses or boards.
  for (const o of launch) assert.match(vendorRunner(o.protocol), /^[A-Z][A-Za-z0-9 .&-]*$/);
});

test('a launch row says who produced it, and keeps whatever else its protocol stated', () => {
  for (const o of launch) {
    const cohort = cohortOf(o), runner = vendorRunner(o.protocol);
    assert.equal(cohort.endsWith(`Vendor-reported by ${runner}`), true, `${o.id}: cohort "${cohort}" does not name the runner`);
    assert.notEqual(cohort, 'Published board');
    // The sub-line is what a reader sees; it must not be suppressed the way the default is.
    assert.ok(cohortSubLabel(cohort)?.includes(`Vendor-reported by ${runner}`), `${o.id}: sub-line does not name the runner`);
    // A harness the source stated still leads the cohort (F-100's labels keep working).
    if (o.subject.harness) assert.ok(cohort.startsWith(o.subject.harness), `${o.id}: harness dropped from "${cohort}"`);
  }
});

test('an independent board row is untouched by the rule', () => {
  const independent = observations.filter((o) => o.basis === 'measured' || (o.basis === 'self_reported' && !vendorRunner(o.protocol)));
  assert.ok(independent.length > 1000);
  for (const o of independent) assert.doesNotMatch(cohortOf(o), /Vendor-reported by/);
});

test('no two axes in one category read the same to a reader', () => {
  // The Compare row sub-line, composed exactly as BenchmarkCompare.tsx composes it: the version when
  // the name does not already carry it, then the cohort. This is F-165's own accept criterion; before
  // the change four groups of axes (nine axes, e.g. three "DeepSWE v1.1" rows) were indistinguishable.
  const subline = (a) => [versionSuffix(a.name, a.version) ?? (humanVersion(a.version).kind === 'snapshot' ? humanVersion(a.version).label : null),
    cohortSubLabel(a.cohort)].filter(Boolean).join(' · ');
  const seen = new Map();
  for (const a of view.axes) {
    const key = `${a.category}\u0000${a.name}\u0000${subline(a)}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(a.id);
  }
  const collisions = [...seen].filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => `${key.split('\u0000').join(' | ')} -> ${ids.join(', ')}`);
  assert.deepEqual(collisions, []);
});

test('axis ids stay stable for everything the rule does not touch', () => {
  // The cohort is part of the axis id, so this change moves ids — but only the launch axes. Anything
  // else moving would be a widened rule, and axis ids are what the benchmark-view and benchmaxxing
  // routes take as `?axis=`.
  const launchBoards = new Set(launch.map((o) => o.benchmark_id));
  const moved = view.axes.filter((a) => a.cohort.includes('Vendor-reported by'));
  assert.equal(moved.length, launchBoards.size, 'every launch board has exactly one launch axis');
  for (const a of moved) assert.ok(launchBoards.has(a.benchmarkId));
});
