import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aaSpeed } from '../lib/aa-speed.mjs';

test('AA speed: the unmeasured 0 / 0 placeholder becomes null, measured values pass through', () => {
  assert.deepEqual(aaSpeed({ median_output_tokens_per_second: 0, median_time_to_first_token_seconds: 0 }), { output_tps: null, ttft_s: null });
  assert.deepEqual(aaSpeed({ median_output_tokens_per_second: 69.723, median_time_to_first_token_seconds: 118.062 }), { output_tps: 69.723, ttft_s: 118.062 });
  assert.deepEqual(aaSpeed({ median_output_tokens_per_second: '12', median_time_to_first_token_seconds: -1 }), { output_tps: null, ttft_s: null });
  assert.deepEqual(aaSpeed(undefined), { output_tps: null, ttft_s: null });
});

test('dataset: no model carries a speed or first-token time of 0', async () => {
  const ds = JSON.parse(await readFile('data/dataset.json', 'utf8'));
  const zero = ds.models.filter((m) => m.aa_speed?.output_tps === 0 || m.aa_speed?.ttft_s === 0).map((m) => m.id);
  assert.deepEqual(zero, []);
  assert.ok(ds.models.some((m) => m.aa_speed?.output_tps > 0), 'no measured speed left; the source may have changed');
});
