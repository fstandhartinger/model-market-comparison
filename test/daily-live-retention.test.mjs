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
import { MAX_RETAINED_CONTRACTS, planRejectedContract, retainPriorSnapshot } from '../ops/daily/live-retention.mjs';
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

test('CR-67.2: core contracts and a second dispute still fail the run closed', () => {
  for (const core of ['aa', 'da', 'or', 'aa_efficiency', 'or_efficiency', 'chutes_efficiency', 'unknown']) assert.equal(planRejectedContract(core).action, 'fail', core);
  assert.equal(MAX_RETAINED_CONTRACTS, 1);
  assert.equal(planRejectedContract('aa_coding_v15', [{ dataset: 'aa_coding_v15' }]).action, 'fail');
});
