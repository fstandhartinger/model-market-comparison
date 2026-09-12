import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.env.BH_OUT || '/opt/benchmarkheaven/state/ux-evidence/iter5';
const BASE = process.argv[2] || 'http://127.0.0.1:3210';
const fs = await import('node:fs/promises');
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = { base: BASE, checked_at: new Date().toISOString() };

async function selectModels(page) {
  const modelA = page.getByLabel('Model A');
  await modelA.selectOption({ index: 1 });
  await page.waitForTimeout(500);
  const modelB = page.getByLabel('Model B');
  await modelB.selectOption({ index: 1 });
  await page.waitForTimeout(900);
}

{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' });
  await selectModels(page);
  const snapshot = page.getByRole('region', { name: 'Benchmark category snapshots' });
  report.desktop = {
    snapshot_present: await snapshot.count() === 1,
    snapshot_cards: await snapshot.locator('article').count(),
    measured_label: await snapshot.getByText('Measured results only').count(),
    full_table_present: await page.getByRole('region', { name: 'Full comparison table' }).count() === 1,
    best_cells: await page.locator('td.bg-accent2\\/10').count(),
  };
  await snapshot.screenshot({ path: `${OUT}/desktop-category-snapshot.png` });
  await page.screenshot({ path: `${OUT}/desktop-compare-report.png`, fullPage: false });
  await page.goto(`${BASE}/charts`, { waitUntil: 'networkidle' });
  report.desktop.charts_report_link = await page.getByRole('link', { name: 'benchmark report' }).count() === 1;
  await page.screenshot({ path: `${OUT}/desktop-charts-link.png`, fullPage: false });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' });
  await selectModels(page);
  const snapshot = page.getByRole('region', { name: 'Benchmark category snapshots' });
  report.mobile = {
    snapshot_present: await snapshot.count() === 1,
    snapshot_cards: await snapshot.locator('article').count(),
    table_scroll_region: await page.getByRole('region', { name: 'Full comparison table' }).count() === 1,
    page_horizontal_overflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
  };
  await snapshot.screenshot({ path: `${OUT}/mobile-category-snapshot.png` });
  await page.screenshot({ path: `${OUT}/mobile-compare-report.png`, fullPage: false });
  await context.close();
}

await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
