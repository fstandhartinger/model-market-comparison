// F-07 live evidence: many-axis radar geometry, mobile containment and honest default selection.
// Usage: OUT=<dir> node ops/ux-2026-09-12/bin/verify-f07-live.mjs [canonical] [legacy]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const bases = process.argv.slice(2);
const hosts = bases.length ? bases : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const out = process.env.OUT || '/opt/benchmarkheaven/state/ux-evidence/f07-live';
await fs.mkdir(out, { recursive: true });
const result = { checked_at: new Date().toISOString(), hosts: [], rule: 'Default prefers the highest Composite among models with >=40 measured axes; if the current catalog has none, the highest-coverage pool is used and the gap is reported.' };
const browser = await chromium.launch();
for (const base of hosts) {
  const host = { base, themes: {} };
  for (const [theme, width, height] of [['light', 1440, 1000], ['dark', 1440, 1000], ['light', 390, 844], ['dark', 390, 844]]) {
    const mobile = width < 500;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: mobile, isMobile: mobile, colorScheme: theme });
    await context.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); }, theme);
    const page = await context.newPage();
    const response = await page.goto(`${base}/benchmaxxing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const check = await page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Per-model Benchmaxxing report"]');
      const radar = section?.querySelector('svg[aria-label^="Many-axis radar"]');
      const selected = section?.querySelector('select')?.selectedOptions[0]?.textContent?.trim() || '';
      const options = [...section?.querySelectorAll('select option') || []].map((option) => option.textContent || '');
      const coverage = options.map((text) => Number(text.match(/· (\d+)\/(\d+) measured/)?.[1])).filter(Number.isFinite);
      return {
        status: null,
        selected,
        selectedCoverage: selected.match(/· (\d+)\/(\d+) measured/)?.slice(1).map(Number) || null,
        maxCoverage: coverage.length ? Math.max(...coverage) : null,
        availableGe40: coverage.filter((value) => value >= 40).length,
        radar: radar ? { width: radar.getBoundingClientRect().width, height: radar.getBoundingClientRect().height, lines: radar.querySelectorAll('line').length, sectors: radar.querySelectorAll('path').length, labels: [...radar.querySelectorAll('text')].map((node) => node.textContent) } : null,
        nativeTooltips: [...radar?.querySelectorAll('circle title') || []].slice(0, 3).map((node) => node.textContent),
        bodyWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    });
    check.status = response?.status() ?? null;
    check.defaultSelection = check.selectedCoverage?.[0] === check.maxCoverage && check.availableGe40 === 0 ? 'honest-highest-coverage-fallback' : check.availableGe40 > 0 && check.selectedCoverage?.[0] >= 40 ? 'meets-40-axis-rule' : 'unexpected';
    host.themes[`${mobile ? 'mobile' : 'desktop'}_${theme}`] = check;
    await page.screenshot({ path: `${out}/${host.themes[`${mobile ? 'mobile' : 'desktop'}_${theme}`].defaultSelection}-${mobile ? 'mobile' : 'desktop'}-${theme}.png`, fullPage: true });
    await context.close();
  }
  result.hosts.push(host);
}
await browser.close();
await fs.writeFile(`${out}/verification.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
