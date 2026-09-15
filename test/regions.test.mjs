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

import { sanitizeRegionList, migrateLegacyRegions, labBucket, labFilter } from '../lib/regions.mjs';

test('CR-25.4: stored lists are canonical; empty or junk lists mean all; legacy switches migrate once', () => {
  assert.deepEqual(sanitizeRegionList(['US', 'EU', 'Mars']), ['EU', 'US']);
  assert.deepEqual(sanitizeRegionList([]), REGION_BUCKETS);
  assert.equal(sanitizeRegionList('EU'), null);
  assert.deepEqual(migrateLegacyRegions({ euHostedOnly: true, excludeChinese: false, nonUsOnly: true, openOnly: true }),
    { openOnly: true, hostedIn: ['EU'], providerBasedIn: ['China', 'EU', 'Other'] });
  assert.deepEqual(migrateLegacyRegions({ euHostedOnly: true, hostedIn: ['US'] }).hostedIn, ['US'], 'the new shape wins');
  const plain = { openOnly: true };
  assert.equal(migrateLegacyRegions(plain), plain);
});

test('CR-25.4/25.5: lab country is documented or Other; the lab filter combines picked labs and lab country', () => {
  assert.equal(labBucket('Anthropic'), 'US');
  assert.equal(labBucket('DeepSeek'), 'China');
  assert.equal(labBucket('Mistral'), 'EU');
  assert.equal(labBucket('Cohere'), 'Other');
  assert.equal(labBucket('Some fine-tuner'), 'Other');
  assert.equal(labFilter([], REGION_BUCKETS), null);
  const euOnly = labFilter([], ['EU']);
  assert.equal(euOnly('Mistral'), true);
  assert.equal(euOnly('OpenAI'), false);
  const picked = labFilter(['OpenAI', 'Mistral'], ['US', 'Other']);
  assert.equal(picked('OpenAI'), true);
  assert.equal(picked('Mistral'), false, 'picked but outside the lab-country choice');
  assert.equal(picked('Google'), false, 'not picked');
});

test('CR-25.4: every lab in the dataset gets a bucket; the big labs are not Other', async () => {
  const ds = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const orgs = new Set(ds.models.map((m) => m.org));
  for (const org of orgs) assert.ok(REGION_BUCKETS.includes(labBucket(org)), org);
  for (const org of ['OpenAI', 'Anthropic', 'Google', 'Z.ai', 'Moonshot AI', 'Alibaba', 'DeepSeek', 'Mistral']) if (orgs.has(org)) assert.notEqual(labBucket(org), 'Other', org);
});
