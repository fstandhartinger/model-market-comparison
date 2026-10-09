import test from 'node:test';
import assert from 'node:assert/strict';
import { readDecisionBenchmarkManifest, manifestMarkdown } from '../lib/decision-benchmark-manifest.mjs';
import { decisionResults, resultsCsv } from '../lib/decision-result-export.mjs';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { jevV15Composite } from '../lib/jevbench-v15-preview.mjs';

test('CR-368 manifest definitions and exported scores reproduce the published scorer', async () => {
  const m = await readDecisionBenchmarkManifest();
  const { artifact } = await readCurrentJevbench();
  const exported = await decisionResults('jevbench', m.revision);
  assert.equal(exported.rows.length, artifact.systems.length);
  assert.match(manifestMarkdown(m), /harmonic mean/);
  assert.match(manifestMarkdown(m), /not mean an arithmetic average/);
  for (const row of exported.rows.filter(r => r.ranked)) {
    const actual = artifact.systems.find(r => r.key === row.key);
    assert.equal(row.composite, actual.jevbench_score);
    assert.ok(Math.abs(jevV15Composite(actual.axes, m.scores.composite.weights, m.scores.composite.intelligence_floor) - row.composite) < .01);
    assert.ok(Math.abs((row.intelligence + row.calibration)/2 - row.capability) < .01);
    assert.equal(row.last_measured_on, actual.last_measured_on ?? null);
  }
});

test('CR-368 only named own releases are exported, with no item-level or AA-derived fields', async () => {
  assert.equal(await decisionResults('artificial-analysis', 'latest'), null);
  assert.equal(await decisionResults('jevbench', 'draft'), null);
  for (const [key, revision] of [['jevbench','v1.6.1'], ['imagejevbench','v0.3.0']]) {
    const data = await decisionResults(key, revision);
    assert.ok(data.rows.length);
    assert.ok(data.rows.some(r => !r.ranked));
    assert.doesNotMatch(JSON.stringify(data), /"(?:item_id|question|prediction|per_item|aa_intelligence|aa_coding)"|\/home\/flori\//i);
    const csv = resultsCsv(data);
    assert.equal(csv.split('\r\n').length, data.rows.length + 2);
    assert.match(csv.split('\r\n')[0], /"version"/);
  }
});

test('CR-368 CSV preserves commas, quotes and missing values and neutralizes formula text', () => {
  const csv = resultsCsv({ version: 'v1', rows: [{ key: 'a', name: 'a,"b"', pin: null }, { key: 'b', name: '=1+1', pin: null }] });
  assert.match(csv, /"a,""b"""/);
  assert.match(csv, /"'=1\+1"/);
  assert.ok(csv.includes('"v1","a"'));
});
