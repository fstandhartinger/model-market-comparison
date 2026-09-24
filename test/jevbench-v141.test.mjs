import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JEVBENCH_V141_SHA256, JEVBENCH_V141_TOP5, readJevbenchV141 } from '../lib/jevbench-v141.mjs';

const { artifact, sha256 } = await readJevbenchV141();
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('CR-135 v1.4.1 is the exact aggregate-only release with the approved unchanged top five', () => {
  const ranked = artifact.systems.filter((row) => row.listing === 'ranked').sort((a, b) => a.rank - b.rank);
  assert.equal(artifact.revision, 'v1.4.1');
  assert.equal(sha256, JEVBENCH_V141_SHA256);
  assert.equal(artifact.systems.length, 82);
  assert.equal(ranked.length, 77);
  assert.equal(artifact.tiers.easy + artifact.tiers.standard + artifact.tiers.judge + artifact.tiers.hard, 534);
  assert.equal(artifact.tiers.sealed, 308);
  assert.deepEqual(ranked.slice(0, 5).map((row) => row.key), JEVBENCH_V141_TOP5);
  assert.deepEqual(ranked.slice(0, 5).map((row) => [row.display.split(' (')[0], row.jevbench_score.toFixed(2)]), [
    ['Jev 1.13.0', '63.29'],
    ['JevK5 v0.2.0', '62.04'],
    ['Hopper', '59.43'],
    ['Winnow-12B Q8', '55.58'],
    ['reflex 4B', '53.99'],
  ]);
  for (const key of ['decision-2b', 'decision-fast', 'jev-omni', 'spark-s1-4b-v6', 'lev-350m']) assert.ok(artifact.systems.some((row) => row.key === key), `${key} is included`);
  assert.ok(artifact.systems.some((row) => /qwen3\.5-0\.8b-decision-model/i.test(row.key)));
  assert.doesNotMatch(JSON.stringify(artifact), /"(?:item_id|item_text|question_text|gold|expected|prediction|predicted|per_item|item_results)"\s*:/i);
});

test('CR-142 adds only the missing v1.2 hard-family aggregates', () => {
  const added = ['jevk5-v02', 'opensourcejev-qwen35-4b-q4km', 'qwen35-9b-jev-data-mix-v2', 'gpt-6-luna-low', 'gpt-6-luna', 'von-395m', 'mghafiri-qwen3.5-0.8b-decision-model'];
  for (const key of added) {
    const row = artifact.systems.find((system) => system.key === key);
    assert.ok(row?.rank != null, `${key} remains ranked`);
    assert.deepEqual(Object.keys(row.hard ?? {}), ['by_family']);
    const families = row.hard.by_family;
    assert.equal(Object.keys(families).length, 10);
    const values = Object.values(families);
    assert.equal(values.reduce((sum, family) => sum + family.n, 0), 220);
    assert.ok(values.every((family) => family.correct >= 0 && family.correct <= family.n && Math.abs(family.accuracy - family.correct / family.n) < 0.000051));
    assert.ok(Math.abs(values.reduce((sum, family) => sum + family.correct, 0) / 220 - row.tiers.hard) < 0.00001);
  }
});

test('CR-135 adds a versioned API and pin while retaining the v1.4.0 source pin', async () => {
  const [route, page, livePage, frozenV14, sitemap] = await Promise.all([
    read('../app/api/jevbench/v1.4.1/route.ts'),
    read('../app/jev-models/v1.4.1/page.tsx'),
    read('../app/jev-models/page.tsx'),
    read('../app/jev-models/v1.4/page.tsx'),
    read('../app/sitemap.ts'),
  ]);
  assert.match(route, /readJevbenchV141\(\)/);
  assert.match(route, /'X-Content-SHA256': sha256/);
  assert.match(page, /readJevbenchV141\(\)/);
  assert.match(page, /canonical = '\/jev-models\/v1\.4\.1'/);
  assert.match(page, /data-bh-jev-frozen-top-five/);
  assert.match(livePage, /readJevbenchV141\(\)/);
  assert.match(livePage, /href="\/jev-models\/v1\.4\.1" data-bh-jev-version-share/);
  assert.match(livePage, /canonical: '\/jev-models'/);
  assert.match(frozenV14, /readJevbenchV14\(\)/);
  assert.match(sitemap, /"\/jev-models\/v1\.4\.1"/);
});
