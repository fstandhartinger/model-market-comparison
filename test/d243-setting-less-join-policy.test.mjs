import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyJoin, SETTING_LESS_VARIANT } from '../ops/ux-2026-09-12/bin/measure-d243-join.mjs';

// 2026-09-28 (iteration 261, D243). D243 asks whether MentalHealthBench's setting-less model names can
// be joined to a catalog configuration. The measurement written for it in iteration 260 answered with a
// predicate of its own — "is the single configuration's variant one of these effort names?" — instead of
// the standing exact-join policy, and because `non-reasoning` was missing from that list it reported
// `gemini-2.5-flash::non-reasoning` as joinable and the ledger recommended shipping it.
//
// That would have published a setting the source never states. These tests pin the predicate to the
// policy it is supposed to measure, so the two cannot drift apart again.
const cfg = (id, variant, deprecated = false) => ({ id, variant, deprecated });

test('D243: a setting-less name joins only a family whose single configuration is the default', () => {
  const r = classifyJoin([cfg('gpt-4.1-mini::default', 'default')]);
  assert.equal(r.verdict, 'joinable');
  assert.equal(r.model_id, 'gpt-4.1-mini::default');
});

test('D243: `non-reasoning` is a setting, not the absence of one — a lone non-reasoning config never joins', () => {
  // The exact row iteration 260 proposed to ship.
  const r = classifyJoin([cfg('gemini-2.5-flash::non-reasoning', 'non-reasoning', true)]);
  assert.equal(r.model_id, null);
  assert.equal(r.verdict, 'single-config-not-default');
  assert.match(r.reason, /variant "non-reasoning" is a setting, not the default/);
  // The catalog's own vocabulary is the argument: `non-reasoning` is the paired opposite of `reasoning`.
  // Anything that is not the single setting-less variant is a setting, including ones nobody listed.
  for (const v of ['reasoning', 'non-reasoning-low', 'non-reasoning-high', 'thinking', 'openrouter', 'minimal', 'high', 'max']) {
    assert.equal(classifyJoin([cfg(`x::${v}`, v)]).verdict, 'single-config-not-default', `variant ${v} must not join`);
  }
  assert.equal(SETTING_LESS_VARIANT, 'default');
});

test('D243: several configurations never join, whether or not one of them is the default', () => {
  const none = classifyJoin(['max', 'xhigh', 'high', 'medium', 'low'].map((v) => cfg(`claude-opus-5.5::${v}`, v)));
  assert.equal(none.model_id, null);
  assert.equal(none.verdict, 'ambiguous');
  assert.match(none.reason, /and none is the default/);
  // Gemini 2.5 Pro's real shape: `default` plus a second `openrouter` configuration. A single default is
  // the whole rule — "there is a default among them" is not it, so the reason must not claim the rule was met.
  const withDefault = classifyJoin([cfg('gemini-2.5-pro::default', 'default'), cfg('gemini-2.5-pro::openrouter', 'openrouter')]);
  assert.equal(withDefault.model_id, null);
  assert.equal(withDefault.verdict, 'ambiguous');
  assert.match(withDefault.reason, /one is the default, but the policy joins a setting-less name only to a family that holds a single configuration/);
});

test('D243: a name no catalog family carries is reported as an identity question, not an effort one', () => {
  const r = classifyJoin([]);
  assert.equal(r.model_id, null);
  assert.equal(r.verdict, 'no-catalog-family');
});

test('D243: the predicate agrees with the exact-join rule shipped in lib/board-identity.mjs', () => {
  // Not a re-implementation check: the rule is one line of source, and this asserts the measurement is
  // measuring that line. If board-identity's predicate is ever relaxed, this fails and the two are
  // reconciled deliberately instead of silently.
  const src = readFileSync(new URL('../lib/board-identity.mjs', import.meta.url), 'utf8');
  assert.match(src, /configs\.length === 1 && configs\[0\]\.variant === 'default'/);
  assert.match(src, /configs\.length === 1 && configs\[0\]\.variant === 'default' \? configs\[0\] : null/);
});
