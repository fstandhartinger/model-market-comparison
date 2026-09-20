// CR-85.2: DeepSeek's own model card for DeepSeek-V4.1-Flash, ingested as vendor-reported claims.
// The point of the CR is that a popular model looked unmeasured; the point of these tests is that
// filling it in did not quietly turn a vendor's claim into a measured result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const read = async (p) => JSON.parse(await readFile(new URL(`../${p}`, import.meta.url), 'utf8'));
const PREFIX = 'self-reported:deepseek-v41-flash-';
const CARD = 'https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/raw/main/README.md';
const MODEL = 'deepseek-v4.1-flash::max';

test('every DeepSeek-V4.1-Flash card claim is visibly self-reported, approved and its own identity', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const approvals = await read('data/raw/benchmarks/score-approvals.json');
  const registry = await read('data/raw/benchmarks/registry.json');
  const rows = candidates.observations.filter((o) => o.id.startsWith(PREFIX));
  assert.equal(rows.length, 19);
  assert.equal(new Set(rows.map((o) => o.benchmark_id)).size, 19);
  const entries = new Map(registry.entries.map((e) => [e.id, e]));
  for (const row of rows) {
    assert.equal(row.basis, 'self_reported');
    assert.equal(row.subject.model_id, MODEL, row.id);
    assert.equal(row.subject.variant, 'max', row.id);
    assert.equal(row.source.url, CARD);
    assert.equal(row.source.published_at, '2026-09-10');
    assert.match(row.protocol, /Vendor-reported by DeepSeek/);
    assert.match(row.protocol, /reasoning_effort=100/);
    assert.match(row.protocol, /replace with an independently measured matching-version result/);
    const entry = entries.get(row.benchmark_id);
    assert.ok(entry, row.benchmark_id);
    assert.equal(entry.source_type, 'vendor_report');
    assert.equal(entry.scoring.unit, row.unit);
    const approval = approvals.rows.find((a) => a.id === row.id);
    assert.ok(approval && approval.verdict === 'accepted', row.id);
    // The reviewer must be outside the producing family, and must not be the vendor under review.
    assert.ok(!/^anthropic\//.test(approval.critic_model), row.id);
    assert.ok(!/^deepseek\//.test(approval.critic_model), row.id);
  }
});

test('an unversioned card claim keeps the card\'s own date, a versioned one keeps its version', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const byId = new Map(candidates.observations.filter((o) => o.id.startsWith(PREFIX)).map((o) => [o.id.slice(PREFIX.length), o]));
  // The card prints these versions, so they must not collapse into one board or into a guessed date.
  assert.equal(byId.get('terminal-bench-v2-1').benchmark_id, 'deepseek-terminal-bench-v2-1::2.1');
  assert.equal(byId.get('terminal-bench-v3').benchmark_id, 'deepseek-terminal-bench-v3::3.0');
  assert.equal(byId.get('terminal-bench-v4').benchmark_id, 'deepseek-terminal-bench-v4::4.0');
  assert.equal(byId.get('deepswe-v1-1').benchmark_id, 'deepseek-deepswe-v1-1::1.1');
  // The card prints no version for these, so the identity is the card's publication date.
  for (const slug of ['gpqa-diamond', 'hle', 'hle-w-tools', 'codeforces-rating']) {
    assert.match(byId.get(slug).benchmark_id, /::snapshot-2026-09-10$/, slug);
  }
  // "HLE" and "HLE w/ tools" are two printed rows and must never share an identity.
  assert.notEqual(byId.get('hle').benchmark_id, byId.get('hle-w-tools').benchmark_id);
  assert.equal(byId.get('codeforces-rating').unit, 'Elo');
  assert.equal(byId.get('nl2repo-bench').unit, 'points');
});

test('every card value re-derives from the retained capture, in the DS-V4.1-Flash column', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const rows = candidates.observations.filter((o) => o.id.startsWith(PREFIX));
  const file = new URL(`../${rows[0].source.file}`, import.meta.url);
  const card = gunzipSync(await readFile(file));
  assert.equal(createHash('sha256').update(card).digest('hex'), rows[0].source.sha256);
  const text = card.toString('utf8');
  const section = text.split('#### Comparison with frontier models (Max reasoning effort)')[1];
  const block = [];
  for (const line of section.split('\n')) {
    if (line.trim().startsWith('|')) block.push(line);
    else if (block.length) break;
  }
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.replace(/\*\*/g, '').trim());
  const column = cells(block[0]).indexOf('DS-V4.1-Flash');
  assert.ok(column > 0);
  for (const row of rows) {
    const label = row.source.locator.match(/row "([^"]+)"/)[1];
    const line = block.find((l) => cells(l)[0] === label);
    assert.ok(line, `${label} is a printed row of the captured table`);
    const printed = cells(line)[column];
    // "36.8 (39.1†)": the ingested value is the full-dataset figure, never the footnoted subset.
    assert.equal(Number(printed.replace(/\s*\([\d.]+†\)$/, '')), row.value, row.id);
  }
});

test('the card\'s base-model table, its scaffold breakdown and other labs\' columns stay out', async () => {
  const candidates = await read('data/raw/benchmarks/self-reported-candidates.json');
  const dataset = await read('data/dataset.json');
  const refusals = candidates.rejected.filter((r) => r.source_id === CARD).map((r) => r.reason);
  assert.equal(refusals.length, 9);
  assert.ok(refusals.some((r) => /Base Model evaluation table/.test(r) && /base checkpoint is not that model/.test(r)));
  assert.ok(refusals.some((r) => /agent scaffolds/.test(r) && /duplicate one published result/.test(r)));
  assert.ok(refusals.some((r) => /text-only subset/.test(r)));
  for (const other of ['Opus-5.0', 'GPT-5.6 Sol', 'K3', 'GLM-5.3']) {
    assert.ok(refusals.some((r) => r.startsWith(`${other} column`)), other);
  }
  // The card's own older siblings print no checkpoint, and the catalog carries two candidates each.
  for (const own of ['DS-V4-Pro', 'DS-V4-Flash']) assert.ok(refusals.some((r) => r.startsWith(`${own} column`)), own);
  // Nothing from this card reached another model's row.
  const built = dataset.benchmark_results.observations.filter((o) => o.source?.url === CARD);
  assert.equal(built.length, 19);
  assert.ok(built.every((o) => o.subject.model_id === MODEL));
});

test('the vendor claims raise V4.1 Flash coverage without entering the Composite', async () => {
  const dataset = await read('data/dataset.json');
  const rows = dataset.benchmark_results.observations.filter((o) => o.subject?.model_id === MODEL);
  assert.equal(rows.length, 39);
  assert.equal(rows.filter((o) => o.basis === 'self_reported').length, 19);
  const model = dataset.models.find((m) => m.id === MODEL);
  assert.ok(model);
  // CR-85's complaint was a composite resting on one input. Coverage may rise; the score may not,
  // so none of the card's boards may appear anywhere in the model's own scoring record.
  const record = JSON.stringify(model);
  for (const o of rows.filter((r) => r.basis === 'self_reported')) {
    assert.ok(!record.includes(o.benchmark_id.split('::')[0]), o.benchmark_id);
  }
  const { computeCompositeScores, compositeEvidenceCount } = await import('../lib/composite.mjs');
  // The composite reads the model record's own slots, and the vendor rows leave it byte-identical;
  // these pin the values so a later change that wires a claim into the score fails here.
  assert.equal(computeCompositeScores(dataset.models).get(MODEL), 50);
  assert.equal(compositeEvidenceCount(model), 0);
});
