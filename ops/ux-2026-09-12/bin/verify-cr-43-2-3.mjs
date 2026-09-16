// CR-43.2 (matched-height expansion panes) and CR-43.3 (Benchmaxxing quick-look rows) —
// live verification, 1440/1024/800/390, light and dark.
// Usage: BH_RUNNER=<engine> node verify-cr-43-2-3.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-43-2-3';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const b = await chromium.launch();
const VIEWS = [['desktop', { width: 1440, height: 1000 }], ['laptop', { width: 1024, height: 800 }], ['tablet', { width: 800, height: 900 }], ['mobile', { width: 390, height: 844 }]];
for (const theme of ['light', 'dark']) for (const [kind, vp] of VIEWS) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await goto(page, BASE + path); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };

  // ---------- CR-43.2: expanded overview row, panes of equal height ----------
  await go('/');
  // Florian's report was GLM-5.2 (many providers). Exercise both extremes of the rows on screen: the most
  // routes (overflow → internal scroll) and the fewest (short list → pane still matches the height).
  const rows = page.locator('tr.bh-ranking-row');
  const counts = await rows.evaluateAll((trs) => trs.map((tr) => { const t = tr.querySelectorAll('td'); return Number((t[t.length - 1]?.textContent || '').replace(/\D/g, '')) || 0; }));
  const glm = await rows.evaluateAll((trs) => trs.findIndex((tr) => /GLM-5\.2\b/.test(tr.textContent)));
  const most = glm >= 0 ? glm : counts.indexOf(Math.max(...counts)); const fewest = counts.indexOf(Math.min(...counts.filter((n) => n > 0)));
  for (const [which, idx] of [['most-routes', most], ['fewest-routes', fewest]]) {
  if (idx < 0) continue;
  const target = rows.nth(idx);
  const modelName = (await target.innerText()).split('\n')[0].replace(/^\W+/, '').slice(0, 60) + ` [${which}]`;
  await target.scrollIntoViewIfNeeded(); await target.click(); await page.waitForTimeout(900);
  const panes = await page.evaluate(() => {
    const bm = document.querySelector('[data-pane="benchmarks"]'), pv = document.querySelector('[data-pane="providers"]');
    if (!bm || !pv) return null;
    const sc = pv.querySelector('[data-pane-scroll="providers"]'); const inner = pv.firstElementChild;
    const r1 = bm.getBoundingClientRect(), r2 = pv.getBoundingClientRect();
    return { bmH: r1.height, pvH: r2.height, bmTop: r1.top, pvTop: r2.top, bmBottom: r1.bottom,
      innerH: inner.getBoundingClientRect().height, innerScroll: inner.scrollHeight, innerClient: inner.clientHeight,
      sc: sc ? { client: sc.clientHeight, scroll: sc.scrollHeight, overflowY: getComputedStyle(sc).overflowY, bottom: sc.getBoundingClientRect().bottom, tabIndex: sc.tabIndex, label: sc.getAttribute('aria-label') } : null,
      theadSticky: sc ? getComputedStyle(sc.querySelector('thead') || sc).position : null,
      routes: pv.querySelectorAll('tbody tr').length, pvBottom: r2.bottom };
  });
  check(`${tag} CR-43.2 both panes present in the expanded row (${modelName})`, !!panes, panes);
  if (panes) {
    if (!mobile) {
      check(`${tag} CR-43.2 provider pane has the benchmarks pane's height (±1 px)`, Math.abs(panes.bmH - panes.pvH) <= 1, { bm: panes.bmH, pv: panes.pvH });
      check(`${tag} CR-43.2 panes sit side by side (same top)`, Math.abs(panes.bmTop - panes.pvTop) <= 1, { bmTop: panes.bmTop, pvTop: panes.pvTop });
      check(`${tag} CR-43.2 provider content fills the pane without clipping (inner box = pane, no hidden overflow)`, Math.abs(panes.innerH - panes.pvH) <= 1 && panes.innerScroll <= panes.innerClient + 1, panes);
      check(`${tag} CR-43.2 provider list scrolls inside the pane and ends at the pane's bottom`, !panes.sc || (/(auto|scroll)/.test(panes.sc.overflowY) && panes.sc.bottom <= panes.pvBottom + 1), panes.sc);
      check(`${tag} CR-43.2 overflow is reachable: the scroll area is keyboard-focusable and labelled`, !panes.sc || panes.sc.scroll <= panes.sc.client + 1 || (panes.sc.tabIndex === 0 && /Provider routes/.test(panes.sc.label || '')), panes.sc);
      check(`${tag} CR-43.2 provider table header stays visible while scrolling (sticky)`, !panes.sc || panes.theadSticky === 'sticky', panes.theadSticky);
    } else {
      check(`${tag} CR-43.2 phones stack the panes (providers below benchmarks)`, panes.pvTop >= panes.bmBottom - 1, panes);
      check(`${tag} CR-43.2 phones keep the capped provider scroll (≤ 256 px)`, !panes.sc || panes.sc.client <= 257, panes.sc);
    }
    check(`${tag} CR-43.2 no stray page-level horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  const expandedRow = page.locator('[data-pane="providers"]').first();
  if (await expandedRow.count()) await expandedRow.locator('xpath=ancestor::tr[1]').screenshot({ path: `${OUT}/${tag}-expanded-panes-${which}.png` }).catch(() => {});
  if (which === 'most-routes' && panes?.sc && !mobile) check(`${tag} CR-43.2 the many-routes row really overflows and scrolls internally (${modelName})`, panes.sc.scroll > panes.sc.client + 1, panes.sc);
  }

  // ---------- CR-43.3: Benchmaxxing quick-look rows ----------
  await go('/benchmaxxing');
  const reportTitle = async () => (await page.locator('#radar h2').first().innerText().catch(() => '')).trim();
  const titleBefore = await reportTitle();
  const toggles = page.locator('button.bh-bmx-expand');
  check(`${tag} CR-43.3 every table row has a quick-look toggle`, (await toggles.count()) > 0 && (await toggles.count()) === (await page.locator('tbody tr[data-row-id]').count()), await toggles.count());
  const second = page.locator('tbody tr[data-row-id]').nth(1);
  const rowId = await second.getAttribute('data-row-id');
  const rowName = (await second.locator('button[aria-pressed]').innerText()).split('\n')[0].replace(/^[AB]/, '').trim();
  const t2 = second.locator('button.bh-bmx-expand');
  check(`${tag} CR-43.3 toggle starts collapsed with an accessible name`, (await t2.getAttribute('aria-expanded')) === 'false' && /quick look for/.test(await t2.getAttribute('aria-label') || ''), await t2.getAttribute('aria-label'));
  if (mobile) await t2.tap(); else { await t2.focus(); await page.keyboard.press('Enter'); }
  await page.waitForTimeout(400);
  const panelId = await t2.getAttribute('aria-controls');
  const panel = page.locator(`[id="${panelId}"]`);
  await panel.locator('svg[role="img"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  check(`${tag} CR-43.3 ${mobile ? 'tap' : 'Enter'} expands (aria-expanded=true, controlled panel shown)`, (await t2.getAttribute('aria-expanded')) === 'true' && (await panel.count()) === 1);
  check(`${tag} CR-43.3 expanding does not change the report selection (master-detail untouched)`, (await reportTitle()) === titleBefore, { before: titleBefore, after: await reportTitle() });
  const quick = await panel.evaluate((el) => ({
    radar: !!el.querySelector('svg[role="img"]'), radarLabel: el.querySelector('svg[role="img"]')?.getAttribute('aria-label') || '',
    hits: el.querySelectorAll('svg [role="button"]').length, svgW: el.querySelector('svg')?.getBoundingClientRect().width || 0,
    reading: el.querySelector('[data-quick-reading]')?.textContent || '', detail: el.querySelector('[data-quick-detail]')?.textContent || '',
    signal: el.textContent.match(/\d+\.\d/)?.[0] || null, link: el.querySelector('[data-quick-report]')?.getAttribute('href') || '' }));
  check(`${tag} CR-43.3 panel shows a compact static radar (≤ 320 px, one accessible name, no per-point tab stops)`, quick.radar && quick.svgW <= 321 && quick.hits === 0 && /measured benchmarks/.test(quick.radarLabel), quick);
  const tableSignal = (await second.locator('td').first().innerText()).match(/\d+\.\d/)?.[0];
  check(`${tag} CR-43.3 panel shows the same signal score as the row`, quick.signal && quick.signal === tableSignal, { panel: quick.signal, row: tableSignal });
  // Independent recomputation of the reading's topic sentence from the public API.
  const api = await (await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(rowId)}`)).json().catch(() => null);
  const topics = (api?.report?.topicSpread || []).filter((t) => t.measured >= 2).sort((a, b) => b.spread - a.spread);
  check(`${tag} CR-43.3 plain-language reading present with a level verdict and a caveat`, /^(Strong signal|Weak signal|No tag)/.test(quick.reading) && /not proof/.test(await panel.innerText()), quick.reading);
  check(`${tag} CR-43.3 the most-uneven topic named matches the API's topic spreads`, !topics.length || (quick.detail.includes(`Most uneven topic: ${topics[0].category}`) && quick.detail.includes(`differ by ${Math.round(topics[0].spread)} percentile`)), { detail: quick.detail, api: topics[0] });
  check(`${tag} CR-43.3 the full-report link is a real anchor to ?model=<id>#radar`, quick.link === `?model=${encodeURIComponent(rowId)}#radar`, quick.link);
  await panel.screenshot({ path: `${OUT}/${tag}-bmx-quicklook.png` }).catch(() => {});
  const link = panel.locator('[data-quick-report]');
  if (mobile) await link.tap(); else { await link.focus(); await page.keyboard.press('Enter'); }
  await page.waitForFunction(() => document.activeElement?.id === 'radar', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const landed = await page.evaluate(() => ({ active: document.activeElement?.id, url: location.search + location.hash, top: document.getElementById('radar')?.getBoundingClientRect().top }));
  check(`${tag} CR-43.3 link selects that model in the full report`, (await reportTitle()) === rowName, { title: await reportTitle(), rowName });
  check(`${tag} CR-43.3 link moves focus and scroll to the full radar section`, landed.active === 'radar' && Math.abs(landed.top) < 120, landed);
  check(`${tag} CR-43.3 URL keeps the context (?model=<id>#radar)`, landed.url.includes(`model=${encodeURIComponent(rowId)}`) && landed.url.endsWith('#radar'), landed.url);
  await page.screenshot({ path: `${OUT}/${tag}-bmx-landed.png` }).catch(() => {});
  // Collapse via keyboard Space (desktop) / tap (phone); then master-detail still works by row selection.
  await t2.scrollIntoViewIfNeeded();
  if (mobile) await t2.tap(); else { await t2.focus(); await page.keyboard.press('Space'); }
  await page.waitForTimeout(300);
  check(`${tag} CR-43.3 toggle collapses again`, (await t2.getAttribute('aria-expanded')) === 'false' && (await page.locator(`[id="${panelId}"]`).count()) === 0);
  const third = page.locator('tbody tr[data-row-id]').nth(2);
  const thirdName = (await third.locator('button[aria-pressed]').innerText()).split('\n')[0].trim();
  await third.locator('button[aria-pressed]').click();
  await page.waitForFunction((n) => document.querySelector('#radar h2')?.textContent?.trim() === n, thirdName, { timeout: 15000 }).catch(() => {});
  check(`${tag} CR-43.3 selecting a row still drives the report (master-detail kept)`, (await reportTitle()) === thirdName, { title: await reportTitle(), thirdName });
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const failed = checks.filter((c) => !c.ok);
const out = { runner: process.env.BH_RUNNER || 'unknown', base: BASE, revision: meta.revision, at: new Date().toISOString(), checks, failed: failed.length };
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 2));
console.log(`${OUT}: ${checks.length - failed.length}/${checks.length} passed`);
for (const f of failed) console.log(`FAIL ${f.name}: ${f.detail}`);
process.exit(failed.length ? 1 : 0);
