// F-35 acceptance: compact release-post comparison table with one evidence expand per row.
// Usage: node verify-f35.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/f35';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, checked_at: new Date().toISOString(), errors: [], fails: [] };
const expect = (name, ok, detail) => { if (!ok) result.fails.push(`${name}: ${JSON.stringify(detail)}`); };

for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile' });
  const page = await context.newPage();
  const key = kind;
  page.on('pageerror', (error) => result.errors.push(`${key} pageerror: ${String(error).slice(0, 200)}`));
  try {
    await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(700);
    const before = await page.evaluate(() => {
      const table = document.querySelector('#full-comparison table');
      const rows = [...(table?.querySelectorAll('tbody tr') || [])];
      const expanders = [...(table?.querySelectorAll('button[aria-controls^="comparison-evidence-"]') || [])];
      return {
        height: document.querySelector('#full-comparison')?.getBoundingClientRect().height ?? 0,
        pageHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        tableWidth: table?.getBoundingClientRect().width ?? 0,
        summaryRows: expanders.length,
        allValuesHaveBars: expanders.every((button) => {
          const row = button.closest('tr');
          return [...(row?.querySelectorAll('td') || [])].every((cell) => cell.textContent?.includes('—') || cell.querySelector('[aria-hidden="true"]'));
        }),
        hasObservedOutsideExpand: /observed 2026-/.test(document.body.innerText),
        expanded: document.querySelectorAll('#full-comparison tr[id^="comparison-evidence-"]').length,
        rowCount: rows.length,
      };
    });
    result[key] = { before };
    expect(`${key} compact comparison section height`, kind === 'desktop' ? before.height <= 3500 : before.height <= 6000, before.height);
    expect(`${key} no page overflow`, before.scrollWidth === viewport.width, before.scrollWidth);
    expect(`${key} comparison has rows`, before.summaryRows > 0, before.summaryRows);
    expect(`${key} every model cell has value or bar`, before.allValuesHaveBars, before);
    expect(`${key} provenance hidden before expand`, !before.hasObservedOutsideExpand && before.expanded === 0, before);

    const first = page.locator('#full-comparison button[aria-controls^="comparison-evidence-"]').first();
    await first.click();
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => {
      const table = document.querySelector('#full-comparison table');
      const expanded = document.querySelector('tr[id^="comparison-evidence-"]');
      const summary = expanded?.previousElementSibling;
      const values = [...(summary?.querySelectorAll('td') || [])];
      return {
        expanded: document.querySelectorAll('#full-comparison tr[id^="comparison-evidence-"]').length,
        observedInOpenEvidence: /observed 2026-/.test(expanded?.textContent || ''),
        bestBold: values.some((cell) => cell.className.includes('bg-accent2') && cell.querySelector('.font-bold')),
        evidenceSource: !!expanded?.querySelector('a[href*="benchmark-scores"], a[href^="https://"]'),
        tableHeight: table?.getBoundingClientRect().height ?? 0,
      };
    });
    result[key].after = after;
    expect(`${key} one row expands`, after.expanded === 1, after.expanded);
    expect(`${key} open expand contains provenance`, after.observedInOpenEvidence, after);
    expect(`${key} best measured cell is bold and tinted`, after.bestBold, after);
    await page.screenshot({ path: `${OUT}/${key}-compare-f35.png`, fullPage: true });
  } catch (error) {
    result.errors.push(`${key}: ${String(error).split('\n')[0].slice(0, 240)}`);
  } finally {
    await context.close();
  }
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ fails: result.fails, errors: result.errors }, null, 2));
