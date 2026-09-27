// D232, 2026-09-27 — the last of D192's eight one-row arms.
//
// `frontiercode-cost::1.1` had been retained since 2026-09-21 on one blocker: the reviewer was asked
// to accept `scoring.metric` "Cost per rollout" and `scoring.unit` "USD" with no source excerpt that
// states either. The words are the leaderboard's own, but the FrontierCode page is client-rendered
// and its column definitions live in one of the 19 hashed chunks the page declares. The
// `follow_module_script` rule built for exactly this (D188) requires *one* module script matching a
// Vite `/assets/*.js` or CRA `static/js/main.*.js` name, so it can never reach a Next.js page whose
// chunk names rotate on every deploy.
//
// The rule therefore gained a second, declared form: `follow_script_marker`. The page's own
// same-origin `<script src>` list is fetched under the same robots policy and crawl delay, and the
// one script containing the reviewed marker is kept — exactly one, or nothing. Zero matches and two
// matches are both recorded as an error; neither is guessed at, and no other chunk body is written.
//
// Two things are pinned here:
//
//   * The capture this iteration took (data/raw/benchmarks/daily-evidence/2026-09-27-d232/): 19
//     declared scripts, exactly one marker match, and the excerpt verbatim in that chunk's retained
//     bytes. The chunk extracts to far more than the 60,000-byte review bound, so the excerpt path
//     in `protocolSourceContent` is the one actually in force — the mutation probe below shows it
//     failing closed rather than passing a changed column definition.
//   * `captureTargets` must not let a plain `primary_url` cancel a follow request for the same page.
//     Before this change that was a live latent defect, not a hypothetical: `frontiercode-cost::1.1`
//     (registry index 77) declares the follow and `frontiercode::1.1` (index 78) names the same page
//     as its `primary_url`, so the later plain GET overwrote the follow request and the marker
//     capture would never have run in the daily. The four `apprenticebench-*` entries have the same
//     shape and only escaped it because their follow reference happens to be read last.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { captureTargets, followsPageScript, discoveredScriptReceipt, protocolSourceContent } from '../ops/daily/refresh-benchmarks.mjs';

const repo = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, repo), 'utf8'));
const registry = read('data/raw/benchmarks/registry.json');
const plan = read('data/raw/benchmarks/collection-plan.json');
const receipts = read('data/raw/benchmarks/daily-evidence/2026-09-27-d232/manifest.json');

const PAGE = 'https://cognition.com/frontiercode';
const MARKER = 'note:"Cost ($): the mean USD spend per rollout."';
const entry = registry.entries.find((e) => e.id === 'frontiercode-cost::1.1');
const marked = (entry.evidence ?? []).filter((s) => s.follow_script_marker);

test('the cost column reference declares the page, the marker, and nothing else to follow', () => {
  assert.equal(marked.length, 1);
  const [reference] = marked;
  assert.equal(reference.page_url, PAGE);
  assert.equal(reference.follow_script_marker, MARKER);
  assert.equal(reference.follow_module_script, undefined);
  assert.ok(followsPageScript(reference));
  // The marker is part of the quoted passage: a reviewer reads the same text the rule selected on.
  assert.ok(reference.excerpt.includes(MARKER));
  // The row's two disputed fields are both stated by that passage.
  assert.match(reference.excerpt, /label:"Cost \(\$\)"/);
  assert.match(reference.excerpt, /avg cost \(USD\) per rollout/);
  assert.equal(entry.scoring.metric, 'Cost per rollout');
  assert.equal(entry.scoring.unit, 'USD');
  // `field:"cost"` is the leaderboard's own name for the value the locator reads.
  assert.match(reference.excerpt, /field:"cost"/);
  assert.match(entry.how_to_collect.locator, /\.main\.cost/);
});

test('the capture receipt shows the whole declared set searched and exactly one match', () => {
  const page = receipts.find((r) => r.url === PAGE);
  assert.equal(page.status, 200);
  assert.equal(page.follow_marker, MARKER);
  assert.equal(page.declared_scripts, 19);
  assert.equal(page.marker_matches.length, 1);
  assert.equal(page.follow_error, undefined);
  const chunk = discoveredScriptReceipt(receipts, marked[0]);
  assert.equal(chunk.url, page.marker_matches[0]);
  assert.equal(chunk.discovered_from, PAGE);
  assert.equal(chunk.follow_marker, MARKER);
  assert.equal(chunk.file, marked[0].file);
  // The two hashes of one capture, which have been confused before: a capture receipt states the
  // sha256 of the decompressed body, a registry evidence reference the sha256 of the .gz on disk.
  assert.notEqual(chunk.sha256, marked[0].sha256);
  assert.equal(createHash('sha256').update(gunzipSync(readFileSync(new URL(chunk.file, repo)))).digest('hex'), chunk.sha256);
  // Only the page and the one winning chunk were ever written: the other 18 were read and dropped.
  assert.deepEqual(receipts.map((r) => r.url).sort(), [PAGE, chunk.url].sort());
});

// The shape the capture script writes when the marker selects nothing, observed against a page with
// no scripts at all (evidence: iter249-d232/fail-closed-probe/). The page capture still succeeds —
// which matters, because `frontiercode::1.1` reviews that same page — and nothing is queued, so
// `current()` finds no discovered receipt and the cost arm is retained rather than published.
test('a marker that selects nothing leaves the page captured and the arm without a source', () => {
  const softFail = [{ url: PAGE, status: 200, follow_marker: MARKER, declared_scripts: 0, marker_matches: [],
    follow_error: 'Expected exactly one declared script containing the marker, found 0' }];
  assert.equal(discoveredScriptReceipt(softFail, marked[0]), undefined);
  assert.equal(softFail[0].status, 200);
});

test('a marker follow is only satisfied by a receipt carrying that marker', () => {
  const other = { page_url: PAGE, follow_script_marker: 'note:"Time (min): something else."' };
  assert.equal(discoveredScriptReceipt(receipts, other), undefined);
  // An unmarked module-script follow is not satisfied by a marked receipt either.
  assert.equal(discoveredScriptReceipt(receipts, { page_url: PAGE, follow_module_script: true }), undefined);
});

test('the excerpt is verbatim in the retained chunk, and the review is the excerpt path', () => {
  const bytes = readFileSync(new URL(marked[0].file, repo));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), marked[0].sha256);
  const body = gunzipSync(bytes).toString('utf8');
  assert.ok(Buffer.byteLength(body) > 60_000, 'a chunk under the bound would be supplied in full');
  assert.equal(protocolSourceContent(entry.id, marked[0], body), marked[0].excerpt);
  // Failure probe: a column definition that no longer says what we publish cannot reach a reviewer.
  const changed = body.replace(MARKER, 'note:"Cost ($): the median USD spend per task."');
  assert.notEqual(changed, body);
  assert.throws(() => protocolSourceContent(entry.id, marked[0], changed),
    /methodology passage changed or unavailable/);
});

test('a plain primary_url for the same page never cancels the follow request', () => {
  const { urls } = captureTargets({ registry, plan, vendor: { observations: [] } });
  const queued = urls.get(PAGE);
  assert.equal(typeof queued, 'object');
  assert.equal(queued.follow_script_marker, MARKER);
  // The regression in its smallest form: the follow is declared first, a plain GET of the same page
  // second — the order the real registry reads these two FrontierCode entries in.
  const ordered = captureTargets({
    registry: { entries: [
      { id: 'a', primary_url: 'https://example.test/board', evidence: [{ page_url: 'https://example.test/board', follow_script_marker: 'X', url: 'https://example.test/x.js' }] },
      { id: 'b', primary_url: 'https://example.test/board', evidence: [] },
    ] },
    plan: { entries: [] }, vendor: { observations: [] },
  });
  assert.equal(ordered.urls.get('https://example.test/board').follow_script_marker, 'X');
  // And the Vite form of the same rule is protected by the same guard.
  const vite = captureTargets({
    registry: { entries: [
      { id: 'a', primary_url: 'https://example.test/', evidence: [{ page_url: 'https://example.test/', follow_module_script: true, url: 'https://example.test/assets/index-abc.js' }] },
      { id: 'b', primary_url: 'https://example.test/', evidence: [] },
    ] },
    plan: { entries: [] }, vendor: { observations: [] },
  });
  assert.equal(vite.urls.get('https://example.test/').follow_module_script, true);
});
