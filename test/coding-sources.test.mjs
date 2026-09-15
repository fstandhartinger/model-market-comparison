import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 2026-09-15 coding intake: DeepSWE (via Epoch AI) and Scale AI's SWE Atlas boards.
const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const IDS = ['deepswe::snapshot-2026-09-15', 'swe-atlas-qna::snapshot-2026-09-15', 'swe-atlas-test-writing::snapshot-2026-09-15', 'swe-atlas-refactoring::snapshot-2026-09-15'];
const MIN = { 'deepswe::snapshot-2026-09-15': 60, 'swe-atlas-qna::snapshot-2026-09-15': 20, 'swe-atlas-test-writing::snapshot-2026-09-15': 20, 'swe-atlas-refactoring::snapshot-2026-09-15': 15 };

test('the collector reproduces the committed observations from the committed evidence alone', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json');
  const subset = { ...plan, entries: plan.entries.filter((e) => IDS.includes(e.benchmark_id)) };
  assert.equal(subset.entries.length, 4);
  const dir = mkdtempSync(join(tmpdir(), 'bh-coding-'));
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(subset));
  execFileSync('python3', ['scripts/collect-public-benchmarks.py', '--plan', join(dir, 'plan.json'), join(dir, 'out.json')], { cwd: new URL('..', import.meta.url) });
  const fresh = JSON.parse(readFileSync(join(dir, 'out.json'))).observations;
  const committed = json('data/raw/benchmarks/public-observations.json').observations.filter((o) => IDS.includes(o.benchmark_id));
  assert.deepEqual(fresh, committed);
  for (const id of IDS) assert.ok(fresh.filter((o) => o.benchmark_id === id).length >= MIN[id], `${id} keeps its minimum coverage`);
  assert.ok(fresh.every((o) => o.basis === 'measured' && o.subject.model_id === null), 'measured; joins happen only at ingestion');
  assert.ok(fresh.filter((o) => o.benchmark_id.startsWith('deepswe')).every((o) => o.unit === 'fraction' && o.value >= 0 && o.value <= 1 && o.subject.harness === 'mini-swe-agent'));
  assert.ok(fresh.filter((o) => o.benchmark_id.startsWith('swe-atlas')).every((o) => o.unit === 'percent' && o.value >= 0 && o.value <= 100));
});

test('a changed page identity or CSV header fails closed instead of importing', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json');
  const dir = mkdtempSync(join(tmpdir(), 'bh-coding-guard-'));
  for (const [id, patch] of [
    ['swe-atlas-qna::snapshot-2026-09-15', (e) => { e.parser.require_text = '<title>SWE Atlas - Test Writing</title>'; }],
    ['deepswe::snapshot-2026-09-15', (e) => { e.parser.require_header = [...e.parser.require_header].reverse(); }],
  ]) {
    const entry = structuredClone(plan.entries.find((e) => e.benchmark_id === id));
    patch(entry);
    writeFileSync(join(dir, 'plan.json'), JSON.stringify({ ...plan, entries: [entry] }));
    assert.throws(() => execFileSync('python3', ['scripts/collect-public-benchmarks.py', '--plan', join(dir, 'plan.json'), join(dir, `${id.split('::')[0]}.json`)], { cwd: new URL('..', import.meta.url), stdio: 'pipe' }));
  }
});

test('DeepSWE is a reviewed manual snapshot the daily refresh never fetches; SWE Atlas boards stay in the daily refresh', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json');
  const spec = (id) => plan.entries.find((e) => e.benchmark_id === id);
  assert.equal(spec(IDS[0]).refresh, 'manual');
  for (const id of IDS.slice(1)) assert.equal(spec(id).refresh, undefined);
  const refresh = readFileSync(new URL('../ops/daily/refresh-benchmarks.mjs', import.meta.url), 'utf8');
  assert.match(refresh, /filter\(\(spec\) => spec\.refresh === 'manual'\)/);
  assert.match(refresh, /if \(manual\.has\(entry\.id\)\) continue; add\(\{ url: entry\.primary_url \}\)/, 'registry URLs of manual entries are not queued');
  assert.match(refresh, /if \(manual\.has\(spec\.benchmark_id\)\) continue;\s*add\(spec\.source\)/, 'plan sources of manual entries are not queued');
  assert.match(refresh, /status: 'retained_manual_snapshot'/, 'their rows are retained, not re-parsed');
  assert.match(json('data/raw/benchmarks/registry.json').entries.find((e) => e.id === IDS[0]).how_to_collect.notes, /^Manual snapshot, not part of the automatic daily refresh/);
});

test('registry provenance: measured maintainers, dated identities, committed evidence and robots receipts', () => {
  const registry = json('data/raw/benchmarks/registry.json');
  for (const id of IDS) {
    const e = registry.entries.find((x) => x.id === id);
    assert.ok(e, id);
    assert.equal(e.category, 'Coding');
    assert.equal(e.version_status, 'snapshot', 'no version is claimed that the capture does not state');
    assert.ok(e.evidence.some((x) => x.url.endsWith('/robots.txt')), 'robots receipt');
    assert.ok(e.evidence.every((x) => x.file.startsWith('data/raw/benchmarks/daily-evidence/2026-09-15-coding/')));
  }
  assert.match(registry.entries.find((x) => x.id === IDS[0]).how_to_collect.notes, /CC-BY 4\.0/);
});

test('identity map: only measured rows, exact existing configurations, every join visible in the dataset', () => {
  const map = json('data/raw/benchmarks/identity-map.json');
  const dataset = json('data/dataset.json');
  const catalog = new Set(dataset.models.map((m) => m.id));
  const observations = dataset.benchmark_results.observations;
  assert.ok(map.entries.length >= 80);
  for (const entry of map.entries) {
    assert.ok(IDS.includes(entry.benchmark_id), 'the map covers only the reviewed boards');
    assert.ok(catalog.has(entry.model_id), `${entry.model_id} exists`);
    const o = observations.find((x) => x.benchmark_id === entry.benchmark_id && x.subject.source_id === entry.source_id);
    assert.ok(o, entry.source_id);
    assert.equal(o.basis, 'measured');
    assert.equal(o.subject.model_id, entry.model_id);
    assert.match(o.join_note, /^Reviewed identity map 2026-09-15: /);
  }
  const effortless = map.entries.filter((e) => /without an effort/.test(e.rule));
  assert.ok(effortless.every((e) => e.model_id.endsWith('::default')), 'no effort is ever guessed');
  // Self-reported boards stay untouched by the map.
  for (const b of ['frontiercode::1.1', 'cursorbench::4.0']) assert.ok(!map.entries.some((e) => e.benchmark_id === b));
});
