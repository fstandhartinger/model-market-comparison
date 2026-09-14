import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async (p) => JSON.parse(await readFile(p, 'utf8'));

// CR-9.3: AA marks an unrated model as { elo: 0, lower95ci: 0, upper95ci: 0 }. It must stay missing,
// never become a measured Elo of 0 in the committed scores.
test('AA Elo fields: the unrated 0 [0, 0] placeholder never becomes an observation', async () => {
  const registry = await read('data/raw/benchmarks/registry.json');
  const aa = await read('data/raw/benchmarks/aa-observed-fields.json');
  const scores = await read('data/raw/benchmarks/scores.json');
  const ids = new Set(scores.observations.map((o) => o.id));
  let placeholders = 0;
  for (const mapping of registry.aa_field_map.filter((m) => m.field.endsWith('.elo'))) {
    const parentPath = mapping.field.split('.').slice(0, -1);
    for (const row of aa.rows) {
      const parent = parentPath.reduce((v, k) => v?.[k], row.fields);
      if (parent?.elo !== 0 || parent.lower95ci !== 0 || parent.upper95ci !== 0) continue;
      placeholders++;
      assert.ok(!ids.has(`aa:${row.source_id}:${mapping.field}`), `${row.name}: ${mapping.field} placeholder ingested as a score`);
    }
  }
  assert.ok(placeholders > 0, 'fixture no longer contains a placeholder; keep the guard but revisit this test');
});
