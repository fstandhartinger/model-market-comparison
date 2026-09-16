// F-101 (Providers combobox: one row per company) and F-102 (one counting rule for "benchmarks").
// F-101: no company name appears twice in the Providers popover; a company reached directly and through a
//        gateway is one row that names its routes, folds the gateway's own spelling, stays searchable under
//        that spelling, and toggles all of its catalog keys at once (a partly excluded company reads "mixed").
// F-102: the hero, Simple's section 2 and the Benchmarks page count the same thing — boards (one family at
//        one version, harness cohorts and cost twins being rows of a board), and never say "benchmark results".
// Usage: BH_RUNNER=<engine> node verify-f101-f102.mjs <base> <outdir>   (1440/390, light/dark)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f101-f102';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const goto = async (page, url, waitUntil = 'domcontentloaded') => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil, timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const openOptions = async (page) => {
  await page.evaluate(() => {
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    [...document.querySelectorAll('[data-bh-filters-toggle], header button[aria-controls="global-filters"]')].find(visible)?.click();
  });
  await page.locator('#global-filters').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
};
const options = (page) => page.evaluate(() => [...document.querySelectorAll('[role="listbox"][aria-label="Providers"] [role="option"]')].map((o) => ({
  label: o.querySelector('span:nth-child(2)')?.textContent?.trim() ?? '',
  sub: o.querySelector('span:nth-child(3)')?.textContent?.trim() ?? '',
  checked: o.getAttribute('aria-checked'),
})));

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // ---------- F-102: the hero count ----------
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await page.waitForTimeout(3000); await page.reload(); });
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const hero = await page.locator('.bh-hero-line').innerText();
  const heroCount = Number(hero.match(/([\d,]+)\s+benchmarks/)?.[1]?.replace(/,/g, ''));
  check(`${tag} F-102 the hero states a benchmark count`, Number.isFinite(heroCount) && heroCount > 0, hero.replace(/\s+/g, ' ').trim());

  // ---------- F-102: Simple's section 2 ----------
  await page.locator('#benchmarks').scrollIntoViewIfNeeded();
  await page.locator('[data-catalog-count]').waitFor({ timeout: 20000 }).catch(() => {});
  const section2 = await page.evaluate(() => {
    const el = document.querySelector('[data-catalog-count]');
    return {
      shown: Number(document.querySelector('[data-bench-count]')?.textContent),
      catalog: Number(el?.textContent),
      sentence: el?.closest('p')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
      boards: new Set([...document.querySelectorAll('#benchmarks tbody tr[data-board]')].map((tr) => tr.getAttribute('data-board'))).size,
      rows: document.querySelectorAll('#benchmarks tbody tr[data-board]').length,
    };
  });
  check(`${tag} F-102 section 2's denominator is the hero's number`, section2.catalog === heroCount, `${section2.catalog} vs hero ${heroCount}`);
  check(`${tag} F-102 section 2's numerator is the board count of its own rows, and rows ≥ benchmarks`,
    section2.shown === section2.boards && section2.rows >= section2.boards && section2.boards > 0, JSON.stringify(section2));
  check(`${tag} F-102 section 2 counts benchmarks, never "benchmark results"`,
    /benchmarks we track/.test(section2.sentence) && !/benchmark results/.test(section2.sentence), section2.sentence);
  await page.locator('#benchmarks').screenshot({ path: `${OUT}/${tag}-section2-count.png` }).catch(() => {});

  // ---------- F-102: the Benchmarks page ----------
  await goto(page, `${BASE}/benchmarks`);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000);
  const page3 = await page.evaluate(() => {
    const el = document.querySelector('section[aria-label="Benchmark comparison"] [role="status"]');
    const clone = el?.cloneNode(true);
    clone?.querySelectorAll('select').forEach((x, i) => x.replaceWith(el.querySelectorAll('select')[i].value));
    return {
      status: clone?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      chooser: document.querySelector('.bh-rowpicker summary')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
      rows: document.querySelectorAll('table.bh-matrix tbody tr:not(.bh-matrix-group)').length,
    };
  });
  const status = page3.status.match(/(\d+) benchmarks across (\d+) categories/);
  const chooser = page3.chooser.match(/\((\d+) of (\d+)\)/);
  check(`${tag} F-102 the Benchmarks page counts benchmarks, the chooser agrees, and rows ≥ benchmarks`,
    status && chooser && status[1] === chooser[1] && page3.rows >= Number(status[1]) && !/benchmark results/.test(page3.status),
    `${page3.status} · ${page3.chooser} · rows ${page3.rows}`);
  check(`${tag} F-102 the chooser's total never exceeds the catalog the hero states`,
    chooser && Number(chooser[2]) <= heroCount, `${page3.chooser} vs hero ${heroCount}`);

  // ---------- F-101: the Providers combobox ----------
  await goto(page, `${BASE}/`);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200);
  await openOptions(page);
  const trigger = page.locator('#global-filters [data-bh-combobox-trigger="Providers"]');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click(); await page.waitForTimeout(500);
  const items = await options(page);
  const labels = items.map((i) => i.label);
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
  check(`${tag} F-101 no company name appears twice in the Providers list`, labels.length > 20 && dupes.length === 0, dupes.join(', ') || `${labels.length} rows`);
  const folded = items.filter((i) => /direct · via|routes/.test(i.sub));
  check(`${tag} F-101 a company reached twice is one row that names its routes`, folded.length >= 5, folded.slice(0, 6).map((i) => `${i.label} — ${i.sub}`).join(' | '));
  check(`${tag} F-101 the gateway's own spelling is folded into the name the site uses`,
    labels.includes('AWS Bedrock') && !labels.includes('Amazon Bedrock') && labels.includes('Azure AI Foundry') && !labels.includes('Azure'),
    labels.filter((l) => /Bedrock|Azure|Google/.test(l)).join(', '));
  await page.screenshot({ path: `${OUT}/${tag}-providers-open.png` });

  // The folded spelling is still searchable.
  await page.locator('[data-bh-combobox] input').first().fill('amazon'); await page.waitForTimeout(400);
  const found = await options(page);
  check(`${tag} F-101 searching the gateway's spelling still finds the company`, found.length === 1 && found[0].label === 'AWS Bedrock', found.map((f) => f.label).join(', '));
  await page.locator('[data-bh-combobox] input').first().fill(''); await page.waitForTimeout(400);

  // Toggling a folded row toggles all of its catalog keys at once.
  const before = await trigger.textContent();
  const row = page.locator('[role="listbox"][aria-label="Providers"] [role="option"]').filter({ hasText: 'AWS Bedrock' }).first();
  await row.click(); await page.waitForTimeout(400);
  const afterItems = await options(page);
  const aws = afterItems.find((i) => i.label === 'AWS Bedrock');
  const after = await trigger.textContent();
  check(`${tag} F-101 one click unchecks the whole company (never a half state)`, aws && aws.checked === 'false' && before !== after, `${before?.trim()} → ${after?.trim()} · ${JSON.stringify(aws)}`);
  await row.click(); await page.waitForTimeout(400);
  const restored = (await options(page)).find((i) => i.label === 'AWS Bedrock');
  check(`${tag} F-101 clicking again restores every route of the company`, restored && restored.checked === 'true', JSON.stringify(restored));
  check(`${tag} no page errors`, !errors.length, errors.join(' | '));
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${String(c.detail).slice(0, 200)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
