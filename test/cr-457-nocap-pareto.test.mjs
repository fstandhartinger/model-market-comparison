// CR-457 (12 Oct 2026): /jev-models?costcap=none&latcap=none crashed ("RangeError: Invalid array length") because the
// Pareto charts put the Infinity limit into the log domain, so logTicks looped until the array overflowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('CR-457: Pareto chart domain ignores a non-finite (no cap) limit', async () => {
  const src = await readFile(new URL('../components/JevParetoCharts.tsx', import.meta.url), 'utf8');
  assert.match(src, /const limits = Number\.isFinite\(limit\) && limit > 0 \? \[limit\] : \[\];/);
  assert.doesNotMatch(src, /Math\.(min|max)\(\.\.\.values, limit\)/);
});
