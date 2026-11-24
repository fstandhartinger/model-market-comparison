import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { startNextServer } from './helpers/next-server.mjs';

async function withPage(fixture, check) {
  const previous = process.env.IMAGEJEV_V04_PREVIEW_FIXTURE;
  if (fixture) process.env.IMAGEJEV_V04_PREVIEW_FIXTURE = '1';
  else delete process.env.IMAGEJEV_V04_PREVIEW_FIXTURE;
  let handle;
  try {
    handle = await startNextServer('/image-jev-bench/v0.4');
    assert.ok(handle.firstResponse?.ok, handle.log());
    const html = (await handle.firstResponse.text()).replace(/<!--[\s\S]*?-->/g, '');
    await check(html, handle);
  } finally {
    if (previous === undefined) delete process.env.IMAGEJEV_V04_PREVIEW_FIXTURE;
    else process.env.IMAGEJEV_V04_PREVIEW_FIXTURE = previous;
    if (handle?.server.exitCode === null) {
      handle.stop();
      await once(handle.server, 'exit');
    }
  }
}

test('measured v0.4-A feed renders the Gemini row, use-case cells and disclosure, indexed and without fixture labels', { timeout: 60_000 }, async () => {
  await withPage(false, (html) => {
    assert.match(html, /ImageJevBench v0\.4/);
    assert.match(html, /<nav\b/);
    assert.match(html, /href="\/image-jev-bench"/);
    assert.match(html, /data-feed-kind="measured"/);
    assert.match(html, /Gemini Decision 1/);
    assert.equal((html.match(/data-bh-imagejev-v04-row="/g) ?? []).length, 1);
    assert.match(html, /data-bh-imagejev-v04-breakdown="use_case"/);
    assert.match(html, /data-bh-imagejev-v04-breakdown="image_type"/);
    assert.equal((html.match(/data-bh-imagejev-v04-cell="/g) ?? []).length, 12);
    assert.match(html, /Compare models only within the same evaluation pool/);
    assert.doesNotMatch(html, /name="robots" content="noindex/);
    assert.doesNotMatch(html, /FICTIONAL FIXTURE|Fixture Amber|data-bh-imagejev-v04-method-placeholder|Results are not available yet/);
    assert.doesNotMatch(html, /data-bh-v03-measured|data-bh-mm-ranking|<th[^>]*>Rank|delta_v03/);
  });
});

test('explicit local fixture preview renders v0.4 only, fictional labels and disclosure placeholder', { timeout: 60_000 }, async () => {
  await withPage(true, (html) => {
    assert.match(html, /data-bh-imagejev-v04=/);
    assert.match(html, /data-feed-kind="fixture"/);
    assert.match(html, /FICTIONAL FIXTURE — NOT BENCHMARK RESULTS/);
    assert.match(html, /data-bh-imagejev-v04-method-placeholder=/);
    assert.match(html, /release owner to supply/);
    assert.match(html, /separate scale/);
    assert.match(html, /name="robots" content="noindex, nofollow/);
    assert.match(html, /aria-valuenow="75"/);
    assert.match(html, /aria-valuenow="62"/);
    assert.match(html, /Fixture Amber \(fictional\)/);
    assert.match(html, /Fixture Cobalt \(fictional\)/);
    assert.equal((html.match(/data-bh-imagejev-v04-row="/g) ?? []).length, 2);
    assert.doesNotMatch(html, /data-bh-v03-measured|data-bh-mm-ranking|<th[^>]*>Rank|delta_v03/);
  });
});
