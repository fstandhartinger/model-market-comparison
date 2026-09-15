// CR-29.3 (outlier tags), CR-31.1 (simplified-list hint), CR-31.2 ((i) per benchmark) on Simple's benchmark table.
// Live at 1440/390, light/dark. Usage: node verify-cr-29-31.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const { rowOutliers } = await import('../../../lib/benchmark-matrix.mjs');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-29-31';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  // CR-31.1 via manual scroll: no hint before, hint beside the button when the table enters, gone after ~4 s.
  check(`${tag} CR-31.1 no hint before the table is in view`, (await page.locator('[data-simplified-hint]').count()) === 0, '');
  await page.locator('#benchmarks .bh-matrix-wrap').scrollIntoViewIfNeeded(); await page.mouse.wheel(0, 120);
  await page.locator('[data-simplified-hint]').waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  const hint = page.locator('[data-simplified-hint]');
  const shown = await hint.isVisible().catch(() => false);
  check(`${tag} CR-31.1 hint 'This is a simplified list' appears when the table scrolls into view`, shown && (await hint.innerText()).trim() === 'This is a simplified list', '');
  if (shown) {
    await page.locator('#benchmarks a', { hasText: 'Open the full comparison' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const geo = await page.evaluate(() => {
      const h = document.querySelector('[data-simplified-hint]').getBoundingClientRect();
      const b = [...document.querySelectorAll('#benchmarks a')].find((a) => /Open the full comparison/.test(a.textContent)).getBoundingClientRect();
      const overlap = !(h.right <= b.left || h.left >= b.right || h.bottom <= b.top || h.top >= b.bottom);
      return { overlap, near: Math.hypot((h.left + h.right) / 2 - (b.left + b.right) / 2, (h.top + h.bottom) / 2 - (b.top + b.bottom) / 2), inView: h.left >= 0 && h.right <= innerWidth };
    });
    check(`${tag} CR-31.1 hint sits next to the button without covering it, inside the viewport`, !geo.overlap && geo.near < 260 && geo.inView, geo);
    await page.screenshot({ path: `${OUT}/${tag}-hint.png` });
  }
  await page.waitForTimeout(4500);
  check(`${tag} CR-31.1 hint disappears after a short moment`, (await page.locator('[data-simplified-hint]').count()) === 0, '');
  await page.mouse.wheel(0, -2000); await page.waitForTimeout(400); await page.locator('#benchmarks .bh-matrix-wrap').scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  check(`${tag} CR-31.1 not shown again in the same page visit`, (await page.locator('[data-simplified-hint]').count()) === 0, '');

  // CR-31.1 via the header Benchmarks link on a fresh load.
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);
  // The header holds a desktop and a phone Benchmarks link; click whichever is visible at this width.
  await page.locator('header a[href="/benchmarks"]').filter({ visible: true }).first().click();
  const viaLink = await page.locator('[data-simplified-hint]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  check(`${tag} CR-31.1 hint also appears after the header Benchmarks link scrolls there`, viaLink, '');

  // CR-31.2: an (i) with non-empty text on every benchmark row.
  const rows = await page.evaluate(() => [...document.querySelectorAll('#benchmarks tbody tr')].filter((tr) => !tr.classList.contains('bh-matrix-hero') && !tr.classList.contains('bh-matrix-group'))
    .map((tr) => ({ name: tr.querySelector('.bh-matrix-bench')?.childNodes[0]?.textContent?.trim(), info: !!tr.querySelector('th button[aria-label^="About the"]') })));
  check(`${tag} CR-31.2 every benchmark row has an (i)`, rows.length > 0 && rows.every((r) => r.info), { rows: rows.length, missing: rows.filter((r) => !r.info).map((r) => r.name) });
  const trigger = page.locator('#benchmarks tbody tr:not(.bh-matrix-hero):not(.bh-matrix-group) th button[aria-label^="About the"]').first();
  await trigger.scrollIntoViewIfNeeded();
  let tipText = '', tipOk = false;
  if (mobile) {
    await trigger.click(); await page.waitForTimeout(300);
    const dlg = page.locator('dialog[open]').last();
    tipText = await dlg.innerText().catch(() => '');
    const bg = await dlg.evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => '');
    tipOk = /Score:/.test(tipText) && tipText.length > 40 && !/rgba\(.*, 0\)/.test(bg);
    await page.screenshot({ path: `${OUT}/${tag}-info.png` });
    await page.keyboard.press('Escape');
  } else {
    await trigger.hover(); await page.waitForTimeout(300);
    const tip = page.locator('[role=tooltip]').last();
    tipText = await tip.innerText().catch(() => '');
    // The tooltip is pointer-events:none, so elementFromPoint cannot see it; "above sticky headers and the table"
    // is checked as: portalled to <body>, fixed, z-index >= 100. Attachment: within 24 px of its (i).
    const tb = await trigger.boundingBox();
    const st = await tip.evaluate((el, t) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); const gap = t ? Math.min(Math.abs(r.top - (t.y + t.height)), Math.abs(t.y - r.bottom)) : 999; return { z: Number(cs.zIndex), position: cs.position, portalled: el.parentElement === document.body, bg: cs.backgroundColor, gap: Math.round(gap), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; }, tb).catch(() => null);
    tipOk = /Score:/.test(tipText) && tipText.length > 40 && st && st.z >= 100 && st.portalled && st.position === 'fixed' && st.gap <= 24 && st.inView && !/rgba\(.*, 0\)/.test(st.bg);
    if (!tipOk) tipText = `${JSON.stringify(st)} ${tipText.replace(/\n/g, ' ')}`;
    await page.screenshot({ path: `${OUT}/${tag}-info.png` });
  }
  check(`${tag} CR-31.2 (i) explains the benchmark and its score type; opaque, on top, not clipped`, tipOk, tipText.slice(0, 200));

  // CR-29.3: tags on screen equal the rule applied to the cells on screen; at most one per cell.
  const table = await page.evaluate(() => [...document.querySelectorAll('#benchmarks tbody tr')].filter((tr) => !tr.classList.contains('bh-matrix-hero') && !tr.classList.contains('bh-matrix-group')).map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => { const v = td.querySelector('.bh-matrix-link .tabular'); const t = td.querySelectorAll('.bh-outlier-tag'); return { text: v ? v.childNodes[0]?.textContent : null, tags: [...t].map((x) => x.dataset.kind) }; })));
  let mismatches = 0, tags = 0, multi = 0;
  const parse = (s) => { if (s == null) return null; const n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : null; };
  for (const cells of table) {
    const vals = cells.map((c) => parse(c.text));
    const shownTags = cells.map((c) => c.tags[0] ?? null);
    tags += shownTags.filter(Boolean).length; multi += cells.filter((c) => c.tags.length > 1).length;
    const expectHigh = rowOutliers(vals, true), expectLow = rowOutliers(vals, false);
    if (JSON.stringify(shownTags) !== JSON.stringify(expectHigh) && JSON.stringify(shownTags) !== JSON.stringify(expectLow)) mismatches++;
  }
  check(`${tag} CR-29.3 tags follow the published rule on every row, one tag per cell at most`, mismatches === 0 && multi === 0, { rows: table.length, tags, mismatches, multi });
  const tagEl = page.locator('#benchmarks .bh-outlier-tag').first();
  if (await tagEl.count()) {
    const sr = await tagEl.innerText();
    check(`${tag} CR-29.3 a tag is readable text (not colour only) with an explanation`, /^(top|low)/i.test(sr.trim()) && !!(await tagEl.getAttribute('title')), sr);
    await tagEl.scrollIntoViewIfNeeded(); await page.locator('#benchmarks .bh-matrix-wrap').screenshot({ path: `${OUT}/${tag}-outliers.png` }).catch(() => {});
  }
  const foot = await page.locator('#benchmarks p', { hasText: 'Bold is best in row' }).innerText().catch(() => '');
  check(`${tag} CR-29.3 footnote states the tag rule`, /top.*low.*twice the spread/.test(foot), foot.slice(0, 200));
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
