import assert from 'node:assert/strict';
import test from 'node:test';
import contextData from '../data/jevbench-context-length.json' with { type: 'json' };
import { readFileSync } from 'node:fs';

const SEALED_MARKERS = [
  'jevbench-sealed',
  'sealed item',
  'gold answer',
  'prediction',
  'question text',
];

test('context-length dataset covers the frozen public v1.4.1 rows without invented limits', () => {
  assert.equal(contextData.sourceDataset, 'JevBench v1.4.1 public split');
  assert.equal(contextData.capacitySystems.length, 82);
  assert.equal(new Set(contextData.capacitySystems.map((row) => row.key)).size, 82);
  assert.equal(contextData.capacitySystems.filter((row) => row.rank != null).length, 77);
  assert.equal(contextData.capacitySystems.filter((row) => row.rank == null).length, 5);
  assert.equal(contextData.capacitySystems.filter((row) => row.maxContextTokens == null).length, 8);
  assert.deepEqual(
    Object.fromEntries(Object.entries(contextData.capacitySystems.reduce((counts, row) => {
      counts[row.type] = (counts[row.type] ?? 0) + 1;
      return counts;
    }, {}))),
    { 'API cap': 16, 'Trained length': 45, 'Hard limit': 13, Unknown: 8 },
  );
  for (const row of contextData.capacitySystems) {
    assert.ok(row.sourceUrl, `${row.key} needs a primary source URL`);
    assert.match(row.sourceDate, /^\d{4}-\d{2}-\d{2}$/);
    if (row.maxContextTokens == null) assert.equal(row.type, 'Unknown', `${row.key} unknown limit must be labelled`);
    else assert.ok(row.maxContextTokens > 0, `${row.key} limit must be positive`);
  }
});

test('length analysis only includes reconciled public telemetry and records exclusions', () => {
  assert.equal(contextData.lengthSystems.length, 13);
  assert.equal(contextData.excludedLengthSystems.length, 2);
  assert.deepEqual(contextData.excludedLengthSystems.map((row) => row.key), ['jevk5-v02', 'system-one-open']);
  for (const row of contextData.lengthSystems) {
    assert.equal(row.outcomes, 231);
    assert.ok(row.lengthCoverage > 0 && row.lengthCoverage <= row.outcomes);
    assert.equal(row.buckets.reduce((sum, bucket) => sum + bucket.n, 0), row.lengthCoverage);
    assert.ok(row.buckets.every((bucket) => bucket.correct >= 0 && bucket.correct <= bucket.n));
  }
  assert.equal(contextData.longPolicyItems, 19);
  assert.equal(contextData.longPolicySystems.length, 14);
  assert.deepEqual(contextData.bucketLabels, ['<2k', '2–8k', '8–16k', '16–64k', '64–256k', '256k–1M', '≥1M']);
  for (const row of contextData.lengthSystems) assert.deepEqual(row.buckets.map((bucket) => bucket.label), contextData.bucketLabels);
});

test('context page uses theme-aware labels and charts exact limits with distinct training markers', () => {
  const source = readFileSync(new URL('../components/JevContextLength.tsx', import.meta.url), 'utf8');
  assert.match(source, /fill="var\(--muted\)"/);
  assert.match(source, /data-bh-jev-context-top-five/);
  assert.match(source, /data-bh-jev-context-capacity-chart/);
  assert.match(source, /data-bh-jev-context-capacity-row=\{row\.key\}/);
  assert.match(source, /<ol[^>]*aria-label="Published context limits by system"/);
  assert.match(source, /<div className="relative h-6" aria-hidden="true">/);
  // F-182 (Fable pass 34): the training markers stay distinct, but the page spells them in words.
  assert.match(source, /Trained sequence length/);
  assert.match(source, /Training state limit/);
  // Review gate 2026-09-25: the helper moved to components/jevFieldNames.tsx, because the hub's cost
  // bases quote the same keys. This file now carries no dataset key at all, and still routes sourced
  // prose through the shared helper that sets a quoted one in code type.
  assert.equal(/max_seq_len|long_policy|usage\.input_tokens/.test(source), false, 'no dataset keys in the page copy');
  assert.match(source, /import \{ withFieldNames \} from '\.\/jevFieldNames'/);
  assert.match(source, /withFieldNames\(row\.basis\)/);
});

test('F-180: the context table and its notes are disclosures, and the chart lists 25 bars first', () => {
  const source = readFileSync(new URL('../components/JevContextLength.tsx', import.meta.url), 'utf8');
  assert.match(source, /<summary[^>]*>All \{rows\.length\} limits as a table<\/summary>/);
  assert.match(source, /data-bh-jev-context-notes/);
  assert.match(source, /Notes for \{rows\.length\} systems/);
  assert.equal(source.includes('Basis, training and serving notes'), false, 'no per-row disclosure survives');
  assert.equal(source.includes('Sort by selecting a column heading'), false, 'the instruction sentence is gone');
  assert.match(source, /const CAPACITY_TOP = 25;/);
  assert.match(source, /data-bh-jev-context-capacity-more/);
  assert.match(source, /bh-ctx-sticky/);
});

test('F-180: the pinned name cell is scoped to the context table in the stylesheet', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  assert.match(css, /\[data-bh-jev-context-table\] \.bh-ctx-sticky \{[^}]*position: sticky;[^}]*left: 0;/);
});

test('F-185: the drawn axis is the range the data occupies and thin points are marked', () => {
  const source = readFileSync(new URL('../components/JevContextLength.tsx', import.meta.url), 'utf8');
  assert.match(source, /const THIN_BUCKET = 20;/);
  assert.match(source, /data-bh-thin/);
  assert.match(source, /data-bh-jev-context-empty-buckets/);
  // the seven buckets stay in the data even when the axis draws fewer
  const active = new Set();
  for (const system of contextData.lengthSystems) for (const bucket of system.buckets) if (bucket.accuracy != null) active.add(bucket.label);
  assert.ok(active.size < contextData.bucketLabels.length, 'today at least one bucket is empty for every system');
  assert.deepEqual([...active], contextData.bucketLabels.filter((label) => active.has(label)));
  const thin = contextData.lengthSystems.flatMap((system) => system.buckets.filter((bucket) => bucket.accuracy != null && bucket.n < 20));
  assert.ok(thin.length > 0, 'the hollow-point rule has at least one row to describe today');
});

test('public context artifact contains no sealed item-level material', () => {
  const serialized = JSON.stringify(contextData).toLowerCase();
  for (const marker of SEALED_MARKERS) assert.equal(serialized.includes(marker), false, `unexpected marker: ${marker}`);
  for (const row of contextData.capacitySystems) {
    assert.equal(typeof row.basis, 'string');
    assert.equal('question' in row, false);
    assert.equal('gold' in row, false);
    assert.equal('prediction' in row, false);
  }
});
