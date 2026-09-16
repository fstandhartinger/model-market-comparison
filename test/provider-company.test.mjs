// F-101: the Providers list shows one row per provider product. The folding is data, not layout,
// so it is tested here against the shipped catalog as well as against hand-made cases.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { providerCompanies, providerCompanyName, providerRouteLabel } from '../lib/provider-company.mjs';

const dataset = JSON.parse(readFileSync(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const catalog = dataset.providers.map((p) => ({ platform: p.platform, provider: p.provider }));

test('two keys of one company fold into one row that toggles both', () => {
  const rows = providerCompanies([
    { platform: 'Anthropic', provider: 'Anthropic' },
    { platform: 'OpenRouter', provider: 'Anthropic' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, 'Anthropic');
  assert.deepEqual(rows[0].keys, ['Anthropic::Anthropic', 'OpenRouter::Anthropic']);
  assert.equal(rows[0].sub, 'direct · via OpenRouter');
  // The row's own key is one of its keys, so an existing key-based selection keeps working.
  assert.ok(rows[0].keys.includes(rows[0].key));
});

test("a gateway's own spelling folds into the name the site uses elsewhere, and stays searchable", () => {
  const rows = providerCompanies([
    { platform: 'OpenRouter', provider: 'Amazon Bedrock' },
    { platform: 'AWS Bedrock', provider: 'AWS Bedrock' },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, 'AWS Bedrock');
  assert.equal(rows[0].keys.length, 2);
  assert.ok(rows[0].search.toLowerCase().includes('amazon bedrock'));
  assert.equal(providerCompanyName({ platform: 'OpenRouter', provider: 'Azure' }), 'Azure AI Foundry');
  assert.equal(providerCompanyName({ platform: 'OpenRouter', provider: 'Google' }), 'Google Vertex AI');
  // Only the named gateway keys are renamed — a provider of the same name elsewhere is untouched.
  assert.equal(providerCompanyName({ platform: 'Azure AI Foundry', provider: 'Azure AI Foundry' }), 'Azure AI Foundry');
  assert.equal(providerRouteLabel({ platform: 'OpenRouter', provider: 'Chutes' }), 'via OpenRouter');
  assert.equal(providerRouteLabel({ platform: 'Chutes', provider: 'Chutes' }), 'direct');
});

test('different products of one company stay separate rows', () => {
  const rows = providerCompanies([
    { platform: 'Google Vertex AI', provider: 'Google Vertex AI' },
    { platform: 'OpenRouter', provider: 'Google AI Studio' },
    { platform: 'OpenRouter', provider: 'Claude Platform on AWS' },
  ]);
  assert.deepEqual(rows.map((r) => r.label).sort(), ['Claude Platform on AWS', 'Google AI Studio', 'Google Vertex AI']);
});

test('the shipped catalog shows every company once, and no key is lost or duplicated', () => {
  const rows = providerCompanies(catalog);
  const labels = rows.map((r) => r.label);
  assert.deepEqual([...new Set(labels)].length, labels.length, 'a company name appears twice');
  const keys = rows.flatMap((r) => r.keys);
  assert.equal(keys.length, catalog.length);
  assert.deepEqual([...keys].sort(), catalog.map((p) => `${p.platform}::${p.provider}`).sort());
  // The folding is real on the live catalog: the known double routes are one row each.
  for (const name of ['Anthropic', 'Chutes', 'Mistral', 'Nebius', 'Inceptron', 'AWS Bedrock', 'Azure AI Foundry', 'Google Vertex AI']) {
    const row = rows.find((r) => r.label === name);
    assert.ok(row, `${name} missing`);
    assert.ok(row.keys.length >= 2, `${name} should fold at least two catalog keys`);
    assert.ok(row.sub?.includes('direct'), `${name} should name its direct route`);
  }
});
