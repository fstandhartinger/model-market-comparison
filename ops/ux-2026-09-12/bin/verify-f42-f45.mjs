// Focused acceptance for F-42 (phone shortlist geometry/labels) and F-45
// (benchmark ranking affordances + compact Advanced toolbar).
// Usage: BH_OUT=<dir> node verify-f42-f45.mjs <base-url>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/f42-f45';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = { base: BASE, checked_at: new Date().toISOString(), checks: [], failures: [], errors: [] };
const check = (name, ok, detail) => { report.checks.push({ name, ok, detail }); if (!ok) report.failures.push({ name, detail }); };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const theme of ['light', 'dark']) {
    const key = `${kind}-${theme}`;
    const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
    await context.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
    const page = await context.newPage();
    try {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
      const card = page.getByText(kind === 'mobile' ? 'Min. capability score' : 'Minimum Capability Score', { exact: false }).first().locator('xpath=ancestor::div[contains(@class,"card")][1]');
      const simple = await card.evaluate((el) => ({
        height: Math.round(el.getBoundingClientRect().height),
        width: Math.round(el.getBoundingClientRect().width),
        rowHeights: [...el.querySelectorAll(':scope > div > div:first-child > div')].map((row) => Math.round(row.firstElementChild?.getBoundingClientRect().height ?? 0)),
        text: el.innerText,
      }));
      if (kind === 'mobile') {
        check(`${key} F-42 card <= 900px`, simple.height <= 900, simple.height);
        check(`${key} F-42 slider captions <= 24px`, simple.rowHeights.length === 2 && simple.rowHeights.every((v) => v <= 24), simple.rowHeights);
        check(`${key} F-42 concise phone labels`, /Min\. capability score/.test(simple.text) && /Max cost \/ task/.test(simple.text), simple.text.slice(0, 260));
      } else {
        check(`${key} F-42 desktop labels remain full`, /Minimum Capability Score/.test(simple.text) && /Max adjusted cost \/ task/.test(simple.text), simple.text.slice(0, 260));
      }
      check(`${key} home no horizontal overflow`, await overflow(page), await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })));
      await page.screenshot({ path: `${OUT}/${key}-home.png`, fullPage: kind === 'mobile' });

      await page.getByRole('tab', { name: 'Advanced' }).click();
      await page.waitForTimeout(500);
      if (kind === 'desktop') {
        const controls = await page.locator('.bh-advanced-toolbar > input, .bh-advanced-toolbar > div > select, .bh-advanced-toolbar > div > span input, .bh-advanced-toolbar > div > details > summary').evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0).map((el) => ({ tag: el.tagName, text: el.textContent?.trim(), height: Math.round(el.getBoundingClientRect().height) })));
        check(`${key} F-45 visible Advanced controls are 36px`, controls.length >= 5 && controls.every((v) => v.height === 36), controls);
      }
      check(`${key} Advanced no horizontal overflow`, await overflow(page), await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })));
      await page.screenshot({ path: `${OUT}/${key}-advanced.png` });
    } catch (error) {
      report.errors.push(`${key} home: ${String(error).split('\n')[0]}`);
    }
    await context.close();

    const context2 = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
    await context2.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
    const benchmarks = await context2.newPage();
    try {
      await benchmarks.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' });
      await benchmarks.waitForTimeout(500);
      const region = benchmarks.getByRole('region', { name: 'Benchmark ranking table' });
      const headers = (await region.locator('thead th').allInnerTexts()).map((v) => v.trim());
      const firstRow = region.locator('tbody tr').first();
      const modelLinks = await firstRow.locator('th a[href^="/models/"]').count();
      const hasExplore = (await region.innerText()).includes('Explore');
      const source = firstRow.locator('summary', { hasText: 'Source & evidence' });
      await source.click();
      await benchmarks.waitForTimeout(100);
      const compare = firstRow.locator('a[href^="/compare?model="]');
      check(`${key} F-45 ranking has 3-column phone/desktop table`, headers.length === 3 && headers.join('|') === 'Rank|Model / configuration|Result', headers);
      check(`${key} F-45 model name is linked`, modelLinks >= 1, modelLinks);
      check(`${key} F-45 Explore column is absent`, !hasExplore, hasExplore);
      check(`${key} F-45 Compare is inside expanded source row`, await compare.isVisible(), await compare.getAttribute('href'));
      check(`${key} benchmark page no horizontal overflow`, await overflow(benchmarks), await benchmarks.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })));
      await benchmarks.screenshot({ path: `${OUT}/${key}-benchmarks.png`, fullPage: kind === 'mobile' });
    } catch (error) {
      report.errors.push(`${key} benchmarks: ${String(error).split('\n')[0]}`);
    }
    await context2.close();
  }
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ base: BASE, checks: report.checks.length, failures: report.failures, errors: report.errors }, null, 2));
process.exitCode = report.failures.length || report.errors.length ? 1 : 0;
