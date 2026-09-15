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
