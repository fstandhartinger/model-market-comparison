import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { jevSystemPath } from '../../lib/jev-system-slug.mjs';

const locked = process.argv.includes('--locked');
if (!locked) {
  const result = spawnSync('flock', ['/home/flori/.locks/chrome-9333.lock', process.execPath, fileURLToPath(import.meta.url), ...process.argv.slice(2), '--locked'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
const watchdog = spawnSync('/home/flori/bin/sandy-watchdog', ['--status'], { encoding: 'utf8' });
const status = JSON.parse(watchdog.stdout);
if (watchdog.status !== 0 || status.critical?.length) throw new Error(`Sandy resource guard: ${JSON.stringify(status.critical)}`);
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const [base = 'http://127.0.0.1:3191', out = '../shots'] = process.argv.slice(2).filter((a) => a !== '--locked');
await mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const receipts = [];
let exitCode = 0;
try {
  for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
    try {
      for (const [name, path] of [['jev-models', '/jev-models'], ['api', '/jev-models/api'], ['image-jev-bench', '/image-jev-bench'], ['system', jevSystemPath('quyet-1-0-large')]]) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        try {
          await page.addInitScript((theme) => localStorage.setItem('bh-theme', theme), theme);
          const response = await page.goto(`${base}${path}`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
          if (response.status() !== 200) throw new Error(`${path}: HTTP ${response.status()}`);
          await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
          const toggle = page.locator('[data-bh-jev-api-toggle-button]');
          const states = name === 'jev-models' ? ['off', 'on'] : ['off'];
          for (const state of states) {
            if (await toggle.count()) {
              const on = await toggle.getAttribute('aria-checked') === 'true';
              if (on !== (state === 'on')) await toggle.click();
            }
            const file = `${name}-${theme}-${width}${name === 'jev-models' ? `-api-${state}` : ''}.png`;
            await page.screenshot({ path: `${out}/${file}`, fullPage: true });
            receipts.push({ file, path, theme, width, errors: [...errors], legends: await page.locator('[data-bh-jev-capability-legend], [data-bh-jev-bubble-legend], [aria-label="System types"]').allTextContents() });
          }
        } finally { await page.close(); }
      }
    } finally { await context.close(); }
  }
} catch (error) {
  receipts.push({ error: error.message }); exitCode = 1;
} finally {
  await writeFile(`${out}/receipts.json`, JSON.stringify(receipts, null, 2) + '\n');
}
// CR-292: contexts are closed above; disconnect without closing the shared Chrome instance.
process.exit(exitCode);
