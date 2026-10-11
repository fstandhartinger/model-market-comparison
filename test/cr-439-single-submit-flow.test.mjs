import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFile(join(root, p), 'utf8');
const OLD = '/jev-models/request-evaluation';

async function* walk(dir) {
  for (const name of await readdir(join(root, dir))) {
    const rel = join(dir, name);
    if ((await stat(join(root, rel))).isDirectory()) yield* walk(rel);
    else if (/\.(tsx?|mjs|txt|md)$/.test(name)) yield rel;
  }
}

test('CR-439: the old request page is a permanent redirect to /submit', async () => {
  const config = await read('next.config.mjs');
  assert.match(config, /source: "\/jev-models\/request-evaluation", destination: "\/submit", permanent: true/);
  await assert.rejects(stat(join(root, 'app/jev-models/request-evaluation/page.tsx')));
});

test('CR-439: Stripe return pages of earlier sessions keep working', async () => {
  await stat(join(root, 'app/jev-models/request-evaluation/success/page.tsx'));
  await stat(join(root, 'app/jev-models/request-evaluation/cancel/page.tsx'));
});

test('CR-439: no internal link points at the old path (except Stripe return URLs)', async () => {
  const hits = [];
  for (const dir of ['app', 'components', 'lib', 'public']) {
    for await (const file of walk(dir)) {
      if ((await read(file)).includes(OLD)) hits.push(file);
    }
  }
  const allowed = new Set(['lib/priority-checkout.ts']);
  assert.deepEqual(hits.filter((f) => !allowed.has(f)), []);
  const sitemap = await read('app/sitemap.ts');
  assert.ok(!sitemap.includes(OLD));
});

test('CR-439: /submit shows the fee tiers and the hosted-endpoint note', async () => {
  const page = await read('app/submit/page.tsx');
  assert.match(page, /PRIORITY_PRICES_CENTS\.api_or_small_open \/ 100/);
  assert.match(page, /PRIORITY_PRICES_CENTS\.large_open_gpu \/ 100/);
  assert.match(page, /What the fee does and does not change/);
  assert.match(page, /fee waiver/);
  assert.match(page, /Hosted-endpoint timing \(on request\)/);
  assert.match(page, /2× measured \+ 150 ms for network/);
  assert.match(page, /info@productivity-boost\.com/);
});
