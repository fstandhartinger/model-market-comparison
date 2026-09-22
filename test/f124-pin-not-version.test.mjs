// F-124 / F-125 (Fable pass 23): a commit-like benchmark identity is a pinned revision of the
// benchmark's own repository, not a version its maintainer published — and a model whose org is
// its own name is named once. Both are read-the-page defects; both are pinned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPin } from '../lib/version-pin.mjs';
import { versionLine } from '../lib/benchmark-matrix.mjs';
import { humanVersion } from '../lib/version-label.ts';

test('a hash is a pin; a numeric, semantic, dated or snapshot version is not', () => {
  assert.equal(isPin('74221fb'), true, 'the AA Terminal-Bench Hard identity');
  assert.equal(isPin('74221FB'), true, 'case does not matter');
  assert.equal(isPin('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'), true, 'a full 40-character sha');
  assert.equal(isPin('4.0'), false);
  assert.equal(isPin('1.0.1'), false);
  assert.equal(isPin('2.1'), false);
  assert.equal(isPin('snapshot-2026-09-10 (unversioned)'), false);
  assert.equal(isPin('2026-06-25'), false);
  assert.equal(isPin('release-v1'), false);
  assert.equal(isPin('opt1-102'), false);
  assert.equal(isPin('curated'), false);
  // A pure-digit string is never a pin: about one short git hash in twenty has no letter, and a
  // version like `20260918` would be misread as one. Fail closed towards "version".
  assert.equal(isPin('20260918'), false);
  assert.equal(isPin('123456'), false);
  assert.equal(isPin('abcde'), false, 'shorter than a short hash');
});

test('the table row prints no "Version" for a pin; the result page names the revision once', () => {
  const pinned = { version: '74221fb', asOf: '2026-09-16', freshness: null };
  assert.equal(versionLine(pinned), 'values as published on 2026-09-16', 'the row keeps the read date only');
  assert.equal(versionLine(pinned, true), 'Pinned revision 74221fb · values as published on 2026-09-16');
  // Nothing changes for a version a maintainer published.
  const versioned = { version: '4.0', asOf: '2026-09-16', freshness: null };
  assert.equal(versionLine(versioned), 'Version 4.0 · values as published on 2026-09-16');
  assert.equal(versionLine(versioned, true), versionLine(versioned), 'the flag only ever adds a pin');
  const snapshot = { version: 'snapshot-2026-09-10 (unversioned)', asOf: '2026-09-18', freshness: null };
  assert.equal(snapshot.version.startsWith('snapshot-'), true);
  assert.equal(versionLine(snapshot, true), 'values as published on 2026-09-18');
});

test('named release identities are not given a fabricated v prefix', () => {
  assert.equal(humanVersion('8-needle').label, '8-needle');
  assert.equal(humanVersion('opt1-102').label, 'opt1-102');
  assert.equal(humanVersion('release-v1').label, 'release-v1');
  assert.equal(humanVersion('4.0').label, 'v4.0');
});

test('the result page drops the org line when it only repeats the model name', () => {
  const src = readFileSync(new URL('../app/benchmarks/result/page.tsx', import.meta.url), 'utf8');
  assert.match(src, /const sameAsName =/, 'the comparison lives in one place');
  assert.equal(src.match(/sameAsName\(/g)?.length, 4, 'both cards and both compared-model tables use it');
  assert.doesNotMatch(src, /\{model\.org\} · </, 'no unconditional org prefix is left');
  const subLines = src.match(/.{0,24}<span className="bh-muted block text-xs font-normal">\{m\.org\}<\/span>/g) ?? [];
  assert.equal(subLines.length, 2, 'the two compared-model tables');
  for (const line of subLines) assert.match(line, /!sameAsName\(m\) && <span/, 'every org sub-line is guarded');
  // F-124 on the same page: the eyebrow must not headline a pin.
  assert.match(src, /isPin\(ax\.version\)/, 'the eyebrow asks whether the version is a pin');
});

// 2026-09-22 (iteration 169): only a release `v` before a digit is dropped in "Version …" — MCPMark's `verified` read "Version erified".
test('the version heading keeps a word that starts with v', async () => {
  const { versionHeading } = await import('../lib/version-label.ts');
  assert.equal(versionHeading('verified'), 'Version verified');
  assert.equal(versionHeading('v2'), 'Version 2');
  assert.equal(versionHeading('4.0'), 'Version 4.0');
  assert.match(readFileSync(new URL('../components/BenchmarkMatrix.tsx', import.meta.url), 'utf8'), /suffix\.replace\(\/\^v\(\?=\\d\)\/i, ""\)/);
});
