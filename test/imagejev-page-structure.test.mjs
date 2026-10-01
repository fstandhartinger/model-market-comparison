import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

// Production HTML is the regression boundary: an indexable page with a menu and a full roster.
// Like test/production/prerender.mjs, this runs after the production build.
test('ImageJevBench production page keeps the shared section order, full roster, pricing and site menu', { timeout: 45000 }, async () => {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '--hostname', '127.0.0.1'], {
    env: { ...process.env, OPENAI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  server.stdout.on('data', (chunk) => { log += chunk; });
  server.stderr.on('data', (chunk) => { log += chunk; });
  try {
    let html;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`Production server exited: ${log}`);
      try {
        // v0.2 is the default tab; the CR-248 v0.1.5 release keeps its full page under its archived tab.
        const response = await fetch(`http://127.0.0.1:${port}/image-jev-bench?version=v0.1.5`);
        if (response.ok) { html = await response.text(); break; }
      } catch { /* Wait for Next's listener. */ }
      await pause(200);
    }
    assert.ok(html, `Production page must render: ${log}`);
    html = html.replace(/<!--[\s\S]*?-->/g, '');
    const shared3d = await readFile('components/JevCapabilityChart.tsx', 'utf8');
    assert.match(shared3d, /<JevCapability3D[^>]*benchmarkName=\{benchName\}/, 'the 3D view uses the page benchmark name');
    let previous = -1;
    for (const marker of ['JevImageBench Capability Score</h2>', 'data-bh-jev-bubbles=', 'data-bh-jev14-chart=', 'data-bh-jev15-compare=', 'data-bh-mm-ranking="all"', 'id="method-heading"', 'data-bh-mm-revision-history=']) {
      const index = html.indexOf(marker);
      assert.ok(index > previous, `${marker} must follow the preceding section`);
      previous = index;
    }
    const fullTable = html.match(/<table\b[^>]*data-bh-mm-ranking="all"[\s\S]*?<\/table>/)?.[0];
    assert.ok(fullTable, 'full ranking table renders');
    assert.ok((fullTable.match(/scope="row"/g) ?? []).length >= 50, 'all 50 systems stay visible');
    assert.match(html, /<nav\b/);
    assert.match(html, /href="\/jev-models"/);
    assert.match(html, /data-bh-jev-alt="wity_1"/);
    assert.match(html, /data-bh-mm-3d-toggle/);
    assert.match(html, /38 of 50 systems qualify/);
    assert.match(html, /mostly because self-hosted cost is computed from measured GPU time/);
    assert.match(html, /USD 0\.042 per million input tokens/);
    assert.doesNotMatch(html, /Florian chose this basis on 29 Sep/);
    assert.match(html, /No frozen v0\.1 ranking copy is retained/);
    for (const [revision, count] of [['v0.1.1', 48], ['v0.1.2', 49], ['v0.1.3', 49], ['v0.1.4', 50], ['v0.1.5', 50]]) {
      const frozen = JSON.parse(await readFile(`data/raw/benchmarks/jevbench/multimodal-preview/${revision === 'v0.1.5' ? 'preview' : `preview-${revision}`}.json`, 'utf8'));
      const history = html.match(new RegExp(`<table\\b[^>]*data-bh-mm-history-ranking="${revision.replaceAll('.', '\\.')}"[\\s\\S]*?<\\/table>`))?.[0];
      assert.equal((history?.match(/scope="row"/g) ?? []).length, count, `${revision} contains its frozen roster`);
      assert.ok(history.includes(frozen.ranking[0].name), `${revision} contains its recorded winner`);
    }
    assert.match(html, /data-bh-imagejev-version-tab="v0\.1\.5"[^>]*aria-current="page"|aria-current="page"[^>]*data-bh-imagejev-version-tab="v0\.1\.5"/);
    const defaultHtml = await (await fetch(`http://127.0.0.1:${port}/image-jev-bench`)).text();
    assert.match(defaultHtml, /data-bh-imagejev-v02-page/, 'the normal page opens on v0.2');
    for (const version of ['v0.2.0', 'v0.1.5', 'v0.1.4']) assert.match(defaultHtml, new RegExp(`data-bh-imagejev-version-tab="${version.replaceAll('.', '\\.')}"`));
    const archived = await (await fetch(`http://127.0.0.1:${port}/image-jev-bench?version=v0.1.4`)).text();
    assert.equal((archived.match(/<table\b[^>]*data-bh-mm-ranking="all"[\s\S]*?<\/table>/)?.[0].match(/scope="row"/g) ?? []).length, 50, 'v0.1.4 archive keeps 50 rows');
    const linked = (await (await fetch(`http://127.0.0.1:${port}/jev-models`)).text()).replace(/<!--[\s\S]*?-->/g, '');
    assert.match(linked, /Explore Image JevBench v0\.2 and compare/, 'the JevBench link names the default Image JevBench version');
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null) await new Promise((resolve) => server.once('exit', resolve));
  }
});
