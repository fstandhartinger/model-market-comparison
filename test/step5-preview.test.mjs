import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = async p => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), 'utf8'));

test('Step-5 Preview keeps all 40 vendor claims visibly self-reported and separate', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const approvals = await read('data/raw/benchmarks/score-approvals.json');
  const dataset = await read('data/dataset.json');
  const rows = candidates.observations.filter(o => o.id.startsWith('self-reported:step5-'));
  assert.equal(rows.length, 40);
  assert.equal(new Set(rows.map(o => o.benchmark_id)).size, 40);
  for (const row of rows) {
    assert.equal(row.basis, 'self_reported');
    assert.equal(row.subject.model_id, 'step-5-preview::default');
    assert.equal(row.subject.variant, 'High');
    assert.equal(row.source.url, 'https://www.stepfun.com/step-5-preview');
    assert.match(row.protocol, /replace with an independently measured matching-version result/);
    assert.ok(approvals.rows.some(a => a.id === row.id && a.verdict === 'accepted'));
  }
  const built = dataset.benchmark_results.observations.filter(o => o.subject.model_id === 'step-5-preview::default' && o.basis === 'self_reported');
  assert.equal(built.length, 40);
  assert.equal(dataset.benchmark_results.registry.filter(e => e.family.startsWith('stepfun-')).length, 40);
});

test('Step-5 Preview launch caveats and exact headline rows are retained', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const byId = new Map(candidates.observations.filter(o => o.id.startsWith('self-reported:step5-')).map(o => [o.id, o]));
  assert.equal(byId.get('self-reported:step5-gpqa-diamond').value, 93.5);
  assert.equal(byId.get('self-reported:step5-terminal-bench-v2-1').value, 85);
  assert.equal(byId.get('self-reported:step5-browsecomp').value, 88.7);
  assert.equal(byId.get('self-reported:step5-mmmu-pro').value, 76);
  assert.match(byId.get('self-reported:step5-hle-w-tools').protocol, /text-only subset/);
  for (const id of ['stepcodebench','stepcode-bench-daily','stepcode-bench-general','finstepbench-livesearch','finstepbench-corporatevaluation','finstepbench-financedr']) {
    assert.match(byId.get(`self-reported:step5-${id}`).protocol, /internally developed/);
  }
});
