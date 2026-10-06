import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { humanSourceUrl, baseModelFor } from '../lib/jev-base-model.mjs';
import { imageJevSourceUrl } from '../lib/imagejev-system-links.mjs';

// CR-303 (three-page review, 6 Oct 2026): links a visitor follows open a human page, hosted ImageJev rows link to the
// vendor page, llms.txt lists the image and audio boards, and the bar list does not announce "0 more not ranked".
test('CR-303: machine source URLs become the human page, pinned ref kept', () => {
  assert.equal(humanSourceUrl('https://raw.githubusercontent.com/kyr0/Bonsai-Llama-Jev/HEAD/README.md'), 'https://github.com/kyr0/Bonsai-Llama-Jev/blob/HEAD/README.md');
  assert.equal(humanSourceUrl('https://raw.githubusercontent.com/mmastrac/djev-spark/08b708e5/README.md'), 'https://github.com/mmastrac/djev-spark/blob/08b708e5/README.md');
  assert.equal(humanSourceUrl('https://huggingface.co/api/models/surogate/rune-26b-a4b-GGUF'), 'https://huggingface.co/surogate/rune-26b-a4b-GGUF');
  const data = 'https://raw.githubusercontent.com/fstandhartinger/model-market-comparison/main/data/raw/benchmarks/jevbench/v1.6/jevbench-v1.6.0-results.json';
  assert.equal(humanSourceUrl(data), data, 'data files stay raw downloads');
  for (const key of ['glance_qwen3vl_4b', 'surogate_rune_26b_v3', 'bonsai_2_27b_pq2_0']) {
    for (const s of baseModelFor('imagejevbench', key).sources) {
      assert.doesNotMatch(s.url, /raw\.githubusercontent\.com\/.*\.md$|huggingface\.co\/api\//, `${key}: ${s.url}`);
    }
  }
});

test('CR-303: every hosted ImageJevBench row links to a source', async () => {
  const a = JSON.parse(await readFile(new URL('../data/raw/benchmarks/jevbench/multimodal-preview/preview.json', import.meta.url), 'utf8'));
  const missing = a.ranking.filter((row) => !imageJevSourceUrl(row.key, row.repo ?? null)).map((row) => row.key);
  assert.deepEqual(missing, []);
});

test('CR-303: llms.txt lists ImageJevBench and AudioJevBench; no "0 more not ranked"', async () => {
  const llms = await readFile(new URL('../app/llms.txt/route.ts', import.meta.url), 'utf8');
  assert.match(llms, /\/image-jev-bench/);
  assert.match(llms, /\/audio-jev-bench/);
  const board = await readFile(new URL('../components/JevBoardInteractive.tsx', import.meta.url), 'utf8');
  assert.match(board, /rest\.some\(\(r\) => !r\.ranked\)/);
});
