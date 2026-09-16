import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 2026-09-15 coding intake: DeepSWE (via Epoch AI) and Scale AI's SWE Atlas boards.
const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
// 2026-09-16 (iteration 80): Epoch AI's own runs from the same hub archive, joined with the DeepSWE label rule.
const EPOCH_RUN = ['frontiermath-tiers-1-3::v2', 'frontiermath-tier-4::v2', 'simpleqa-verified::snapshot-2026-09-16'];
const IDS = ['deepswe::snapshot-2026-09-15', 'swe-atlas-qna::snapshot-2026-09-15', 'swe-atlas-test-writing::snapshot-2026-09-15', 'swe-atlas-refactoring::snapshot-2026-09-15'];
// 2026-09-16 (iteration 79): boards whose labels are model slugs, joined by lib/board-identity.mjs.
const SLUG_BOARDS = ['osworld-2', 'swe-rebench', 'gso', 'hyper-tau-bench', 'lisanbench', 'matharena-arxivmath', 'matharena-brokenarxiv', 'bullshitbench-v1', 'bullshitbench-v2', 'apprenticebench-api', 'apprenticebench-api-cost',
  'apprenticebench-cua', 'apprenticebench-cua-cost', 'vals-index', 'vals-index-cost', 'vals-index-emb',
  'vals-index-finance-agent', 'vals-index-hlab', 'vals-index-legal-research', 'vals-index-terminal-bench-2.1',
  'vals-index-vibe-code-bench', 'vals-index-code-migration'];
const MIN = { 'deepswe::snapshot-2026-09-15': 60, 'swe-atlas-qna::snapshot-2026-09-15': 20, 'swe-atlas-test-writing::snapshot-2026-09-15': 20, 'swe-atlas-refactoring::snapshot-2026-09-15': 15 };

test('the collector reproduces the committed observations from the committed evidence alone', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json');
  const subset = { ...plan, entries: plan.entries.filter((e) => IDS.includes(e.benchmark_id)) };
  assert.equal(subset.entries.length, 4);
  const dir = mkdtempSync(join(tmpdir(), 'bh-coding-'));
  writeFileSync(join(dir, 'plan.json'), JSON.stringify(subset));
  execFileSync('python3', ['scripts/collect-public-benchmarks.py', '--plan', join(dir, 'plan.json'), join(dir, 'out.json')], { cwd: new URL('..', import.meta.url) });
  const fresh = JSON.parse(readFileSync(join(dir, 'out.json'))).observations;
  const committed = json('data/raw/benchmarks/public-observations.json').observations.filter((o) => IDS.includes(o.benchmark_id));
  assert.deepEqual(fresh, committed);
  for (const id of IDS) assert.ok(fresh.filter((o) => o.benchmark_id === id).length >= MIN[id], `${id} keeps its minimum coverage`);
  assert.ok(fresh.every((o) => o.basis === 'measured' && o.subject.model_id === null), 'measured; joins happen only at ingestion');
  assert.ok(fresh.filter((o) => o.benchmark_id.startsWith('deepswe')).every((o) => o.unit === 'fraction' && o.value >= 0 && o.value <= 1 && o.subject.harness === 'mini-swe-agent'));
  assert.ok(fresh.filter((o) => o.benchmark_id.startsWith('swe-atlas')).every((o) => o.unit === 'percent' && o.value >= 0 && o.value <= 100));
});

test('a changed page identity or CSV header fails closed instead of importing', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json');
  const dir = mkdtempSync(join(tmpdir(), 'bh-coding-guard-'));
  for (const [id, patch] of [
    ['swe-atlas-qna::snapshot-2026-09-15', (e) => { e.parser.require_text = '<title>SWE Atlas - Test Writing</title>'; }],
    ['deepswe::snapshot-2026-09-15', (e) => { e.parser.require_header = [...e.parser.require_header].reverse(); }],
  ]) {
    const entry = structuredClone(plan.entries.find((e) => e.benchmark_id === id));
    patch(entry);
    writeFileSync(join(dir, 'plan.json'), JSON.stringify({ ...plan, entries: [entry] }));
    assert.throws(() => execFileSync('python3', ['scripts/collect-public-benchmarks.py', '--plan', join(dir, 'plan.json'), join(dir, `${id.split('::')[0]}.json`)], { cwd: new URL('..', import.meta.url), stdio: 'pipe' }));
  }
});

test('DeepSWE is a reviewed manual snapshot the daily refresh never fetches; SWE Atlas boards stay in the daily refresh', () => {
  const plan = json('data/raw/benchmarks/collection-plan.json');
  const spec = (id) => plan.entries.find((e) => e.benchmark_id === id);
  assert.equal(spec(IDS[0]).refresh, 'manual');
  for (const id of IDS.slice(1)) assert.equal(spec(id).refresh, undefined);
  const refresh = readFileSync(new URL('../ops/daily/refresh-benchmarks.mjs', import.meta.url), 'utf8');
  assert.match(refresh, /filter\(\(spec\) => spec\.refresh === 'manual'\)/);
  assert.match(refresh, /if \(manual\.has\(entry\.id\)\) continue; add\(\{ url: entry\.primary_url \}\)/, 'registry URLs of manual entries are not queued');
  assert.match(refresh, /if \(manual\.has\(spec\.benchmark_id\)\) continue;\s*add\(spec\.source\)/, 'plan sources of manual entries are not queued');
  assert.match(refresh, /status: 'retained_manual_snapshot'/, 'their rows are retained, not re-parsed');
  assert.match(json('data/raw/benchmarks/registry.json').entries.find((e) => e.id === IDS[0]).how_to_collect.notes, /^Manual snapshot, not part of the automatic daily refresh/);
});

test('registry provenance: measured maintainers, dated identities, committed evidence and robots receipts', () => {
  const registry = json('data/raw/benchmarks/registry.json');
  for (const id of IDS) {
    const e = registry.entries.find((x) => x.id === id);
    assert.ok(e, id);
    assert.equal(e.category, 'Coding');
    assert.equal(e.version_status, 'snapshot', 'no version is claimed that the capture does not state');
    assert.ok(e.evidence.some((x) => x.url.endsWith('/robots.txt')), 'robots receipt');
    assert.ok(e.evidence.every((x) => x.file.startsWith('data/raw/benchmarks/daily-evidence/2026-09-15-coding/')));
  }
  assert.match(registry.entries.find((x) => x.id === IDS[0]).how_to_collect.notes, /CC-BY 4\.0/);
});

test('identity map: exact existing configurations; measured joins visible; self-reported joins only with a review receipt', () => {
  const map = json('data/raw/benchmarks/identity-map.json');
  const dataset = json('data/dataset.json');
  const catalog = new Set(dataset.models.map((m) => m.id));
  const observations = dataset.benchmark_results.observations;
  assert.ok(map.entries.length >= 80);
  const SELF_REPORTED = ['frontiercode::1.1', 'frontiercode-cost::1.1', 'cursorbench::4.0', 'cursorbench-cost::4.0', 'swe-bench-pro-public::snapshot-2026-09-10'];
  for (const entry of map.entries.filter((e) => e.basis === 'self_reported')) {
    assert.ok(SELF_REPORTED.includes(entry.benchmark_id), 'self-reported joins cover only the reviewed vendor boards');
    assert.ok(catalog.has(entry.model_id), `${entry.model_id} exists`);
    const o = observations.find((x) => x.benchmark_id === entry.benchmark_id && x.subject.source_id === entry.source_id);
    assert.ok(o, entry.source_id);
    assert.equal(o.source_basis ?? o.basis, 'self_reported', 'derived rows keep their self-reported source basis');
    if (entry.review) {
      assert.equal(o.subject.model_id, entry.model_id);
      assert.equal(o.identity_review.critic_model, entry.review.critic_model);
    } else assert.equal(o.subject.model_id, null, 'without a receipt the row stays unjoined');
  }
  for (const entry of map.entries.filter((e) => e.basis !== 'self_reported')) {
    assert.ok([...IDS, ...EPOCH_RUN, ...SLUG_BOARDS].some((id) => entry.benchmark_id === id || entry.benchmark_id.startsWith(`${id}::`)),
      `the map covers only the reviewed boards: ${entry.benchmark_id}`);
    assert.ok(catalog.has(entry.model_id), `${entry.model_id} exists`);
    const o = observations.find((x) => x.benchmark_id === entry.benchmark_id && x.subject.source_id === entry.source_id);
    assert.ok(o, entry.source_id);
    assert.equal(o.basis, 'measured');
    assert.equal(o.subject.model_id, entry.model_id);
    assert.match(o.join_note, new RegExp(`^Reviewed identity map ${map.reviewed_at}: `));
  }
  const effortless = map.entries.filter((e) => /without an effort|without a setting/.test(e.rule));
  assert.ok(effortless.every((e) => e.model_id.endsWith('::default')), 'no effort is ever guessed');
  // A configuration is never claimed twice on one board — the rule that keeps two harness rows of one
  // configuration from both becoming "the" result.
  const seen = new Set();
  for (const e of map.entries) {
    const key = `${e.benchmark_id}\0${e.model_id}`;
    assert.ok(!seen.has(key), `${e.model_id} is claimed twice on ${e.benchmark_id}`);
    seen.add(key);
  }
});

// 2026-09-16 (iteration 79): the slug boards. The map is re-derived here from the labels alone, so a hand
// edit that does not follow the published rule fails the build.
test('slug boards: every join re-derives from the label, and the refusals are the honest ones', async () => {
  const { normaliseSlug, parseBullshitBenchId, parseApprenticeBenchId, parseValsIndexId, parseOsworld2Id, parseMathArenaLabel } = await import('../lib/board-identity.mjs');
  const map = json('data/raw/benchmarks/identity-map.json');
  const dataset = json('data/dataset.json');
  const byId = new Map(dataset.models.map((m) => [m.id, m]));
  const parserFor = (benchmarkId) => benchmarkId.startsWith('bullshitbench-') ? parseBullshitBenchId
    : benchmarkId.startsWith('apprenticebench-') ? parseApprenticeBenchId
    : benchmarkId.startsWith('vals-index') ? parseValsIndexId
    : benchmarkId.startsWith('osworld-2::') ? parseOsworld2Id
    : benchmarkId.startsWith('matharena-') ? parseMathArenaLabel : null;
  const slugEntries = map.entries.filter((e) => parserFor(e.benchmark_id));
  assert.ok(slugEntries.length >= 300, `slug boards carry joins: ${slugEntries.length}`);
  const observations = dataset.benchmark_results.observations;
  for (const e of slugEntries) {
    // Vals publishes the setting it ran in its own row, which the observation retains verbatim, so the
    // re-derivation reads the same protocol text the join was made from.
    const o = observations.find((x) => x.benchmark_id === e.benchmark_id && x.subject.source_id === e.source_id);
    const { family, effort } = parserFor(e.benchmark_id)(e.source_id, e.source_id, o?.protocol ?? '');
    const model = byId.get(e.model_id);
    assert.ok(model, e.model_id);
    assert.equal(model.family_key, family, `${e.source_id}: the joined family is the label's own slug`);
    if (effort && effort !== 'none' && effort !== 'default') assert.equal(model.variant, effort, `${e.source_id}: the joined configuration is the stated setting`);
    if (effort === 'none') assert.equal(model.variant, 'non-reasoning', 'reasoning off joins only a non-reasoning configuration');
    if (!effort) assert.equal(model.variant, 'default', 'a label without a setting joins only a default configuration');
  }
  // The normalisation is the documented one and nothing more.
  assert.equal(normaliseSlug('muse_spark_1_3'), 'muse-spark-1.3');
  assert.equal(normaliseSlug('claude-opus-4-8'), 'claude-opus-4.8');
  assert.equal(normaliseSlug('MiniMax-M3'), 'minimax-m3');
  assert.equal(normaliseSlug('claude-haiku-4-5-20251001-thinking'), 'claude-haiku-4-5-20251001-thinking', 'a dated checkpoint is not rewritten into a version');
  // Vals' own published setting is what decides the configuration; "0.99" in that field is not a setting.
  const vals = (id, protocol) => parseValsIndexId(id, id, `x; source row: ${JSON.stringify(protocol)}`);
  assert.deepEqual(vals('openai/gpt-6-astra', { reasoning_effort: 'max', compute_effort: null }), { family: 'gpt-6-astra', effort: 'max' });
  assert.deepEqual(vals('anthropic/claude-opus-4-7', { reasoning_effort: null, compute_effort: 'high' }), { family: 'claude-opus-4.7', effort: 'high' });
  assert.deepEqual(vals('thinkingmachines/inkling', { reasoning_effort: '0.99' }), { family: 'inkling', effort: null });
  assert.deepEqual(vals('x/y', { reasoning_effort: 'high', compute_effort: 'max' }), { family: 'y', effort: null }, 'two different published settings state none');
  assert.deepEqual(parseValsIndexId('meta/muse_spark_1_3_max', '', ''), { family: 'muse-spark-1.3', effort: 'max' });
  // A label the catalog cannot place stays unplaced: BullshitBench's OpenRouter suffixes never join.
  // (LisanBench states its setting as a `:thinking-<level>` suffix by design; its own rule lives in test/lisanbench.test.mjs.)
  assert.ok(!map.entries.some((e) => e.benchmark_id.startsWith('bullshitbench-') && (e.source_id.includes(':thinking') || e.source_id.includes(':free'))), 'suffixed OpenRouter slugs are refused, not stripped');
});
