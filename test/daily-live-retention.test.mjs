// CR-67.1 / CR-67.2: the 17 Sep 2026 aa_coding_v15 dispute. The producer (DeepSeek V4 Flash 0731) reported a mismatch
// for example #00015 by comparing its score (0.4305…) with the components of example #00001 (mean 0.5193…); the critic
// recomputed both correctly and passed. The review rule is unchanged — a critic never overrules producer uncertainty —
// but one withheld secondary contract no longer blocks every other verified update.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { reviewArtifact, sha256 } from '../ops/daily/gauntlet.mjs';
import { MAX_RETAINED_CONTRACTS, planRejectedContract, retainPriorSnapshot, reviewerUnavailable } from '../ops/daily/live-retention.mjs';
import { DAILY_FRESH_SOURCES, sourceFreshnessErrors } from '../ops/daily/policy.mjs';

// Today's two example rows, as staged (values verbatim from the retained capture of run 2026-09-17T05-17-01).
const example1 = { row_id: 'aa_coding_v15#00001', score: 0.519259105470924, components: [0.684365781710915, 0.661290322580645, 0.212121212121212] };
const example15 = { row_id: 'aa_coding_v15#00015', score: 0.4305203524444174, components: [0.572271386430678, 0.618279569892473, 0.101010101010101] };
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

async function disputeRunner(args) {
  const out = args[args.indexOf('--out') + 1];
  const packet = await readFile(args[args.indexOf('--file') + 1], 'utf8');
  const critic = args.includes('--critic');
  const object = critic ? {
    artifact_id: packet.match(/ARTIFACT_ID: (.*)/)[1], artifact_sha256: packet.match(/ARTIFACT_SHA256: (.*)/)[1], round: Number(packet.match(/ROUND: (\d+)/)[1]),
    verdict: 'pass', coverage_checked: ['aa_coding_v15', 'mapping', 'safety'], errors_found: 0, findings: [], fixed: [], uncertainties: [], missing_evidence: [],
  } : { rows: [{ id: 'aa_coding_v15', status: 'mismatch', note: `Supplied primary example #00015 has staged score ${example15.score}, but mean of listed component scores (${example1.components.join(', ')}) is ${mean(example1.components)}` }] };
  const body = JSON.stringify(object) + '\n';
  await writeFile(out, body);
  const model = critic ? 'z-ai/glm-5.3-flash' : 'deepseek/deepseek-v4-flash-0731';
  await writeFile(out + '.meta.json', JSON.stringify({ actual_model: model, output_sha256: sha256(body), qualification: { id: model, aa_intelligence_index: critic ? 41.9 : 34.5, input_per_1m: 0.1, output_per_1m: 0.3 } }));
}

test('CR-67.1: the producer claim was an arithmetic mix-up — both staged scores equal their own component means', () => {
  assert.ok(Math.abs(mean(example1.components) - example1.score) < 1e-9);
  assert.ok(Math.abs(mean(example15.components) - example15.score) < 1e-9);
  assert.ok(Math.abs(mean(example1.components) - example15.score) > 0.08, 'the claimed mismatch pairs #00015 with #00001');
});

test('CR-67.1/67.2: the dispute still rejects the contract, and the run withholds only that dataset', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-live-retention-'));
  try {
    const rows = [{ id: 'aa_coding_v15', mapping: 'score == mean of the 3 component rewards (1e-9)' }];
    const content = JSON.stringify(example15);
    const review = await reviewArtifact({ runDir: dir, artifactId: 'live-contract-aa_coding_v15', rows, sources: [{ url: 'https://artificialanalysis.ai/agents/coding-agents', sha256: sha256(content), locator: 'benchmarkRows[14]', content }],
      criteria: ['mapping'], runner: disputeRunner, maxRounds: 1 });
    // The rule stands: producer uncertainty is not overruled by the critic's pass.
    assert.equal(review.accepted, false);
    assert.deepEqual(review.quarantined.map((r) => r.id), ['aa_coding_v15']);
    // The secondary contract is withheld; the prior published snapshot is restored byte for byte.
    const plan = planRejectedContract('aa_coding_v15');
    assert.equal(plan.action, 'retain');
    const runDir = join(dir, 'run'), rawDir = join(dir, 'work', 'data', 'raw');
    await mkdir(join(runDir, 'before', 'raw'), { recursive: true }); await mkdir(rawDir, { recursive: true });
    const prior = JSON.stringify({ version: '1.5', collected_at: '2026-09-16', rows: [{ score: 0.43 }] });
    await writeFile(join(runDir, 'before', 'raw', 'aa-coding-agents-v1.5.json'), prior);
    await writeFile(join(rawDir, 'aa-coding-agents-v1.5.json'), JSON.stringify({ version: '1.5', collected_at: '2026-09-17', rows: [{ score: 0.4305203524444174 }] }));
    const record = await retainPriorSnapshot({ runDir, rawDir, dataset: 'aa_coding_v15', errors: review.errors });
    assert.equal(await readFile(join(rawDir, 'aa-coding-agents-v1.5.json'), 'utf8'), prior);
    assert.deepEqual([record.source, record.restored[0].file, record.restored[0].retained_collected_at, record.restored[0].retained_sha256], ['aa_coding_agents_v1_5', 'data/raw/aa-coding-agents-v1.5.json', '2026-09-16', sha256(prior)]);
    assert.ok(record.reasons.length > 0 && record.restored[0].rejected_capture_sha256);
    // Freshness: the withheld source keeps its published date; every other source must still be today's.
    const day = '2026-09-17';
    const before = { sources: Object.fromEntries(DAILY_FRESH_SOURCES.map((k) => [k, '2026-09-16'])) };
    const after = { sources: { ...Object.fromEntries(DAILY_FRESH_SOURCES.map((k) => [k, day])), aa_coding_agents_v1_5: '2026-09-16' } };
    assert.deepEqual(sourceFreshnessErrors({ day, before, after, retained: ['aa_coding_agents_v1_5'] }), []);
    assert.match(sourceFreshnessErrors({ day, before, after }).join(), /aa_coding_agents_v1_5 is not today/);
    assert.match(sourceFreshnessErrors({ day, before, after: { sources: { ...after.sources, aa_coding_agents_v1_5: day } }, retained: ['aa_coding_agents_v1_5'] }).join(), /withheld but its date changed/);
    // No prior copy → nothing to fall back to → the run fails.
    await assert.rejects(retainPriorSnapshot({ runDir: join(dir, 'empty'), rawDir, dataset: 'aa_coding_v15' }));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CR-67.2: core contracts still fail the run closed; every retainable contract may be withheld (17 Sep)', () => {
  for (const core of ['aa', 'da', 'or', 'unknown']) assert.equal(planRejectedContract(core).action, 'fail', core);
  // 17 Sep 05:49 run: the or_efficiency critic asked for cache prices the source does not publish (it read the prompt/completion
  // prices as cache prices). Efficiency datasets are retainable like aa_coding_v15 — withheld, never accepted.
  for (const [dataset, source] of [['or_efficiency', 'openrouter_efficiency'], ['aa_efficiency', 'aa_efficiency'], ['chutes_efficiency', 'chutes_efficiency']]) {
    assert.deepEqual([planRejectedContract(dataset).action, planRejectedContract(dataset).source], ['retain', source]);
  }
  // 17 Sep 09:16 run: or_efficiency was the second disputed contract after aa_efficiency and failed the whole day.
  assert.equal(MAX_RETAINED_CONTRACTS, 4);
  assert.equal(planRejectedContract('or_efficiency', [{ dataset: 'aa_efficiency' }]).action, 'retain');
  assert.equal(planRejectedContract('chutes_efficiency', [{ dataset: 'a' }, { dataset: 'b' }, { dataset: 'c' }, { dataset: 'd' }]).action, 'fail');
});

// 17 Sep 09:16 run, or_efficiency: "round 1 glm-5.3-flash malformed JSON; round 2 malformed producer audit; round 3 no supported viable worker".
async function malformedRunner(args) {
  const out = args[args.indexOf('--out') + 1];
  const body = 'Sure! Here is my review: {"verdict": pass'; // not JSON
  await writeFile(out, body);
  const model = args.includes('--critic') ? 'z-ai/glm-5.3-flash' : 'moonshotai/kimi-k3';
  await writeFile(out + '.meta.json', JSON.stringify({ actual_model: model, output_sha256: sha256(body), qualification: { id: model, aa_intelligence_index: 40, input_per_1m: 0.1, output_per_1m: 0.3 } }));
}

test('17 Sep: reviewer models that only return malformed output fall back to the deterministic verification', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-live-fallback-'));
  try {
    const content = JSON.stringify({ cache_hit_rate: 0.42 });
    const review = await reviewArtifact({ runDir: dir, artifactId: 'live-contract-or_efficiency', rows: [{ id: 'or_efficiency', mapping: 'cache hit rate' }],
      sources: [{ url: 'https://openrouter.ai/x', sha256: sha256(content), locator: 'x', content }], criteria: ['mapping'], runner: malformedRunner, maxRounds: 3 });
    assert.equal(review.accepted, false);
    assert.deepEqual(review.producer_disputed, []);
    assert.equal(reviewerUnavailable(review), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('17 Sep: a substantive objection is never treated as an unavailable reviewer', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bh-live-fallback-'));
  try {
    const content = JSON.stringify(example15);
    // Producer flags the row, then the critic answers malformed: the producer's dispute must survive.
    const flaggedThenMalformed = async (args) => (args.includes('--critic') ? malformedRunner(args) : disputeRunner(args));
    const review = await reviewArtifact({ runDir: dir, artifactId: 'live-contract-aa_coding_v15', rows: [{ id: 'aa_coding_v15', mapping: 'mean' }],
      sources: [{ url: 'https://artificialanalysis.ai/x', sha256: sha256(content), locator: 'x', content }], criteria: ['mapping'], runner: flaggedThenMalformed, maxRounds: 1 });
    assert.deepEqual(review.producer_disputed, ['aa_coding_v15']);
    assert.equal(reviewerUnavailable(review), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
  // An objection inside an answer the strict parser rejects (errors_found miscounted) still counts as an objection.
  const dir2 = await mkdtemp(join(tmpdir(), 'bh-live-fallback-'));
  try {
    const miscounted = async (args) => {
      if (!args.includes('--critic')) return malformedRunner(args);
      const out = args[args.indexOf('--out') + 1];
      const body = JSON.stringify({ verdict: 'revise', errors_found: 2, findings: [{ id: 'f1', severity: 'major', location: 'x', evidence: 'cache price is not published' }] });
      await writeFile(out, body);
      await writeFile(out + '.meta.json', JSON.stringify({ actual_model: 'z-ai/glm-5.3-flash', output_sha256: sha256(body), qualification: { id: 'z-ai/glm-5.3-flash', aa_intelligence_index: 40, input_per_1m: 0.1, output_per_1m: 0.3 } }));
    };
    const good = async (args) => {
      if (args.includes('--critic')) return miscounted(args);
      const out = args[args.indexOf('--out') + 1];
      const body = JSON.stringify({ rows: [{ id: 'or_efficiency', status: 'match', note: 'ok' }] });
      await writeFile(out, body);
      await writeFile(out + '.meta.json', JSON.stringify({ actual_model: 'moonshotai/kimi-k3', output_sha256: sha256(body), qualification: { id: 'moonshotai/kimi-k3', aa_intelligence_index: 40, input_per_1m: 0.1, output_per_1m: 0.3 } }));
    };
    const content = JSON.stringify({ cache_hit_rate: 0.42 });
    const review = await reviewArtifact({ runDir: dir2, artifactId: 'live-contract-or_efficiency', rows: [{ id: 'or_efficiency', mapping: 'cache hit rate' }],
      sources: [{ url: 'https://openrouter.ai/x', sha256: sha256(content), locator: 'x', content }], criteria: ['mapping'], runner: good, maxRounds: 3 });
    assert.equal(review.accepted, false);
    assert.ok(review.objections > 0);
    assert.equal(reviewerUnavailable(review), false);
  } finally { await rm(dir2, { recursive: true, force: true }); }
  // A terminal setup error in round 1 (HTTP 429/401, unqualified worker) is not a format failure: no fallback.
  assert.equal(reviewerUnavailable({ accepted: false, errors: ['round 1: HTTP 429'], reviews: [], quarantined: [], manifest: { rounds_used: 1 } }), false);
  assert.equal(reviewerUnavailable({ accepted: false, errors: ['round 1: fail'], reviews: [{ verdict: 'fail', errors_found: 1 }], quarantined: [], manifest: { rounds_used: 3 } }), false);
  assert.equal(reviewerUnavailable({ accepted: false, errors: ['x'], reviews: [{ verdict: 'pass', errors_found: 0, findings: [{ severity: 'major' }] }], quarantined: [], manifest: { rounds_used: 3 } }), false);
  assert.equal(reviewerUnavailable({ accepted: true, errors: [], reviews: [], quarantined: [] }), false);
});
