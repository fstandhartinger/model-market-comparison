import test from 'node:test';
import assert from 'node:assert/strict';
import { identityJoins, parseDeepSweId, parseScaleLabel } from '../lib/coding-identity.mjs';

const catalog = [
  { id: 'claude-opus-4.8::xhigh', family_key: 'claude-opus-4.8', variant: 'xhigh' }, { id: 'claude-opus-4.8::max', family_key: 'claude-opus-4.8', variant: 'max' },
  { id: 'gpt-5.4::xhigh', family_key: 'gpt-5.4', variant: 'xhigh' }, { id: 'gpt-5.4::low', family_key: 'gpt-5.4', variant: 'low' },
  { id: 'kimi-k2.7-code::default', family_key: 'kimi-k2.7-code', variant: 'default' },
  { id: 'glm-5.2::max', family_key: 'glm-5.2', variant: 'max' }, { id: 'glm-5.2::non-reasoning', family_key: 'glm-5.2', variant: 'non-reasoning' },
  { id: 'gpt-6-astra::xhigh', family_key: 'gpt-6-astra', variant: 'xhigh' },
];

test('DeepSWE ids: model slug and stated effort; dashed versions become dotted catalog versions', () => {
  assert.deepEqual(parseDeepSweId('claude-opus-4-8_xhigh'), { family: 'claude-opus-4.8', effort: 'xhigh' });
  assert.deepEqual(parseDeepSweId('gpt-5.6-sol_max'), { family: 'gpt-5.6-sol', effort: 'max' });
  assert.deepEqual(parseDeepSweId('kimi-k2.7-code'), { family: 'kimi-k2.7-code', effort: null });
  assert.deepEqual(parseDeepSweId('gpt-5.4-2026-03-05_xhigh'), { family: 'gpt-5.4-2026-03-05', effort: 'xhigh' }, 'a dated snapshot is not silently the undated model');
  // Critic finding (pre-release): the id has no suffix but the label states the tested effort.
  assert.deepEqual(parseDeepSweId('gemini-3.1-pro-preview', 'gemini-3.1-pro-preview (high)'), { family: 'gemini-3.1-pro-preview', effort: 'high' });
  const only = [{ id: 'gemini-3.1-pro-preview::default', family_key: 'gemini-3.1-pro-preview', variant: 'default' }];
  const [join] = identityJoins([{ source_id: 'gemini-3.1-pro-preview', name: 'gemini-3.1-pro-preview (high)' }], parseDeepSweId, only);
  assert.equal(join.model_id, null, 'a stated effort never falls through to the default configuration');
  assert.match(join.reason, /no catalog configuration gemini-3\.1-pro-preview::high/);
});

test('Scale labels: reviewed model names, harness and effort in either position, refusal asterisk ignored', () => {
  assert.deepEqual(parseScaleLabel('Opus 4.8 (Claude Code) xhigh'), { family: 'claude-opus-4.8', effort: 'xhigh', harness: 'Claude Code', name: 'opus 4.8' });
  assert.deepEqual(parseScaleLabel('Gpt 5.4 xHigh (Mini-SWE-Agent)'), { family: 'gpt-5.4', effort: 'xhigh', harness: 'Mini-SWE-Agent', name: 'gpt 5.4' });
  assert.equal(parseScaleLabel('GPT 6 Astra (Codex) xHigh*').family, 'gpt-6-astra');
  assert.equal(parseScaleLabel('Fable-5.1 (Claude Code) xHigh').family, 'claude-fable-5.1');
  assert.equal(parseScaleLabel('GPT 5.3 (Codex) xHigh').family, null, 'unknown names never match');
});

test('joins need the exact configuration; no effort only for single-configuration families; duplicates join nothing', () => {
  const rows = ['claude-opus-4-8_xhigh', 'claude-opus-4-8_low', 'kimi-k2.7-code', 'glm-5.2', 'nope-1_max', 'gpt-6-astra'].map((source_id) => ({ source_id }));
  const joined = identityJoins(rows, parseDeepSweId, catalog);
  assert.deepEqual(joined.map((j) => j.model_id), ['claude-opus-4.8::xhigh', null, 'kimi-k2.7-code::default', null, null, null]);
  assert.match(joined[5].reason, /only catalog configuration is gpt-6-astra::xhigh, not a default/, 'a lone non-default configuration is never an effort guess');
  const board = ['GPT 5.4 (Codex) xHigh', 'Gpt 5.4 xHigh (Mini-SWE-Agent)', 'GPT 6 Astra (Codex) xHigh*', 'GLM 5.2 (Mini-SWE-Agent)'].map((source_id) => ({ source_id }));
  const joins = identityJoins(board, parseScaleLabel, catalog);
  assert.deepEqual(joins.map((j) => j.model_id), [null, null, 'gpt-6-astra::xhigh', null]);
  assert.match(joins[0].reason, /appears 2 times/);
  assert.match(joins[3].reason, /effort not stated/);
});

test('self-reported boards: FrontierCode ids, CursorBench "Extra High", SWE-Bench Pro harness asterisk', async () => {
  const { parseFrontierCodeId, parseCursorBenchLabel, parseSweBenchProLabel } = await import('../lib/coding-identity.mjs');
  assert.deepEqual(parseFrontierCodeId('Claude Fable 5.1|xhigh'), { family: 'claude-fable-5.1', effort: 'xhigh' });
  assert.deepEqual(parseFrontierCodeId('Kimi K3|none'), { family: 'kimi-k3', effort: null }, '"none" states no effort');
  assert.deepEqual(parseFrontierCodeId('Inkling|0.99'), { family: null, effort: null });
  assert.equal(parseFrontierCodeId('GPT-5.4-mini|medium').family, 'gpt-5.4-mini', 'mini is its own family, never gpt-5.4');
  assert.deepEqual(parseCursorBenchLabel('Opus 5 Extra High'), { family: 'claude-opus-5', effort: 'xhigh' });
  assert.deepEqual(parseCursorBenchLabel('Gemini 3.8 Flash High'), { family: 'gemini-3.8-flash', effort: 'high' });
  assert.deepEqual(parseCursorBenchLabel('Composer 2.5'), { family: 'composer-2.5', effort: null });
  assert.deepEqual(parseSweBenchProLabel('gpt-5.4 (xHigh)*'), { family: 'gpt-5.4', effort: 'xhigh' });
  assert.deepEqual(parseSweBenchProLabel('claude-opus-4-6 (thinking)*'), { family: null, effort: null }, '"thinking" is not an effort');
  const kimi = [{ id: 'kimi-k3::max', family_key: 'kimi-k3', variant: 'max' }, { id: 'kimi-k3::default', family_key: 'kimi-k3', variant: 'default' }];
  assert.equal(identityJoins([{ source_id: 'Kimi K3|none' }], parseFrontierCodeId, kimi)[0].model_id, null, 'no effort never picks among several configurations');
});

test('reviewed self-reported join: value approval binds the unjoined row; the receipt must be independent and cover the join', async () => {
  const { unjoined, identityKey, observationDigest, verifyScoreEvidence } = await import('../lib/benchmark-score-evidence.mjs');
  const base = { id: 'public:x', benchmark_id: 'cursorbench::4.0', subject: { source_id: 'Opus 5 Max', name: 'Opus 5 Max', model_id: null, variant: null, harness: null }, value: 46.6 };
  const joined = { ...base, subject: { ...base.subject, model_id: 'claude-opus-5::max' }, join_note: 'Reviewed identity map', identity_review: {} };
  assert.equal(observationDigest(unjoined(joined)), observationDigest(base));
  assert.equal(identityKey(joined), 'cursorbench::4.0|Opus 5 Max|claude-opus-5::max');
  assert.equal(typeof verifyScoreEvidence, 'function');
});

test('identity receipt: the committed Kimi verdict covers every self-reported join; a tampered verdict fails closed', async () => {
  const { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { createHash } = await import('node:crypto');
  const { verifyIdentityReview, identityKey } = await import('../lib/benchmark-score-evidence.mjs');
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  const dir = 'ops/benchmark-table-2026-09-15/identity-review';
  const packet = JSON.parse(readFileSync(`${dir}/packet.json`));
  const verdict = JSON.parse(readFileSync(`${dir}/verdict.json`));
  assert.equal(verdict.packet_sha256, sha(readFileSync(`${dir}/packet.json`)));
  assert.equal(verdict.checked, packet.joins.length);
  // 2026-09-26 (CR-173): the Terminal-Bench 4.0 joins carry their own receipt (packet + GLM-5.3-Flash verdict under
  // data/raw/benchmarks/daily-evidence/2026-09-26-epoch-scale-arena/gauntlet/); this suite pins the Kimi packet's rows,
  // and every other receipt must verify on its own.
  const all = JSON.parse(readFileSync('data/raw/benchmarks/scores.json')).observations.filter((o) => o.identity_review);
  const joined = all.filter((o) => o.identity_review.packet_file === `${dir}/packet.json`);
  for (const other of all.filter((o) => !joined.includes(o))) await verifyIdentityReview(other);
  // After the CR-173 lane merge the other receipts also cover FrontierCode (Main + Extended) and ARC Prize's verified pages;
  // each verified above, so only the Terminal-Bench count is pinned here.
  assert.equal(all.filter((o) => !joined.includes(o) && o.benchmark_id === 'terminal-bench::4.0').length, 18, 'the 18 reviewed Terminal-Bench 4.0 joins');
  const approved = new Set(packet.joins.map((j) => j.key).filter((k) => !verdict.rejected.some((r) => r.key === k)));
  // 2026-09-26 (CR-173): the FrontierCode rows Cognition added on Sep 21-22 carry their own receipt
  // (ops/rebuild-2026-09/evidence/phase-09/frontiercode/identity-review/); every other join is still the Kimi packet's.
  // The Extended boards added the same day carry a second receipt (identity-review-extended/).
  const laterDirs = ['ops/rebuild-2026-09/evidence/phase-09/frontiercode/identity-review', 'ops/rebuild-2026-09/evidence/phase-09/frontiercode/identity-review-extended'];
  for (const later of laterDirs) {
    const laterPacket = JSON.parse(readFileSync(`${later}/packet.json`)), laterVerdict = JSON.parse(readFileSync(`${later}/verdict.json`));
    assert.equal(laterVerdict.packet_sha256, sha(readFileSync(`${later}/packet.json`)));
    assert.equal(laterVerdict.checked, laterPacket.joins.length);
    for (const j of laterPacket.joins) if (!laterVerdict.rejected.some((r) => r.key === j.key)) approved.add(j.key);
  }
  assert.ok(joined.length > 0 && joined.every((x) => approved.has(identityKey(x))), 'every joined row is an approved packet join');
  assert.ok(joined.every((x) => [dir, ...laterDirs].map((d) => `${d}/packet.json`).includes(x.identity_review.packet_file)), 'every receipt names one of the reviewed packets');
  const o = joined.find((x) => x.identity_review.packet_file === `${dir}/packet.json`);
  await verifyIdentityReview(o);
  const root = mkdtempSync('/tmp/bh-receipt-');
  mkdirSync(join(root, dir), { recursive: true });
  copyFileSync(`${dir}/packet.json`, join(root, dir, 'packet.json'));
  const bad = JSON.stringify({ ...verdict, rejected: [{ key: identityKey(o), reason: 'test' }] });
  writeFileSync(join(root, dir, 'verdict.json'), bad);
  await assert.rejects(verifyIdentityReview({ ...o, identity_review: { ...o.identity_review, verdict_sha256: sha(bad) } }, root), /not accepted by critic/);
  await assert.rejects(verifyIdentityReview(o, root), /digest mismatch/, 'an altered verdict no longer matches the recorded digest');
  await assert.rejects(verifyIdentityReview({ ...o, identity_review: { ...o.identity_review, producer_models: ['moonshotai/kimi-k3'] } }), /not independent/);
});
