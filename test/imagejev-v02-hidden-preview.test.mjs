import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../data/previews/imagejev-v02.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const aggregate = JSON.parse(script.match(/const DATA=([\s\S]*?);\nconst \$/)[1]);

test('hidden image preview has complete ordered sections and noindex', () => {
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  const ids = ['capability', 'tradeoffs', 'composite', 'compare', 'table', 'pilot', 'method', 'whatif', 'history'];
  let previous = -1;
  for (const id of ids) {
    const index = html.indexOf(`id="${id}"`);
    assert.ok(index > previous, `${id} must exist in the required order`);
    previous = index;
  }
  new vm.Script(script);
});

test('preview keeps historical scores separate and does not contain sealed item fields', () => {
  assert.deepEqual(aggregate.views.map(v => v.key), ['core', 'computer-use', 'browser-use', 'archive-v014']);
  const archive = aggregate.views.at(-1);
  assert.equal(archive.rows.length, 50);
  assert.match(archive.note, /not v0\.2 results/);
  const forbidden = new Set(['question', 'options', 'answer', 'answer_index', 'gold', 'gold_index', 'predictions', 'token', 'image_path', 'private_path', 'api_key']);
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbidden.has(key), `sealed or credential field ${key}`);
      inspect(child);
    }
  }
  inspect(aggregate);
  assert.doesNotMatch(html, /\/home\/flori\/|data:image\/|Bearer [A-Za-z0-9]|sk-[A-Za-z0-9]{20}/);
});

test('all displayed axes and row memberships are valid aggregates', () => {
  for (const view of aggregate.views) {
    assert.equal(new Set(view.rows.map(r => r.key)).size, view.rows.length);
    for (const row of view.rows) {
      for (const axis of ['intelligence', 'calibration', 'speed', 'cost']) {
        const value = row.axes[axis];
        assert.ok(value === null || Number.isFinite(value) && value >= 0 && value <= 100);
      }
      assert.ok(row.composite === null || Number.isFinite(row.composite) && row.composite >= 0 && row.composite <= 100);
    }
  }
});

test('preview is unlinked from sitemap and route sends crawler headers', async () => {
  const sitemap = await readFile(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(sitemap, /wip-imagejev-v02-9e2d4a/);
  const route = await readFile(new URL('../app/wip-imagejev-v02-9e2d4a/route.ts', import.meta.url), 'utf8');
  assert.match(route, /'X-Robots-Tag': 'noindex, nofollow, noarchive'/);
  assert.match(route, /'Cache-Control': 'no-store'/);
});
