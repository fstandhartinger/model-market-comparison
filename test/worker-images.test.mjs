import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { imageEvidence } from '../ops/rebuild-2026-09/bin/worker-images.mjs';
test('vision critic sends actual local pixels with hashed receipts, without weakening model or payload gates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bh-image-test-'));
  try {
    const file = join(directory, 'tiny.png');
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=', 'base64');
    await writeFile(file, bytes);
    const model = { architecture: { input_modalities: ['text','image'] } };
    const result = await imageEvidence([file], model);
    assert.equal(result.parts[0].image_url.url, `data:image/png;base64,${bytes.toString('base64')}`);
    assert.equal(result.manifest[0].sha256, createHash('sha256').update(bytes).digest('hex'));
    await assert.rejects(imageEvidence([file], { architecture: { input_modalities: ['text'] } }), /image input/);
    await assert.rejects(imageEvidence(Array(9).fill(file), model), /eight/);
    await writeFile(file, '<html>no image</html>');
    await assert.rejects(imageEvidence([file], model), /PNG or JPEG/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
