import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewArtifact, sha256 } from '../ops/daily/gauntlet.mjs';

// Sep 29: a producer returned only the score half of a mixed score/cost packet;
// daily critics added prose to otherwise JSON answers. Exercise the call seam,
// not a text snapshot, and keep incomplete/wrongly bound answers fail-closed.
for (const failure of [null, 'missing-row', 'wrong-hash', 'missing-coverage']) {
  test(`daily review requests JSON and explicit producer coverage (${failure ?? 'complete'})`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bh-request-contract-'));
    try {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: `fixture:${i < 5 ? 'score' : 'cost'}:${i % 5}`, value: i,
      }));
      const ids = rows.map((r) => r.id);
      let calls = 0;
      const runner = async (args) => {
        calls++;
        assert.ok(args.includes('--json'), 'both producer and critic must request JSON transport');
        const critic = args.includes('--critic');
        const packet = await readFile(args[args.indexOf('--file') + 1], 'utf8');
        const task = args.at(-1);
        let answer;
        if (critic) {
          answer = {
            artifact_id: /ARTIFACT_ID: (.*)/.exec(packet)[1],
            artifact_sha256: failure === 'wrong-hash' ? sha256('other') : /ARTIFACT_SHA256: (.*)/.exec(packet)[1],
            round: 1, verdict: 'pass', coverage_checked: failure === 'missing-coverage' ? ids : [...ids, 'c1'],
            errors_found: 0, findings: [], fixed: [], uncertainties: [], missing_evidence: [],
          };
        } else {
          // Read the authoritative task only; do not infer required IDs from
          // source material, which can also contain IDs of unrelated rows.
          const required = JSON.parse(/REQUIRED_ROW_IDS = (\[[^\n]*\])/.exec(task)?.[1] ?? 'null');
          assert.deepEqual(required, ids);
          const covered = failure === 'missing-row' ? required.slice(0, 5) : required;
          answer = { rows: Object.fromEntries(covered.map((id) => [id, { status: 'match', note: 'exact fixture source' }])) };
        }
        const out = args[args.indexOf('--out') + 1];
        const text = JSON.stringify(answer) + '\n';
        const model = critic ? 'z-ai/fixture' : 'deepseek/fixture';
        await writeFile(out, text);
        await writeFile(out + '.meta.json', JSON.stringify({ actual_model: model, output_sha256: sha256(text),
          qualification: { id: model, aa_intelligence_index: 34, input_per_1m: 0, output_per_1m: 0 } }));
      };
      const result = await reviewArtifact({ runDir: dir, artifactId: 'mixed-fixture', rows,
        sources: [{ url: 'https://example.test/fixture', content: JSON.stringify(rows), sha256: sha256(JSON.stringify(rows)) }],
        criteria: ['Verify every fixture value'], runner, maxRounds: 1 });
      assert.equal(result.accepted, failure === null, result.errors.join('; '));
      assert.equal(result.fingerprints.length, failure === null ? 10 : 0);
      assert.equal(calls, failure === 'missing-row' ? 1 : 2);
      if (failure) assert.equal(result.quarantined.length, 10);
      if (failure === 'missing-row') assert.match(result.errors.join('; '), /missing row fixture:cost:0; incomplete coverage fails closed/);
      if (failure === 'wrong-hash') assert.match(result.errors.join('; '), /did not echo the exact frozen artifact hash/);
      if (failure === 'missing-coverage') assert.match(result.errors.join('; '), /uncovered criteria c1/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}
