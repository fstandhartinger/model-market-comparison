// R1.8 live input-device check. Uses Playwright's Pixel profile so a 390 px viewport
// also has the coarse touch media that a phone actually reports.
// Usage: node verify-live-infotip-device.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require = createRequire('/home/flori/n8n-local/');
const { chromium, devices } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-live-infotip-device';
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const result = { base: BASE, checked_at: new Date().toISOString(), contexts: {}, failures: [] };
const check = (ctx, name, ok, detail = '') => { if (!ok) result.failures.push({ ctx, name, detail: String(detail) }); };
const text = async (locator) => (await locator.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

try {
  for (const kind of ['desktop', 'mobile']) for (const theme of ['light', 'dark']) {
    const mobile = kind === 'mobile';
    const ctx = `${kind}_${theme}`;
    const options = mobile
      ? { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, colorScheme: theme, deviceScaleFactor: 1 }
      : { viewport: { width: 1440, height: 1000 }, colorScheme: theme, deviceScaleFactor: 1 };
    const context = await browser.newContext(options);
    await context.addInitScript((value) => {
      localStorage.setItem('theme', value);
      localStorage.setItem('bh-theme', value);
    }, theme);
    try {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(String(error)));
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await page.getByRole('tab', { name: 'Advanced' }).click();
      await page.waitForTimeout(500);

      const data = result.contexts[ctx] = {};
      data.theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      data.input = await page.evaluate(() => ({
        hover: matchMedia('(hover: hover)').matches,
        pointerFine: matchMedia('(pointer: fine)').matches,
        pointerCoarse: matchMedia('(pointer: coarse)').matches,
        maxTouchPoints: navigator.maxTouchPoints,
      }));
      data.scoreSort = await page.locator('th', { hasText: 'Score' }).first().getAttribute('aria-sort');
      const scoreHeaderIndex = await page.locator('table.dtable thead th').evaluateAll((headers) => headers.findIndex((header) => /\bscore\b/i.test(header.innerText) && !/signal/i.test(header.innerText)));
      data.firstScores = (await page.locator(`table.dtable tbody tr td:nth-child(${scoreHeaderIndex + 1})`).allInnerTexts())
        .map((value) => Number.parseFloat(value)).filter(Number.isFinite).slice(0, 10);
      data.noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
      check(ctx, 'theme is applied', data.theme === theme, data.theme);
      check(ctx, 'active score sorts descending', data.scoreSort === 'descending' && data.firstScores.every((value, index) => !index || data.firstScores[index - 1] >= value), JSON.stringify({ sort: data.scoreSort, values: data.firstScores }));
      check(ctx, 'no horizontal page overflow', data.noOverflow);
      if (mobile) check(ctx, 'phone reports coarse touch input', !data.input.hover && !data.input.pointerFine && data.input.pointerCoarse && data.input.maxTouchPoints > 0, JSON.stringify(data.input));
      await page.screenshot({ path: `${OUT}/${ctx}-advanced.png` });

      const costTrigger = page.getByRole('button', { name: 'About the Adjusted Cost column' }).first();
      if (mobile) await costTrigger.tap(); else await costTrigger.hover();
      await page.waitForTimeout(450);
      const costPanel = page.locator('[data-bh-infotip-panel]').first();
      data.costInfo = {
        tag: await costPanel.evaluate((element) => element.tagName).catch(() => null),
        role: await costPanel.getAttribute('role').catch(() => null),
        openDialogs: await page.locator('dialog[open]').count(),
        text: (await text(costPanel)).slice(0, 350),
      };
      await page.screenshot({ path: `${OUT}/${ctx}-cost-info.png` });
      check(ctx, 'cost info uses the expected device mechanism', mobile ? data.costInfo.tag === 'DIALOG' && data.costInfo.openDialogs === 1 : data.costInfo.tag === 'SPAN' && data.costInfo.role === 'dialog', JSON.stringify(data.costInfo));
      check(ctx, 'cost info explains adjusted cost', /What one typical task costs you/.test(data.costInfo.text), data.costInfo.text);
      if (mobile) await page.getByRole('button', { name: 'Close' }).tap();
      else { await costTrigger.click(); await page.keyboard.press('Escape'); }
      await page.waitForTimeout(300);
      data.costInfoCloses = await page.locator('[data-bh-infotip-panel]').count() === 0 && await costTrigger.getAttribute('aria-expanded') === 'false';
      check(ctx, 'cost info closes and resets its trigger', data.costInfoCloses);

      const scoreTrigger = page.getByRole('button', { name: /About the Capability Score column/ }).first();
      if (mobile) await scoreTrigger.tap(); else await scoreTrigger.hover();
      await page.waitForTimeout(450);
      const scorePanel = page.locator('[data-bh-infotip-panel]').first();
      data.scoreInfo = {
        tag: await scorePanel.evaluate((element) => element.tagName).catch(() => null),
        role: await scorePanel.getAttribute('role').catch(() => null),
        openDialogs: await page.locator('dialog[open]').count(),
        text: (await text(scorePanel)).slice(0, 500),
      };
      await page.screenshot({ path: `${OUT}/${ctx}-score-info.png` });
      check(ctx, 'score info is visible with the expected mechanism', mobile ? data.scoreInfo.tag === 'DIALOG' && data.scoreInfo.openDialogs === 1 : data.scoreInfo.tag === 'SPAN' && data.scoreInfo.role === 'dialog', JSON.stringify(data.scoreInfo));
      check(ctx, 'score info names the composite and ECI', /Main Composite Score/.test(data.scoreInfo.text) && /ECI/.test(data.scoreInfo.text), data.scoreInfo.text);
      if (mobile) await page.getByRole('button', { name: 'Close' }).tap();
      else {
        await page.mouse.move(1200, 950);
        await page.waitForTimeout(400);
        data.scoreInfoHoverDismisses = await page.locator('[data-bh-infotip-panel]').count() === 0;
        check(ctx, 'score info dismisses after pointer leaves', data.scoreInfoHoverDismisses);
        await scoreTrigger.hover();
        await page.waitForTimeout(300);
        await scoreTrigger.click();
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
      data.scoreInfoCloses = await page.locator('[data-bh-infotip-panel]').count() === 0;
      check(ctx, 'score info closes', data.scoreInfoCloses);
      data.pageErrors = pageErrors;
      check(ctx, 'no page errors', pageErrors.length === 0, pageErrors.join('\n'));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(result, null, 2));
console.log(`${Object.keys(result.contexts).length} contexts; ${result.failures.length} failures`);
for (const failure of result.failures) console.log(`FAIL ${failure.ctx}: ${failure.name} — ${failure.detail}`);
process.exit(result.failures.length ? 1 : 0);
