// D180 (2026-09-23): the CR-128 ingest attached Epoch's ECI input table (`eci_benchmarks.csv`,
// column `performance`) to four registry identities whose declared metric is Epoch's
// "Best score (across scorers)" from the benchmarking-hub export. The two files publish two
// different statistics of the same runs — `performance` is chance-normalised with a
// per-benchmark baseline — so three boards ended up carrying two different measured values for
// one configuration, and the newer, wrong one was the one the site showed.
//
// `withholdConflictingSourceRows` could not see it: it groups by source URL on purpose, so a
// duplicate that arrives from a *second* file is invisible to it. These checks cover that gap
// and pin the withdrawal so the value cannot return through the history bridge either.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { datedEstimates } from '../lib/benchmark-history.mjs';

const readJson = async (name) => JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));
const ECI_URL = 'https://epoch.ai/data/eci_benchmarks.csv';

test('no benchmark identity publishes two different measured values for one model configuration', async () => {
  const dataset = await readJson('data/dataset.json');
  const groups = new Map();
  for (const o of dataset.benchmark_results.observations) {
    if (!o.subject?.model_id || (o.source_basis ?? o.basis) !== 'measured') continue;
    // Deliberately *not* keyed by source url: the point is that two sources may not disagree
    // under one identity either. Harness stays in the key — a board that runs several harnesses
    // publishes several legitimate rows and labels them (aa-coding-agent-index).
    const key = [o.benchmark_id, o.subject.model_id, o.subject.harness ?? ''].join('|');
    if (!groups.has(key)) groups.set(key, new Map());
    groups.get(key).set(o.value, (o.source?.url ?? '?'));
  }
  const conflicts = [...groups].filter(([, values]) => values.size > 1)
    .map(([key, values]) => `${key} → ${[...values].map(([v, url]) => `${v} (${url})`).join(' vs ')}`);
  assert.deepEqual(conflicts, []);
});

test('the withdrawn Epoch ECI rows are recorded, reasoned, and not published', async () => {
  const manual = await readJson('data/raw/benchmarks/manual-board-observations.json');
  // CR-173 (2026-09-26): two non-ECI Vals rows were withdrawn later by the same mechanism, each with its own reason
  // (a superseded vals-index::2 hand row and a VCB 1-100 row attributed to the wrong compute_effort); this test pins
  // the five ECI rows, so it counts only those.
  const withdrawn = (manual.withdrawn_observations ?? []).filter((o) => o.source?.url === ECI_URL);
  assert.equal(withdrawn.length, 5, 'the five eci_benchmarks.csv rows stay in the file as evidence');
  assert.ok((manual.withdrawn_observations ?? []).every((o) => typeof o.withdrawn_reason === 'string' && o.withdrawn_reason.length > 40));
  assert.ok(withdrawn.every((o) => o.source?.url === ECI_URL));
  // Nothing is withdrawn silently: a row without a reason fails the ingest, and this pins it.
  assert.ok(withdrawn.every((o) => typeof o.withdrawn_reason === 'string' && o.withdrawn_reason.includes('D180')));
  assert.ok(manual.observations.every((o) => o.source?.url !== ECI_URL), 'none is still published');

  const scores = await readJson('data/raw/benchmarks/scores.json');
  assert.ok(scores.observations.every((o) => o.source?.url !== ECI_URL));
  // Each one must reach the snapshot as a *withheld* rejection carrying its locator — that is what
  // stops `datedEstimates` from reviving it out of a retained state.
  const withheld = scores.rejected.filter((r) => r.withheld && r.reason?.includes('D180'));
  assert.equal(withheld.length, 5);
  assert.ok(withheld.every((r) => typeof r.locator === 'string' && r.locator.length > 0));
});

test('the withdrawn values do not come back as historical estimates', async () => {
  const dataset = await readJson('data/dataset.json');
  const withdrawnValues = new Set([0.9436026936026937, 0.7053872053872053, 0.8237497246089448, 0.976]);
  const revived = dataset.benchmark_results.historical.estimates.filter((e) =>
    ['epoch-gpqa-diamond', 'chess-puzzles', 'mystery-game-puzzles', 'frontiermath-tier-4', 'otis-mock-aime'].includes(e.family)
    && withdrawnValues.has(e.source_value));
  assert.deepEqual(revived.map((e) => `${e.benchmark_id}#${e.subject_name}#${e.source_value}`), []);
});

test('a withheld locator suppresses the estimate a retained state would otherwise produce', () => {
  const B = 'epoch-gpqa-diamond::snapshot-2026-09-18';
  const registry = { entries: [{ id: B, family: 'epoch-gpqa-diamond', version: 'snapshot-2026-09-18', status: 'active', scoring: { unit: 'fraction', higher_better: true } }] };
  const locator = 'Epoch: GPQA diamond; gpt-6-astra_max; exact source excerpt';
  const st = (m, v, extra = {}) => ({ benchmark_id: B, model_key: `${m}||`, model_id: m, subject_name: m, harness: null, variant: null,
    value: v, unit: 'fraction', basis: 'measured', source_url: 'https://x', source_retrieved_at: '2026-09-22T00:00:00Z', source_locator: null, ...extra });
  const states = [{ state_id: 's1', collected_at: '2026-09-23T00:00:00Z',
    rows: [st('gpt-6-astra::max', 0.9436026936026937, { source_locator: locator }), st('a::default', 0.5), st('b::default', 0.4), st('c::default', 0.3), st('d::default', 0.2)] }];
  const ob = (m, v) => ({ id: m, benchmark_id: B, basis: 'measured', value: v, subject: { source_id: m, name: m, model_id: m, variant: null, harness: null }, source: { url: 'https://x', retrieved_at: '2026-09-23' } });
  const obs = [ob('a::default', 0.51), ob('b::default', 0.41), ob('c::default', 0.31), ob('d::default', 0.21)];
  assert.equal(datedEstimates(obs, registry, states).filter((e) => e.model_id === 'gpt-6-astra::max').length, 1,
    'without the withheld locator the retained row becomes an estimate');
  assert.equal(datedEstimates(obs, registry, states, [{ benchmark_id: B, locator }]).filter((e) => e.model_id === 'gpt-6-astra::max').length, 0);
  // D187: the locator is withheld on its own board only — the same string on another board is another row.
  assert.equal(datedEstimates(obs, registry, states, [{ benchmark_id: 'other::1', locator }]).filter((e) => e.model_id === 'gpt-6-astra::max').length, 1);
});

test('the four Epoch identities still say which statistic they carry', async () => {
  const registry = await readJson('data/raw/benchmarks/registry.json');
  for (const id of ['epoch-gpqa-diamond::snapshot-2026-09-18', 'chess-puzzles::snapshot-2026-09-18',
    'mystery-game-puzzles::snapshot-2026-09-18', 'frontiermath-tier-4::v2']) {
    const entry = registry.entries.find((e) => e.id === id);
    assert.ok(entry, id);
    assert.match(entry.scoring.metric, /Best score across scorers/,
      `${id} is defined by Epoch's best-score column; a row carrying another statistic belongs to another identity`);
  }
});
