import test from 'node:test';
import assert from 'node:assert/strict';
import { imageJevSourceUrl } from '../lib/imagejev-system-links.mjs';

test('ImageJevBench links wity-1 to the author homepage, never to a base model', () => {
  assert.equal(imageJevSourceUrl('wity_1', null), 'https://wity.alphanimble.com/');
  assert.equal(imageJevSourceUrl('wity_1', undefined), 'https://wity.alphanimble.com/');
  assert.equal(imageJevSourceUrl('jev_omni', null), 'https://huggingface.co/akhilaaa3/Jev-Omni');
});
