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

test('missing v0.4 feed hides the section while the production page and site layout render', { timeout: 60_000 }, async () => {
  await withPage(false, (html) => {
    assert.match(html, /ImageJevBench v0\.4/);
    assert.match(html, /Results are not available yet/);
    assert.match(html, /<nav\b/);
    assert.match(html, /href="\/image-jev-bench"/);
    assert.match(html, /name="robots" content="noindex, nofollow/);
    assert.doesNotMatch(html, /id="imagejev-v04"|data-bh-imagejev-v04-row/);
    assert.doesNotMatch(html, /Fixture Amber|FICTIONAL FIXTURE/);
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
    assert.match(html, /aria-valuenow="75"/);
    assert.match(html, /aria-valuenow="62"/);
    assert.match(html, /Fixture Amber \(fictional\)/);
    assert.match(html, /Fixture Cobalt \(fictional\)/);
    assert.equal((html.match(/data-bh-imagejev-v04-row="/g) ?? []).length, 2);
    assert.doesNotMatch(html, /data-bh-v03-measured|data-bh-mm-ranking|<th[^>]*>Rank|delta_v03/);
  });
});
