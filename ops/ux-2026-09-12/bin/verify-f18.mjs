// F-18 acceptance (Filters as an overlay sheet, not a page push) plus the F-17 value-map checks.
// Usage: node verify-f18.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'http://127.0.0.1:3241';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter15/f18-local';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const out = { base: BASE, checked_at: new Date().toISOString(), results: {}, errors: [] };

const heroTop = () => Math.round(document.querySelector('.bh-hero')?.getBoundingClientRect().top ?? -1);
const sheet = () => {
  const p = document.getElementById('global-filters');
  if (!p) return null;
  const r = p.getBoundingClientRect();
  const btn = [...p.querySelectorAll('button')].find((b) => /^Show /.test(b.innerText.trim()));
  const br = btn?.getBoundingClientRect();
  return {
    visible: r.height > 0, top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height),
    footerButton: btn ? btn.innerText.trim() : null,
    footerVisible: !!br && br.bottom <= window.innerHeight && br.top >= 0,
    focusInside: p.contains(document.activeElement),
    minScorePlaceholder: p.querySelector('input[aria-label="Min score"]')?.getAttribute('placeholder') ?? null,
  };
};
const mapChecks = () => {
  const map = document.querySelector('.bh-value-map');
  const plot = map?.querySelector('.recharts-wrapper');
  const labels = [...(map?.querySelectorAll('.bh-point-labels text') ?? [])].map((t) => t.getBoundingClientRect());
  let overlaps = 0;
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
  }
  const svg = plot?.querySelector('svg')?.getBoundingClientRect();
  const clipped = svg ? labels.filter((l) => l.right > svg.right + 0.5 || l.left < svg.left - 0.5).length : null;
  const yTicks = [...(map?.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value') ?? [])].map((t) => Number(t.textContent.trim()));
  return {
    chartHeight: plot ? Math.round(plot.getBoundingClientRect().height) : null,
    labelCount: labels.length, labelOverlaps: overlaps, labelsClipped: clipped,
    yTicks, yTicksRound: yTicks.every((v) => v % 5 === 0),
  };
};

for (const [name, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const r = {};
  try {
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(800);
    r.map = await page.evaluate(mapChecks);
    r.heroTopBefore = await page.evaluate(heroTop);
    await page.locator('header button[aria-controls="global-filters"]').click();
    await page.waitForTimeout(500);
    r.heroTopOpen = await page.evaluate(heroTop);
    r.sheet = await page.evaluate(sheet);
    await page.screenshot({ path: `${OUT}/${name}-filters-open.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    r.closedByEscape = !(await page.evaluate(sheet))?.visible;
    r.focusBackOnButton = await page.evaluate(() => document.activeElement?.getAttribute('aria-controls') === 'global-filters');
    // The Simple summary's pool count opens the same sheet.
    const pool = page.locator('.bh-value-map').locator('xpath=ancestor::div[contains(@class,"card")][1]').locator('button', { hasText: /^of \d+$/ });
    if (await pool.count()) { await pool.first().click(); await page.waitForTimeout(300); r.poolCountOpens = !!(await page.evaluate(sheet))?.visible; await page.keyboard.press('Escape'); }
    else r.poolCountOpens = false;
    // Outside click closes.
    await page.locator('header button[aria-controls="global-filters"]').click();
    await page.waitForTimeout(300);
    await page.mouse.click(vp.width / 2, name === 'desktop' ? vp.height - 20 : 30);
    await page.waitForTimeout(300);
    r.closedByOutsideClick = !(await page.evaluate(sheet))?.visible;
    await page.screenshot({ path: `${OUT}/${name}-simple.png` });
  } catch (e) { out.errors.push(`${name}: ${String(e).split('\n')[0]}`); }
  r.pass = {
    pageDoesNotMove: r.heroTopBefore === r.heroTopOpen,
    sheetAtBottomOnMobile: name !== 'mobile' || r.sheet?.bottom === vp.height,
    footerButtonVisible: !!r.sheet?.footerVisible,
    focusMovesIn: !!r.sheet?.focusInside,
    escapeCloses: !!r.closedByEscape,
    focusReturns: !!r.focusBackOnButton,
    outsideClickCloses: !!r.closedByOutsideClick,
    poolCountOpens: !!r.poolCountOpens,
    minScorePlaceholderAny: r.sheet?.minScorePlaceholder === 'any',
    mapHeight: r.map?.chartHeight === (name === 'mobile' ? 200 : 240),
    noLabelOverlap: r.map?.labelOverlaps === 0,
    noLabelClipped: r.map?.labelsClipped === 0,
    roundYTicks: !!r.map?.yTicksRound,
  };
  out.results[name] = r;
  await ctx.close();
}
await browser.close();
out.allPass = Object.values(out.results).every((r) => Object.values(r.pass).every(Boolean)) && !out.errors.length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
