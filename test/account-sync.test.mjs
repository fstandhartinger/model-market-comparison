import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planPresetSync, planSettingsSync, parseAccountPatch, sameOrigin, publicOrigin, isJsonRequest, MAX_SETTINGS_CHARS } from '../lib/account-sync.mjs';
import { ACCOUNTS_SCHEMA_SQL } from '../lib/accounts-schema.mjs';

const headers = (h) => ({ get: (k) => h[k.toLowerCase()] ?? null });
const p = (id, name, value, updatedAt = 1) => ({ id, name, value, updatedAt });

test('CR-5.4 first sign-in in a browser merges local presets into the account; nothing is lost', () => {
  const account = { models: [p('a1', 'Coding', ['m1', 'm2'])], rows: [], filters: [] };
  const local = {
    models: [p('l2', 'coding', ['m3']), p('l3', 'Cheap', ['m4'])],
    rows: [p('l4', 'Mine', ['aa_index'])],
    filters: [],
  };
  const { presets, push } = planPresetSync({ account, local, syncedUid: null, uid: 'u1' });
  assert.equal(push, true);
  assert.deepEqual(presets.models.map((x) => x.name), ['Coding', 'coding (this browser)', 'Cheap']);
  assert.deepEqual(presets.rows.map((x) => x.name), ['Mine']);
});

test('CR-5.4 merging identical presets pushes nothing', () => {
  const store = { models: [p('a1', 'Coding', ['m1'])], rows: [], filters: [] };
  const r = planPresetSync({ account: store, local: structuredClone(store), syncedUid: null, uid: 'u1' });
  assert.equal(r.push, false);
  assert.equal(r.presets.models.length, 1);
});

test('CR-5.2 after the first merge the account is authoritative (a deletion elsewhere is not resurrected)', () => {
  const account = { models: [], rows: [], filters: [] };
  const local = { models: [p('l1', 'Deleted elsewhere', ['m1'])], rows: [], filters: [] };
  const r = planPresetSync({ account, local, syncedUid: 'u1', uid: 'u1' });
  assert.deepEqual(r.presets.models, []);
  assert.equal(r.push, false);
  // A different account signing in on the same browser merges again.
  assert.equal(planPresetSync({ account, local, syncedUid: 'u1', uid: 'u2' }).presets.models.length, 1);
});

test('CR-5.2 account presets are sanitised before they reach the browser', () => {
  const r = planPresetSync({ account: { models: [{ id: 1, name: 'bad' }, p('ok', 'Fine', ['m'])] }, local: null, syncedUid: 'u', uid: 'u' });
  assert.deepEqual(r.presets.models.map((x) => x.id), ['ok']);
});

test('CR-5.2 settings: the account copy wins; an empty account adopts this browser', () => {
  assert.deepEqual(planSettingsSync({ accountSettings: { score: 'aa' }, localSettings: { score: 'composite' } }), { apply: { score: 'aa' }, push: false });
  assert.deepEqual(planSettingsSync({ accountSettings: null, localSettings: { score: 'composite' } }), { apply: null, push: true });
  assert.deepEqual(planSettingsSync({ accountSettings: [], localSettings: null }), { apply: null, push: false });
});

test('CR-5.2 PUT payload validation', () => {
  assert.equal(parseAccountPatch(null), null);
  assert.equal(parseAccountPatch([]), null);
  assert.equal(parseAccountPatch({}), null);
  assert.equal(parseAccountPatch({ settings: [1] }), null);
  assert.equal(parseAccountPatch({ settings: { x: 'y'.repeat(MAX_SETTINGS_CHARS) } }), null);
  assert.deepEqual(parseAccountPatch({ settings: { score: 'composite' } }), { settings: { score: 'composite' } });
  const r = parseAccountPatch({ presets: { models: [p('a', 'A', ['m']), { junk: true }], rows: 'nope' } });
  assert.deepEqual(r, { presets: { models: [p('a', 'A', ['m'])], rows: [], filters: [] } });
});

test('CR-5.1 CSRF guard: Origin must match the host the request was sent to', () => {
  assert.equal(sameOrigin(headers({ origin: 'https://benchmarkheaven.com', host: 'benchmarkheaven.com' })), true);
  assert.equal(sameOrigin(headers({ origin: 'https://model-market-comparison.app.mintapis.com', 'x-forwarded-host': 'model-market-comparison.app.mintapis.com', host: 'internal:3000' })), true);
  assert.equal(sameOrigin(headers({ origin: 'https://evil.example', host: 'benchmarkheaven.com' })), false);
  assert.equal(sameOrigin(headers({ host: 'benchmarkheaven.com' })), false);
  assert.equal(sameOrigin(headers({ origin: 'null', host: 'benchmarkheaven.com' })), false);
  assert.equal(isJsonRequest(headers({ 'content-type': 'application/json; charset=utf-8' })), true);
  assert.equal(isJsonRequest(headers({ 'content-type': 'text/plain' })), false);
});

test('CR-5.2 the committed migration and the runtime schema are identical', () => {
  const sql = fs.readdirSync(new URL('../db/accounts/', import.meta.url))
    .filter((file) => file.endsWith('.sql')).sort()
    .map((file) => fs.readFileSync(new URL(`../db/accounts/${file}`, import.meta.url), 'utf8'))
    .join('');
  assert.equal(ACCOUNTS_SCHEMA_SQL, sql);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.match(sql, /refund_attention_notified_attempts integer NOT NULL DEFAULT 0/);
  assert.match(sql, /refund_attention_notified_state text/);
  assert.match(sql, /refund_attempt_seq integer NOT NULL DEFAULT 0/);
  assert.match(sql, /table_schema = current_schema\(\)/);
  assert.match(sql, /set_config\('lock_timeout', '2s', true\)/);
  assert.match(sql, /pg_advisory_xact_lock\(hashtext\('bh_accounts_priority_eval_schema'\)\)/);
  assert.ok(sql.indexOf('pg_advisory_xact_lock') < sql.indexOf("set_config('lock_timeout'"));
  assert.match(sql, /refund_attempt_seq = GREATEST\(/);
  // CR-5.5: nothing beyond id, email, name and avatar is stored about a person.
  const userCols = sql.match(/CREATE TABLE IF NOT EXISTS bh_users \(([\s\S]*?)\);/)[1].split('\n').map((l) => l.trim().split(' ')[0]).filter(Boolean);
  assert.deepEqual(userCols, ['id', 'google_sub', 'email', 'name', 'image', 'created_at', 'last_sign_in_at']);
});

test('CR-5.1 sign-in callbacks use the visitor host only when it is one of ours', () => {
  assert.equal(publicOrigin(headers({ host: 'benchmarkheaven.com' })), 'https://benchmarkheaven.com');
  assert.equal(publicOrigin(headers({ 'x-forwarded-host': 'Model-Market-Comparison.app.mintapis.com, proxy', host: 'localhost:3000' })), 'https://model-market-comparison.app.mintapis.com');
  assert.equal(publicOrigin(headers({ host: 'localhost:3000' })), null);
  assert.equal(publicOrigin(headers({ 'x-forwarded-host': 'evil.example', host: 'benchmarkheaven.com' })), null);
  assert.equal(publicOrigin(headers({})), null);
});
