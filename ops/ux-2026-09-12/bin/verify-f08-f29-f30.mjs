// Current live recheck for the prior model-page, dark-label and Guided-state claims.
// Usage: node verify-f08-f29-f30.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/f08-f29-f30';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = { base: BASE, checked_at: new Date().toISOString(), failures: [], viewports: {} };
const check = (name, ok, detail) => { if (!ok) report.failures.push({ name, detail }); };
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await context.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/models/claude-opus-5%3A%3Ahigh`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const model = await page.evaluate(() => ({
      hasCompositePanel: !!document.querySelector('[aria-label="Composite and its inputs"]'),
      miniRadar: !!document.querySelector('svg[aria-label^="Composite inputs as catalog percentiles"]'),
      sheet: !!document.querySelector('#benchmark-sheet'),
      bars: document.querySelectorAll('#benchmark-sheet span[style*="width"]').length,
      hasEmptyCompositeDefinition: document.body.innerText.includes('Composite definition'),
      unusualPanels: [...document.querySelectorAll('h3')].filter((e) => e.textContent?.trim() === 'Unusual results').length,
      unusualContent: [...document.querySelectorAll('h3')].find((e) => e.textContent?.trim() === 'Unusual results')?.parentElement?.parentElement?.innerText || '',
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
    }));
    report.viewports[`${kind}_${theme}_model`] = model;
    check(`${kind}_${theme} F-08b Composite panel`, model.hasCompositePanel && model.miniRadar && model.sheet, model);
    check(`${kind}_${theme} F-08b benchmark bars`, model.bars >= 10, model.bars);
    check(`${kind}_${theme} F-08a no empty Composite copy`, !model.hasEmptyCompositeDefinition, model.hasEmptyCompositeDefinition);
    check(`${kind}_${theme} F-08a unusual panel is conditional and non-empty`, model.unusualPanels === 0 || /threshold-crossing signal flagged|How flags are calculated/.test(model.unusualContent), model.unusualContent);
    check(`${kind}_${theme} model page no overflow`, model.width <= viewport.width, model);
    await page.screenshot({ path: `${OUT}/${kind}_${theme}-model.png`, fullPage: true });
  } catch (error) { report.failures.push({ name: `${kind}_${theme} model exception`, detail: String(error).split('\n')[0] }); }
  await context.close();

  const state = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await state.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
  const home = await state.newPage();
  try {
    await home.goto(BASE, { waitUntil: 'networkidle' });
    await home.waitForTimeout(500);
    const before = await home.getByLabel('Minimum Capability Score (Composite)').inputValue();
    const labels = await home.locator('.bh-point-labels text').evaluateAll((els) => els.map((e) => getComputedStyle(e).fill));
    await home.getByRole('tab', { name: 'Guided' }).click();
    await home.waitForTimeout(350);
    await home.getByRole('tab', { name: 'Simple' }).click();
    await home.waitForTimeout(350);
    const after = await home.getByLabel('Minimum Capability Score (Composite)').inputValue();
    const stateResult = { before, after, labelFills: labels, overflow: await noOverflow(home) };
    report.viewports[`${kind}_${theme}_state`] = stateResult;
    check(`${kind}_${theme} F-29 dark/light map labels`, labels.length > 0 && labels.every((fill) => fill !== 'rgba(0, 0, 0, 0)'), labels);
    check(`${kind}_${theme} F-30 Guided retains Simple floor`, before === '85' && after === '85', stateResult);
    check(`${kind}_${theme} home state no overflow`, stateResult.overflow, stateResult);
    await home.screenshot({ path: `${OUT}/${kind}_${theme}-state.png` });
  } catch (error) { report.failures.push({ name: `${kind}_${theme} state exception`, detail: String(error).split('\n')[0] }); }
  await state.close();
}
await browser.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.failures.length ? 1 : 0;
