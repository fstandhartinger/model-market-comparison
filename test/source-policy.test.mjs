import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// CR-20260916 (CR-39): DesignArena is collected under a recorded documented-risk decision. The point of
// these tests is that the decision, not the collector, defines the scope — so a later change that adds a
// board or an endpoint fails here until the decision itself is changed.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const policies = JSON.parse(read('data/source-policies.json'));

test('the DesignArena decision is recorded with its evidence and blocks expansion', () => {
  const p = policies.policies.designarena;
  assert.ok(p, 'a policy exists');
  assert.equal(p.decision, 'documented_risk');
  assert.equal(p.decided_by, 'Florian');
  assert.equal(p.expansion, 'blocked');
  assert.match(p.evidence, /iter78-designarena-terms/);
  assert.match(p.findings.robots, /Disallow|disallow/);
  assert.match(p.findings.terms, /generally available third-party web browsers/, "the terms are quoted, not summarised away");
  assert.match(p.findings.api_documentation, /None found/);
  assert.ok(p.revisit_when.length > 10, 'the decision says what would reopen it');
});

test('the permitted scope is exactly the two published boards and the two endpoints they need', () => {
  const p = policies.policies.designarena;
  assert.deepEqual(p.permitted_boards.map((b) => b.key), ['frontend', 'fullstack']);
  assert.deepEqual(p.permitted_endpoints, [
    'POST https://www.designarena.ai/api/leaderboard',
    'GET https://www.designarena.ai/api/registry',
  ]);
  for (const b of p.permitted_boards) assert.ok(b.request && Object.keys(b.request).length, `${b.key} carries the exact request it is permitted to send`);
});

test('the collector takes its boards from the decision and refuses anything outside it', () => {
  const src = read('scripts/fetch-live.mjs');
  assert.match(src, /const policy = await readSourcePolicy\("designarena"\)/, 'the scope is read, not hard-coded');
  assert.match(src, /const queries = policy\.permitted_boards\.map/);
  assert.match(src, /permit\(`POST \$\{baseUrl\}\/api\/leaderboard`\)/);
  assert.match(src, /permit\(`GET \$\{baseUrl\}\/api\/registry`\)/);
  assert.match(src, /is outside the recorded access decision/, 'an unlisted endpoint throws');
  // No second DesignArena request may be issued behind the guard's back: inside the collector every
  // request to the source's base URL is one of the two the decision permits.
  const body = src.slice(src.indexOf('async function fetchDesignArena'), src.indexOf('// Concurrency-limited map.'));
  assert.ok(body.length > 500, 'the collector was found');
  const paths = [...body.matchAll(/\$\{baseUrl\}(\/[\w/-]*)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(paths)].sort(), ['/api/leaderboard', '/api/registry']);
});

test('the guard actually refuses: an endpoint outside the decision is rejected', () => {
  const p = policies.policies.designarena;
  const permit = (endpoint) => { if (!p.permitted_endpoints.includes(endpoint)) throw new Error('outside the recorded access decision'); };
  assert.throws(() => permit('POST https://www.designarena.ai/api/battles'), /outside the recorded access decision/);
  assert.doesNotThrow(() => permit('GET https://www.designarena.ai/api/registry'));
});

test('nothing claims an official API or a licensed feed for this source', () => {
  const raw = JSON.parse(read('data/raw/designarena.json'));
  assert.match(raw.source, /no published API documentation or data licence/);
  assert.doesNotMatch(raw.source, /leaderboard API/);
  const about = read('app/about/page.tsx');
  assert.match(about, /publishes no API documentation or data licence/, '/about states what the source actually is');
  assert.match(about, /not an official feed/);
});
