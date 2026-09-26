// CR-173 (frontiercode lane), 2026-09-26. The daily arms frontiercode::1.1 and frontiercode-cost::1.1 were
// RETAINED from 2026-09-22 on: once Cognition added GPT-6 Sol/Luna, Claude Opus 5.5 and Grok 4.7, the rows changed,
// the protocol review ran, and its packet held only the leaderboard page (whose table is client-rendered: "Loading
// leaderboard…") and robots.txt. The critic could not find the score definition, the percent scale or the 100-task
// Main subset (frontiercode::1.1, "critic blocked the artifact"), and the producer could not find "cost per rollout"
// or USD (frontiercode-cost::1.1, "every row was flagged"). The entries now also cite the methodology posts, the
// leaderboard's own legend chunk (cost entry) and the data file's board-level keys through the `frontiercode-meta`
// recipe; both reviews pass on the 2026-09-26 capture (gauntlet/ in that evidence folder).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { protocolSourceContent } from '../ops/daily/refresh-benchmarks.mjs';
import { parseFrontierCodeId } from '../lib/coding-identity.mjs';
import { observationDigest } from '../lib/benchmark-score-evidence.mjs';

const repo = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, repo), 'utf8'));
const E = 'data/raw/benchmarks/daily-evidence/2026-09-26-frontiercode';
const captures = read(`${E}/manifest.json`);
const registry = read('data/raw/benchmarks/registry.json');
const text = (file, recipe) => execFileSync('python3', ['ops/daily/public-candidate.py', 'text', file, ...(recipe ? [recipe] : [])],
  { cwd: repo, encoding: 'utf8', maxBuffer: 16_000_000 });
const DATA = 'https://cognition.com/data/frontiercode-leaderboard/data.json';

/** The sources `protocol()` hands the reviewer for an entry, built from this capture. */
function packet(id) {
  const entry = registry.entries.find((e) => e.id === id);
  return entry.evidence.filter((s) => !s.source_sha256 && !/literal field/.test(s.excerpt ?? ''))
    .filter((s) => !s.url.endsWith('/robots.txt'))
    .map((s) => {
      const capture = captures.find((c) => c.url === s.url);
      assert.ok(capture, `${id}: ${s.url} captured on 2026-09-26`);
      const content = protocolSourceContent(id, s, text(capture.file, s.recipe));
      assert.ok(Buffer.byteLength(content) <= 60_000, `${id}: ${s.url} within the review bound`);
      return { url: s.url, recipe: s.recipe ?? null, content: content.replace(/\s+/g, ' ') };
    });
}

test('CR-173: frontiercode-meta prints only the data file\'s board-level v1_1 keys, never the runs', () => {
  const out = JSON.parse(text(captures.find((c) => c.url === DATA).file, 'frontiercode-meta'));
  assert.deepEqual(Object.keys(out), ['v1_1']);
  assert.deepEqual(Object.keys(out.v1_1), ['subsets', 'harness', 'efforts']);
  assert.deepEqual(out.v1_1.subsets, { main: 100, extended: 150 });
  assert.deepEqual(out.v1_1.efforts['GPT-6 Sol'], ['low', 'medium', 'high', 'xhigh', 'max']);
});

test('CR-173: the score entry\'s packet states the metric, the scale, the subset and the data-file guard', () => {
  const all = packet('frontiercode::1.1').map((s) => s.content).join('\n');
  for (const passage of ['A solution’s score is a weighted aggregate of the rubric items. Solutions that do not pass blocking criteria receive 0.',
    'achieves a score of only 13.4%', 'target a range of scores from 0 to 100%', 'Main consists of the 100 hardest',
    'full 150-task Extended set', 'Current revision. Runs flagged for unfair internet use are zeroed.', '"subsets": {"main": 100, "extended": 150}']) {
    assert.ok(all.includes(passage), `missing from the packet: ${passage}`);
  }
  // The value payload itself stays out: no per-run field reaches a protocol review.
  assert.ok(!all.includes('new_score'), 'no run values in the protocol packet');
});

test('CR-173: the cost entry\'s packet carries the leaderboard\'s own cost legend', () => {
  const sources = packet('frontiercode-cost::1.1');
  const legend = sources.find((s) => s.url.includes('/_next/static/chunks/'));
  assert.ok(legend, 'legend chunk is a reviewed reference');
  assert.ok(legend.content.includes('axisLabel:"avg cost (USD) per rollout"') && legend.content.includes('note:"Cost ($): the mean USD spend per rollout."'));
  assert.ok(Buffer.byteLength(legend.content) < 1_000, 'a 138 KB bundle is reviewed through its excerpt only');
  assert.throws(() => protocolSourceContent('frontiercode-cost::1.1', registry.entries.find((e) => e.id === 'frontiercode-cost::1.1').evidence.find((s) => s.url === legend.url),
    text(captures.find((c) => c.url === legend.url).file).replace('the mean USD spend per rollout', 'the median USD spend per task')), /methodology passage changed/);
});

test('CR-173: new FrontierCode names parse to their own families with the board\'s effort key', () => {
  assert.deepEqual(parseFrontierCodeId('GPT-6 Sol|max'), { family: 'gpt-6-sol', effort: 'max' });
  assert.deepEqual(parseFrontierCodeId('GPT-6 Luna|low'), { family: 'gpt-6-luna', effort: 'low' });
  assert.deepEqual(parseFrontierCodeId('Claude Opus 5.5|xhigh'), { family: 'claude-opus-5.5', effort: 'xhigh' });
  assert.deepEqual(parseFrontierCodeId('Grok 4.7|high'), { family: 'grok-4.7', effort: 'high' });
  assert.equal(parseFrontierCodeId('Claude Opus 5|max').family, 'claude-opus-5', 'Opus 5 stays Opus 5');
});

test('CR-173: each of the 34 new rows has an owner approval bound to its digest and a reviewed identity join', () => {
  const D = 'ops/rebuild-2026-09/evidence/phase-09/frontiercode';
  const rows = ['frontiercode-1.1', 'frontiercode-cost-1.1'].flatMap((slug) => read(`${D}/${slug}-artifact.json`).observations);
  assert.equal(rows.length, 34);
  const pub = new Map(read('data/raw/benchmarks/public-observations.json').observations.map((o) => [o.id, o]));
  const approvals = read('data/raw/benchmarks/score-approvals.json').rows;
  const map = read('data/raw/benchmarks/identity-map.json').entries;
  for (const row of rows) {
    assert.deepEqual(pub.get(row.id), row, `${row.id}: published row equals the frozen artifact row`);
    const approval = approvals.find((a) => a.id === row.id);
    assert.equal(approval?.observation_sha256, observationDigest(row), `${row.id}: approval binds the row`);
    assert.ok(!approval.critic_model.startsWith('anthropic/'), 'critic outside the producer family');
    const join = map.find((e) => e.benchmark_id === row.benchmark_id && e.source_id === row.subject.source_id);
    const { family, effort } = parseFrontierCodeId(row.subject.source_id);
    assert.equal(join?.model_id, `${family}::${effort}`);
    assert.equal(join.review.packet_file, `${D}/identity-review/packet.json`);
  }
});

test('CR-173: FrontierCode 1.1 Extended is its own fully populated identity on the same capture', () => {
  const plan = read('data/raw/benchmarks/collection-plan.json').entries;
  for (const [id, base, field] of [['frontiercode-extended::1.1', 'frontiercode::1.1', 'new_score'], ['frontiercode-extended-cost::1.1', 'frontiercode-cost::1.1', 'cost']]) {
    const e = registry.entries.find((x) => x.id === id), b = registry.entries.find((x) => x.id === base);
    assert.equal(e.family, id.split('::')[0]);
    assert.deepEqual({ ...e.scoring, notes: null }, { ...b.scoring, notes: null }, `${id}: same metric and scale as ${base}`);
    assert.match(e.how_to_collect.version_guard, /subsets\.extended == 150/);
    assert.ok(e.evidence.some((s) => s.excerpt === `"${field}" (literal field in the captured leaderboard data.json, v1_1 Extended subset; gzip source retained)`));
    const spec = plan.find((s) => s.benchmark_id === id);
    assert.equal(spec.parser.subset, 'extended');
    assert.deepEqual(spec.parser.require, { 'subsets.extended': 150 });
    assert.equal(spec.parser.value_field, field);
    // The protocol packet the daily would build for it resolves on the capture, like the Main entries'.
    assert.ok(packet(id).length >= 4);
  }
});

test('CR-173: each of the 230 Extended rows has an owner approval and a reviewed identity join where one exists', () => {
  const D = 'ops/rebuild-2026-09/evidence/phase-09/frontiercode';
  const ids = read(`${D}/changed-rows-extended.json`).changed.map((c) => c.row.id);
  assert.equal(ids.length, 230);
  const pub = new Map(read('data/raw/benchmarks/public-observations.json').observations.map((o) => [o.id, o]));
  const approvals = new Map(read('data/raw/benchmarks/score-approvals.json').rows.map((a) => [a.id, a]));
  const map = read('data/raw/benchmarks/identity-map.json').entries.filter((e) => e.benchmark_id.startsWith('frontiercode-extended'));
  const board = JSON.parse(text(captures.find((c) => c.url === DATA).file)).v1_1;
  for (const id of ids) {
    const row = pub.get(id), [model, effort] = row.subject.source_id.split('|');
    const source = board.data[model][effort].extended[row.benchmark_id.includes('cost') ? 'cost' : 'new_score'];
    assert.ok(Math.abs(row.value - (row.benchmark_id.includes('cost') ? source : source * 100)) < 1e-9, `${id}: value is the source value`);
    assert.equal(approvals.get(id)?.observation_sha256, observationDigest(row), `${id}: approval binds the row`);
  }
  assert.equal(map.length, 170);
  assert.ok(map.every((e) => e.review?.packet_file === `${D}/identity-review-extended/packet.json`));
});
