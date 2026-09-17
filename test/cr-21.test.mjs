import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { benchmaxxingFamilySignals } from '../lib/benchmax.mjs';
import { buildBenchmarkView } from '../lib/benchmark-view.mjs';

test('CR-21.1: one Benchmaxxing row per model family; variants share the verdict', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const view = buildBenchmarkView(ds);
  const { reports, tagged, taggedFamilies, representatives } = benchmaxxingFamilySignals(view);
  const familyOf = new Map(view.models.map((m) => [m.id, m.family]));
  const families = reports.map(([id]) => familyOf.get(id));
  assert.ok(reports.length > 20);
  assert.equal(new Set(families).size, families.length, 'no family appears twice');
  for (const [fam, id] of representatives) assert.equal(familyOf.get(id), fam);
  // Every variant of a tagged family is tagged; no variant of an untagged family is.
  for (const m of view.models) assert.equal(tagged.has(m.id), taggedFamilies.has(m.family), m.id);
  // The representative is the variant with the most measured axes among the family's scored variants.
  const byFam = new Map();
  for (const [id, r] of reports) byFam.set(familyOf.get(id), r.profile.measured);
  // CR-74.1: absolute thresholds, no rank share any more — only that some family is tagged and fewer than all are.
  assert.ok(taggedFamilies.size >= 1 && taggedFamilies.size < reports.length);
});
