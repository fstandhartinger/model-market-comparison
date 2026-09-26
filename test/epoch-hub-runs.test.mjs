import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseDeepSweId } from '../lib/coding-identity.mjs';

// 2026-09-16 (iteration 80, CR-30.2): FrontierMath Tiers 1–3 v2, Tier 4 v2 and SimpleQA Verified as Epoch AI runs them,
// from the committed CSV members of Epoch's Benchmarking Hub archive.
// 2026-09-26 (CR-173): +2 rows each on the two FrontierMath boards (muse-spark-1.3 max/xhigh) from the 2026-09-26 archive
// capture, added through `additional_sources` with an allow-list; the 2026-09-16 rows are unchanged.
const IDS = { 'frontiermath-tiers-1-3::v2': 108, 'frontiermath-tier-4::v2': 64, 'simpleqa-verified::snapshot-2026-09-16': 80 };
const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

test('Epoch hub runs: the collector reproduces the committed observations from the committed evidence alone', () => {
  const out = execFileSync('python3', ['-B', '-c', String.raw`
import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('c','scripts/collect-public-benchmarks.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
ids=json.loads('${JSON.stringify(Object.keys(IDS))}')
plan={'entries':[e for e in json.loads(Path('data/raw/benchmarks/collection-plan.json').read_text())['entries'] if e['benchmark_id'] in ids]}
r=m.collect(plan,json.loads(Path('data/raw/benchmarks/registry.json').read_text()))
print(json.dumps([[o['id'],o['benchmark_id'],o['subject']['source_id'],o['value']] for o in r['observations']]))
`]).toString();
  const fresh = JSON.parse(out);
  const committed = json('data/raw/benchmarks/public-observations.json').observations.filter((o) => o.benchmark_id in IDS)
    .map((o) => [o.id, o.benchmark_id, o.subject.source_id, o.value]);
  // CR-173: rows added by a later capture are appended to the committed file, so compare as sets.
  const byId = (a, b) => a[0].localeCompare(b[0]);
  assert.deepEqual([...fresh].sort(byId), [...committed].sort(byId));
  for (const [id, n] of Object.entries(IDS)) assert.equal(fresh.filter((o) => o[1] === id).length, n, id);
  // The source's own numbers, read from the CSV: Claude Fable 5.1 (max).
  const v = (id) => fresh.find((o) => o[1] === id && o[2] === 'claude-fable-5-1_max')?.[3];
  assert.equal(v('frontiermath-tiers-1-3::v2'), 0.9017543859649123);
  assert.equal(v('frontiermath-tier-4::v2'), 0.8780487804878049);
  assert.equal(v('simpleqa-verified::snapshot-2026-09-16'), 0.708);
});

test('Epoch hub runs: manual snapshots with CC BY attribution and exact slug joins only', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json').entries;
  const registry = json('data/raw/benchmarks/registry.json').entries;
  for (const id of Object.keys(IDS)) {
    assert.equal(plan.find((e) => e.benchmark_id === id).refresh, 'manual', `${id} is never fetched by the daily run`);
    assert.match(registry.find((e) => e.id === id).how_to_collect.notes, /CC BY 4\.0: attribute Epoch AI/);
  }
  const catalog = new Map(json('data/dataset.json').models.map((m) => [m.id, m]));
  const map = json('data/raw/benchmarks/identity-map.json').entries.filter((e) => e.benchmark_id in IDS);
  assert.ok(map.length >= 90, String(map.length));
  for (const e of map) {
    const { family, effort } = parseDeepSweId(e.source_id);
    const model = catalog.get(e.model_id);
    assert.equal(model.family_key, family, e.source_id);
    assert.equal(model.variant, effort ?? 'default', e.source_id);
  }
  assert.ok(!map.some((e) => e.source_id === 'qwen3.8-max-0902_xhigh'), 'a dated checkpoint slug is not rewritten into a catalog family');
});
