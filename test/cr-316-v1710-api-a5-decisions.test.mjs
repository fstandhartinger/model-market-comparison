// CR-316 v1.7.10 (API lane handoff #10818, score-a5-1): OpenAI Decisions answered the fresh sealed API set A5 u P and is
// ranked on the API board with A5's own equating offsets; its preliminary public-set row disappears from the charts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevScopeClassifier, jevApiPreliminaryRows } from '../lib/jevbench-scope.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
const carry = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json').rows;
const a4 = read('data/jevbench-api-a4-equated.json');
const merged = jevWithApiA4Rows(rel, a4, new Map(carry.map((r) => [r.key, r])));
const isApi = jevScopeClassifier(merged.systems, carry);
const api = jevbenchScopeArtifact(merged, 'api', isApi);
const open = jevbenchScopeArtifact(merged, 'open', isApi);
const o = merged.systems.filter((s) => s.key === 'openai-decisions');

test('1: OpenAI Decisions is added once with the lane figures, ranked, equated on A5 u P', () => {
  assert.equal(o.length, 1);
  assert.equal(o[0].jevbench_score, 62.5);
  assert.equal(o[0].capability, 73.5);
  assert.equal(o[0].ranked, true);
  assert.equal(o[0].a4.subset, 'A5');
  assert.equal(o[0].v16.round, 'score-a5-1');
  assert.deepEqual(o[0].v16.equating_offset, a4.a5.a5_offsets);
  assert.equal(o[0].cost.usd_per_1000, 0.0517);
  assert.match(o[0].cost.basis, /launch day/);
});

test('2: A4 rows keep the A4 round and offsets', () => {
  const inst = merged.systems.find((s) => s.key === 'instinct');
  assert.equal(inst.a4.subset, 'A4');
  assert.deepEqual(inst.v16.equating_offset, a4.a4_offsets);
});

test('3: it is ranked #7 in API Composite A after CR-338 and never on the open-weights board', () => {
  assert.equal(api.systems.find((s) => s.key === 'openai-decisions').ranks.A, 7);
  assert.ok(isApi(o[0]));
  assert.equal(open.systems.filter((s) => s.key === 'openai-decisions' && s.ranked).length, 0);
});

test('4: the preliminary public-set row is superseded (board key present, so the chart extras drop it)', () => {
  const { prelim } = jevApiPreliminaryRows(read('data/jevbench-api-public-set.json'), new Map());
  const measured = new Set(api.systems.map((s) => s.key));
  assert.equal(prelim.filter((r) => !measured.has(r.key)).length, 0);
});
