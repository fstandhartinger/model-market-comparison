import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { IMAGEJEV_CATEGORY_BUNDLES } from '../lib/imagejev-category-bundles.mjs';
import { IMAGEJEV_CATEGORY_REVISIONS, imageJevCategoryView } from '../lib/jevbench-categories.mjs';
import { imageJevReleaseCompareRows } from '../lib/imagejev-compare.mjs';
import { loadImageJevV02CategoryBundle, parseImageJevV02CategoryBundleBytes as parse } from '../lib/imagejev-v02-category-loader.mjs';
import { release, native, refs, missing, fixture, receipt } from './helpers/imagejev-v02-category-fixture.mjs';

// TEST ONLY, in memory. These expected hashes certify fixture identity, never a
// genuine producer/reviewer. The public registry stays unconfigured throughout.
const bytes = (value) => Buffer.from(JSON.stringify(value));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const keys = imageJevReleaseCompareRows(release.artifact).map((row) => row.key);
function bundle(a = fixture()) {
  const artifactBytes = bytes(a), acceptanceBytes = bytes(receipt(a));
  return { artifactBytes, acceptanceBytes,
    expected: { artifactSha256: sha256(artifactBytes), acceptanceSha256: sha256(acceptanceBytes) } };
}
const load = (b, expectedRelease = release) => parse(b.artifactBytes, b.acceptanceBytes, b.expected, expectedRelease, keys);

test('explicit trusted fixture bytes produce all51: 48 native including three NULL-composite and Winnow, three genuine missing', () => {
  const view = load(bundle());
  assert.equal(keys.length, 51);
  assert.deepEqual(Object.keys(view.systems).sort(), [...native].sort());
  assert.deepEqual({ ...view.missing }, missing);
  assert.deepEqual(Object.keys(view.missing).sort(), [...refs].sort());
  assert.deepEqual(view.dims.map((dim) => dim.key), ['capabilities', 'usecases']);
  assert.deepEqual(view.systems.winnow_12b_q8.capabilities.multilingual, [-20, 93]);
  for (const row of imageJevReleaseCompareRows(release.artifact).filter((r) => r.listing === 'measured-unrankable')) {
    assert.equal(row.score, null);
    assert.ok(view.systems[row.key], `${row.key} remains native despite NULL composite`);
    assert.equal(view.missing[row.key], undefined);
  }
  assert.equal(view.dims[0].cats.reduce((sum, cat) => sum + cat.n, 0), 418);
  assert.deepEqual(view.splitNames, ['public', 'sealed']);
});

for (const name of ['artifact', 'acceptance']) test(`${name} changes, including whitespace-only changes, refuse the original independent byte hash`, () => {
  const b = bundle(), field = `${name}Bytes`;
  for (const change of [Buffer.from('\n'), Buffer.from('corrupt')]) {
    assert.throws(() => load({ ...b, [field]: Buffer.concat([b[field], change]) }), new RegExp(`${name} bytes differ from the trusted SHA256`));
  }
});

test('both hashes are checked before either JSON parse, even if artifact bytes are trusted invalid JSON', () => {
  const b = bundle();
  b.artifactBytes = Buffer.from('invalid JSON');
  b.expected.artifactSha256 = sha256(b.artifactBytes);
  b.acceptanceBytes = Buffer.from('also invalid JSON');
  assert.throws(() => load(b), /acceptance bytes differ from the trusted SHA256/);
  b.expected.acceptanceSha256 = sha256(b.acceptanceBytes);
  assert.throws(() => load(b), SyntaxError);
});

test('whitespace is valid only when independently expected artifact and acceptance hashes bind those exact bytes', () => {
  const a = fixture(), b = bundle(a);
  b.artifactBytes = Buffer.concat([b.artifactBytes, Buffer.from('\n')]);
  b.expected.artifactSha256 = sha256(b.artifactBytes);
  b.acceptanceBytes = bytes({ ...receipt(a), artifact_sha256: b.expected.artifactSha256 });
  b.expected.acceptanceSha256 = sha256(b.acceptanceBytes);
  assert.equal(load(b).revision, 'v0.2.0');
});

test('a newly pinned altered artifact cannot replay the previous acceptance sidecar', () => {
  const b = bundle(), a = JSON.parse(b.artifactBytes);
  a.systems.winnow_12b_q8.capabilities.multilingual.competence = -40;
  b.artifactBytes = bytes(a); b.expected.artifactSha256 = sha256(b.artifactBytes);
  assert.throws(() => load(b), /acceptance verdict\/hash/);
});

test('trusted bytes never override wrong-release bindings or strict acceptance rules', () => {
  const a = fixture(); a.revision = 'v0.1.5';
  assert.throws(() => load(bundle(a)), /artifact revision\/scope\/counts/);
  const b = bundle(), oldRelease = structuredClone(release);
  oldRelease.artifact.version = 'v0.1.5';
  assert.throws(() => load(b, oldRelease), /selected release pins\/version/);
  const alteredReceipt = JSON.parse(b.acceptanceBytes); alteredReceipt.verdict = 'PENDING';
  b.acceptanceBytes = bytes(alteredReceipt); b.expected.acceptanceSha256 = sha256(b.acceptanceBytes);
  assert.throws(() => load(b), /acceptance verdict\/hash/);
});

test('unconfigured/malformed trust pins refuse before reading bytes', async () => {
  const b = bundle();
  for (const field of ['artifactSha256', 'acceptanceSha256']) for (const value of [null, undefined, '', 'unreviewed']) {
    let reads = 0;
    await assert.rejects(loadImageJevV02CategoryBundle(keys, {
      recipe: { ...IMAGEJEV_CATEGORY_BUNDLES['v0.2.0'], ...b.expected, [field]: value },
      expectedRelease: release, readBytes: async () => { reads++; return b.artifactBytes; },
    }), /independently approved .* is unconfigured/);
    assert.equal(reads, 0);
  }
});

test('explicit read adapter refuses either missing bundle member and never substitutes legacy/null', async () => {
  const b = bundle(), recipe = { ...IMAGEJEV_CATEGORY_BUNDLES['v0.2.0'], ...b.expected };
  for (const absent of [recipe.artifactPath, recipe.acceptancePath]) {
    await assert.rejects(loadImageJevV02CategoryBundle(keys, { recipe, expectedRelease: release,
      readBytes: async (file) => {
        // Real filesystem ENOENT through the adapter, with no fixture file written.
        if (file === absent) return readFile(new URL(`fixtures/uninstalled-category-bundle-${process.pid}/${file.split('/').at(-1)}`, import.meta.url));
        return file === recipe.artifactPath ? b.artifactBytes : b.acceptanceBytes;
      } }), { code: 'ENOENT' });
  }
  const view = await loadImageJevV02CategoryBundle(keys, { recipe, expectedRelease: release,
    readBytes: async (file) => file === recipe.artifactPath ? b.artifactBytes : b.acceptanceBytes });
  assert.equal(view.revision, 'v0.2.0');
});

test('registered public v02 recipe remains unavailable; fixtures cannot override the public release gate', async () => {
  const recipe = IMAGEJEV_CATEGORY_BUNDLES['v0.2.0'];
  assert.ok(IMAGEJEV_CATEGORY_REVISIONS.includes('v0.2.0'));
  assert.equal(recipe.artifactSha256, null); assert.equal(recipe.acceptanceSha256, null);
  assert.ok(Object.isFrozen(recipe)); assert.ok(Object.isFrozen(IMAGEJEV_CATEGORY_BUNDLES));
  await assert.rejects(imageJevCategoryView('v0.2.0', keys), /independently approved .* is unconfigured/);
  // Extra fixture options are ignored by the public API, which has no injection argument.
  await assert.rejects(imageJevCategoryView('v0.2.0', keys, bundle()), /independently approved .* is unconfigured/);
  const legacy = imageJevCategoryView('v0.1.5', ['wity_1']);
  assert.equal(legacy.revision, 'v0.1.5'); assert.equal(typeof legacy.then, 'undefined');
  assert.equal(imageJevCategoryView('unknown', keys), null);
});

test('v02 page source awaits the gate and has exactly one unified comparison with all51, keeping legacy archives and order', async () => {
  const source = await readFile(new URL('../app/jev-models/multimodal-preview/page.tsx', import.meta.url), 'utf8');
  const v02 = source.split('async function ImageJevV02Page(')[1].split('export async function ImageJevBenchContent(')[0];
  assert.match(v02, /const compareRows = imageJevReleaseCompareRows\(artifact\)/);
  assert.match(v02, /const categories = await imageJevCategoryView\('v0\.2\.0', compareRows\.map\(/);
  assert.equal((v02.match(/<JevCompareV15\b/g) ?? []).length, 1);
  assert.match(v02, /<JevCompareV15 rows=\{compareRows\} openDecisions=\{corePublic\} sealedDecisions=\{coreSealed\} axesOnly imageRevision="v0\.2\.0" heading="Compare two CORE systems" categories=\{categories\}/);
  assert.match(v02, /<div id="image-jev-compare"[^>]*data-bh-imagejev-v02-compare/);
  assert.match(v02, /href="#image-jev-compare"/);
  assert.doesNotMatch(v02, /ImageJevRadar|four-axis comparison will appear/);
  let previous = -1;
  for (const marker of ['<JevCapabilityRanking', '<ImageJevV02Charts', 'id="imagejev-v02-composite"', '<JevCompareV15', '<ImageJevV02RankingTable', 'id="imagejev-v02-method-heading"', '<ImageJevV02WhatIf', 'id="imagejev-v02-history-heading"']) {
    const index = v02.indexOf(marker); assert.ok(index > previous, marker); previous = index;
  }
  const legacy = source.split('async function ImageJevV02Page(')[0];
  assert.match(legacy, /<JevCompareV15 [^>]*categories=\{imageJevCategoryView\(a\.revision/);
  assert.match(legacy, /<ImageJevRadar systems=\{a\.ranking\}/);
});

test('client comparison imports the category view type only, keeping filesystem loading on the server', async () => {
  for (const name of ['JevCompareV15', 'JevRadars']) {
    const source = await readFile(new URL(`../components/${name}.tsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /node:fs|node:crypto|imagejev-v02-category-loader/);
    assert.doesNotMatch(source, /import\s+(?!type\b)[^\n]*from [^\n]*jevbench-categories/);
  }
});
