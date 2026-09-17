// CR-66.5: duplicate OpenRouter provider tags resolve to one deterministic, documented offer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { collapseDuplicateEndpoints } from '../lib/openrouter-endpoints.mjs';

const ep = (provider_name, tag, prompt, completion, extra = {}) => ({ provider_name, tag, quantization: 'fp8', pricing: { prompt, completion }, ...extra });

test('identical physical endpoints behind one tag become one offer without alternates', () => {
  const out = collapseDuplicateEndpoints([ep('BaseTen', 'baseten/fp8', '0.0000014', '0.0000044', { uptime_last_30m: 99 }), ep('BaseTen', 'baseten/fp8', '0.0000014', '0.0000044', { uptime_last_30m: 100 }), ep('BaseTen', 'baseten/fast', '0.0000021', '0.0000066')]);
  assert.deepEqual(out.map((o) => [o.endpoint.tag, o.physical_endpoints, o.alternates.length]), [['baseten/fp8', 2, 0], ['baseten/fast', 1, 0]]);
});

test('different prices behind one tag: the cheapest is published regardless of order, the other is recorded', () => {
  const a = ep('Google', 'google-vertex/us-south1', '0.00000025', '0.000001'), b = ep('Google', 'google-vertex/us-south1', '0.00000022', '0.00000088');
  for (const list of [[a, b], [b, a]]) {
    const [only, ...rest] = collapseDuplicateEndpoints(list);
    assert.equal(rest.length, 0);
    assert.equal(only.endpoint, b);
    assert.deepEqual(only.alternates, [a]);
    assert.equal(only.physical_endpoints, 2);
  }
  // Different quantization is a different offer, not a duplicate.
  assert.equal(collapseDuplicateEndpoints([a, { ...b, quantization: 'fp4' }]).length, 2);
});

test('the built dataset has no two OpenRouter offers with the same model, provider, tag and quantization', async () => {
  const { readFile } = await import('node:fs/promises');
  const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
  const seen = new Set(), dups = [];
  for (const m of dataset.models) for (const o of m.offers || []) {
    if (o.source !== 'OpenRouter') continue;
    const key = `${m.id}|${o.or_model_id}|${o.provider}|${o.endpoint_tag}|${o.quantization}`;
    if (seen.has(key)) dups.push(key); else seen.add(key);
  }
  assert.deepEqual(dups, []);
});
