import { jevArchFor } from '../lib/jevbench-architecture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { jevV15FilterRows } from '../lib/jevbench-v15-filter-rows.mjs';

const artifact = JSON.parse(await readFile(new URL('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.5-results.json', import.meta.url), 'utf8'));

test('CR-269: filter metadata maps exact release fields and preserves missing parameter counts', () => {
  const rows = jevV15FilterRows(artifact, { previousKeys: ['cygnet', 'jev-1.13.0'] });
  const cygnet = rows.find((row) => row.key === 'cygnet');
  assert.equal(cygnet.provider, 'blockbrain');
  assert.equal(cygnet.family, null, 'model class is not a family identifier');
  assert.equal(cygnet.modelType, jevArchFor('jevbench', artifact.systems.find((row) => row.key === 'cygnet')).arch);
  assert.equal(cygnet.openStatus, 'yes');
  assert.equal(cygnet.newInVersion, false);
  assert.equal(cygnet.parametersB, null, 'v1.5.5 has no explicit parameter-count field');

  const jev = rows.find((row) => row.key === 'jev-1.13.0');
  assert.equal(jev.api, true);
  assert.equal(jev.apiPricePer1000, artifact.systems.find((row) => row.key === jev.key).cost.usd_per_1000);
  assert.equal(jev.basePricePer1000, null, 'unknown base pricing stays unknown');
  const explicitFamily = artifact.systems.find((row) => row.underlying && row.underlying !== 'closed');
  assert.equal(rows.find((row) => row.key === explicitFamily.key).family, explicitFamily.underlying);
  const booleanOpen = artifact.systems.find((row) => row.open === true);
  const weightOpen = artifact.systems.find((row) => row.open === 'open weights' || row.open === 'weights');
  if (booleanOpen) assert.equal(rows.find((row) => row.key === booleanOpen.key).openStatus, 'yes');
  if (weightOpen) assert.equal(rows.find((row) => row.key === weightOpen.key).openStatus, 'weights');
});

test('CR-269: documented base-model price floors and alternate tariffs remain distinct', () => {
  const rows = jevV15FilterRows(artifact);
  const floor = artifact.systems.find((row) => /(?:price floor|base[- ]model reference price)/i.test(row.cost?.basis ?? '')
    && !/no (?:exact )?base[- ]model floor applies/i.test(row.cost?.basis ?? ''));
  assert.ok(floor, 'fixture includes an explicit base-model price floor');
  const mappedFloor = rows.find((row) => row.key === floor.key);
  assert.equal(mappedFloor.basePricePer1000, floor.cost.usd_per_1000);
  assert.equal(mappedFloor.apiPricePer1000, null);

  const alternative = artifact.systems.find((row) => row.alt?.usd_per_1000 != null);
  assert.ok(alternative, 'fixture includes a separate price scenario');
  const mappedAlternative = rows.find((row) => row.key === alternative.key);
  assert.equal(mappedAlternative.alternativePricePer1000, alternative.alt.usd_per_1000);
  assert.notEqual(mappedAlternative.basePricePer1000, alternative.alt.usd_per_1000);
});

test('CR-269: eligibility uses caller-supplied cap result and keeps its reason', () => {
  const rows = jevV15FilterRows(artifact, {
    eligibilityByKey: new Map([
      ['cygnet', { status: 'eligible', reason: 'inside the selected cost and latency caps' }],
      ['winnow-12b', { status: 'outside', reason: 'latency exceeds the selected cap' }],
    ]),
  });
  assert.deepEqual([rows.find((row) => row.key === 'cygnet').eligibility, rows.find((row) => row.key === 'cygnet').eligibilityReason],
    ['eligible', 'inside the selected cost and latency caps']);
  assert.deepEqual([rows.find((row) => row.key === 'winnow-12b').eligibility, rows.find((row) => row.key === 'winnow-12b').eligibilityReason],
    ['outside', 'latency exceeds the selected cap']);
  assert.equal(rows.find((row) => row.key === 'djev').eligibility, 'unknown');
});

test('CR-269: addendum version and revision links are derived from artifact metadata', () => {
  const rows = jevV15FilterRows(artifact, { previousKeys: ['cygnet'], revisionHref: '/jev-models/v1.5.5' });
  const newcomer = artifact.systems.find((row) => row.addendum?.release);
  assert.ok(newcomer, 'fixture includes an addendum model');
  const mapped = rows.find((row) => row.key === newcomer.key);
  assert.equal(mapped.versionAdded, newcomer.addendum.release);
  assert.equal(mapped.newInVersion, true);
  assert.equal(mapped.revisionNotesHref, '/jev-models/v1.5.5#jev15-addendum');
});

test('CR-269: not-measured roster entries are present without fabricated scores', () => {
  const rows = jevV15FilterRows(artifact);
  for (const row of artifact.not_measured ?? []) {
    const mapped = rows.find((candidate) => candidate.key === row.key);
    assert.ok(mapped, `${row.key} is searchable in the grid/filter options`);
    assert.equal(mapped.eligibility, 'unknown');
    assert.equal(mapped.costPer1000, null);
    assert.equal(mapped.p50, null);
    assert.equal(mapped.p95, null);
    assert.equal(mapped.parametersB, null);
  }
});
