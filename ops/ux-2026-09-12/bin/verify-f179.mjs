// F-179: verify that the historical v1.3 disclosure is absent until opened, then renders the
// same board, radars, task grid and held-out diagnostic at desktop and phone widths.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const host = process.argv[2] ?? 'http://localhost:3100';
const out = process.argv[3] ?? '/opt/benchmarkheaven/state/ux-evidence/f179-local';
const contexts = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
  { name: 'phone390', width: 390, height: 844, isMobile: true },
];
const checks = [];
const check = (scope, name, ok, detail) => checks.push({ scope, name, ok: Boolean(ok), detail });
await mkdir(out, { recursive: true });

const initial = await fetch(`${host}/jev-models?f179=${Date.now()}`);
const initialBytes = Buffer.from(await initial.arrayBuffer());
check('transfer', 'page-200', initial.ok, initial.status);
check('transfer', 'initial-html-under-1.5MB', initialBytes.byteLength < 1_500_000, initialBytes.byteLength);

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const theme of ['light', 'dark']) for (const contextSpec of contexts) {
  const scope = `${contextSpec.name}-${theme}`;
  const context = await browser.newContext({ viewport: { width: contextSpec.width, height: contextSpec.height }, isMobile: contextSpec.isMobile, hasTouch: contextSpec.isMobile, colorScheme: theme, deviceScaleFactor: 1 });
  await context.addInitScript((value) => { localStorage.setItem('theme', value); localStorage.setItem('bh-theme', value); }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  await page.goto(`${host}/jev-models?f179=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
  await page.waitForSelector('[data-bh-jev14-capability-suite]', { state: 'attached', timeout: 30000 });
  await page.waitForSelector('[data-bh-jev-context-section]', { state: 'attached', timeout: 30000 });
  const initialState = await page.evaluate(() => {
    const history = document.querySelector('[data-bh-jev13-history]');
    return { present: Boolean(history), open: history?.hasAttribute('open') ?? false, summary: history?.querySelector('summary')?.textContent?.trim(), heldout: Boolean(document.querySelector('[data-bh-jev-heldout]')), taskTable: Boolean(document.querySelector('[data-bh-jev12-task-table]')) };
  });
  check(scope, 'closed-summary-only', initialState.present && !initialState.open && !initialState.heldout && !initialState.taskTable, initialState);
  const nav = await page.evaluate(() => performance.getEntriesByType('navigation')[0]?.transferSize ?? 0);
  check(scope, 'browser-transfer-under-400KB', nav === 0 || nav < 400_000, nav);
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/jevbench/v1.3/history'), { timeout: 30000 });
  await page.locator('[data-bh-jev13-history] summary').click();
  const response = await responsePromise;
  await page.waitForSelector('[data-bh-jev-score-change]', { timeout: 30000 });
  await page.waitForSelector('[data-bh-jev12-task-table]', { state: 'attached', timeout: 30000 });
  const opened = await page.evaluate(() => ({
    open: document.querySelector('[data-bh-jev13-history]')?.hasAttribute('open') ?? false,
    scoreChange: Boolean(document.querySelector('[data-bh-jev-score-change]')),
    taskTable: Boolean(document.querySelector('[data-bh-jev12-task-table]')),
    topics: Boolean(document.querySelector('[data-bh-jev12-radar="topics"]')),
    heldout: Boolean(document.querySelector('[data-bh-jev-heldout]')),
    heldoutRows: document.querySelectorAll('[data-bh-jev-heldout-table] tbody tr').length,
  }));
  check(scope, 'history-api-200', response.ok(), response.status());
  check(scope, 'opened-history-renders', opened.open && opened.scoreChange && opened.taskTable && opened.topics && opened.heldout && opened.heldoutRows > 0, opened);
  check(scope, 'no-browser-errors', errors.length === 0, errors);
  await page.screenshot({ path: `${out}/${scope}.png`, fullPage: false });
  await context.close();
}
await browser.close();
const result = { host, initialBytes: initialBytes.byteLength, checks, ok: checks.every((entry) => entry.ok) };
await writeFile(`${out}/verification.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
