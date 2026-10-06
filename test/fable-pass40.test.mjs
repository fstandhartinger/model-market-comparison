// Fable pass 40 (2026-09-27): source and behaviour pins for the fixes Fable shipped after the JevBench v1.4.2.2 release (CR-191).
// F-212  the JSON-LD dataset record and the leaf's class title name the release the page shows (they said v1.4.2 on v1.4.2.2 pages).
// F-213  a row's sealed family shares are read as numbers whatever shape the artifact wrote them in — v1.4.2.2 carries Imajev-4B's
//        `sealed_aggregate.by_family` as `{ correct, n, accuracy }` objects while every other row carries the bare share, so the hub
//        compare, the leaf page and the pair page printed "NaN%" on all ten spokes and logged NaN polygon errors.
// F-214  the pair page prints the release's top-five note only when it is about that pair (v1.4.2.2's compares Imajev-4B with Plumb-4B).
// F-215  on a pooled family radar a ranked row with no published hard-tier breakdown is "unpublished", never "a partial run".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sealedFamilyShares } from '../lib/jevbench-v14.mjs';
import { readJevbenchV1422 } from '../lib/jevbench-v1422.mjs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('F-213: sealedFamilyShares returns numbers for both artifact shapes and null for a missing share', () => {
  assert.deepEqual(sealedFamilyShares({ sealed_aggregate: { by_family: { judge_hard: 0.25, probability: { correct: 3, n: 12, accuracy: 0.25 } } } }), { judge_hard: 0.25, probability: 0.25 });
  assert.deepEqual(sealedFamilyShares({ sealed_aggregate: { by_family: { judge_hard: { correct: 0, n: 0 }, probability: 'x' } } }), { judge_hard: null, probability: null });
  assert.equal(sealedFamilyShares({ sealed_aggregate: {} }), null);
  assert.equal(sealedFamilyShares({}), null);
});

test('F-213: every v1.4.2.2 row with a sealed breakdown yields finite shares — Imajev-4B included', async () => {
  const { artifact } = await readJevbenchV1422(new URL('..', import.meta.url).pathname.replace(/\/$/, ''));
  const imajev = artifact.systems.find((row) => row.key === 'imajev_4b');
  assert.ok(imajev, 'Imajev-4B is in the artifact');
  assert.equal(typeof Object.values(imajev.sealed_aggregate.by_family)[0], 'object', 'the artifact still writes Imajev-4B\'s shares as objects (the reason this helper exists)');
  let withBreakdown = 0;
  for (const row of artifact.systems) {
    const shares = sealedFamilyShares(row);
    if (!shares) continue;
    withBreakdown += 1;
    for (const [family, share] of Object.entries(shares)) assert.ok(share === null || (Number.isFinite(share) && share >= 0 && share <= 1), `${row.key} ${family}: ${share}`);
  }
  assert.ok(withBreakdown >= 90, `${withBreakdown} rows carry a sealed breakdown`);
  assert.ok(Object.values(sealedFamilyShares(imajev)).every((share) => Number.isFinite(share)), 'Imajev-4B\'s ten shares are numbers');
});

test('F-213: the three compare readers use the helper, not a raw by_family read', () => {
  for (const file of ['components/JevModelsV14.tsx', 'components/JevV141SystemDetail.tsx']) {
    const src = read(file);
    assert.match(src, /sealedFamilyShares\((row|system)\)/, `${file} reads sealed shares through the helper`);
    assert.doesNotMatch(src, /sealed_aggregate as \{ by_family/, `${file} no longer casts by_family to numbers`);
  }
});

test('F-212: the dataset record and the leaf class title name the release the page renders', () => {
  const blocks = read('components/JevBenchSeoBlocks.tsx');
  assert.match(blocks, /contentUrl: `\$\{SITE_URL\}\/api\/jevbench\/\$\{artifact\.revision\}`/);
  assert.match(blocks, /citation: `https:\/\/github\.com\/fstandhartinger\/jevbench\/blob\/\$\{artifact\.revision\}\/docs\/METHOD-v1\.4\.md`/);
  assert.doesNotMatch(blocks, /jevbench\/v1\.4\.2[`'"/]/);
  const leaf = read('components/JevV141SystemDetail.tsx');
  assert.match(leaf, /title=\{`Class named in the \$\{revision\} artifact; description pending`\}/);
  assert.doesNotMatch(leaf, /Class named in the v1\.4\.2 artifact/);
});

test('F-214: current comparison pages do not borrow a historical top-five story', () => {
  const compare = read('components/JevComparisonPage.tsx');
  assert.doesNotMatch(compare, /top_five_note/);
  assert.match(compare, /jevV15CompareRow/);
  assert.match(compare, /last published measurement/);
});

test('F-215: the pooled family sentence separates an unpublished breakdown (ranked row) from a partial run (unranked row)', () => {
  const src = read('components/JevCompareV14.tsx');
  assert.match(src, /const partial = names\.filter\(\(name\) => pair\.find\(\(r\) => r\.name === name\)\?\.rank === null\);/);
  assert.match(src, /no published hard-tier family breakdown; families that need it are left out \(—\)\./);
  assert.match(src, /not run on the full v1\.4 question set \(a partial run\)/);
});

test('F-216 (refined by CR-290): a radar spoke prints its separator only between two printed slots; a missing value is "n/a"', () => {
  const src = read('components/JevRadars.tsx');
  assert.match(src, /\{k > 0 && shown\(k - 1\) \? <tspan fill="var\(--muted\)" fontWeight=\{400\}> · <\/tspan> : null\}\{s\.values\[k\] === null \? "n\/a" : s\.texts\[k\]\}/);
});
