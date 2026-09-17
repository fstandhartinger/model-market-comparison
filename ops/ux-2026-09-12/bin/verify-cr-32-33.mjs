// CR-32.3 (short slider tooltips), CR-32.4 (fitted value-map Y axis), CR-32.5 (cogwheel settings),
// CR-33.1/33.2 (shortlist column chart + score picker), CR-33.3 (Main Composite row always first), CR-21.2 re-check.
// Live at 1440/390, light/dark. Usage: node verify-cr-32-33.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-32-33';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };
const words = (t) => String(t).replace(/How we calculate/g, '').trim().split(/\s+/).filter(Boolean).length;

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  // CR-32.3: the two slider tooltips are short bullet lists.
  for (const [label, re] of [['capability', /About the minimum capability score setting/], ['cost', /About the adjusted cost setting/]]) {
    const btn = page.getByRole('button', { name: re }).first();
    let text = '', bullets = 0;
    if (mobile) {
      await btn.click(); await page.waitForTimeout(300);
      const dlg = page.locator('dialog[open]').last();
      text = await dlg.innerText().catch(() => ''); bullets = await dlg.locator('li').count();
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    } else {
      await btn.hover(); await page.waitForTimeout(300);
      const tip = page.locator('[data-bh-infotip-panel]').last();
      text = await tip.innerText().catch(() => ''); bullets = await tip.locator('li').count();
      await page.mouse.move(0, 0);
    }
    const body = text.replace(/^.*\n/, '');
    check(`${tag} CR-32.3 ${label} tooltip: 2–4 bullets, ≤ ~60 words`, bullets >= 2 && bullets <= 4 && words(body) <= 60, { bullets, words: words(body), text: text.slice(0, 160) });
  }

  // CR-33.3: Main Composite row first; no selected row while the composite is selected.
  const heroRows = () => page.evaluate(() => [...document.querySelectorAll('#benchmarks tr.bh-matrix-hero')].map((tr) => ({ score: tr.dataset.score, role: tr.dataset.scoreRole, label: tr.querySelector('.bh-hero-label')?.textContent, sub: tr.querySelector('.bh-hero-sub')?.textContent })));
  const rows0 = await heroRows();
  check(`${tag} CR-33.3 composite selected → one score row: Benchmark Heaven Score / Main Composite Score`, rows0.length === 1 && rows0[0].score === 'composite' && rows0[0].label === 'Benchmark Heaven Score' && rows0[0].sub === 'Main Composite Score', rows0);

  // CR-33.1/33.2: column chart above the table, sorted, own picker, no fake zeros.
  const chart = page.locator('[data-shortlist-columns]');
  // Re-pinned 2026-09-17 (iteration 101): the first <span> inside a column is the bar, not the label — on desktop since
  // the value moved above the bar, and F-93 added a second (row) layout below md. Take the first span that has text.
  const cols = await chart.evaluate((el) => [...el.querySelectorAll('[data-col]')].map((c) => ({ id: c.dataset.col, noData: !!c.dataset.noData,
    v: [...c.querySelectorAll('span')].map((x) => (x.textContent || '').trim()).find((t) => t) }))).catch(() => []);
  const vals = cols.filter((c) => !c.noData).map((c) => parseFloat(c.v));
  const above = await page.evaluate(() => { const c = document.querySelector('[data-shortlist-columns]'), t = document.querySelector('#benchmarks .bh-matrix-wrap'); return !!c && !!t && c.getBoundingClientRect().top < t.getBoundingClientRect().top; });
  check(`${tag} CR-33.1 column chart of the shortlist sits above the table, sorted high → low, values labelled`, cols.length >= 5 && above && vals.every((v, i) => i === 0 || vals[i - 1] >= v) && vals.every(Number.isFinite), { n: cols.length, above, first: vals.slice(0, 4) });
  await chart.scrollIntoViewIfNeeded(); await chart.screenshot({ path: `${OUT}/${tag}-columns-composite.png` }).catch(() => {});
  await page.locator('[data-shortlist-score]').selectOption('designarena_fullstack'); await page.waitForTimeout(400);
  const cols2 = await chart.evaluate((el) => [...el.querySelectorAll('[data-col]')].map((c) => ({ noData: !!c.dataset.noData, h: c.querySelector('span.rounded-t:not(.border-dashed)')?.style.height ?? null }))).catch(() => []);
  const nod = cols2.filter((c) => c.noData);
  check(`${tag} CR-33.2 picker switches the chart (DesignArena Full-Stack): Elo as positions; missing values are 'no data', never a zero bar`, cols2.length === cols.length && nod.every((c) => c.h == null) && /Elo/.test(await chart.innerText()), { n: cols2.length, noData: nod.length });
  await chart.screenshot({ path: `${OUT}/${tag}-columns-elo.png` }).catch(() => {});

  // CR-32.5: cogwheel toggles names and Pareto line, persists across reload.
  const cog = page.locator('[data-value-map-settings]').first();
  await cog.scrollIntoViewIfNeeded(); await cog.click(); await page.waitForTimeout(300);
  const panelVisible = await page.locator('#bh-value-map-settings').isVisible();
  const labelsBefore = await page.locator('.bh-value-map .bh-point-labels text').count();
  await page.locator('#bh-value-map-settings [data-pref=labels]').uncheck(); await page.waitForTimeout(400);
  const labelsAfter = await page.locator('.bh-value-map .bh-point-labels text').count();
  check(`${tag} CR-32.5 cogwheel opens chart settings; 'Model names' off removes the labels`, panelVisible && labelsBefore > 0 && labelsAfter === 0, { panelVisible, labelsBefore, labelsAfter });
  await page.screenshot({ path: `${OUT}/${tag}-cogwheel.png` });
  await page.keyboard.press('Escape');
  await page.reload(); await settle(page);
  check(`${tag} CR-32.5 settings persist across reload`, (await page.locator('.bh-value-map .bh-point-labels text').count()) === 0, '');
  await page.evaluate(() => localStorage.removeItem('bh.valueMap.v1'));

  // CR-32.4 + CR-33.3 with another score: select AA Intelligence Index in Options.
  await page.locator('header button[data-bh-filters-toggle]').first().click();
  await page.locator('#global-filters').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  const scoreSelect = page.locator('#global-filters select').first();
  await scoreSelect.selectOption({ value: 'aa_intelligence_index' }).catch(() => {});
  await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
  const rows1 = await heroRows();
  check(`${tag} CR-33.3 another score selected → Main Composite row first, then the selected score row`, rows1.length === 2 && rows1[0].score === 'composite' && rows1[1].score === 'aa_intelligence_index' && rows1[1].role === 'selected' && rows1[1].sub === 'Selected score', rows1);
  const yTicks = await page.evaluate(() => [...document.querySelectorAll('.bh-value-map .recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => Number(t.textContent)));
  check(`${tag} CR-32.4 value map Y axis fits AA Intelligence Index scores (top below 100)`, yTicks.length >= 2 && Math.max(...yTicks) < 100, yTicks);
  await page.locator('.bh-value-map').first().screenshot({ path: `${OUT}/${tag}-yaxis-aa.png` }).catch(() => {});

  // CR-21.2 re-check after the visible-rows fix.
  await goto(page, `${BASE}/benchmaxxing`); await settle(page);
  const bars = await page.evaluate(() => { const f = [...document.querySelectorAll('[data-signal-frac]')].filter((el) => el.offsetParent).map((el) => Number(el.getAttribute('data-signal-frac'))); return { n: f.length, max: Math.max(...f), fracs: f }; });
  // Re-pinned 2026-09-17 (iteration 101): see verify-cr-19-25.mjs — CR-63.5(a) and F-112 made the scale catalog-wide
  // and signed, so the on-screen maximum is no longer 1. The visible bars must still differ and stay inside the scale.
  check(`${tag} CR-21.2 signal bars among the rows on screen vary inside one bounded scale`,
    bars.n > 0 && bars.fracs.every((f) => Math.abs(f) <= 1 + 1e-6) && new Set(bars.fracs).size > 1, bars);
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
