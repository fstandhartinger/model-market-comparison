// CR-65.15 (audit D6): a source that lists one model twice with different values is withheld, not resolved by order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withholdConflictingSourceRows } from '../lib/benchmark-scores.mjs';
import { datedEstimates } from '../lib/benchmark-history.mjs';

const row = (id, value, extra = {}) => ({ id, benchmark_id: 'mazur-elimination-game::snapshot-2026-09-10', basis: 'measured', value,
  subject: { source_id: 'Gemini 2.5 Pro', name: 'Gemini 2.5 Pro', model_id: 'gemini-2.5-pro::default', variant: null, harness: null },
  source: { url: 'https://raw.githubusercontent.com/lechmazur/elimination_game/main/README.md', locator: `markdown_table; source row ${id}` }, ...extra });

test('two rows of one source with different values for one model are both unjoined and recorded as withheld', () => {
  const obs = [row('124', 4.468), row('137', 3.697), { ...row('9', 5.2), subject: { ...row('9', 5.2).subject, source_id: 'Grok 4', model_id: 'grok-4::default' } }];
  const rejected = withholdConflictingSourceRows(obs);
  assert.deepEqual(obs.map((o) => o.subject.model_id), [null, null, 'grok-4::default']);
  assert.equal(rejected.length, 2);
  assert.ok(rejected.every((r) => r.withheld && r.model_id === 'gemini-2.5-pro::default' && /2 times with different values \(4\.468, 3\.697\)/.test(r.reason)));
});

test('an exact duplicate stays joined; vendor sub-scores (self-reported) are out of scope', () => {
  const same = [row('1', 4.4), row('2', 4.4)];
  assert.equal(withholdConflictingSourceRows(same).length, 0);
  assert.ok(same.every((o) => o.subject.model_id));
  const vendor = [row('r', 71.9, { basis: 'self_reported' }), row('a', 58, { basis: 'self_reported' })];
  assert.equal(withholdConflictingSourceRows(vendor).length, 0);
});

test('a withheld benchmark × model pair does not come back as a historical estimate from a retained state', () => {
  const B = 'mazur-elimination-game::snapshot-2026-09-10';
  const registry = { entries: [{ id: B, family: 'mazur-elimination-game', version: 'snapshot-2026-09-10', status: 'active', scoring: { unit: 'points', higher_better: true } }] };
  const st = (m, v) => ({ benchmark_id: B, model_key: `${m}||`, model_id: m, subject_name: m, harness: null, variant: null, value: v, unit: 'points', basis: 'measured', source_url: 'https://x', source_retrieved_at: '2026-09-10T00:00:00Z' });
  const states = [{ state_id: 's1', collected_at: '2026-09-12T00:00:00Z', rows: [st('gemini-2.5-pro::default', 4.468), st('a::default', 5), st('b::default', 4), st('c::default', 3), st('d::default', 2)] }];
  const ob = (m, v) => ({ id: m, benchmark_id: B, basis: 'measured', value: v, subject: { source_id: m, name: m, model_id: m, variant: null, harness: null }, source: { url: 'https://x', retrieved_at: '2026-09-16' } });
  const obs = [ob('a::default', 5.1), ob('b::default', 4.1), ob('c::default', 3.1), ob('d::default', 2.1)];
  assert.equal(datedEstimates(obs, registry, states).filter((e) => e.model_id === 'gemini-2.5-pro::default').length, 1, 'without the guard the retained row becomes an estimate');
  assert.equal(datedEstimates(obs, registry, states, [], [`${B}#gemini-2.5-pro::default`]).length, 0);
});

test('build check: no two measured rows of one source map to one model with different values', async () => {
  const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const groups = new Map();
  for (const o of dataset.benchmark_results.observations) {
    if (!o.subject?.model_id || (o.source_basis ?? o.basis) !== 'measured') continue;
    const key = [o.benchmark_id, o.subject.model_id, o.subject.variant ?? '', o.subject.harness ?? '', o.source?.url ?? ''].join('|');
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(o.value);
  }
  assert.deepEqual([...groups].filter(([, v]) => v.size > 1).map(([k]) => k), []);
  assert.ok(!dataset.benchmark_results.historical.estimates.some((e) => e.benchmark_id.startsWith('mazur-elimination-game') && e.model_id === 'gemini-2.5-pro::default'));
});

test('CR-65.15 (D10): Harvey LAB-AA and Vals HLAB each say they are not the same run as the other', async () => {
  const registry = JSON.parse(await readFile(new URL('../data/raw/benchmarks/registry.json', import.meta.url), 'utf8'));
  const byId = (id) => registry.entries.find((e) => e.id === id);
  assert.match(byId('aa-harvey-lab::snapshot-2026-09-10').one_sentence_description, /not the same run or scale as Vals AI's HLAB row/);
  assert.match(byId('vals-index-hlab::2').one_sentence_description, /not comparable with Artificial Analysis' Harvey LAB-AA row/);
});
