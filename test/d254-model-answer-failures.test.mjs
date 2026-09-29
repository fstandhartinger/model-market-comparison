// D254 (2026-09-28): `Incomplete completion (length)` is the model's answer, and it was filed as transport.
//
// Everything `worker.sh` reports comes back to `defaultRunner` through one `catch`, which filed every one
// of them `failure: 'transport'`. Two of those messages are raised by `validateCompletion` about the answer
// the model actually returned — `Incomplete completion (…)` (it wrote past the caller's cap) and `Empty
// completion` (it wrote nothing). `hardExcludedWorkerModels` counts only `content`, so neither ever
// hardened, and the critic's last-resort retry re-offered the route indefinitely — the unbounded burn D199
// set out to stop, reached by a different road.
//
// Measured on `runs/2026-09-28T11-23-07-137Z-342490`: `z-ai/glm-5.3-flash` took one content strike at
// 11:29 ("Critic did not echo the exact frozen artifact hash") and then three `Incomplete completion
// (length)` answers at 11:38, 11:46 and 11:53, each paying the 600 s worker timeout. Under D199's bound
// those are four own answers and the route is out after the third; filed as transport it was re-offered
// twice more and the run spent ~20 further minutes on calls that could not succeed. The critic cap is
// already at WORKER_MAX_TOKENS_CEILING, so a length failure cannot be retried into success.
//
// A timeout, a dropped connection or a dead process is still not the model's answer and still never hardens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { workerFailureClass, hardExcludedWorkerModels, excludedWorkerModels, HARD_EXCLUSION_STRIKES, WORKER_MAX_TOKENS_CEILING } from '../ops/daily/gauntlet.mjs';
import { validateCompletion } from '../ops/rebuild-2026-09/bin/worker-policy.mjs';

const RUN = '/opt/benchmarkheaven-daily/runs/2026-09-28T11-23-07-137Z-342490/workers/unavailable-models.jsonl';
const GLM = 'z-ai/glm-5.3-flash';

test('D254: the two messages about the model\'s own answer are content; every other worker failure is transport', () => {
  // The exact strings `validateCompletion` raises, taken from it rather than retyped.
  const raised = (body) => { try { validateCompletion(body, 'z-ai/glm-5.3-flash'); return null; } catch (error) { return error.message; } };
  const length = raised({ model: GLM, choices: [{ finish_reason: 'length', message: { content: 'half an answ' } }] });
  const empty = raised({ model: GLM, choices: [{ finish_reason: 'stop', message: { content: '   ' } }] });
  assert.equal(length, 'Incomplete completion (length)');
  assert.equal(empty, 'Empty completion');
  for (const reason of [length, empty, 'Incomplete completion (missing finish reason)', 'Incomplete completion (content_filter)']) {
    assert.equal(workerFailureClass(reason), 'content', reason);
  }
  // Not the model's answer: the transport, the account, the process, or a provider that routed elsewhere.
  for (const reason of ['The operation was aborted due to timeout', 'fetch failed', 'Worker process failed',
    'OpenRouter completion HTTP 402: insufficient credits', 'Provider returned an unexpected or missing model ID',
    'Provider returned an API error', 'Malformed producer audit row', '', null, undefined]) {
    assert.equal(workerFailureClass(reason), 'transport', String(reason));
  }
  // A cap raise cannot be the remedy for a length answer: the critic already asks for the ceiling.
  assert.equal(WORKER_MAX_TOKENS_CEILING, 32768);
});

test('D254: three length answers harden a route, and a timeout still does not', () => {
  const answer = (n) => Array.from({ length: n }, () => ({ model: GLM, role: 'critic', reason: 'Incomplete completion (length)', failure: workerFailureClass('Incomplete completion (length)') }));
  for (const n of [0, 1, 2]) assert.deepEqual(hardExcludedWorkerModels(answer(n), { role: 'critic' }), [], `${n} length answers`);
  assert.deepEqual(hardExcludedWorkerModels(answer(HARD_EXCLUSION_STRIKES), { role: 'critic' }), [GLM]);
  // One is still enough to exclude it the ordinary way; hardening only removes the retry's licence.
  assert.deepEqual(excludedWorkerModels(answer(1), { role: 'critic' }), [GLM]);
  // D199's rule is unchanged for everything that is not the model's answer.
  const timeouts = Array.from({ length: 9 }, () => ({ model: GLM, role: 'critic', reason: 'The operation was aborted due to timeout', failure: workerFailureClass('The operation was aborted due to timeout') }));
  assert.deepEqual(hardExcludedWorkerModels(timeouts, { role: 'critic' }), []);
  // And a length answer counts only against the role that produced it (CR-73.4).
  assert.deepEqual(hardExcludedWorkerModels(answer(3), { role: 'producer' }), []);
});

test('D254: the real 2026-09-28 11:23 record stream hardens glm after its third own answer', async () => {
  let records;
  try { records = (await readFile(RUN, 'utf8')).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
  catch (error) { if (error.code === 'ENOENT') { console.log('run receipts pruned; policy covered by the fixtures above'); return; } throw error; }
  // What the run wrote: three of glm's four strikes were filed transport, so nothing hardened and the
  // critic retry kept re-offering it.
  assert.equal(records.filter((r) => r.model === GLM && r.failure === 'transport').length, 3);
  assert.deepEqual(hardExcludedWorkerModels(records, { role: 'critic' }), [], 'the regression this fixes');

  // What it would write now. `recordInvalidModel` files a rejected review as `content` directly and never
  // reaches the classifier, so only the runner's own path — everything filed `transport` — is replayed.
  const now = records.map((r) => ({ ...r, failure: r.failure === 'content' ? 'content' : workerFailureClass(r.reason) }));
  assert.deepEqual(hardExcludedWorkerModels(now, { role: 'critic' }), [GLM]);
  const upTo = (n) => now.slice(0, n);
  // Strikes in order: 11:29 content, 11:38/11:46/11:53 length. The route is out once the third own answer lands.
  assert.deepEqual(hardExcludedWorkerModels(upTo(2), { role: 'critic' }), []);
  assert.deepEqual(hardExcludedWorkerModels(upTo(3), { role: 'critic' }), [GLM], 'out after 11:46, not after 11:53');
  // The producer's single 600 s timeout is not its own answer and must stay soft.
  const producer = now.find((r) => r.role === 'producer');
  assert.equal(producer.model, 'deepseek/deepseek-v4-flash-0731');
  assert.equal(producer.failure, 'transport');
  assert.deepEqual(hardExcludedWorkerModels(now, { role: 'producer' }), []);
});
