import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  audiojevView, displayName, jevClassReasons, publicExamples, readAudiojevExamples, readAudiojevPreview, robustnessColumns, tableGroup,
} from '../lib/audiojev-preview.mjs';

const root = path.resolve(import.meta.dirname, '..');
const SEGMENT = 'wip-33gyqg9xwm5y';
const PAGE = `app/${SEGMENT}/audio-jev/page.tsx`;
const read = (p) => readFileSync(path.join(root, p), 'utf8');

test('table strings map to the three preview groups', () => {
  assert.equal(tableGroup('full'), 'full');
  assert.equal(tableGroup('public-only (provisional)'), 'public-only');
  assert.equal(tableGroup('partial coverage, public-only'), 'partial');
  assert.equal(tableGroup('partial coverage'), 'partial');
  assert.equal(tableGroup(undefined), 'partial');
});

test('Jev-class reasons follow METHOD §4 limits and tolerate nulls', () => {
  assert.deepEqual(jevClassReasons({ p50_adj_s: 0.8, cost: { usd_per_1000: 0.2 }, jev_class: true }), []);
  assert.deepEqual(jevClassReasons({ p50_adj_s: null, cost: null, jev_class: false }), ['no latency measured', 'no price']);
  assert.match(jevClassReasons({ p50_adj_s: 1.4, cost: { usd_per_1000: 0.19 }, jev_class: false })[0], /latency 1\.40 s > 1\.0 s/);
});

test('view groups the committed data and survives an empty or null input', async () => {
  const scores = await readAudiojevPreview(root);
  assert.ok(scores, 'data/audiojev-preview.json is committed');
  const v = audiojevView(scores);
  assert.equal(v.full.length + v.publicOnly.length + v.partial.length, scores.systems.length);
  for (const r of v.capability) if (r.capabilityRank != null) assert.ok(r.jevClass && r.group === 'full');
  for (const input of [null, {}, { systems: [{}] }, { systems: [{ key: 'x', table: 'full', Capability: 50, robustness: null }] }]) {
    const e = audiojevView(input);
    assert.ok(Array.isArray(e.systems));
    robustnessColumns(e.systems);
  }
  const f = audiojevView({ systems: [
    { key: 'a', table: 'full', headline: 60, Capability: 70, p50_adj_s: 0.5, cost: { usd_per_1000: 0.1 }, jev_class: true },
    { key: 'b', table: 'full', headline: 70, Capability: 60, p50_adj_s: 2, cost: { usd_per_1000: 0.1 }, jev_class: false },
  ] });
  assert.deepEqual(f.full.map((r) => [r.key, r.rank]), [['b', 1], ['a', 2]]);
  assert.deepEqual(f.capability.map((r) => [r.key, r.capabilityRank]), [['a', 1], ['b', null]]);
});

test('examples are public only; a sealed item throws', async () => {
  const ex = await readAudiojevExamples(root);
  for (const e of ex) assert.doesNotMatch(e.id, /sealed/i);
  assert.throws(() => publicExamples({ items: [{ id: 'x', split: 'sealed' }] }), /refusing non-public/);
  assert.throws(() => publicExamples({ items: [{ id: 'sealed-1', split: 'public' }] }), /refusing non-public/);
  assert.throws(() => publicExamples({ items: [{ id: 'y' }] }), /refusing non-public/);
  const [yn] = publicExamples([{ id: 'p', split: 'public', request_type: 'noul', expected: 'yes', question: { criteria: { true: 'T', false: 'F' } } }]);
  assert.deepEqual(yn.labels, ['yes', 'no']);
  assert.equal(yn.descriptions.yes, 'T');
  assert.equal(publicExamples(null).length, 0);
});

test('display names cover every committed system', async () => {
  const v = audiojevView(await readAudiojevPreview(root));
  for (const r of v.systems) {
    assert.ok(r.name && r.name.length <= 60, r.key);
    assert.notEqual(r.name, r.key, `no display name for ${r.key}`);
  }
  assert.deepEqual(displayName('foo (bar)'), { name: 'foo', config: 'bar' });
});

test('CR-214: capability numbers go to Jev-class full rows only; the committed top five', async () => {
  const v = audiojevView(await readAudiojevPreview(root));
  const numbered = v.capability.filter((r) => r.capabilityRank != null);
  for (const r of numbered) assert.ok(r.jevClass && r.group === 'full', r.key);
  for (const r of [...v.publicOnly, ...v.partial]) assert.equal(r.capabilityRank, null, r.key);
  assert.deepEqual(numbered.slice(0, 5).map((r) => r.key.split(' ')[0]),
    ['qwen3-omni-30b-a3b-instruct', 'qwen2.5-omni-7b', 'qwen2.5-omni-3b', 'voxtral-mini-3b-2507', 'ultravox-v0_5-llama-3_2-1b']);
  assert.equal(v.full[0].key.split(' ')[0], 'qwen3-omni-30b-a3b-instruct');
  for (const r of v.publicOnly) assert.ok(r.iPublicCi, `${r.key} shows a CI`);
});

test('CR-214: public page is indexable, canonical, in the sitemap and nav, and keeps the section order', () => {
  const page = read('app/audio-jev-bench/page.tsx');
  assert.doesNotMatch(page, /robots:\s*\{/);
  assert.match(page, /canonical: '\/audio-jev-bench'/);
  assert.match(read('app/sitemap.ts'), /"\/audio-jev-bench"/);
  assert.match(read('components/Nav.tsx'), /\["\/audio-jev-bench", "AudioJevBench"\]/);
  assert.match(read('lib/visit-stats.mjs'), /"audio-jev-bench"/);
  const order = ['<AudioJevBenchCharts', '<CompositeBars', '<AudioJevCompare', 'data-bh-audiojev-full-table', 'data-bh-audiojev-method', 'data-bh-audiojev-history'].map((m) => page.indexOf(m));
  for (const i of order) assert.ok(i > 0);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  const charts = read('components/AudioJevBenchCharts.tsx');
  assert.ok(charts.indexOf('data-bh-audiojev-capability-bars') < charts.indexOf('data-bh-audiojev-bubbles'));
  assert.match(charts, /JevCapability3D/);
  assert.match(read('app/audio-jev-bench/opengraph-image.tsx'), /ImageResponse/);
});

test('CR-214: the old hidden route redirects to the public page and nothing links to the hidden segment', () => {
  assert.match(read(PAGE), /permanentRedirect\('\/audio-jev-bench'\)/);
  assert.doesNotMatch(read('app/sitemap.ts'), /wip-/);
  assert.doesNotMatch(read('app/robots.ts'), /wip-|audio-jev/);
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (['node_modules', '.next', '.git', 'test'].includes(name)) continue;
      const p = path.join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(tsx?|mjs|js|json|md|txt|xml)$/.test(name) && st.size < 5e6 && readFileSync(p, 'utf8').includes(SEGMENT)) hits.push(path.relative(root, p));
    }
  };
  for (const d of ['app', 'components', 'lib', 'public', 'data']) walk(path.join(root, d));
  assert.deepEqual(hits.filter((h) => !h.startsWith(`app/${SEGMENT}/`)), []);
});
