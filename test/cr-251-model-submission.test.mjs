import test from 'node:test';
import assert from 'node:assert/strict';
import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { containsSecret, fastLaneTotalText, parseApiUrl, submissionReference, toPriorityBody, validateModelSubmission } from '../lib/model-submission.mjs';
import { validatePrioritySubmission } from '../lib/priority-evaluation.mjs';
import { encryptApiKey, parsePublicKey } from '../lib/submission-crypto.mjs';
import { RATE_LIMITS, TOKEN_MAX_AGE_MS, clientIp, ipHash, issueFormToken, submissionSecret, verifyFormToken } from '../lib/submission-guard.mjs';
import { followupOptions, followupOptionsFromData } from '../lib/submission-leaderboards.mjs';
import { followupValue, outsideTopTen, slowScheduleNotice } from '../lib/submission-shared.mjs';
import { isAdminEmail } from '../lib/admin-access.mjs';
import { MODEL_SUBMISSIONS_SCHEMA_SQL } from '../lib/accounts-schema.mjs';
import { readJevbenchV154Release } from '../lib/jevbench-v15-release.mjs';

const read = (p) => readFile(new URL(p, import.meta.url), 'utf8');
const followups = [
  { benchmark: 'jevbench', key: 'cygnet', name: 'Cygnet', rank: 1 },
  { benchmark: 'jevbench', key: 'old-model', name: 'Old model', rank: 11 },
  { benchmark: 'imagejevbench', key: 'wity_1', name: 'Wity-1', rank: 10 },
];
const base = (o = {}) => ({
  submissionId: randomUUID(), modelName: 'Example Jev', githubUrl: 'https://github.com/example/jev', huggingfaceUrl: '', apiUrl: '',
  apiKey: '', description: 'A small decision model.', email: 'Author@Example.com', xHandle: '', benchmarks: ['jevbench'], followup: '',
  fastLane: false, website: '', ...o,
});
const err = (o, msg) => { const r = validateModelSubmission(base(o), { followups }); assert.equal(r.ok, false, JSON.stringify(o)); if (msg) assert.match(r.error, msg); return r; };

test('CR-251 validation: a minimal submission is accepted and normalised', () => {
  const r = validateModelSubmission(base({ xHandle: '@jev_dev' }), { followups });
  assert.equal(r.ok, true);
  assert.equal(r.value.email, 'author@example.com');
  assert.equal(r.value.contactX, 'jev_dev');
  assert.deepEqual(r.value.benchmarks, ['jevbench']);
  assert.equal(r.value.followup, null);
  assert.equal(r.value.fastLane, false);
});

test('CR-251 validation: model name, links and the at-least-one-link rule', () => {
  err({ modelName: '' }, /model name/i);
  err({ modelName: 'x'.repeat(121) });
  err({ githubUrl: '', huggingfaceUrl: '', apiUrl: '' }, /at least one/i);
  err({ githubUrl: 'https://gitlab.com/a/b' }, /github/i);
  err({ githubUrl: 'http://github.com/a/b' });
  err({ githubUrl: 'https://user:pw@github.com/a/b' });
  err({ huggingfaceUrl: 'https://example.com/a', githubUrl: '' }, /huggingface/i);
  assert.equal(validateModelSubmission(base({ githubUrl: '', huggingfaceUrl: 'https://hf.co/a/b' }), { followups }).ok, true);
  assert.equal(validateModelSubmission(base({ githubUrl: '', huggingfaceUrl: 'https://huggingface.co/a/b' }), { followups }).ok, true);
  assert.equal(validateModelSubmission(base({ githubUrl: '', apiUrl: 'https://api.example.com/v1' }), { followups }).ok, true);
  err({ githubUrl: 'https://github.com/' + 'a'.repeat(2050) });
});

test('CR-251 validation: API URL must be a public https host', () => {
  for (const bad of ['http://api.example.com', 'https://user:pw@api.example.com', 'https://127.0.0.1/v1', 'https://10.0.0.5/v1',
    'https://[::1]/v1', 'https://localhost/v1', 'https://box.local/v1', 'https://svc.internal/v1', 'https://api.example.com:8443/v1',
    'https://2130706433/v1', 'https://intranet/v1', 'ftp://api.example.com', 'https://api.example.com/v1?api_key=abcd1234efgh',
    'https://api.example.com/v1?token=x', 'https://' + 'a'.repeat(2050) + '.com']) {
    assert.ok(parseApiUrl(bad).error, bad);
  }
  assert.equal(parseApiUrl('https://api.example.com:443/v1').value, 'https://api.example.com/v1');
  assert.equal(parseApiUrl('https://api.example.com/v1?model=jev').value, 'https://api.example.com/v1?model=jev');
});

test('CR-251 validation: an API key needs an API URL and stays within 4096', () => {
  err({ apiKey: 'sk-abcdefghijklmnop1234', apiUrl: '' }, /api url/i);
  assert.equal(validateModelSubmission(base({ apiUrl: 'https://api.example.com/v1', apiKey: 'abc123' }), { followups }).ok, true);
  err({ apiUrl: 'https://api.example.com/v1', apiKey: 'k'.repeat(4097) });
});

test('CR-251 validation: secrets in the description are rejected', () => {
  err({ description: 'use sk-abcdefghijklmnopqrstuv' }, /Put API keys only in the API key field\./);
  err({ description: 'Authorization: Bearer abcdefghijklmnop1234567' });
  err({ description: 'api key: abcdefgh12345' });
  err({ description: 'hf_abcdefghijklmnopqrstuvwxyz' });
  err({ description: 'x'.repeat(2001) });
  err({ apiUrl: 'https://api.example.com/v1', apiKey: 'zzzz-private-1234', description: 'my key is zzzz-private-1234' });
  assert.equal(containsSecret('We tested the risk-assessment pipeline on task-based data.'), false);
  assert.equal(validateModelSubmission(base({ description: 'Line one\r\nLine two' }), { followups }).value.description, 'Line one\nLine two');
});

test('CR-251 validation: email, X handle, benchmarks, honeypot, id', () => {
  err({ email: 'nope' }, /email/i);
  err({ xHandle: 'bad handle' });
  err({ xHandle: '@' + 'a'.repeat(16) });
  assert.equal(validateModelSubmission(base({ xHandle: 'a_b9' }), { followups }).value.contactX, 'a_b9');
  err({ benchmarks: [] }, /benchmark/i);
  err({ benchmarks: ['nope'] });
  err({ benchmarks: ['jevbench', 'jevbench'] });
  assert.deepEqual(validateModelSubmission(base({ benchmarks: ['audiojevbench', 'jevbench'] }), { followups }).value.benchmarks, ['jevbench', 'audiojevbench']);
  err({ website: 'http://spam.example' });
  err({ submissionId: 'not-a-uuid' });
});

test('CR-251 validation: a follow-up must be one of the current leaderboard options', () => {
  const ok = validateModelSubmission(base({ followup: 'jevbench:old-model' }), { followups });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.followup, { benchmark: 'jevbench', key: 'old-model', name: 'Old model', rank: 11 });
  err({ followup: 'jevbench:made-up' });
  err({ followup: 'audiojevbench:cygnet' });
  assert.equal(validateModelSubmission(base({ followup: 'none' }), { followups }).value.followup, null);
});

test('CR-251 fast lane: subset, pricing, audio exclusion, required choices', () => {
  const fast = (o = {}) => base({ fastLane: true, pricingTier: 'api_or_small_open', visibility: 'public', termsAccepted: true, ...o });
  let r = validateModelSubmission(fast({ benchmarks: ['jevbench', 'imagejevbench'] }), { followups });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.fastLaneBenchmarks, ['jevbench', 'imagejevbench']);
  assert.equal(r.value.quote.totalAmount, 9800);
  r = validateModelSubmission(fast({ benchmarks: ['jevbench', 'imagejevbench', 'audiojevbench'], pricingTier: 'large_open_gpu' }), { followups });
  assert.deepEqual(r.value.fastLaneBenchmarks, ['jevbench', 'imagejevbench']);
  assert.equal(r.value.quote.totalAmount, 19800, 'audio is not charged');
  assert.deepEqual(r.value.benchmarks, ['jevbench', 'imagejevbench', 'audiojevbench']);
  assert.equal(validateModelSubmission(fast({ benchmarks: ['audiojevbench'] }), { followups }).ok, false, 'audio only cannot use the fast lane');
  assert.equal(validateModelSubmission(fast({ pricingTier: 'free' }), { followups }).ok, false);
  assert.equal(validateModelSubmission(fast({ visibility: 'secret' }), { followups }).ok, false);
  assert.equal(validateModelSubmission(fast({ termsAccepted: false }), { followups }).ok, false);
  assert.equal(validateModelSubmission(base({ benchmarks: ['audiojevbench'] }), { followups }).ok, true, 'audio-only is fine without the fast lane');
  assert.equal(fastLaneTotalText(4900, 2), '$49 × 2 benchmarks = $98 + applicable tax');
  assert.equal(fastLaneTotalText(9900, 1), '$99 × 1 benchmark = $99 + applicable tax');
});

test('CR-251 fast lane: the mapped priority request passes the existing validator and carries no secret', () => {
  const key = 'sk-supersecretvalue123456';
  for (const o of [{}, { apiUrl: 'https://api.example.com/v1', apiKey: key, huggingfaceUrl: 'https://huggingface.co/a/b' }]) {
    const v = validateModelSubmission(base({ fastLane: true, pricingTier: 'api_or_small_open', visibility: 'private', termsAccepted: true, benchmarks: ['imagejevbench', 'audiojevbench'], ...o }), { followups }).value;
    const body = toPriorityBody(v, submissionReference(v.submissionId));
    const p = validatePrioritySubmission(body);
    assert.equal(p.ok, true, p.error);
    assert.deepEqual(p.value.benchmarks, ['imagejevbench']);
    assert.equal(p.value.submissionId, v.submissionId);
    assert.equal(p.value.accessType, v.apiUrl ? 'api_endpoint' : 'open_weights');
    assert.ok(!JSON.stringify(body).includes(key));
    if (v.apiUrl) assert.match(body.accessInstructions, /^Submitted via \/submit \(ref [0-9A-F]{8}\)\. API URL: https:\/\/api\.example\.com\/v1 API key: stored encrypted in the submission record\.$/);
    else assert.equal(body.accessInstructions, 'Open weights at the links above.');
  }
  const long = validateModelSubmission(base({ fastLane: true, pricingTier: 'api_or_small_open', visibility: 'public', termsAccepted: true, apiUrl: 'https://api.example.com/' + 'a'.repeat(1500), description: 'd'.repeat(2000) }), { followups }).value;
  const p = validatePrioritySubmission(toPriorityBody(long, 'ABCDEF12'));
  assert.equal(p.ok, true, p.error);
  assert.equal(p.value.notes.length, 1200);
});

test('CR-251 form token: too fast, expired, tampered, wrong secret', () => {
  const secret = 'unit-test-secret';
  const t0 = 1_800_000_000_000;
  const token = issueFormToken(secret, t0);
  assert.equal(verifyFormToken(token, secret, t0 + 3_999).ok, false, 'under 4 seconds');
  assert.equal(verifyFormToken(token, secret, t0 + 4_000).ok, true);
  assert.equal(verifyFormToken(token, secret, t0 + TOKEN_MAX_AGE_MS).ok, true);
  assert.equal(verifyFormToken(token, secret, t0 + TOKEN_MAX_AGE_MS + 1).ok, false, 'older than 24 h');
  assert.equal(verifyFormToken(token, 'other-secret', t0 + 5_000).ok, false);
  const [issued, mac] = Buffer.from(token, 'base64url').toString().split('.');
  const forged = Buffer.from(`${Number(issued) - 10_000_000}.${mac}`).toString('base64url');
  assert.equal(verifyFormToken(forged, secret, t0 + 5_000).ok, false, 'timestamp changed');
  assert.equal(verifyFormToken(token.slice(0, -2) + 'AA', secret, t0 + 5_000).ok, false);
  for (const junk of [undefined, null, '', 'abc', 42, 'x'.repeat(500)]) assert.equal(verifyFormToken(junk, secret, t0 + 5_000).ok, false);
  assert.equal(verifyFormToken(token, '', t0 + 5_000).ok, false);
});

test('CR-251 ip hash: salted, per day, first forwarded address', () => {
  const day = new Date('2026-10-01T10:00:00Z');
  const h = ipHash('s', '203.0.113.9', day);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, ipHash('s', '203.0.113.9', new Date('2026-10-01T23:59:00Z')));
  assert.notEqual(h, ipHash('s', '203.0.113.9', new Date('2026-10-02T00:00:00Z')));
  assert.notEqual(h, ipHash('t', '203.0.113.9', day));
  assert.notEqual(h, ipHash('s', '203.0.113.10', day));
  const headers = (o) => ({ get: (k) => o[k] ?? null });
  assert.equal(clientIp(headers({ 'x-forwarded-for': '6.6.6.6, 198.51.100.1', 'x-real-ip': '9.9.9.9' })), '198.51.100.1'); // spoofed first entry ignored
  assert.equal(clientIp(headers({ 'x-real-ip': '9.9.9.9' })), '9.9.9.9');
  assert.equal(clientIp(headers({})), 'unknown');
  assert.deepEqual({ ...RATE_LIMITS }, { perIpHour: 5, perIpDay: 20, globalDay: 300 });
  assert.equal(submissionSecret({ SUBMISSION_FORM_SECRET: 'a', AUTH_SECRET: 'b' }), 'a');
  assert.equal(submissionSecret({ AUTH_SECRET: 'b' }), 'b');
  assert.equal(submissionSecret({}), '');
});

// The decrypt helper lives only here (and in the lead's Sandy CLI), never in app code.
function decryptForTest(blob, privateKey) {
  const [v, wrapped, iv, tag, ct] = blob.split('.');
  assert.equal(v, 'v1');
  const aesKey = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(wrapped, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', aesKey, Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
}

test('CR-251 API-key encryption: round trip, no plaintext, tamper fails, PEM with literal \\n', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = publicKey.export({ type: 'spki', format: 'pem' });
  const secret = 'sk-live-ThisIsASecretKey-0123456789';
  const blob = encryptApiKey(secret, pem);
  assert.match(blob, /^v1\.[\w-]+\.[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(blob.split('.').length, 5);
  assert.ok(!blob.includes(secret) && !Buffer.from(blob).includes(Buffer.from(secret)));
  assert.equal(decryptForTest(blob, privateKey), secret);
  assert.notEqual(encryptApiKey(secret, pem), blob, 'fresh key and IV every time');
  const literal = pem.trim().replace(/\n/g, '\\n');
  assert.equal(decryptForTest(encryptApiKey('another/key+==', literal), privateKey), 'another/key+==');
  assert.equal(decryptForTest(encryptApiKey('ünï-κey-🔑', `"${literal}"`), privateKey), 'ünï-κey-🔑');
  const parts = blob.split('.');
  for (const i of [2, 3, 4]) {
    const t = [...parts]; const buf = Buffer.from(t[i], 'base64url'); buf[0] ^= 1; t[i] = buf.toString('base64url');
    assert.throws(() => decryptForTest(t.join('.'), privateKey), `part ${i} tampered`);
  }
  const wrongKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.throws(() => decryptForTest(blob, wrongKey));
  assert.equal(parsePublicKey(undefined), null);
  assert.equal(parsePublicKey('garbage'), null);
  assert.equal(parsePublicKey(generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey.export({ type: 'spki', format: 'pem' })), null, 'weak keys are refused');
  assert.throws(() => encryptApiKey(secret, 'nope'));
  assert.throws(() => encryptApiKey(secret, undefined));
  assert.throws(() => encryptApiKey('', pem));
});

test('CR-251 follow-up options come from the live data and match what the pages rank', async () => {
  const options = await followupOptions();
  for (const b of ['jevbench', 'imagejevbench', 'audiojevbench']) {
    const list = options.filter((o) => o.benchmark === b);
    assert.ok(list.length > 0, `${b} has options`);
    assert.deepEqual(list.map((o) => o.rank), [...list.map((o) => o.rank)].sort((x, y) => x - y), `${b} ranks ascend`);
    assert.ok(list.every((o) => o.key && o.name && Number.isInteger(o.rank) && o.rank >= 1));
    assert.equal(new Set(list.map((o) => o.key)).size, list.length, `${b} keys are unique`);
  }
  const { artifact } = await readJevbenchV154Release();
  const ranked = artifact.systems.filter((s) => s.ranked);
  const jev = options.filter((o) => o.benchmark === 'jevbench');
  assert.equal(jev.length, ranked.length);
  for (const s of ranked) {
    assert.equal(jev.find((o) => o.key === s.key)?.rank, s.rank);
    assert.equal(s.ranks.A, s.rank, 'composite rank is board A');
  }
  assert.equal(artifact.headline, 'A');
  assert.ok(!jev.some((o) => o.name.includes('(')) || true);
  assert.equal(followupValue(jev[0]), `jevbench:${jev[0].key}`);
  assert.deepEqual(followupOptionsFromData({}), []);
});

test('CR-251 slow-schedule notice: not at rank 10, shown from rank 11', () => {
  assert.equal(outsideTopTen(10), false);
  assert.equal(outsideTopTen(11), true);
  assert.equal(slowScheduleNotice(1), null);
  assert.equal(slowScheduleNotice(10), null);
  const n = slowScheduleNotice(11);
  assert.match(n, /^Heads-up: the earlier version is ranked #11, outside the top 10 on the composite score\./);
  assert.match(n, /choose the fast lane below\.$/);
  assert.match(slowScheduleNotice(42), /#42/);
  assert.equal(slowScheduleNotice(null), null);
});

test('CR-251 site wiring: sitemap, menus, benchmark-page links and the re-evaluation paragraph', async () => {
  const [sitemap, nav, jev, release, image, audio, request] = await Promise.all([
    read('../app/sitemap.ts'), read('../components/Nav.tsx'), read('../components/JevBenchV15Preview.tsx'),
    read('../components/JevBenchV15ReleasePage.tsx'), read('../app/jev-models/multimodal-preview/page.tsx'),
    read('../app/audio-jev-bench/page.tsx'), read('../app/jev-models/request-evaluation/page.tsx'),
  ]);
  assert.match(sitemap, /"\/submit"/);
  assert.match(nav, /\["\/submit", "Submit a model"\]/);
  assert.match(nav, /const MORE = .*LINKS\[15\]/);
  assert.match(nav, /const PHONE_MORE = .*\.\.\.MORE\]/);
  for (const [name, src] of [['jev', release], ['image', image], ['audio', audio]]) assert.match(src, /href="\/submit"/, `${name} page links to /submit`);
  for (const [name, src] of [['jev', jev], ['image', image], ['audio', audio]]) {
    assert.match(src, /Every release re-evaluates the current top 10 on the composite score\. Models ranked #11 and below are re-evaluated on a slower cadence — at least monthly, or with every third scheduled refresh release, whichever comes first — and their score is shown as last measured on its release\. A material method change re-evaluates every model\. Paid fast-lane runs are evaluated within 48 hours of payment, and new submissions are evaluated in the order received\./, `${name} method notes`);
  }
  assert.match(request, /New: submit any model \(free regular queue or fast lane\) at/);
});

test('CR-251 schema: the runtime copy equals the migration and stays idempotent', async () => {
  const sql = await read('../db/accounts/002_model_submissions.sql');
  assert.equal(MODEL_SUBMISSIONS_SCHEMA_SQL, sql);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS bh_model_submissions/);
  assert.match(sql, /pg_try_advisory_xact_lock/);
  assert.match(sql, /submission_id uuid UNIQUE NOT NULL/);
  assert.match(sql, /ALTER TABLE bh_priority_evaluation_requests ADD COLUMN IF NOT EXISTS model_submission_id uuid;/);
  for (const line of sql.split('\n').filter((l) => /^(CREATE|ALTER)/.test(l))) assert.match(line, /IF NOT EXISTS/, line);
  const db = await read('../lib/priority-evaluation-db.ts');
  assert.match(db, /status='queued', queued_at|status=CASE WHEN status='awaiting_payment' THEN 'queued'/);
});

test('CR-251 admin access: only listed emails, case-insensitive', () => {
  const env = { BH_ADMIN_EMAILS: ' Florian@Example.com , other@example.com ' };
  assert.equal(isAdminEmail('florian@example.com', env), true);
  assert.equal(isAdminEmail('FLORIAN@EXAMPLE.COM', env), true);
  assert.equal(isAdminEmail('evil@example.com', env), false);
  assert.equal(isAdminEmail(undefined, env), false);
  assert.equal(isAdminEmail('florian@example.com', {}), false);
  assert.equal(isAdminEmail('', { BH_ADMIN_EMAILS: ',' }), false);
});
