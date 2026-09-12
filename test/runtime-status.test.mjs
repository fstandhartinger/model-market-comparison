import test from 'node:test';
import assert from 'node:assert/strict';
import { revisionFromEnvironment, sourceAgeDays, publicOperatorReceipt } from '../lib/runtime-status.mjs';

test('revision identity only exposes a valid Coolify SOURCE_COMMIT and never invents one', () => {
  assert.equal(revisionFromEnvironment({ SOURCE_COMMIT: '9caf5f3e049f32c62ed0ca57bccfee620d52761a' }), '9caf5f3e049f32c62ed0ca57bccfee620d52761a');
  assert.equal(revisionFromEnvironment({ SOURCE_COMMIT: 'not-a-commit' }), 'unknown');
  assert.equal(revisionFromEnvironment({}), 'unknown');
});

test('operator receipt retains last success and reports source ages from the live snapshot without claiming a refresh', () => {
  const receipt = {
    schema_version: 1,
    last_success: { finished_at: '2026-09-11T06:50:09.612Z', commit: 'a41df419e69b9c0cd465e8dccb16c1f1f3f375fe', live_verified: true },
    last_attempt: { finished_at: '2026-09-12T05:17:15.242Z', status: 'problem', published: false, error_code: 'openrouter_catalog_identity_withdrawal' },
  };
  assert.equal(sourceAgeDays('2026-09-11', '2026-09-12T18:00:00Z'), 1);
  assert.equal(sourceAgeDays('not-a-date', '2026-09-12T18:00:00Z'), null);
  const status = publicOperatorReceipt(receipt, { artificialanalysis: '2026-09-11', provider_meta: '2026-07-12' }, '2026-09-12T18:00:00Z');
  assert.equal(status.last_success.commit, receipt.last_success.commit);
  assert.equal(status.last_attempt.status, 'problem');
  assert.equal(status.source_ages_days.artificialanalysis, 1);
  assert.equal(status.source_ages_days.provider_meta, 62);
  assert.equal(status.refresh_claim, 'none');
});
