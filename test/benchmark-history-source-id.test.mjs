import test from 'node:test';
import assert from 'node:assert/strict';
import { retainedSourceId } from '../lib/benchmark-history.mjs';

// 2026-09-15 (iteration 69): FrontierCode rows retained while unmatched and joined later must be recognised as still
// published; a "|" inside the source id once turned 408 of them into false drop-out estimates.
test('retained source id keeps a "|" inside the source id and drops only harness and variant', () => {
  assert.equal(retainedSourceId({ model_key: 'source:Claude Fable 5|high|claude-code|' }), 'Claude Fable 5|high');
  assert.equal(retainedSourceId({ model_key: 'source:Opus 5 Max||' }), 'Opus 5 Max');
  assert.equal(retainedSourceId({ model_key: 'source:gpt-5.4 (xHigh)*|mini-swe-agent|xhigh' }), 'gpt-5.4 (xHigh)*');
  assert.equal(retainedSourceId({ model_key: 'claude-opus-5::max', source_locator: 'model UUID 01234567-89ab-cdef-0123-456789abcdef; field' }), '01234567-89ab-cdef-0123-456789abcdef');
  assert.equal(retainedSourceId({ model_key: 'claude-opus-5::max' }), null);
});
