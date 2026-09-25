// Browser receipt for CR-164. Run under ~/.locks/chrome-9333.lock.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const base = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const out = process.argv[3] || '/tmp/verify-cr-164';
await fs.mkdir(out, { recursive: true });
const checks = [];
const check = (context, name, ok, detail) => checks.push({ context, name, ok: !!ok, detail });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');

try {
  for (const theme of ['light', 'dark']) for (const [size, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['phone', { width: 390, height: 844 }],
  ]) {
    const context = `${size}_${theme}`;
    const session = await browser.newContext({ viewport, colorScheme: theme, isMobile: size === 'phone', hasTouch: size === 'phone' });
    try {
      const page = await session.newPage();
      await page.goto(`${base}/jev-models`, { waitUntil: 'domcontentloaded' });
      const hub = await page.evaluate(() => {
        const notes = [...document.querySelectorAll('[data-bh-jev-capability-note]')];
        return {
          heights: [...document.querySelectorAll('[data-bh-jev14-capability-row]')].map((row) => Math.round(row.getBoundingClientRect().height)),
          noteCount: notes.length,
          visibleNotes: notes.filter((note) => note.getBoundingClientRect().width > 0).length,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      check(context, 'class notes remain available', hub.noteCount > 0 && hub.visibleNotes > 0, hub);
      check(context, 'hub has no horizontal page overflow', !hub.overflow, hub);
      if (size === 'desktop') check(context, 'capability rows have one height', hub.heights.length > 20 && Math.max(...hub.heights) - Math.min(...hub.heights) <= 2, hub.heights);
      await page.screenshot({ path: `${out}/${context}-hub.png` });

      await page.goto(`${base}/jev-models/v1.4.2`, { waitUntil: 'domcontentloaded' });
      const disclosure = page.locator('[data-bh-jev-frozen-capability]');
      const before = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        open: document.querySelector('[data-bh-jev-frozen-capability]')?.open,
        board: !!document.querySelector('[data-bh-jevbench-v14]'),
        compare: !!document.querySelector('[data-bh-jev14-compare]'),
        share: !!document.querySelector('[data-bh-jev-version-share]'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      check(context, 'frozen chart disclosure starts closed', before.open === false && before.board && before.compare && before.share, before);
      check(context, 'frozen page has no horizontal overflow', !before.overflow, before);
      if (size === 'desktop') check(context, 'frozen page under 14,000 px', before.height < 14000, before.height);
      await page.screenshot({ path: `${out}/${context}-frozen-closed.png` });
      await disclosure.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      const after = await page.evaluate(() => ({
        open: document.querySelector('[data-bh-jev-frozen-capability]')?.open,
        chart: !!document.querySelector('[data-bh-jev-frozen-capability] [data-bh-jev14-capability-chart]'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      }));
      check(context, 'keyboard opens the artifact charts', after.open === true && after.chart && !after.overflow, after);
      await page.screenshot({ path: `${out}/${context}-frozen-open.png` });
    } finally {
      await session.close();
    }
  }
} finally {
  await browser.close();
}

const pass = checks.filter(({ ok }) => ok).length;
await fs.writeFile(`${out}/verification.json`, JSON.stringify({ base, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
for (const item of checks.filter(({ ok }) => !ok)) console.error(`FAIL ${item.context} ${item.name}: ${JSON.stringify(item.detail).slice(0, 500)}`);
console.log(`${pass}/${checks.length} CR-164 checks passed (${base})`);
process.exit(pass === checks.length ? 0 : 1);
