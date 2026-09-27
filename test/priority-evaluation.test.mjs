import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import * as priorityEvaluation from '../lib/priority-evaluation.mjs';
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

test('priority request accepts long URLs and ordinary line breaks in multiline textareas', () => {
  const notes = 'Detailed release context: '.repeat(25) + '\nReference: https://example.com/results?' +
    'signal=rank&'.repeat(20) + 'final=true\nFinal line.';
  const accessInstructions = 'Weights are public.\nModel id: author/model-4b';
  const parsed = validatePrioritySubmission(valid({ notes, accessInstructions }));
  assert.ok(notes.length > 500 && notes.length <= 1200);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.value.notes, notes);
  assert.equal(parsed.value.accessInstructions, accessInstructions);
  assert.equal(validatePrioritySubmission(valid({ notes: 'First line.\u0000Second line.' })).ok, false);
});

test('validated requests reach checkout creation for every benchmark, visibility, and price choice', async () => {
  assert.equal(typeof priorityEvaluation.startPriorityCheckout, 'function');
  const createdSessions = [];
  const savedSessions = [];
  const benchmarks = [['jevbench'], ['imagejevbench'], ['jevbench', 'imagejevbench']];
  let index = 0;

  for (const selectedBenchmarks of benchmarks) {
    for (const visibility of ['public', 'private']) {
      for (const pricingTier of ['api_or_small_open', 'large_open_gpu']) {
        index += 1;
        const submission = validatePrioritySubmission(valid({
          submissionId: randomUUID(),
          modelName: 'Imajev v4.2 / author/imajev-4b',
          modelLink: 'https://huggingface.co/author/imajev-4b',
          codeLink: 'https://github.com/author/imajev',
          accessInstructions: 'Public release weights.\nModel id: author/imajev-4b',
          notes: 'Review release 4.2.\nReference: https://example.com/release?view=public&version=4.2',
          benchmarks: selectedBenchmarks,
          visibility,
          pricingTier,
        })).value;
        const result = await priorityEvaluation.startPriorityCheckout({
          submission,
          stripeMode: 'test',
          stripeKey: 'sk_test_unit_only',
          origin: 'https://benchmarkheaven.com',
          requestId: 'request-' + index,
          prepareRequest: async (value, mode) => ({ id: value.submissionId, checkoutUrl: null, mode }),
          createSession: async (input) => {
            createdSessions.push(input);
            return { id: 'cs_test_' + index, url: 'https://checkout.stripe.com/c/pay/cs_test_' + index };
          },
          saveSession: async (...args) => savedSessions.push(args),
          markFailed: async () => assert.fail('successful checkout must not be marked failed'),
          isConflict: () => false,
          logFailure: () => assert.fail('successful checkout must not be logged as a failure'),
        });

        assert.equal(result.status, 200);
        assert.equal(result.body.url, 'https://checkout.stripe.com/c/pay/cs_test_' + index);
      }
    }
  }

  assert.equal(createdSessions.length, 12);
  assert.equal(savedSessions.length, 12);
  assert.deepEqual(createdSessions.map((session) => session.quote.totalAmount).sort((a, b) => a - b),
    [4900, 4900, 4900, 4900, 9800, 9800, 9900, 9900, 9900, 9900, 19800, 19800]);
});

test('checkout failures are visible with a request id and logged without request content', async () => {
  const failures = [];
  const markedFailed = [];
  const result = await priorityEvaluation.startPriorityCheckout({
    submission: validatePrioritySubmission(valid({ notes: 'private synthetic notes' })).value,
    stripeMode: 'live',
    stripeKey: 'sk_live_never_logged',
    origin: 'https://benchmarkheaven.com',
    requestId: 'request-7d1d',
    prepareRequest: async () => ({ id: 'row-7d1d', checkoutUrl: null }),
    createSession: async () => { throw new Error('Stripe response included private synthetic notes'); },
    saveSession: async () => assert.fail('failed session must not be saved'),
    markFailed: async (id) => markedFailed.push(id),
    isConflict: () => false,
    logFailure: (entry) => failures.push(entry),
  });

  assert.equal(result.status, 502);
  assert.equal(result.body.requestId, 'request-7d1d');
  assert.match(result.body.error, /Checkout could not be started/);
  assert.match(result.body.error, /request-7d1d/);
  assert.deepEqual(failures, [{ requestId: 'request-7d1d', phase: 'stripe', errorType: 'Error' }]);
  assert.deepEqual(markedFailed, ['row-7d1d']);
  assert.doesNotMatch(JSON.stringify(failures), /private synthetic notes|sk_live/);
});

test('priority request refuses pasted API keys and bad links', () => {
  assert.match(validatePrioritySubmission(valid({ notes: 'sk_live_123456789abcdefgh' })).error, /Do not enter API keys/);
  assert.match(validatePrioritySubmission(valid({ accessInstructions: 'Bearer ABCDEFGHIJKLMNOPQRSTUVWXYZ' })).error, /Do not enter API keys/);
  assert.equal(validatePrioritySubmission(valid({ modelLink: 'http://huggingface.co/example/jev' })).ok, false);
  assert.equal(validatePrioritySubmission(valid({ codeLink: 'https://evil.example/model' })).ok, false);
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
