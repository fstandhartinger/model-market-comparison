import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const map = json('data/raw/benchmarks/identity-map.json');

test('identity-map review dates are attached to individual joins', () => {
  assert.match(map.reviewed_at, /^2026-09-16$/, 'legacy fallback remains stable for old consumers');
  assert.ok(map.entries.length > 1000);
  for (const entry of map.entries) {
    assert.match(entry.reviewed_at, /^2026-\d{2}-\d{2}$/, `${entry.benchmark_id}/${entry.source_id}`);
  }
  assert.equal(map.entries.find((e) => e.benchmark_id === 'frontiercode::1.1').reviewed_at, '2026-09-15');
  assert.equal(map.entries.find((e) => e.benchmark_id === 'rsi-exam::0.1').reviewed_at, '2026-09-20');
  assert.equal(map.entries.find((e) => e.benchmark_id === 'toolathlon-verified::2026-06-30').reviewed_at, '2026-09-20');
});

test('ingestion reads the per-entry date rather than only the legacy map date', () => {
  const source = readFileSync('scripts/ingest-benchmark-scores.mjs', 'utf8');
  assert.match(source, /reviewed\.reviewed_at \?\? identityMap\.reviewed_at/);
  const scores = json('data/raw/benchmarks/scores.json').observations;
  const joined = scores.find((o) => o.benchmark_id === 'toolathlon-verified::2026-06-30' && o.subject.model_id);
  assert.ok(joined);
  assert.match(joined.join_note, /^Reviewed identity map 2026-09-20: /, joined.id);
});
