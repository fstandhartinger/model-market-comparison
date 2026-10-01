import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parsePinnedMultimodalPreviewV02Bytes } from '../lib/jevbench-multimodal-preview.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('v0.2 byte-pin guard rejects an unset pin before attempting JSON parsing', () => {
  assert.throws(
    () => parsePinnedMultimodalPreviewV02Bytes(Buffer.from('{invalid json'), null),
    /artifact SHA256 is not pinned/,
  );
});

test('v0.2 byte-pin guard rejects mismatched bytes before attempting JSON parsing', () => {
  assert.throws(
    () => parsePinnedMultimodalPreviewV02Bytes(Buffer.from('{invalid json'), '0'.repeat(64)),
    /bytes differ from the pinned SHA256/,
  );
});

test('v0.2 byte-pin helper parses only the exact synthetic bytes supplied to it', () => {
  const bytes = Buffer.from(JSON.stringify({ version: 'v0.2.0', ranking: [] }));
  const parsed = parsePinnedMultimodalPreviewV02Bytes(bytes, sha256(bytes));
  assert.deepEqual(parsed.artifact, { version: 'v0.2.0', ranking: [] });
  assert.equal(parsed.sha256, sha256(bytes));
});
