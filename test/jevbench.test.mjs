// CR-84.1: the JevBench v1 artifact is publication-safe (aggregates only), unsupported metrics are null — never zero — and
// the page view ranks only complete runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { JEVBENCH_ARTIFACT, readJevbench, validateJevbenchArtifact, jevbenchView } from '../lib/jevbench.mjs';

const ARTIFACT_SHA256 = '38fc5f1d6fd8bda970c6f4a918492d67370e9e764477a302611419a97fb0bd53'; // = results/jevbench-v1-results.json in the public repo
const clone = async () => JSON.parse(await readFile(JEVBENCH_ARTIFACT, 'utf8'));

test('the committed artifact is the published v1 artifact, byte for byte', async () => {
  const bytes = await readFile(JEVBENCH_ARTIFACT);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), ARTIFACT_SHA256);
  const { sha256 } = await readJevbench();
  assert.equal(sha256, ARTIFACT_SHA256);
});

test('item text, labels or per-item predictions anywhere fail validation', async () => {
  for (const [path, key] of [[['systems', 0], 'predictions'], [['systems', 1, 'by_family', 'routing'], 'label'], [[], 'items'], [['dataset'], 'prompt']]) {
    const a = await clone();
    let node = a; for (const p of path) node = node[p];
    node[key] = ['leak'];
    assert.throws(() => validateJevbenchArtifact(a), /item-level content/, `${path.join('.')}.${key}`);
  }
});

test('a route with no billable account must carry a null price, never $0', async () => {
  const a = await clone();
  const s = a.systems.find((x) => x.overall.n_cost_known === 0);
  s.overall.cost_per_1000_usd = 0;
  assert.throws(() => validateJevbenchArtifact(a), /cost must be null/);
});

test('empty calibration bins stay null, and bin counts must add up', async () => {
  const a = await clone();
  const bin = a.systems[0].overall.ece.bins.find((b) => b.n === 0);
  bin.accuracy = 0;
  assert.throws(() => validateJevbenchArtifact(a), /bins\[\d\] values/);
  const b2 = await clone();
  b2.systems[0].overall.ece.bins[9].n += 1;
  assert.throws(() => validateJevbenchArtifact(b2), /do not add up/);
});

test('"complete" must agree with the run\'s own denominators', async () => {
  const a = await clone();
  a.systems.find((x) => !x.complete).complete = true;
  assert.throws(() => validateJevbenchArtifact(a), /complete/);
});

test('view: only complete runs are ranked; a stopped run and an unrunnable one stay outside the ranking', async () => {
  const v = jevbenchView(await readJevbench());
  assert.ok(v.ranked.length >= 2 && v.ranked.every((r) => r.complete && r.ranked));
  assert.deepEqual(v.partial.map((r) => r.key), ['qwen3.8-27b']);
  assert.ok(v.partial.every((r) => r.nAttempted < r.nPlanned));
  assert.deepEqual(v.unrunnable.map((r) => r.key), ['open-alternative-jev']);
  // Sorted by accuracy, highest first.
  for (let i = 1; i < v.ranked.length; i++) assert.ok(v.ranked[i - 1].accuracy >= v.ranked[i].accuracy);
  // The availability ledger does not list the reached-but-unfinished system a second time.
  assert.ok(!v.notMeasured.some((n) => n.candidate === 'open-alternative-jev'));
  assert.ok(v.notMeasured.length >= 10 && v.notMeasured.every((n) => n.candidate && n.author && n.reason));
});

test('view numbers are the artifact numbers (no recomputation)', async () => {
  const d = await readJevbench();
  const v = jevbenchView(d);
  for (const r of [...v.ranked, ...v.partial]) {
    const s = d.artifact.systems.find((x) => x.key === r.key);
    assert.equal(r.accuracy, s.overall.accuracy);
    assert.equal(r.cost, s.overall.cost_per_1000_usd);
    assert.equal(r.p50, s.overall.latency_ok_s.p50_s);
    assert.equal(r.ece, s.overall.ece.ece);
    assert.equal(r.brier, s.overall.brier_mean);
    assert.equal(r.sameAnswer, s.paraphrase_consistency.same_answer_rate);
  }
  // Findings never call a null-price route the cheapest.
  const cheap = v.findings.find((f) => f.id === 'cheap');
  const metered = v.ranked.filter((r) => r.cost !== null).sort((a, b) => a.cost - b.cost)[0];
  assert.ok(cheap.text.startsWith(`Cheapest metered route: ${metered.display}`));
  assert.ok(!/"cost":0[,}]/.test(JSON.stringify(v)));
});
