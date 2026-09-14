import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildState, datedEstimates, isAaUnratedPlaceholder } from '../lib/benchmark-history.mjs';

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

// F-78 residue: history states retained before the ingest fix still hold the placeholder as value 0.
test('history: a retained AA Elo 0 is never read as a value; other Elo sources and non-zero AA Elo are', () => {
  const aa = 'https://artificialanalysis.ai/models/gpt-5-6-sol';
  assert.equal(isAaUnratedPlaceholder({ unit: 'Elo', value: 0, source_url: aa }), true);
  assert.equal(isAaUnratedPlaceholder({ unit: 'Elo', value: -44.77, source_url: aa }), false);
  assert.equal(isAaUnratedPlaceholder({ unit: 'Elo', value: 0, source_url: 'https://lmarena.ai/' }), false);
  assert.equal(isAaUnratedPlaceholder({ unit: 'percent', value: 0, source_url: aa }), false);
  assert.equal(isAaUnratedPlaceholder({ unit: 'Elo', value: 0, source_url: 'https://notartificialanalysis.ai/x' }), false);

  // Synthetic fixture values, not production claims.
  const obs = (id, value) => ({ id, value, benchmark_id: 'aa-briefcase::1', basis: 'measured', unit: 'Elo',
    subject: { model_id: `model:${id}`, source_id: `src:${id}`, name: `Model ${id}`, harness: null, variant: null },
    source: { url: aa, retrieved_at: '2026-09-10', published_at: null, file: 'fixture.json', locator: `row ${id}` } });
  const anchors = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const old = buildState([...anchors.map((id, i) => obs(id, 1000 + 20 * i)), obs('unrated', 0), obs('rated', 1030)], { state_id: 'S0', source: 'synthetic', collected_at: '2026-09-10T00:00:00.000Z' });
  assert.ok(old.rows.some((r) => r.value === 0), 'fixture state keeps the zero row, as the pre-fix states do');
  const out = datedEstimates(anchors.map((id, i) => obs(id, 1000 + 20 * i)), { entries: [{ id: 'aa-briefcase::1', family: 'aa-briefcase', version: '1', status: 'active', scoring: { unit: 'Elo', metric: 'Elo', higher_better: true } }] }, [old]);
  assert.ok(out.some((e) => e.subject_name === 'Model rated'), 'a real retained rating still yields an estimate');
  assert.ok(!out.some((e) => e.subject_name === 'Model unrated'), 'the placeholder zero produced a historical estimate');
});
