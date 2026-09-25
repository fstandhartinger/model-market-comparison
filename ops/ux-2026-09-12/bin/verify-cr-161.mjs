// Verify the frozen v1.4.2 page in the shared Chrome, under chrome-9333.lock.
// Usage: node verify-cr-161.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const base = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const out = process.argv[3] || '/tmp/verify-cr-161';
await fs.mkdir(out, { recursive: true });
const checks = [];
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');

try {
  for (const theme of ['light', 'dark']) for (const width of [1440, 390]) {
    const label = `${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: theme, isMobile: width === 390, hasTouch: width === 390 });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/jev-models/v1.4.2`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await page.locator('[data-bh-jev-pinned-capability-disclosure]').waitFor();
      const before = await page.evaluate(() => {
        const details = document.querySelector('[data-bh-jev-pinned-capability-disclosure]');
        const board = document.querySelector('[data-bh-jevbench-v14]');
        const main = document.querySelector('main');
        return {
          height: document.documentElement.scrollHeight,
          viewport: document.documentElement.clientWidth,
          width: document.documentElement.scrollWidth,
          collapsed: !details.open,
          summary: details.querySelector('summary')?.textContent.trim(),
          chartInDisclosure: !!details.querySelector('[data-bh-jev14-capability-chart]'),
          boardBeforeDisclosure: !!(board.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING),
          boardBars: main.querySelectorAll('[data-bh-jev14-bar]').length,
          hasContextLength: [...main.querySelectorAll('h2')].some((node) => /^Context length/.test(node.textContent.trim())),
        };
      });
      checks.push({ label, before, ok: before.collapsed && before.chartInDisclosure && before.boardBeforeDisclosure && before.boardBars >= 5 && !before.hasContextLength && before.width <= before.viewport && (width !== 1440 || before.height < 14000) });
      await page.screenshot({ path: `${out}/${label}-collapsed.png`, fullPage: false });
      const summary = page.locator('[data-bh-jev-pinned-capability-disclosure] > summary');
      await summary.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/${label}-disclosure-collapsed.png`, fullPage: false });
      if (width === 390) await summary.tap();
      else await summary.click();
      const after = await page.evaluate(() => {
        const details = document.querySelector('[data-bh-jev-pinned-capability-disclosure]');
        return {
          expanded: details.open,
          chartVisible: !!details.querySelector('[data-bh-jev14-capability-chart]') && getComputedStyle(details.querySelector('[data-bh-jev14-capability-chart]')).display !== 'none',
          costAxis: !!details.querySelector('[data-bh-jev14-cost-axis]'),
          bubbleCount: details.querySelectorAll('[data-bh-jev14-scatter]').length,
          width: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
        };
      });
      checks.at(-1).after = after;
      checks.at(-1).ok &&= after.expanded && after.chartVisible && after.costAxis && after.bubbleCount === 2 && after.width <= after.viewport;
      await page.screenshot({ path: `${out}/${label}-expanded.png`, fullPage: false });
      await summary.focus();
      await page.keyboard.press('Enter');
      const closedWithEnter = !(await page.locator('[data-bh-jev-pinned-capability-disclosure]').evaluate((element) => element.open));
      await page.keyboard.press('Space');
      const openedWithSpace = await page.locator('[data-bh-jev-pinned-capability-disclosure]').evaluate((element) => element.open);
      checks.at(-1).keyboardAccessible = closedWithEnter && openedWithSpace;
      checks.at(-1).ok &&= checks.at(-1).keyboardAccessible;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const result = { base, at: new Date().toISOString(), passed: checks.filter((item) => item.ok).length, total: checks.length, checks };
await fs.writeFile(`${out}/verification.json`, JSON.stringify(result, null, 2));
for (const item of checks) console.log(`${item.label}: ${item.ok ? 'PASS' : 'FAIL'}, height ${item.before.height}px, collapsed ${item.before.collapsed}, expanded ${item.after?.expanded}`);
if (result.passed !== result.total) process.exitCode = 1;
