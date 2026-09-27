import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const dataset = JSON.parse(await readFile(new URL('../data/dataset.json', import.meta.url), 'utf8'));
const approvals = JSON.parse(await readFile(new URL('../data/raw/benchmarks/score-approvals.json', import.meta.url), 'utf8'));
const carried = JSON.parse(await readFile(new URL('../data/raw/benchmarks/self-reported/carried-documents.json', import.meta.url), 'utf8'));
const ID = 'openai-mentalhealthbench::snapshot-2026-09-23';
const PAPER = 'https://cdn.openai.com/ctf-cdn/MentalHealthBench_A_Comprehensive_Benchmark_of_AI_Capabilities_in_Realistic_Mental_Health_Conversations.pdf';
const PAPER_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-27-cr190/fa5a3dc17fb2a58f820a.gz';
const POST_FILE = 'data/raw/benchmarks/daily-evidence/2026-09-27-cr190/dc0047a15f9272dd2c84.gz';
const rows = dataset.benchmark_results.observations.filter((o) => o.benchmark_id === ID);

// Figure 5(a), page 11 of the retained paper capture, re-read from the capture by the test itself.
const paperText = gunzipSync(await readFile(new URL(`../${PAPER_FILE}`, import.meta.url))).toString('utf8');
const printed = new Map();
{
  const from = paperText.indexOf('a) Task-clipped score');
  const to = paperText.indexOf('Task-clipped score (%)', from);
  for (const line of paperText.slice(from, to).split('\n')) {
    const m = /^\s*(\S.*?)\s{2,}(\d+\.\d)\s{2,}(−\d+)\s{2,}(\d+)\s*$/.exec(line);
    if (m) printed.set(m[1], Number(m[2]));
  }
}

test('CR-190.1: the board is exactly the 17 rows Figure 5(a) prints, at the values it prints', () => {
  assert.equal(printed.size, 17);
  assert.equal(rows.length, 17);
  assert.deepEqual(rows.map((o) => o.subject.name).sort(), [...printed.keys()].sort());
  for (const o of rows) assert.equal(o.value, printed.get(o.subject.name), `${o.subject.name}`);
});

test('CR-190.1: no row asserts a reasoning effort the paper never states', () => {
  // The paper runs every model at its API default and our catalog holds no setting-less
  // configuration for these families, so a joined row would invent the setting (D219.1's rule).
  assert.equal(rows.length, 17);
  for (const o of rows) {
    assert.equal(o.subject.model_id, null, `${o.subject.name} must stay unjoined`);
    assert.equal(o.subject.variant, null, `${o.subject.name} must carry no variant`);
    assert.equal(o.basis, 'self_reported');
    assert.equal(o.comparison_key, null);
    assert.equal(o.unit, 'percent');
    assert.match(o.protocol, /default reasoning effort/);
    assert.doesNotMatch(o.subject.name, /\*/);
  }
});

test("CR-190.1: OpenAI's own 95% intervals cover the 15 models its announcement chart publishes", () => {
  const withCi = rows.filter((o) => o.confidence_interval);
  assert.equal(withCi.length, 15);
  for (const o of withCi) {
    assert.equal(o.confidence_interval.level, 0.95);
    assert.ok(o.confidence_interval.lower <= o.value && o.value <= o.confidence_interval.upper, `${o.subject.name} interval must contain its value`);
    assert.equal(o.supporting_sources?.length, 1);
    assert.equal(o.supporting_sources[0].file, POST_FILE);
  }
  // The two the chart omits are the two the paper alone prints; neither may acquire an interval.
  assert.deepEqual(rows.filter((o) => !o.confidence_interval).map((o) => o.subject.name).sort(),
    ['GPT-5 Thinking', 'Gemini 2.5 Flash']);
});

test('CR-190.1: every row is bound to the retained captures and to its own critic approval', async () => {
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const paperSha = sha(gunzipSync(await readFile(new URL(`../${PAPER_FILE}`, import.meta.url))));
  const postSha = sha(gunzipSync(await readFile(new URL(`../${POST_FILE}`, import.meta.url))));
  assert.equal(rows.length, 17);
  for (const o of rows) {
    assert.equal(o.source.url, PAPER);
    assert.equal(o.source.file, PAPER_FILE);
    assert.equal(o.source.sha256, paperSha);
    assert.equal(o.source.published_at, '2026-09-23');
    // The locator must quote this model's own printed row, not a neighbour's.
    assert.ok(o.source.locator.includes(`"${o.subject.name}  ${printed.get(o.subject.name).toFixed(1)}`), `${o.subject.name} locator`);
    for (const s of o.supporting_sources ?? []) assert.equal(s.sha256, postSha);
    const approval = approvals.rows.find((r) => r.id === o.id);
    assert.ok(approval, `${o.id} needs an approval`);
    assert.equal(approval.verdict, 'accepted');
    assert.equal(approval.critic_model, 'moonshotai/kimi-k3');
    assert.deepEqual(approval.producer_models, ['anthropic/claude-opus-5']);
  }
});

test('CR-190.1: the paper stays a carried document, so a collector rebuild cannot drop the board', () => {
  assert.ok(carried.documents.some((d) => d.url === PAPER));
  const collection = dataset.benchmark_results.collections.find((c) => c.benchmark_id === ID);
  assert.equal(collection?.status, 'collected');
  assert.equal(dataset.benchmark_results.coverage.by_benchmark[ID].observations, 17);
});
