// CR-87 live verification: current JevBench v1.2 weighting controls.
// Usage: node verify-cr-87.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-87';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const api = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const ranked = api.systems.filter((row) => row.ranked).sort((a, b) => a.rank - b.rank);
const presetKeys = {
  score: 'JevBench Score (25:25:25:25)',
  balanced: 'Balanced 33:33:33 (no calibration)',
  accuracy: 'Emphasis on Accuracy 60:20:20',
  speed: 'Emphasis on Speed 20:60:20',
  cost: 'Emphasis on Cost 20:20:60',
};
const expectedOrder = (key) => [...ranked].sort((a, b) => a.rank_under[key] - b.rank_under[key]).map((row) => row.key);
const customOrder = (weights) => [...ranked].sort((a, b) => {
  const score = (row) => ['intelligence', 'calibration', 'speed', 'cost'].reduce((product, axis, i) => product * Math.pow(row.axes[axis], weights[i]), 1);
  return score(b) - score(a) || a.rank - b.rank;
}).map((row) => row.key);

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`;
    const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: kind === 'mobile' ? 2 : 1 });
    await context.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.message)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
      const bars = () => page.$$eval('[data-bh-jevc-bars] [data-bh-jev12-bar]', (nodes) => nodes.map((node) => node.getAttribute('data-bh-jev12-bar')));
      const title = () => page.locator('[data-bh-jevc-title]').innerText();
      const header = () => page.locator('[data-bh-jev12-sort="main"]').innerText();
      check(`${tag}: default title is the official JevBench Score`, /JevBench Score/.test(await title()) && !/not the official/.test(await title()), await title());
      check(`${tag}: default chart order is official ranking`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectedOrder(presetKeys.score)), await bars());
      check(`${tag}: chart comes before the current table`, await page.evaluate(() => { const chart = document.querySelector('[data-bh-jevc-chart]'); const table = document.querySelector('[data-bh-jev12-table]'); return !!chart && !!table && !!(chart.compareDocumentPosition(table) & 4); }));
      check(`${tag}: official badge and chart state`, await page.locator('[data-bh-jevc-badge="official"]').count() === 1 && await page.locator('[data-bh-jevc-badge="not-default"]').count() === 0 && await page.locator('[data-bh-jev12-main-chart]').getAttribute('data-bh-jevc-chart') === 'official');
      const colours = await page.$$eval('[data-bh-jevc-bars] .bh-jevc-bar', (nodes) => new Set(nodes.map((node) => getComputedStyle(node).backgroundColor)).size);
      check(`${tag}: bars are coloured by system type`, colours >= 4, colours);
      const links = await page.$$eval('[data-bh-jevc-bars] a[data-bh-jev-link]', (nodes) => nodes.map((node) => node.href));
      check(`${tag}: every chart system links out`, links.length === api.systems.length, links);
      for (const [id, key] of Object.entries(presetKeys)) {
        await page.locator(`[data-bh-jevc-preset="${id}"]`).click();
        const nonDefault = id !== 'score';
        check(`${tag}: preset ${id} re-ranks`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectedOrder(key)), await bars());
        check(`${tag}: preset ${id} state`, (await page.locator('[data-bh-jevc-badge="not-default"]').count() === (nonDefault ? 1 : 0)) && (await page.locator('[data-bh-jevc-reset]').count() === (nonDefault ? 1 : 0)) && (await page.locator('[data-bh-jev12-main-chart]').getAttribute('data-bh-jevc-chart') === (nonDefault ? 'custom' : 'official')) && (await header()).includes(nonDefault ? 'not the official score' : 'official'), await header());
      }
      await page.locator('[data-bh-jevc-preset="cost"]').click();
      check(`${tag}: URL carries the selected weighting`, new URL(page.url()).searchParams.get('w') === '20-0-20-60', page.url());
      await page.locator('[data-bh-jevc-reset]').click();
      check(`${tag}: reset returns official view and clean URL`, await page.locator('[data-bh-jev12-main-chart]').getAttribute('data-bh-jevc-chart') === 'official' && !new URL(page.url()).searchParams.has('w') && !new URL(page.url()).searchParams.has('scope'), page.url());
      await page.goto(`${BASE}/jev-models?w=50-10-20-20`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.locator('[data-bh-jevc-badge="not-default"]').waitFor({ state: 'visible', timeout: 10000 });
      check(`${tag}: custom URL restores and is labelled non-official`, (await title()).includes('Custom weights (50:10:20:20)') && (await page.locator('[data-bh-jev12-main-chart]').getAttribute('data-bh-jevc-chart')) === 'custom' && JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(customOrder([0.5, 0.1, 0.2, 0.2])), await title());
      check(`${tag}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1);
      await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.screenshot({ path: `${OUT}/${tag}-default.png`, fullPage: false });
      check(`${tag}: no page or console errors`, errors.length === 0, errors);
    } finally {
      await page.close();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const failed = checks.filter((item) => !item.ok);
await fs.writeFile(`${OUT}/verify-cr-87.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
console.log(`${BASE}: ${checks.length - failed.length}/${checks.length} passed`);
for (const item of failed) console.log(`FAIL ${item.name}: ${item.detail}`);
process.exit(failed.length ? 1 : 0);
