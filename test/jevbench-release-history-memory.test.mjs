import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withPublicationValidationScope, markPublicationValidated, isPublicationValidated, lastValidatedPublication, rememberValidatedPublication } from '../lib/jevbench-publication-validation-scope.mjs';
import { JEVBENCH_RELEASES } from '../lib/jevbench-releases.mjs';

// Run the real server component's data-loading body, replacing only the publication
// readers. No JSX renderer or multi-gigabyte historical fixtures are needed here.
const source = await readFile(new URL('../components/JevReleaseHistory.tsx', import.meta.url), 'utf8');
const names = [...source.matchAll(/import \{ (hasPublished\w+) \}/g)].map(match => match[1]);
const body = source.split('export async function JevReleaseHistory() {')[1].split('  return <section')[0];
const load = new (Object.getPrototypeOf(async function () {}).constructor)(...names, 'JEVBENCH_RELEASES', 'withPublicationValidationScope', body + '\nreturn { releases, v170 };');

test('history validates at most one full recursive release chain at a time', async () => {
  let active = 0, peak = 0;
  const seen = [];
  const readers = names.map(name => async () => {
    active++; peak = Math.max(peak, active); seen.push(name);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return true;
  });
  const result = await load(...readers, JEVBENCH_RELEASES, withPublicationValidationScope);
  assert.equal(peak, 1, 'overlapping recursive validations exhaust the production heap');
  assert.equal(seen.length, names.length);
  assert.equal(new Set(seen).size, names.length);
  assert.deepEqual(result.releases, JEVBENCH_RELEASES);
  assert.equal(result.v170, true);
});

test('history still omits failed publications and checks fresh results on every render', async () => {
  let available = false;
  const readers = names.map(name => async () => name === 'hasPublishedJevbenchV187Release' ? available : true);
  const before = await load(...readers, JEVBENCH_RELEASES, withPublicationValidationScope);
  assert.ok(!before.releases.some(release => release.version === 'v1.8.7'));
  available = true;
  const after = await load(...readers, JEVBENCH_RELEASES, withPublicationValidationScope);
  assert.deepEqual(after.releases, JEVBENCH_RELEASES);
});


test('successful predecessor checks are scoped to this render and root', async () => {
  assert.equal(isPublicationValidated('/one', 'v1.8.7'), false);
  markPublicationValidated('/one', 'v1.8.7');
  assert.equal(isPublicationValidated('/one', 'v1.8.7'), false);
  await withPublicationValidationScope(async () => {
    markPublicationValidated('/one', 'v1.8.7');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(isPublicationValidated('/one', 'v1.8.7'), true);
    assert.equal(isPublicationValidated('/two', 'v1.8.7'), false);
    assert.equal(isPublicationValidated('/one', 'v1.8.6'), false);
    await withPublicationValidationScope(async () => {
      assert.equal(isPublicationValidated('/one', 'v1.8.7'), false);
    });
    assert.equal(isPublicationValidated('/one', 'v1.8.7'), true);
  });
  assert.equal(isPublicationValidated('/one', 'v1.8.7'), false);
});

test('concurrent renders never share successful validation facts', async () => {
  await Promise.all([withPublicationValidationScope(async () => {
    markPublicationValidated('/same', 'v1.8.7');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(isPublicationValidated('/same', 'v1.8.7'), true);
  }), withPublicationValidationScope(async () => {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(isPublicationValidated('/same', 'v1.8.7'), false);
  })]);
});


test('board assembly retains only the latest bundle, and never caches outside its scope', async () => {
  const first = { artifact: { revision: 'v1.8.6' } };
  const second = { artifact: { revision: 'v1.8.7' } };
  rememberValidatedPublication('/one', 'v1.8.6', first);
  assert.equal(lastValidatedPublication('/one', 'v1.8.6'), undefined);
  await withPublicationValidationScope(async () => {
    rememberValidatedPublication('/one', 'v1.8.6', first);
    assert.equal(lastValidatedPublication('/one', 'v1.8.6'), first);
    rememberValidatedPublication('/one', 'v1.8.7', second);
    assert.equal(lastValidatedPublication('/one', 'v1.8.6'), undefined);
    assert.equal(isPublicationValidated('/one', 'v1.8.6'), true);
    assert.equal(lastValidatedPublication('/one', 'v1.8.7'), second);
    assert.equal(lastValidatedPublication('/two', 'v1.8.7'), undefined);
  });
  assert.equal(lastValidatedPublication('/one', 'v1.8.7'), undefined);
});
