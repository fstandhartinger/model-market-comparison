// F-44 live acceptance. Usage: node verify-f44.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:3130';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter30-f44-local';
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
    await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' });
    await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
    await page.waitForTimeout(450);
    const metrics = await page.evaluate(() => {
      const picker = document.querySelector('[aria-label="Model selection"]');
      const row = picker?.querySelector('[role="list"]');
      const radar = document.querySelector('#benchmark-radar');
      const table = document.querySelector('#full-comparison');
      const rect = (node) => node ? (() => { const r = node.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height), bottom: Math.round(r.bottom + window.scrollY) }; })() : null;
      return {
        viewport: window.innerWidth,
        pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        picker: rect(picker), pickerRow: rect(row), radar: rect(radar), table: rect(table),
        chips: picker ? picker.querySelectorAll('[role="listitem"]').length : 0,
        combobox: Boolean(picker?.querySelector('[role="combobox"]')),
        radarTip: Boolean(radar?.querySelector('button[aria-label*="benchmark radar explanation"]')),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        tableRows: table?.querySelectorAll('tbody tr').length || 0,
      };
    });
    check(`${label}/${theme}: compact picker row and benchmark table`, Boolean(metrics.picker && metrics.combobox && metrics.tableRows > 0), metrics);
    check(`${label}/${theme}: page stays within F-44 height bound`, metrics.pageHeight <= (isMobile ? 7000 : 4000), metrics.pageHeight);
    check(`${label}/${theme}: no page-level horizontal overflow`, !metrics.horizontalOverflow, metrics.viewport);
    check(`${label}/${theme}: radar explanation is an accessible info tip`, metrics.radarTip, metrics.radarTip);
    check(`${label}/${theme}: phone radar starts within 900px`, !isMobile || (metrics.radar?.top ?? Infinity) <= 900, metrics.radar?.top);
    check(`${label}/${theme}: desktop picker is one row`, isMobile || (metrics.pickerRow?.height ?? Infinity) <= 60, metrics.pickerRow);
    await page.screenshot({ path: path.join(OUT, `${label}-${theme}-compare.png`), fullPage: true });

    if (label === 'phone' && theme === 'light') {
      const input = page.getByRole('combobox', { name: 'Add a model' });
      const firstOption = await page.locator('#compare-model-options option').first().getAttribute('value');
      await input.fill(firstOption || '');
      await input.press('Enter');
      await page.waitForTimeout(700);
      const afterAdd = await page.locator('[aria-label="Model selection"] [role="listitem"]').count();
      check('phone/light: keyboard-compatible add model works', afterAdd === 3, { firstOption, afterAdd });
      await page.getByRole('button', { name: /Remove / }).last().focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(350);
      const afterRemove = await page.locator('[aria-label="Model selection"] [role="listitem"]').count();
      check('phone/light: keyboard-compatible remove model works', afterRemove === 2, { afterRemove });
    }
    await context.close();
  }
}

await browser.close();
result.pass = result.checks.every((item) => item.ok);
await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(result.pass ? 'PASS' : 'FAIL');
for (const item of result.checks) console.log(`${item.ok ? 'ok  ' : 'FAIL'} ${item.name}`);
process.exitCode = result.pass ? 0 : 1;
