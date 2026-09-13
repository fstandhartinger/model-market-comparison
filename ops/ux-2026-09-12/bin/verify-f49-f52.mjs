// F-49 (cost precision) and F-52 (Compare head) live acceptance.
// Usage: node verify-f49-f52.mjs <base-url> <evidence-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter34-f49-f52';
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const result = { base: BASE, at: new Date().toISOString(), checks: [] };
const check = (name, ok, detail) => result.checks.push({ name, ok, detail });

// A dollar figure breaks F-49 when it has more than two decimals at >= $1, or more than
// three significant figures below $1.
const badPrice = (text) => {
  const m = text.match(/^\$\s?([0-9,]*\.?[0-9]+)$/);
  if (!m) return false;
  const raw = m[1].replace(/,/g, '');
  const value = Number(raw);
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  if (value >= 1) return decimals > 2;
  return raw.replace(/^0*\.?0*/, '').replace('.', '').length > 3;
};
const prices = (page, selector) => page.$$eval(selector, (nodes) => nodes
  .map((n) => (n.textContent || '').trim()).filter((t) => /^\$\s?[0-9]/.test(t)));

for (const [label, viewport, isMobile] of [
  ['desktop', { width: 1440, height: 1000 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) {
  const context = await browser.newContext({ viewport, isMobile });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const simple = await prices(page, 'table td, table td *');
  check(`${label} simple cost cells present`, simple.length > 0, simple.slice(0, 8));
  check(`${label} simple cost precision`, !simple.some(badPrice), simple.filter(badPrice));

  const advanced = page.getByRole('tab', { name: /advanced/i }).or(page.getByRole('button', { name: /^advanced$/i })).first();
  if (await advanced.count()) {
    await advanced.click();
    await page.waitForTimeout(800);
    const adv = await prices(page, 'table td, table td *');
    check(`${label} advanced cost cells present`, adv.length > 0, adv.length);
    check(`${label} advanced cost precision`, !adv.some(badPrice), adv.filter(badPrice).slice(0, 10));
  } else check(`${label} advanced mode control`, false, 'not found');
  await page.screenshot({ path: path.join(OUT, `${label}-advanced.png`) });

  const href = await page.$eval('table a[href^="/models/"]', (a) => a.getAttribute('href')).catch(() => null);
  if (href) {
    await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const model = await page.$$eval('main *', (nodes) => nodes.filter((n) => n.children.length === 0)
      .map((n) => (n.textContent || '').trim().replace(/\s*\/\s*task$/, '')).filter((t) => /^\$\s?[0-9]/.test(t)));
    check(`${label} model page cost precision (${href})`, !model.some(badPrice), { n: model.length, bad: model.filter(badPrice).slice(0, 10) });
  } else check(`${label} model link`, false, 'no model link in table');

  await page.goto(`${BASE}/compare`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const head = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const block = h1?.parentElement;
    const paragraphs = block ? [...block.querySelectorAll('p')].filter((p) => (p.textContent || '').trim()) : [];
    return {
      h1: h1?.textContent?.trim(),
      eyebrow: Boolean(block?.querySelector('.bh-eyebrow')),
      paragraphs: paragraphs.map((p) => p.textContent.trim()),
      serifInHead: h1 ? getComputedStyle(h1).fontFamily : null,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  check(`${label} compare H1 is "Compare"`, head.h1 === 'Compare', head.h1);
  check(`${label} compare head has no eyebrow`, !head.eyebrow, head.eyebrow);
  check(`${label} compare head has one line`, head.paragraphs.length <= 1, head.paragraphs);
  check(`${label} compare no horizontal overflow`, !head.overflow, head.overflow);
  await page.screenshot({ path: path.join(OUT, `${label}-compare.png`) });
  await context.close();
}

await browser.close();
result.failures = result.checks.filter((c) => !c.ok).length;
await fs.writeFile(path.join(OUT, 'verification.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ base: BASE, checks: result.checks.length, failures: result.failures, failed: result.checks.filter((c) => !c.ok) }, null, 2));
