import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseReview, objectionSignal, reviewArtifact, sha256 } from '../ops/daily/gauntlet.mjs';
import { reviewerUnavailable } from '../ops/daily/live-retention.mjs';
const binding = { artifactId: 'fixture', artifactSha256: 'a'.repeat(64), round: 1 };
const clean = () => ({ artifact_id: binding.artifactId, artifact_sha256: binding.artifactSha256, round: 1,
  verdict: 'pass', coverage_checked: ['row', 'c1'], errors_found: 0, findings: [], fixed: [], uncertainties: [], missing_evidence: [] });

test('short caveats remain valid, oversized narrative is a hold even with exact binding', () => {
  const good = { ...clean(), uncertainties: ['Transport hashes are checked separately by the owner.'] };
  assert.deepEqual(parseReview(JSON.stringify(good), binding), good);
  assert.equal(objectionSignal(JSON.stringify(good)), false);
  for (const patch of [{ uncertainties: ['x'.repeat(2049)] }, { fixed: ['x'.repeat(2049)] },
    { uncertainties: Array(5).fill('x'.repeat(1700)) }]) {
    const text = JSON.stringify({ ...clean(), ...patch });
    assert.throws(() => parseReview(text, binding), /narrative.*bound/);
    assert.equal(objectionSignal(text), true, 'quality refusal must prevent unavailable-review fallback');
  }
});

test('a formally passing oversized critic cannot mint fingerprints or become unavailable', async () => {
  const runDir = await mkdtemp(join(tmpdir(), 'bh-critic-narrative-'));
  try {
    let calls = 0;
    const runner = async (args) => {
      calls++;
      const out = args[args.indexOf('--out') + 1], critic = args.includes('--critic');
      const packet = await readFile(args[args.indexOf('--file') + 1], 'utf8');
      const value = critic ? { ...clean(), artifact_id: packet.match(/ARTIFACT_ID: (.*)/)[1],
        artifact_sha256: packet.match(/ARTIFACT_SHA256: (.*)/)[1], uncertainties: ['x'.repeat(4751)] }
        : { rows: { row: { status: 'match', note: 'exact primary value' } } };
      const body = JSON.stringify(value), model = critic ? 'z-ai/fixture' : 'deepseek/fixture';
      await writeFile(out, body);
      await writeFile(out + '.meta.json', JSON.stringify({ actual_model: model, output_sha256: sha256(body),
        qualification: { id: model, aa_intelligence_index: 34, input_per_1m: 0, output_per_1m: 0 } }));
    };
    const result = await reviewArtifact({ runDir, artifactId: 'fixture', rows: [{ id: 'row', value: 0 }],
      sources: [{ url: 'https://example.test', sha256: sha256('0'), fetched_at: '2026-09-29', content: 'row = 0' }],
      criteria: ['Exact transcription'], runner, maxRounds: 1 });
    assert.equal(result.accepted, false); assert.equal(result.fingerprints.length, 0);
    assert.equal(result.objections, 1); assert.equal(result.manifest.rounds_used, 1); assert.equal(calls, 2);
    const exhausted = { ...result, manifest: { ...result.manifest, rounds_used: 3 } };
    assert.equal(reviewerUnavailable(exhausted), false, 'quality objections must prevent fallback after full budget too');
    assert.equal(reviewerUnavailable({ ...exhausted, objections: 0 }), true, 'isolate the objection signal from budget/shape checks');
    assert.match(result.errors.join(' '), /narrative.*bound/);
  } finally { await rm(runDir, { recursive: true, force: true }); }
});
