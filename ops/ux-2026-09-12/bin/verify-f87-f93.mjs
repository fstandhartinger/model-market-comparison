// Fable pass 17 live acceptance: F-87 (More menu width), F-88 (BETA spacing), F-89 (short picker names, menu
// inside the phone), F-90 (three Y ticks on the phone map), F-91 (desktop compare radar size), F-92 (inline (i),
// footnote without the repeated intro), F-93 (shortlist chart: bar rows on phones, bottom-to-top names on desktop).
// Usage: BH_RUNNER=<engine> node verify-f87-f93.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-f87-f93';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  // F-88 BETA text carries the space.
  const beta = await page.locator('[data-beta-tag]').first().evaluate((el) => ({ text: el.textContent, w: el.getBoundingClientRect().width }));
  check(`${tag} F-88 BETA tag text has a space before the dash (desktop) / reads BETA (phone)`, mobile ? /^BETA/.test(beta.text.trim()) : /^BETA — Work in progress$/.test(beta.text), beta);

  // F-87 More menu width (desktop only).
  if (!mobile) {
    const more = page.locator('nav[aria-label=Primary] summary', { hasText: 'More' }).first(); await more.click(); await page.waitForTimeout(300);
    const geo = await page.evaluate(() => { const s = [...document.querySelectorAll('nav summary')].find((e) => /More/.test(e.textContent)); const d = s?.closest('details'); const m = d?.querySelector('div'); const r = m?.getBoundingClientRect(); const rs = s?.getBoundingClientRect(); return r && { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), sb: Math.round(rs.bottom), vw: innerWidth, wrapped: [...m.querySelectorAll('a')].some((a) => a.getBoundingClientRect().height > 56) }; });
    check(`${tag} F-87 desktop More menu is ≥ 200 px wide, anchored under its button, inside the viewport, no wrapped item`, geo && geo.w >= 200 && geo.right <= geo.vw && geo.top >= geo.sb && geo.top - geo.sb <= 16 && !geo.wrapped, geo);
    await page.screenshot({ path: `${OUT}/${tag}-more-menu.png` });
    await page.keyboard.press('Escape'); await page.mouse.click(700, 400); await page.waitForTimeout(200);
  }

  // F-89 picker names.
  const scoreBtn = page.locator('[data-label-picker="Capability score"]'); await scoreBtn.click(); await page.waitForTimeout(300);
  const menu = page.locator('[role=menu][aria-label="Capability score"]');
  const items = await menu.locator('[role=menuitemradio]').allInnerTexts();
  const mgeo = await menu.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), vw: innerWidth, docW: document.documentElement.scrollWidth }; });
  check(`${tag} F-89 score picker uses the short names (AA Intelligence Index, Epoch ECI, DesignArena Full-Stack (Elo)), no source prefix`, items.includes('AA Intelligence Index') && items.includes('Epoch ECI') && items.includes('DesignArena Full-Stack (Elo)') && !items.some((t) => /ArtificialAnalysis|Epoch AI —|Agentic Web Dev/.test(t)), items);
  check(`${tag} F-89 picker menu stays inside the viewport (no page overflow)`, mgeo.right <= mgeo.vw && mgeo.docW <= mgeo.vw, mgeo);
  await page.screenshot({ path: `${OUT}/${tag}-score-menu.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // F-90 phone map ticks.
  const yTicks = await page.evaluate(() => [...document.querySelectorAll('.bh-value-map .recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => Number(t.textContent)));
  check(`${tag} F-90 value map Y axis has ${mobile ? 'three' : '≥ 3'} round ticks`, mobile ? yTicks.length === 3 && yTicks[0] < yTicks[1] && yTicks[1] < yTicks[2] : yTicks.length >= 3, yTicks);

  // F-92 + F-93 in section 2.
  await page.evaluate(() => { const el = document.querySelector('#benchmarks'); el && window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 8); }); await page.waitForTimeout(2500);
  const chart = page.locator('[data-shortlist-columns]');
  const cg = await chart.evaluate((el) => { const cols = [...el.querySelectorAll('[data-col]')]; const first = cols[0]; const r = el.getBoundingClientRect(); const bar = first?.querySelector('span.rounded-t'); const b = bar?.getBoundingClientRect(); const label = el.querySelector('[data-col] a') || [...el.querySelectorAll('a')].find((a) => a.closest('[data-col]') === null && a.title); const scroller = el.querySelector('[role=img]'); return { n: cols.length, w: Math.round(r.width), vw: innerWidth, scrollable: scroller ? scroller.scrollWidth > scroller.clientWidth + 2 : null, bar: b && { w: Math.round(b.width), h: Math.round(b.height) }, rowsMode: !!first?.querySelector('a'), labelStyle: label ? getComputedStyle(label).writingMode + '/' + getComputedStyle(label).transform : null, firstText: first?.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) }; });
  if (mobile) check(`${tag} F-93 phone shortlist chart is bar rows: every model in view, no horizontal panning, horizontal bars`, cg.n >= 5 && cg.rowsMode && cg.scrollable === false && cg.bar && cg.bar.w > cg.bar.h, cg);
  else check(`${tag} F-93 desktop shortlist chart keeps columns with names reading bottom-to-top`, cg.n >= 5 && !cg.rowsMode && cg.bar && cg.bar.h > cg.bar.w && /vertical-rl/.test(cg.labelStyle || '') && /matrix/.test(cg.labelStyle || ''), cg);
  await chart.screenshot({ path: `${OUT}/${tag}-shortlist-chart.png` }).catch(() => {});
  const stub = await page.evaluate(() => { const s = [...document.querySelectorAll('#benchmarks tbody th.bh-matrix-stub')].find((th) => th.querySelector('.bh-matrix-bench-inline')); if (!s) return null; const bench = s.querySelector('.bh-matrix-bench-inline'); const tip = bench.querySelector('button'); const range = document.createRange(); const textNode = [...bench.childNodes].find((n) => n.nodeType === 3); range.selectNodeContents(textNode); const rects = [...range.getClientRects()]; const last = rects[rects.length - 1]; const t = tip?.getBoundingClientRect(); return { name: textNode?.textContent, display: getComputedStyle(bench).display, lastLineTop: last && Math.round(last.top), tipTop: t && Math.round(t.top), tipH: t && Math.round(t.height), sameLine: last && t ? Math.abs((last.top + last.height / 2) - (t.top + t.height / 2)) < 8 : null }; });
  check(`${tag} F-92 the benchmark (i) sits on the same line as the last word of the name`, stub && stub.display === 'inline' && stub.sameLine, stub);
  const foot = await page.locator('#benchmarks p.bh-muted.text-xs').last().innerText().catch(() => '');
  check(`${tag} F-92 footnote starts with the rule, not a repeat of the intro; keeps the AA credit`, /^Bold is best in row/.test(foot) && /Artificial Analysis/.test(foot) && !/Every benchmark with a result for at least one/.test(foot), foot.slice(0, 120));
  await page.screenshot({ path: `${OUT}/${tag}-section2.png` });

  // F-91 desktop radar size.
  await goto(page, `${BASE}/compare`); await settle(page);
  const rg = await page.evaluate(() => { const svg = [...document.querySelectorAll('#benchmark-radar svg[role=group]')].find((s) => s.getBoundingClientRect().width > 100); const r = svg?.getBoundingClientRect(); return r && { w: Math.round(r.width), h: Math.round(r.height), vb: svg.getAttribute('viewBox') }; });
  if (!mobile) check(`${tag} F-91 desktop compare radar is ≥ 760 px wide (was 640)`, rg && rg.w >= 760 && /900 600/.test(rg.vb), rg);
  else check(`${tag} F-91 phone compare radar unchanged (360 viewBox, ≤ 360 px)`, rg && rg.w <= 360 && /360 360/.test(rg.vb), rg);
  await page.locator('#benchmark-radar').screenshot({ path: `${OUT}/${tag}-compare-radar.png` }).catch(() => {});
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 260)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
