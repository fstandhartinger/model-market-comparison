// Recheck the global filter contract after opening the actual More settings panel.
// Usage: BH_OUT=<dir> node verify-filter-acceptance.mjs <base-url>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/filter-acceptance';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = { base: BASE, checked_at: new Date().toISOString(), checks: [], failures: [], errors: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok, detail }); if (!ok) report.failures.push({ name, detail }); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const key = `${kind}-${theme}`;
    const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
    await context.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
    const page = await context.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: 'Advanced' }).click();
      await page.waitForTimeout(400);
      const opener = page.locator('header button[aria-controls="global-filters"]').first();
      await opener.click();
      await page.waitForTimeout(300);
      const panel = page.locator('#global-filters');
      const more = panel.locator('details > summary', { hasText: 'More settings' });
      await more.click();
      await page.waitForTimeout(150);
      const body = await panel.innerText();
      check(`${key} filter panel opens`, await panel.isVisible(), await panel.getAttribute('aria-label'));
      check(`${key} R4.1 regional settings`, /Regional settings/i.test(body) && /EU-hosted only/i.test(body), body.slice(0, 1200));
      check(`${key} R4.2 confidentiality controls`, /Strong confidential guarantees/.test(body) && /Trains or keeps your data/.test(body), body.slice(0, 1800));
      check(`${key} R4.3 More settings expanded`, /One variant for Reasoning models/.test(body) && /Hide deprecated/.test(body), body.slice(-600));
      check(`${key} R4.4 fixed blend 20:1`, await panel.locator('select[aria-label="Fixed I/O blend"]').inputValue() === '20', await panel.locator('select[aria-label="Fixed I/O blend"]').inputValue());
      check(`${key} R4.5 exclusion buttons default off`, await panel.getByRole('button', { name: 'Exclude Chinese providers' }).getAttribute('aria-pressed') === 'false' && await panel.getByRole('button', { name: /Trains or keeps your data/ }).getAttribute('aria-pressed') === 'false', {
        chinese: await panel.getByRole('button', { name: 'Exclude Chinese providers' }).getAttribute('aria-pressed'),
        training: await panel.getByRole('button', { name: /Trains or keeps your data/ }).getAttribute('aria-pressed'),
      });
      check(`${key} filters no horizontal overflow`, await noOverflow(page), await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })));
      await page.screenshot({ path: `${OUT}/${key}.png`, fullPage: kind === 'mobile' });
    } catch (error) {
      report.errors.push(`${key}: ${String(error).split('\n')[0]}`);
    }
    await context.close();
  }
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ base: BASE, checks: report.checks.length, failures: report.failures, errors: report.errors }, null, 2));
process.exitCode = report.failures.length || report.errors.length ? 1 : 0;
