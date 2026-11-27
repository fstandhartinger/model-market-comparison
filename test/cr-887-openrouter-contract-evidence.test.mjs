import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { buildLiveContractUnits } from '../ops/daily/live-contracts.mjs';
import { GAUNTLET_LIMITS } from '../ops/daily/gauntlet.mjs';

test('CR-887: OpenRouter critic receives the executable projection including absent/null/zero rules', async () => {
  const verifier = await readFile(new URL('../ops/daily/review-live.mjs', import.meta.url), 'utf8');
  const [unit] = buildLiveContractUnits({
    manifest: { datasets: [{ dataset: 'or', rows: 1 }], coverage: { complete: true } },
    verified: {
      evidence: { packets: [{ dataset: 'or', rows: [{
        row_id: 'or#00001', staged: { reasoning: null, benchmarks: null },
        extract: { catalog_model: { id: 'example/model' }, endpoints: [] },
        source: { url: 'https://example.test/endpoints', sha256: 'a'.repeat(64) }, pointer: '$.data[0]',
      }] }] }, report: { run: {} },
    }, verifier, aaEfficiencyParser: '',
  });
  const code = unit.sources.find((s) => s.url === 'repo:ops/daily/review-live.mjs').content;
  const begin = code.indexOf('function orModelProjection(');
  assert.ok(begin >= 0, 'the critic must see the projection used by verifyOr');
  const end = code.indexOf('async function verifyOr(', begin);
  assert.ok(end > begin, 'include the complete helper before its verifier call');
  const project = runInNewContext(`${code.slice(begin, end)}\norModelProjection`);
  assert.equal(project({}, []).reasoning, null);
  assert.equal(project({}, []).benchmarks, null);
  for (const value of [null, 0, false]) {
    assert.equal(project({ reasoning: value, benchmarks: value }, []).reasoning, value);
    assert.equal(project({ reasoning: value, benchmarks: value }, []).benchmarks, value);
  }
  assert.ok(Buffer.byteLength(code) <= GAUNTLET_LIMITS.sourceBytesCap, 'projection evidence must fit without truncation');
});
