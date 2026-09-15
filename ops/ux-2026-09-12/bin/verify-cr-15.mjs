// CR-15 (Florian 2026-09-15): cost-cell value tags, Benchmaxxing preset + master-detail + compare, signal warning pill.
// Usage: node verify-cr-15.mjs <base> <outdir>   (1440×1000 and 390×844, light and dark; writes verification.json + PNGs)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-15';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const browser = await chromium.launch();
// The row's model name without the A/B slot marker (a child span), so names starting with A or B stay intact.
const rowName = (button) => button.locator('span').first().evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim());
async function settle(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); }

for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // CR-15.1 cost-cell value tags (Simple home table).
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await settle(page);
  const simpleCount = await page.locator('.bh-value-tag').count();
  // A 30-row Simple table can legitimately have no outlier; the full Advanced table must show the feature.
  await page.getByRole('tab', { name: 'Advanced' }).click(); await settle(page);
  const tags = await page.locator('.bh-value-tag').evaluateAll((els) => els.map((e) => ({ kind: e.getAttribute('data-kind'), text: e.textContent || '', title: e.getAttribute('title') || '' })));
  const wellFormed = tags.every((t) => (t.kind === 'cheap' ? /^↓[\d.]+× cheaper/.test(t.text) && /below the typical cost/.test(t.title) : t.kind === 'pricey' && /^↑[\d.]+× pricier/.test(t.text) && /above the typical cost/.test(t.title))
    && Number(t.text.match(/([\d.]+)×/)[1]) >= 2);
  check(`${tag} CR-15.1 cost cells tag notably cheap/pricey models with arrow + words (≥2×), explained (Advanced table)`, tags.length >= 1 && wellFormed, { simpleCount, advancedCount: tags.length, cheap: tags.filter((t) => t.kind === 'cheap').length, sample: tags.slice(0, 3) });
  const tagged = page.locator('.bh-value-tag').first();
  if (await tagged.count()) { await tagged.scrollIntoViewIfNeeded(); await page.locator('table').first().screenshot({ path: `${OUT}/${tag}-cost-value-tags.png` }).catch(() => {}); }

  // CR-15.2 / 15.4 Benchmaxxing master-detail.
  await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded' }); await settle(page);
  const presets = page.locator('[aria-label="Model list preset"] button');
  check(`${tag} CR-15.2 table list is a changeable preset, Featured by default`, (await presets.count()) === 3 && (await presets.first().getAttribute('aria-pressed')) === 'true' && /Featured/.test(await presets.first().innerText()), await presets.allInnerTexts());
  const report = page.locator('section[aria-label="Per-model Benchmaxxing report"]');
  check(`${tag} CR-15.4 report has no model selector of its own`, (await report.locator('select').count()) === 0, '');
  const rowButtons = page.locator('section[aria-label="Benchmaxxing overview"] tbody th button');
  const firstName = await rowName(rowButtons.first());
  const title0 = await report.locator('h2').innerText();
  check(`${tag} CR-15.4 report opens on the first featured row (selected)`, title0.trim() === firstName && (await rowButtons.first().getAttribute('aria-pressed')) === 'true', { firstName, title0 });
  const third = rowButtons.nth(2), thirdName = await rowName(third);
  await third.click(); await page.waitForTimeout(1500);
  const title1 = await report.locator('h2').innerText();
  check(`${tag} CR-15.4 selecting a row drives the report and the URL`, title1.includes(thirdName) && /[?&]model=/.test(page.url()), { thirdName, title1, url: page.url() });
  await page.reload(); await settle(page);
  check(`${tag} CR-15.4 deep link restores the selected model`, (await report.locator('h2').innerText()).includes(thirdName), await report.locator('h2').innerText());

  await report.getByRole('button', { name: 'Compare side by side' }).click(); await page.waitForTimeout(1800);
  const legend = await report.locator('[aria-label="Chart legend"] li').count(), cards = await report.locator('aside').count();
  const colours = await report.locator('svg[aria-label^="Many-axis radar"] polyline').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('stroke')))]);
  check(`${tag} CR-15.4 compare mode: two series on one radar, two signal cards`, legend === 2 && cards === 2 && colours.length === 2 && / vs /.test(await report.locator('h2').innerText()), { legend, cards, colours });
  await report.screenshot({ path: `${OUT}/${tag}-benchmaxxing-compare.png` });
  const fifthName = await rowName(rowButtons.nth(4));
  await rowButtons.nth(4).click(); await page.waitForTimeout(1800);
  check(`${tag} CR-15.4 compare mode: selecting another row replaces B, keeps A`, (await report.locator('h2').innerText()).endsWith(fifthName) && (await report.locator('h2').innerText()).startsWith(thirdName), await report.locator('h2').innerText());
  await report.getByRole('button', { name: 'Close side-by-side' }).click(); await page.waitForTimeout(600);
  check(`${tag} CR-15.4 closing compare returns to the single report`, (await report.locator('aside').count()) === 1, String(await report.locator('aside').count()));

  // CR-15.3 warning pill above 25 (Strongest signals preset lists the tagged models).
  await presets.nth(1).click(); await page.waitForTimeout(500);
  const signalCells = await page.locator('section[aria-label="Benchmaxxing overview"] tbody tr td:nth-of-type(1)').evaluateAll((tds) => tds.map((td) => ({ pill: !!td.querySelector('.bh-signal-pill'), icon: (td.querySelector('.bh-signal-pill')?.textContent || '').includes('⚠'), value: Number((td.textContent || '').match(/\d+\.\d/)?.[0]) })));
  const pillRule = signalCells.length > 0 && signalCells.every((c) => c.pill === (c.value > 25) && (!c.pill || c.icon));
  check(`${tag} CR-15.3 signals above 25 are warning pills with an icon; 25 and below are not`, pillRule && signalCells.some((c) => c.pill), signalCells.slice(0, 12));
  check(`${tag} CR-15.3 the threshold is explained in the Signal column (i)`, (await page.getByRole('button', { name: /the Signal column/ }).count()) === 1, '');
  await page.locator('section[aria-label="Benchmaxxing overview"]').screenshot({ path: `${OUT}/${tag}-benchmaxxing-signals.png` });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal page overflow, no page errors`, overflow <= 1 && !errors.length, { overflow, errors });
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
