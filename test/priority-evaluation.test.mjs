import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { quotePriorityEvaluation, validatePrioritySubmission, verifyStripeSignature } from '../lib/priority-evaluation.mjs';

const valid = (overrides = {}) => ({
  submissionId: randomUUID(), email: 'author@example.com', modelName: 'Example Jev',
  modelLink: 'https://huggingface.co/example/jev', codeLink: 'https://github.com/example/jev',
  accessType: 'open_weights', accessInstructions: 'Weights are public at the model link.',
  notes: '', pricingTier: 'api_or_small_open', benchmarks: ['jevbench'], visibility: 'public', termsAccepted: true,
  ...overrides,
});

test('priority pricing is per selected benchmark and in USD cents', () => {
  assert.deepEqual(quotePriorityEvaluation({ benchmarks: ['jevbench'], pricingTier: 'api_or_small_open' }), { currency: 'usd', unitAmount: 4900, quantity: 1, totalAmount: 4900 });
  assert.deepEqual(quotePriorityEvaluation({ benchmarks: ['jevbench', 'imagejevbench'], pricingTier: 'large_open_gpu' }), { currency: 'usd', unitAmount: 9900, quantity: 2, totalAmount: 19800 });
  assert.equal(quotePriorityEvaluation({ benchmarks: ['jevbench', 'jevbench'], pricingTier: 'api_or_small_open' }), null);
});

test('priority request accepts only valid fields and public/private visibility', () => {
  const parsed = validatePrioritySubmission(valid());
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.quote.totalAmount, 4900);
  assert.equal(validatePrioritySubmission(valid({ visibility: 'listed-by-payment' })).ok, false);
  assert.equal(validatePrioritySubmission(valid({ termsAccepted: false })).ok, false);
  assert.equal(validatePrioritySubmission(valid({ email: 'not an email' })).ok, false);
});

test('priority request refuses pasted API keys and bad links', () => {
  assert.match(validatePrioritySubmission(valid({ notes: 'sk_live_123456789abcdefgh' })).error, /Do not enter API keys/);
  assert.match(validatePrioritySubmission(valid({ accessInstructions: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ' })).error, /Do not enter API keys/);
  assert.equal(validatePrioritySubmission(valid({ modelLink: 'http://huggingface.co/example/jev' })).ok, false);
  assert.equal(validatePrioritySubmission(valid({ codeLink: 'https://evil.example/model' })).ok, false);
  assert.equal(validatePrioritySubmission(valid({ notes: 'line one\nline two' })).ok, false);
});

test('Stripe signatures require a valid HMAC and a fresh timestamp', () => {
  const body = Buffer.from('{"id":"evt_test","livemode":false}');
  const secret = 'whsec_test_secret_for_unit_test_only';
  const now = 1_800_000_000;
  const digest = createHmac('sha256', secret).update(Buffer.concat([Buffer.from(`${now}.`), body])).digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${now},v1=${digest}`, secret, now), true);
  assert.equal(verifyStripeSignature(body, `t=${now},v1=${'0'.repeat(64)}`, secret, now), false);
  assert.equal(verifyStripeSignature(body, `t=${now - 301},v1=${digest}`, secret, now), false);
  assert.equal(verifyStripeSignature(body, `t=${now},v1=${digest}`, 'wrong', now), false);
});
