import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readJevbenchV142, JEVBENCH_V142_SHA256 } from '../lib/jevbench-v142.mjs';
import { readJevbenchV142Families, readJevbenchV142WithFamilies, validateJevbenchV142Families } from '../lib/jevbench-v142-families.mjs';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');

test('CR-153: the family supplement fills every measured row without touching the pinned v1.4.2 artifact', async () => {
  const pinned = await readJevbenchV142();
  const merged = await readJevbenchV142WithFamilies();
  assert.equal(merged.sha256, JEVBENCH_V142_SHA256);
  assert.deepEqual(merged.bytes, pinned.bytes);
  // Only the hard-tier family breakdown changes, and only where the artifact had none.
  pinned.artifact.systems.forEach((row, i) => {
    const out = merged.artifact.systems[i];
    const { hard: a, ...restA } = row, { hard: b, ...restB } = out;
    assert.deepEqual(restA, restB, row.key);
    if (row.hard?.by_family) assert.deepEqual(a, b, row.key);
  });
  const missing = merged.artifact.systems.filter((row) => row.listing === 'ranked' && !row.hard?.by_family).map((row) => row.key);
  assert.deepEqual(missing, [], 'every ranked system has a hard-tier family breakdown');
  assert.equal(Object.values(merged.sealedFamilyN).reduce((a, b) => a + b, 0), 308);
  // Each sealed family share times its size is a whole number of decisions for every system, so pooling is exact.
  for (const row of merged.artifact.systems) for (const [family, v] of Object.entries(row.sealed_aggregate?.by_family ?? {})) {
    if (v != null) assert.ok(Math.abs(v * merged.sealedFamilyN[family] - Math.round(v * merged.sealedFamilyN[family])) < 0.01, `${row.key}.${family}`);
  }
});

test('CR-153: the supplement validator fails closed', async () => {
  const { artifact } = await readJevbenchV142();
  const { supplement } = await readJevbenchV142Families();
  const copy = () => JSON.parse(JSON.stringify(supplement));
  const off = copy(); off.hard_by_family['decider-4b-v2'].trap.correct += 1;
  assert.throws(() => validateJevbenchV142Families(off, artifact), /does not add up|decider-4b-v2/);
  const dup = copy(); dup.hard_by_family['jev-1.13.0'] = dup.hard_by_family['decider-4b-v2'];
  assert.throws(() => validateJevbenchV142Families(dup, artifact), /already has/);
  const leak = copy(); leak.hard_by_family['decider-4b-v2'].trap.gold = 'x';
  assert.throws(() => validateJevbenchV142Families(leak, artifact), /item-level/);
  const sealed = copy(); sealed.sealed_family_n.trap_adversarial += 1;
  assert.throws(() => validateJevbenchV142Families(sealed, artifact), /sum to the sealed tier/);
});

test('CR-153: compare pools hard and sealed families; the Intelligence view hides general-purpose LLMs; cost is a thin red line', async () => {
  const [compare, board, capability, css, route] = await Promise.all([
    read('../components/JevCompareV14.tsx'), read('../components/JevBoardInteractive.tsx'), read('../components/JevCapabilityChart.tsx'),
    read('../app/globals.css'), read('../app/api/jevbench/v1.4.2/families/route.ts'),
  ]);
  assert.match(compare, /Current question set by family \(hard \+ sealed\)/);
  assert.match(compare, /r\.axes\?\.\[k\]/, 'a partial row without axes must not break the compare view');
  assert.match(board, /const \[hideLlms, setHideLlms\] = useState\(true\)/);
  assert.match(board, /data-bh-jev-hide-llms/);
  assert.match(board, /GENERAL_LLM = 'llm-baseline'/);
  assert.match(capability, /h-\[3px\][^\n]*data-bh-jev14-cost-bar/);
  assert.match(css, /\.bh-jev-cost-bar \{ background-color: rgb\(var\(--jev-cost-red\)\); \}/);
  assert.match(route, /'X-Content-SHA256': sha256/);
});
