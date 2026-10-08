// CR-307 v1.7.8 (API lane handoff #10768, score-a4-3): Liquid AI d1 answered the full v1.6.1 S u P set and joins the API
// board as a ranked, not-equated row; every other row keeps its figures and the open-weights board is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jevWithApiA4Rows, jevbenchScopeArtifact, jevScopeClassifier } from '../lib/jevbench-scope.mjs';

const read = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url)));
const rel = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.1-results.json');
const carry = read('data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-dated-carry.json').rows;
const a4 = read('data/jevbench-api-a4-equated.json');
const merged = jevWithApiA4Rows(rel, a4, new Map(carry.map((r) => [r.key, r])));
const isApi = jevScopeClassifier(merged.systems, carry);
const api = jevbenchScopeArtifact(merged, 'api', isApi);
const open = jevbenchScopeArtifact(merged, 'open', isApi);

test('1: d1 is added once with the lane figures, ranked, full set, not equated', () => {
  const d1 = merged.systems.filter((s) => s.key === 'liquid-d1');
  assert.equal(d1.length, 1);
  assert.equal(d1[0].jevbench_score, 73.0491258431614);
  assert.equal(d1[0].capability, 74.4216922125323);
  assert.equal(d1[0].status.rows, 1500);
  assert.equal(d1[0].v16.full_set_api ?? true, true);
  assert.equal(d1[0].a4, undefined);
  assert.equal(d1[0].ranked, true);
});

// CR-338: Mercury Decide joins the API board at #3; OpenAI Decisions moves to #7.
test('2: API board Composite A top 5 includes Mercury Decide after Sage and d1', () => {
  const top = api.systems.filter((s) => s.ranked).sort((x, y) => x.ranks.A - y.ranks.A).slice(0, 5).map((s) => s.key);
  assert.deepEqual(top, ['sage-1.3.0', 'liquid-d1', 'mercury-decide', 'jev-1.13.0', 'wity-1']);
});

test('3: d1 never reaches the open-weights board', () => {
  assert.ok(isApi(merged.systems.find((s) => s.key === 'liquid-d1')));
  assert.equal(open.systems.filter((s) => s.key === 'liquid-d1' && s.ranked).length, 0);
});

// v1.7.9 (API lane #10791): OpenAI Decisions is a preliminary public-set row with its own reason, never ranked.
test('4: OpenAI Decisions is preliminary with the lane figures and its own reason', async () => {
  const { jevApiPreliminaryRows } = await import('../lib/jevbench-scope.mjs');
  const { prelim } = jevApiPreliminaryRows(read('data/jevbench-api-public-set.json'), new Map());
  const o = prelim.find((r) => r.key === 'openai-decisions');
  assert.equal(o.ranked, false);
  assert.equal(o.listing, 'preliminary');
  assert.equal(o.jevbench_score, 37.21821285634585);
  assert.equal(o.capability, 68.82610528565101);
  assert.match(o.not_ranked_because, /next fresh sealed API draw/);
});
