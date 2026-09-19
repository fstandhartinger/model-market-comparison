// CR-90 live verifier: difficulty scopes and the public-task outcome grid.
// Usage: node verify-cr-90.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/work-20260919-cr90/verify';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
try {
  for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`;
    const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: kind === 'mobile' ? 2 : 1 });
    await context.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error.message)));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    try {
      await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
      const difficulty = page.locator('[data-bh-jev12-difficulty]');
      const grid = page.locator('[data-bh-jev12-task-grid]');
      check(`${tag}: difficulty controls render`, await difficulty.count() === 1 && await difficulty.locator('[data-bh-jev12-scope-option]').count() === 3);
      check(`${tag}: default scope is All tasks without warning`, await difficulty.getAttribute('data-bh-jev12-scope') === 'all' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 0);
      await difficulty.locator('[data-bh-jev12-scope-option="easy-medium"]').click();
      check(`${tag}: Easy + Medium changes scope and warns`, await difficulty.getAttribute('data-bh-jev12-scope') === 'easy-medium' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 1);
      check(`${tag}: Easy + Medium grid summary is public-only`, /120 public task outcomes/.test(await grid.locator('summary').innerText()));
      await difficulty.locator('[data-bh-jev12-scope-option="easy"]').click();
      check(`${tag}: Easy changes scope`, await difficulty.getAttribute('data-bh-jev12-scope') === 'easy' && /48 public task outcomes/.test(await grid.locator('summary').innerText()));
      await difficulty.locator('[data-bh-jev12-scope-reset]').click();
      check(`${tag}: reset returns official All tasks`, await difficulty.getAttribute('data-bh-jev12-scope') === 'all' && await difficulty.locator('[data-bh-jev12-scope-warning]').count() === 0);
      await grid.locator('summary').click();
      const gridData = await grid.locator('table').evaluate((table) => {
        const heads = [...table.querySelectorAll('thead th')].map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
        const taskRows = table.querySelectorAll('tbody tr[data-bh-jev12-task]').length;
        const first = table.querySelector('tbody tr[data-bh-jev12-task]');
        const djevIndex = heads.findIndex((head) => head === 'djev');
        const djevCell = djevIndex >= 0 ? first?.children[djevIndex] : null;
        return { heads, taskRows, djevIndex, djevText: djevCell?.textContent?.trim(), djevTitle: djevCell?.getAttribute('title') };
      });
      check(`${tag}: grid exposes all 231 public tasks grouped by tier`, gridData.taskRows === 231, gridData.taskRows);
      check(`${tag}: djev has an explicit unavailable column`, gridData.djevIndex >= 0 && gridData.djevText === '—' && /no public outcome/.test(gridData.djevTitle || ''), gridData);
      check(`${tag}: task grid contains no hidden question/answer payload`, !/question|expected|prediction/i.test(await grid.locator('table').innerText()));
      if (kind === 'mobile') check(`${tag}: no page horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1);
      check(`${tag}: no page or console errors`, errors.length === 0, errors);
      await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
    } finally {
      await page.close();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const failed = checks.filter((item) => !item.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
console.log(`${BASE}: ${checks.length - failed.length}/${checks.length} passed`);
for (const item of failed) console.log(`FAIL ${item.name}: ${item.detail}`);
process.exit(failed.length ? 1 : 0);
