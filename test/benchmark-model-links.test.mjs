import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';

// CR-252 (1 Oct 2026): every model name in the ImageJevBench overall ranking linked to /jev-models/<imagejev key>,
// a JevBench system page that does not exist for image-only systems, so 49 of 51 names opened a 404.
// CR-254 adds real Image detail pages; retain the 404/anchor crawl and require all 50 detail links.
// This crawls every internal link on the three benchmark pages of the production build: each path must answer
// 200 (after redirects), and each in-page anchor must name an element on that page. Runs after the production build.
const PAGES = ['/image-jev-bench', '/jev-models', '/audio-jev-bench'];
// Ids that only exist after hydration: JevCapabilityLazy renders JevCapabilityChart with ssr: false.
const CLIENT_ONLY_IDS = new Set(['jev14-capability-views']);

test('every internal link on the benchmark pages opens a page or an element that exists', { timeout: 180000 }, async () => {
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
  const base = `http://127.0.0.1:${port}`;
  try {
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(`Production server exited: ${log}`);
      try { if ((await fetch(`${base}/jev-models`)).ok) break; } catch { /* Wait for Next's listener. */ }
      await pause(200);
    }
    const broken = [];
    const checked = new Map();
    let modelLinks = 0;
    let imageSystemDetails = 0;
    for (const page of PAGES) {
      const response = await fetch(`${base}${page}`);
      assert.equal(response.status, 200, `${page} must render`);
      const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, '');
      const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      const anchors = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
      for (const href of new Set(anchors)) {
        if (/^\/(?:jev-models|image-jev-bench)\/[^/?#]+$/.test(href) || href.startsWith('#imagejev-system-')) modelLinks += 1;
        if (href.startsWith('#')) {
          if (href.length > 1 && !ids.has(decodeURIComponent(href.slice(1))) && !CLIENT_ONLY_IDS.has(href.slice(1))) broken.push(`${page} → ${href} (no such element)`);
          continue;
        }
        if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/_next/')) continue;
        const path = href.split('#')[0];
        if (!checked.has(path)) checked.set(path, (await fetch(`${base}${path}`, { redirect: 'follow' })).status);
        if (checked.get(path) !== 200) broken.push(`${page} → ${href} (${checked.get(path)})`);
      }
      if (page === '/image-jev-bench') imageSystemDetails = new Set(anchors.filter((href) => /^\/image-jev-bench\/[^/?#]+$/.test(href))).size;
    }
    assert.deepEqual(broken, [], `broken links:\n${broken.join('\n')}`);
    assert.ok(modelLinks >= 50, `the crawl must see the model links (found ${modelLinks})`);
    assert.equal(imageSystemDetails, 50, `CR-254: every ImageJev system has a working detail page (found ${imageSystemDetails})`);
  } finally {
    server.kill('SIGTERM');
  }
});
