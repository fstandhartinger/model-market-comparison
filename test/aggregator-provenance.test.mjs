import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// CR-38.4 (iteration 82): aggregators are for discovery and cross-checks. Values come from the primary
// evaluator, and the same result never enters twice through two different routes.
const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const policy = read('data/lumina-feed-policy.json');
const aggregators = new Set(policy.host_roles.aggregator);
const host = (url) => { try { return new URL(url).hostname.toLowerCase(); } catch { return null; } };
const stores = ['data/raw/benchmarks/scores.json', 'data/raw/benchmarks/public-observations.json'];

// Same board, same catalog configuration, same harness and basis: every observation of it must come from one
// host. Two hosts would be the same result counted twice through two routes.
function doubledResults(observations) {
  const hosts = new Map();
  for (const o of observations) {
    const s = o.subject || {};
    if (!s.model_id) continue;
    const key = JSON.stringify([o.benchmark_id, s.model_id, s.variant ?? null, s.harness ?? null, o.basis ?? null]);
    (hosts.get(key) || hosts.set(key, new Set()).get(key)).add(host(o.source?.url));
  }
  return [...hosts].filter(([, set]) => set.size > 1).map(([key, set]) => `${key} ← ${[...set].join(', ')}`);
}

test('CR-38.4: the aggregator list covers the aggregators data/SCRAPING.md names', () => {
  for (const h of ['luminabench.com', 'benchlm.ai', 'theaggregate.ai', 'llm-stats.com', 'lmcouncil.ai', 'benchmarklist.com']) assert.ok(aggregators.has(h), h);
});

for (const store of stores) {
  const observations = read(store).observations;

  test(`CR-38.4: no observation in ${store} cites an aggregator as its source`, () => {
    assert.ok(observations.length > 1000);
    const bad = observations.filter((o) => aggregators.has(host(o.source?.url)));
    assert.deepEqual(bad.map((o) => `${o.id} ${o.source.url}`), []);
  });

  test(`CR-38.4: one result enters ${store} through one source only`, () => {
    assert.deepEqual(doubledResults(observations), []);
  });
}

test('CR-38.4: the dedupe check fails on a result that arrives twice', () => {
  const o = (url, extra = {}) => ({ benchmark_id: 'b::1', subject: { model_id: 'm::x', ...extra }, basis: 'measured', source: { url } });
  assert.equal(doubledResults([o('https://board.example/'), o('https://llm-stats.com/benchmarks/b')]).length, 1);
  assert.deepEqual(doubledResults([o('https://board.example/'), o('https://board.example/other')]), []);
  assert.deepEqual(doubledResults([o('https://board.example/'), o('https://other.example/', { harness: 'h' })]), []);
});
