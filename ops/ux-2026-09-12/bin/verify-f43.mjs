// F-43 live acceptance. Usage: node verify-f43.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3130';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter30-f43-local';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, at: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => result.checks.push({ name, ok, detail });

for (const [label, viewport, isMobile] of [
  ['desktop', { width: 1440, height: 1000 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport, isMobile, colorScheme: theme });
    const page = await context.newPage();
    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'networkidle' });
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    await page.waitForTimeout(650);
    const metrics = await page.evaluate(() => {
      const report = document.querySelector('[aria-label="Per-model Benchmaxxing report"]');
      const svg = report?.querySelector('svg[role="img"]');
      const axisCount = svg?.querySelectorAll(':scope > g > title').length || 0;
      const shown = report?.textContent?.match(/(\d+) measured axes shown/)?.[0] || '';
      const toggle = [...(report?.querySelectorAll('label') || [])].find((el) => el.textContent?.includes('Show all'))?.querySelector('input');
      const sectors = report?.querySelectorAll('.pointer-events-none span').length || 0;
      return { axisCount, shown, toggleChecked: toggle?.checked ?? null, toggleLabel: toggle?.parentElement?.textContent, sectors, scrollWidth: document.documentElement.scrollWidth, viewport: window.innerWidth };
    });
    const measured = Number(metrics.shown.match(/^(\d+)/)?.[1] || 0);
    const total = Number(metrics.toggleLabel?.match(/all (\d+) axes/)?.[1] || 0);
    check(`${label}/${theme}: default radar uses measured axes only`, metrics.axisCount === measured && measured > 0 && metrics.toggleChecked === false, metrics);
    check(`${label}/${theme}: at least five measured topic sectors are labelled`, metrics.sectors >= 5, metrics.sectors);
    check(`${label}/${theme}: no page-level horizontal overflow`, metrics.scrollWidth <= metrics.viewport, metrics);
    await page.screenshot({ path: path.join(OUT, `${label}-${theme}-benchmaxxing.png`), fullPage: true });
    const toggle = page.getByRole('checkbox', { name: new RegExp(`Show all ${total} axes`) });
    await toggle.check();
    await page.waitForTimeout(200);
    const allAxes = await page.locator('svg[role="img"] > g > title').count();
    check(`${label}/${theme}: opt-in all-axis view shows ${total} axes`, allAxes === total && total > measured, { allAxes, total, measured });
    await context.close();
  }
}

await browser.close();
result.pass = result.checks.every((item) => item.ok);
await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(result.pass ? 'PASS' : 'FAIL');
for (const item of result.checks) console.log(`${item.ok ? 'ok  ' : 'FAIL'} ${item.name}`);
process.exitCode = result.pass ? 0 : 1;
