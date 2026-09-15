import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REGION_BUCKETS, countryBucket, hostingBucket, regionStateFromLegacy, allRegions } from '../lib/regions.mjs';

test('CR-25.4: company country → China / EU / US / Other, never guessed', () => {
  assert.deepEqual(REGION_BUCKETS, ['China', 'EU', 'US', 'Other']);
  for (const [c, b] of [['Germany', 'EU'], ['EU', 'EU'], ['France', 'EU'], ['Netherlands', 'EU'], ['US', 'US'], ['United States', 'US'], ['China', 'China'], ['Hong Kong', 'China'],
    ['United Kingdom', 'Other'], ['Switzerland', 'Other'], ['Canada', 'Other'], ['Japan', 'Other'], ['', 'Other'], [null, 'Other']]) assert.equal(countryBucket(c), b, String(c));
});

test('CR-25.4: every provider country in the dataset lands in a bucket; the known ones where expected', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const buckets = new Map(ds.providers.map((p) => [p.provider, countryBucket(p.country)]));
  assert.ok([...buckets.values()].every((b) => REGION_BUCKETS.includes(b)));
  assert.ok([...buckets.values()].includes('EU') && [...buckets.values()].includes('US') && [...buckets.values()].includes('China'));
});

test('CR-25.4: hosting bucket needs EU evidence for EU; US regions, Chinese regions, global → Other', () => {
  assert.equal(hostingBucket({ region: 'eu' }, true), 'EU');
  assert.equal(hostingBucket({ region: 'eu' }, false), 'Other', 'a label alone is not EU evidence');
  assert.equal(hostingBucket({ region: 'us-east-1' }, false), 'US');
  assert.equal(hostingBucket({ region: 'us (US cross-region inference profile)' }, false), 'US');
  assert.equal(hostingBucket({ region: 'global' }, false), 'Other');
  assert.equal(hostingBucket({ region: 'uk' }, false), 'Other');
  assert.equal(hostingBucket({ region: 'cn-north-1' }, false), 'China');
  assert.equal(hostingBucket({}, false), 'Other');
});

test('CR-25.4: the old toggles migrate onto positive sets without changing anyone\'s results', () => {
  assert.deepEqual(regionStateFromLegacy({}), { hostedIn: REGION_BUCKETS, providerBasedIn: REGION_BUCKETS, labBasedIn: REGION_BUCKETS });
  assert.deepEqual(regionStateFromLegacy({ euHostedOnly: true }).hostedIn, ['EU']);
  assert.deepEqual(regionStateFromLegacy({ excludeChinese: true, nonUsOnly: true }).providerBasedIn, ['EU', 'Other']);
  assert.equal(allRegions(REGION_BUCKETS), true);
  assert.equal(allRegions(['EU']), false);
});
