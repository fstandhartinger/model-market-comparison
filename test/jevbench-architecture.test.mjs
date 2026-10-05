import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JEV_ARCH_CLASSES, jevArchFor, jevArchBadgeText } from '../lib/jevbench-architecture.mjs';
import { compileTsModule } from './helpers/transpile-ts.mjs';
const { jevRowArch, jevLegendTypes, jevTypeVarName, JEV_TYPE_LABEL } = await import(await compileTsModule(new URL('../components/jevTypes.ts', import.meta.url)));
import { jevV15BoardSystem, jevV15BoardRow, jevV15CompareRow } from '../lib/jevbench-v15-board.mjs';

test('canonical architecture classes and deterministic fallback rules', () => {
  assert.equal(JEV_ARCH_CLASSES.length, 8);
  const cases = [
    [{ class: 'jev', api_flag: true }, 'closed-api'], [{ key: 'jev-1.99.0' }, 'jev-reference'],
    [{ api_flag: true, class: 'reranker' }, 'closed-api'], [{ kind: 'api' }, 'closed-api'], [{ endpoint_kind: 'api' }, 'closed-api'],
    [{ class: 'reranker' }, 'open-reranker'], [{ class: 'raw-logit-control' }, 'base-control'],
    [{ class: 'classifier' }, 'open-encoder'], [{ class: 'unclassified' }, 'open-llm-decoder'],
    [{ class: 'system-one-open' }, 'open-llm-decoder'], [{}, 'open-llm-decoder'],
  ];
  for (const [row, arch] of cases) assert.equal(jevArchFor('jevbench', { key: 'missing-seed-key', ...row }).arch, arch);
  assert.ok(cases.every(([row]) => jevArchFor('jevbench', row).arch !== 'unclassified'));
});

test('cited overlay takes precedence over legacy flags', () => {
  const overlay = JSON.parse(readFileSync(new URL('../data/jevbench-architecture.json', import.meta.url)));
  for (const [benchmark, rows] of Object.entries(overlay.benchmarks)) for (const [key, entry] of Object.entries(rows)) {
    const result = jevArchFor(benchmark, { key, class: 'classifier', api_flag: true });
    assert.equal(result.arch, entry.arch); assert.deepEqual(result.evidence, entry.evidence);
  }
});

test('badge text omits absent fields', () => {
  assert.equal(jevArchBadgeText({ derivation: 'fine-tune', params: '12B', quant: 'NVFP4' }), 'fine-tune · 12B · NVFP4');
  assert.equal(jevArchBadgeText({ derivation: null, params: '12B', quant: null }), '12B');
  assert.equal(jevArchBadgeText(null), '');
});

test('v1.6.0 presentation mappings preserve every rank, score, axis and artifact class', () => {
  const artifact = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json', import.meta.url)));
  const before = JSON.stringify(artifact);
  for (const row of artifact.systems) {
    for (const built of [jevV15BoardSystem(row), jevV15BoardRow(row)]) {
      assert.equal(built.rank, row.rank ?? null); assert.equal(built.jevbench_score, row.jevbench_score ?? null);
      assert.deepEqual(built.axes, row.axes); assert.equal(built.class, row.class);
      assert.ok(JEV_ARCH_CLASSES.some((c) => c.id === built.arch));
    }
    const compare = jevV15CompareRow(row);
    assert.equal(compare.rank, row.rank ?? null); assert.equal(compare.score, row.jevbench_score ?? null);
  }
  assert.equal(JSON.stringify(artifact), before);
});

test('legends merge legacy classes, keep canonical order and use one palette', () => {
  assert.deepEqual(jevLegendTypes(['classifier', 'unclassified', 'jev-rebuild', 'jev', 'reranker', 'closed-api']), ['jev-reference', 'closed-api', 'open-llm-decoder', 'open-encoder', 'open-reranker']);
  for (const c of JEV_ARCH_CLASSES) {
    assert.equal(jevTypeVarName(c.id), c.cssVar);
    assert.equal(JEV_TYPE_LABEL[c.id], c.label);
  }
  assert.equal(jevRowArch({ key: 'missing', class: 'classifier', arch: 'system' }), 'system');
  assert.equal(jevArchFor('jevbench', { key: '__proto__' }).arch, 'open-llm-decoder');
});

test('chart renderers colour rows by architecture, never by the legacy artifact class', () => {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : /\.tsx?$/.test(e.name) ? [new URL(e.name, dir)] : []);
  const files = ['../components/', '../app/'].flatMap((d) => walk(new URL(d, import.meta.url)));
  const offenders = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((line, i) => [f.pathname.split('/').slice(-2).join('/'), i + 1, line])
    .filter(([, , line]) => /(typeVar|typeColour|architectureVar|jevTypeVarName)\(\s*\w+\.(cls|class)\s*\)/.test(line)));
  assert.deepEqual(offenders.map(([f, n]) => `${f}:${n}`), []);
});

test('fallback never paints a non-Jev or hosted row in the Jev reference colour', () => {
  assert.equal(jevArchFor('jevbench', { key: 'not-in-json', class: 'jev' }).arch, 'open-llm-decoder');
  assert.equal(jevArchFor('jevbench', { key: 'not-in-json', class: 'jev', api_flag: true }).arch, 'closed-api');
  assert.equal(jevArchFor('jevbench', { key: 'not-in-json', class: 'llm-baseline' }).arch, 'closed-api');
  assert.equal(jevArchFor('jevbench', { key: 'jev-9.9.9' }).arch, 'jev-reference');
});
