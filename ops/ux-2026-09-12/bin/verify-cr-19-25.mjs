// CR-20260915d quick fixes: CR-19.1/19.3, CR-20.1, CR-21.2, CR-22.1–22.3, CR-23.1, CR-24.1, CR-25.1–25.3.
// Data checks against the deployed API; UI checks at 1440/390, light/dark. Usage: node verify-cr-19-25.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-19-25';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// CR-22.1 data: Muse Spark 1.3 no longer gets a percentile from a two-variant cohort.
const report = (await (await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent('muse-spark-1.3::xhigh')}`)).json()).report;
const agent = report.profile.axes.filter((a) => /Coding Agent/.test(a.name) && a.nativeValue != null);
check('CR-22.1 Muse Spark 1.3 (xhigh): no Coding Agent Index axis plotted at percentile 0 from a 2-variant cohort', !report.profile.axes.some((a) => /Coding Agent/.test(a.name) && a.value === 0), agent);

const alpha = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length >= 4 ? Number(p[3]) : 1; };
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

  // CR-25.1 Options label; CR-25.2 no confidential filter; CR-25.3 company toggle out of Data confidentiality.
  const optBtn = page.locator('header button[data-bh-filters-toggle]').first();
  check(`${tag} CR-25.1 header button reads Options`, (await optBtn.innerText()).trim() === 'Options' && (await optBtn.getAttribute('aria-label')) === 'Open options', await optBtn.innerText());
  await optBtn.click(); await page.locator('#global-filters').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  const dialog = page.locator('#global-filters');
  check(`${tag} CR-25.1 dialog is named Options`, (await dialog.getAttribute('aria-label')) === 'Options', await dialog.getAttribute('aria-label'));
  const dialogText = await dialog.innerText();
  check(`${tag} CR-25.2 no 'Strong confidential guarantees' filter`, !/Strong confidential guarantees/i.test(dialogText), '');
  const placement = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('#global-filters *')].filter((el) => /^(Price basis|Data confidentiality)$/i.test((el.childNodes[0]?.textContent || '').trim()));
    const company = [...document.querySelectorAll('#global-filters button, #global-filters label')].find((el) => /buying for a company/i.test(el.textContent || ''));
    const box = (el) => { let n = el; while (n && n.parentElement && !(n.parentElement.id === 'global-filters' || n.parentElement.classList.contains('space-y-4') || n.parentElement.classList.contains('space-y-3'))) n = n.parentElement; return n; };
    return { company: !!company, inPrice: company ? /Price basis/i.test(box(company)?.textContent || '') && !/Data confidentiality/i.test(box(company)?.textContent || '') : false, sections: sections.length };
  });
  check(`${tag} CR-25.3 'I'm buying for a company' sits in Price basis, not Data confidentiality`, placement.company && placement.inPrice, placement);
  await page.screenshot({ path: `${OUT}/${tag}-options.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);

  // CR-24.1: value tag left of the price, one line.
  const tagLine = await page.evaluate(() => {
    const t = [...document.querySelectorAll('tr.bh-ranking-row .bh-value-tag')].find((el) => el.offsetParent);
    if (!t) return null;
    const line = t.parentElement, price = [...line.children].find((c) => c !== t);
    const a = t.getBoundingClientRect(), b = price?.getBoundingClientRect();
    return { tagRight: a.right, priceLeft: b?.left, tagMid: (a.top + a.bottom) / 2, priceTop: b?.top, priceBottom: b?.bottom, lineH: line.getBoundingClientRect().height };
  });
  check(`${tag} CR-24.1 value tag is left of the price on the same line`, tagLine && tagLine.tagRight <= tagLine.priceLeft + 1 && tagLine.tagMid >= tagLine.priceTop - 2 && tagLine.tagMid <= tagLine.priceBottom + 2 && tagLine.lineH < 32, tagLine);

  // CR-23.1: More menu anchored to its button.
  const summary = mobile ? page.locator('header summary', { hasText: /^More$/ }).first() : page.locator('nav[aria-label=Primary] summary', { hasText: 'More' }).first();
  await summary.click(); await page.waitForTimeout(300);
  const anchor = await summary.evaluate((s) => { const a = s.getBoundingClientRect(), m = s.parentElement.querySelector('div').getBoundingClientRect(); return { sl: a.left, sr: a.right, sb: a.bottom, ml: m.left, mr: m.right, mt: m.top, vw: innerWidth }; });
  const anchored = mobile ? Math.abs(anchor.mr - anchor.sr) <= 2 && anchor.ml >= 0 : Math.abs(anchor.ml - anchor.sl) <= 2;
  check(`${tag} CR-23.1 More menu opens under its own button, inside the viewport`, anchored && anchor.mt >= anchor.sb && anchor.mt - anchor.sb <= 16 && anchor.mr <= anchor.vw, anchor);
  await page.screenshot({ path: `${OUT}/${tag}-more-menu.png` });
  await summary.click();

  // Compare: CR-19.1 opaque tooltip, CR-19.3 default axes, CR-20.1 equal columns.
  await goto(page, `${BASE}/compare`); await settle(page); await page.waitForTimeout(1500);
  const axesText = await page.locator('#benchmark-radar').innerText().catch(() => '');
  check(`${tag} CR-19.3 default radar axes include DesignArena Full-Stack and not Frontend`, /Full-Stack/.test(axesText) && !/DesignArena Frontend/.test(axesText), axesText.slice(0, 300));
  const hit = page.locator('#benchmark-radar svg [role=button]').filter({ visible: true }).first();
  // Focus opens the same tooltip as a tap (RadarHit onFocus); a physical tap can land on an overlapping point.
  await hit.focus().catch(() => hit.dispatchEvent('click'));
  await page.waitForTimeout(400);
  const bg = await page.locator('#benchmark-radar [role=status]').first().evaluate((el) => getComputedStyle(el).backgroundColor).catch(() => null);
  check(`${tag} CR-19.1 radar tooltip background is opaque`, bg && alpha(bg) === 1 && bg !== 'rgba(0, 0, 0, 0)', bg);
  await page.locator('#benchmark-radar').screenshot({ path: `${OUT}/${tag}-compare-radar.png` }).catch(() => {});
  const widths = await page.evaluate(() => { const t = document.querySelector('#full-comparison table'); if (!t) return null; return [...t.querySelectorAll('thead th')].slice(1).map((th) => Math.round(th.getBoundingClientRect().width)); });
  check(`${tag} CR-20.1 full comparison model columns have equal widths`, widths && widths.length >= 2 && Math.max(...widths) - Math.min(...widths) <= 1, widths);

  // Benchmaxxing: CR-21.2 bar scale, CR-22.2 sentence, CR-22.3 faint spokes.
  await goto(page, `${BASE}/benchmaxxing`); await settle(page); await page.waitForTimeout(1500);
  const bars = await page.evaluate(() => {
    const fracs = [...document.querySelectorAll('[data-signal-frac]')].filter((el) => el.offsetParent).map((el) => Number(el.getAttribute('data-signal-frac')));
    return { n: fracs.length, max: Math.max(...fracs), fracs, label: document.querySelector('[data-signal-max]')?.textContent || '' };
  });
  // Re-pinned 2026-09-17 (iteration 101): CR-63.5(a) replaced "the max of the visible list" with one scale across all
  // tabs, and F-112 made that scale signed around zero, so the visible maximum is no longer 1 and the old caption is
  // gone. What CR-21.2 actually asked for — differences clearly visible, never a fixed max — is what is checked now.
  // The scale's wording lives in the Signal (i), which only renders its text once opened; the caption is asserted in
  // test/fable-pass21-f112-f114.test.mjs and bin/verify-f112-f114.mjs instead. Here: the bars themselves.
  check(`${tag} CR-21.2 signal bars vary on one shared, bounded scale`,
    bars.n > 0 && bars.fracs.every((f) => Math.abs(f) <= 1 + 1e-6) && new Set(bars.fracs).size > 1, bars);
  const note = await page.locator('[data-jagged-note]').first().innerText().catch(() => '');
  // Re-pinned 2026-09-17 (iteration 101): CR-22.2 allows the wording to be polished, and CR-65.18(e) required exactly
  // that — Florian judged "the more jagged, the more benchmaxxed" an overstatement. The requirement that survives is
  // one plain sentence by the radar that says how to read the shape and does not claim proof.
  check(`${tag} CR-22.2 one plain sentence by the radar says how to read the shape, without claiming proof`,
    note.length > 0 && /jagged/.test(note) && /not proof|not a flag|a screen/.test(note), note);
  const spokes = await page.evaluate(() => { const svg = [...document.querySelectorAll('section[aria-label="Per-model Benchmaxxing report"] svg')].find((s) => s.querySelectorAll('line').length > 10); return svg ? [...new Set([...svg.querySelectorAll('line')].map((l) => l.getAttribute('opacity')))] : null; });
  check(`${tag} CR-22.3 radial spoke lines are faint (opacity <= 0.14)`, spokes && spokes.every((o) => Number(o) <= 0.14), spokes);
  await page.locator('section[aria-label="Per-model Benchmaxxing report"]').screenshot({ path: `${OUT}/${tag}-benchmaxxing-report.png` }).catch(() => {});

  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
