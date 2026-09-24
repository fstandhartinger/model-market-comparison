import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_IMAGE_JEV_EXAMPLES } from '../lib/image-jev-public-examples.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicOnlyIds = new Set([
  'promo-parcel-01', 'promo-receipt-00', 'mm-195', 'mm-139',
  'mm-135', 'mm-118', 'mm-029', 'mm-061',
]);

test('ImageJevBench examples use the audited public-only selection', () => {
  assert.equal(PUBLIC_IMAGE_JEV_EXAMPLES.length, 8);
  assert.deepEqual(new Set(PUBLIC_IMAGE_JEV_EXAMPLES.map((item) => item.sourceItemId)), publicOnlyIds);
  assert.equal(new Set(PUBLIC_IMAGE_JEV_EXAMPLES.map((item) => item.key)).size, 8);

  for (const item of PUBLIC_IMAGE_JEV_EXAMPLES) {
    assert.equal(item.split, 'public', item.key);
    assert.equal(/sealed/i.test(item.sourceItemId), false, item.key);
    assert.ok(item.options.some((option) => option.label === item.correctLabel), item.key);
    assert.ok(item.image.startsWith('/image-jev/examples/'), item.key);
    assert.ok(item.license, item.key);
    if (item.sourceUrl) {
      assert.match(item.sourceUrl, /^https:\/\/huggingface\.co\/datasets\//, item.key);
      assert.ok(item.sourceRevision, item.key);
    } else {
      assert.equal(item.sourceRevision, null, item.key);
      assert.match(item.license, /synthetic/i, item.key);
    }
  }
});

test('published example images match the public-only manifest and are downscaled', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'public/image-jev/examples/manifest.json'), 'utf8'));
  assert.equal(manifest.status, 'public_examples_only');
  assert.equal(manifest.count, 8);
  assert.match(manifest.hash_fields?.source_file_sha256 ?? '', /file named by source_file.*evaluation image/i);
  assert.match(manifest.hash_fields?.asset_sha256 ?? '', /published WebP asset/i);

  for (const item of PUBLIC_IMAGE_JEV_EXAMPLES) {
    const record = manifest.examples.find((example) => example.source_item_id === item.sourceItemId);
    assert.ok(record, item.key);
    assert.equal(record.split, 'public', item.key);
    assert.match(record.source_file_sha256 ?? '', /^[a-f0-9]{64}$/i, item.key);
    assert.equal('source_sha256' in record, false, item.key);
    assert.equal(record.asset, item.image, item.key);
    assert.equal(record.license, item.license, item.key);
    assert.ok(Math.max(...record.published_size_px) <= 1200, item.key);
    assert.ok(record.asset_bytes < 500_000, item.key);

    const assetPath = path.join(root, 'public', item.image.slice(1));
    const bytes = readFileSync(assetPath);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', item.key);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), record.asset_sha256, item.key);
  }
});

test('source labels disambiguate benchmark IDs from upstream row IDs and point to license evidence', () => {
  const geometry = PUBLIC_IMAGE_JEV_EXAMPLES.find((item) => item.sourceItemId === 'mm-029');
  assert.equal(geometry?.sourceRow, '8');
  assert.match(geometry?.sourceName ?? '', /source item 8.*public item mm-029/i);

  const finqa = PUBLIC_IMAGE_JEV_EXAMPLES.find((item) => item.sourceItemId === 'mm-061');
  assert.equal(finqa?.sourceUrl, 'https://huggingface.co/datasets/bevaya/FinQA/blob/3d6a736bc67e06bc15fbf3618d88204a57c5b25e/README.md');
  assert.match(finqa?.license ?? '', /MIT annotations; CDLA-Permissive-1\.0 table data/);
});

test('preview pages retain noindex metadata and the unlisted route renders the same examples', () => {
  const preview = readFileSync(path.join(root, 'app/jev-models/multimodal-preview/page.tsx'), 'utf8');
  const wip = readFileSync(path.join(root, 'app/wip-oiifi41ouv1f/image-jev/page.tsx'), 'utf8');
  assert.match(preview, /robots:\s*\{\s*index:\s*false/);
  assert.match(preview, /<ImageJevExamples\s*\/>/);
  assert.match(wip, /robots:\s*\{\s*index:\s*false/);
  assert.match(wip, /MultimodalPreviewPage/);
});
