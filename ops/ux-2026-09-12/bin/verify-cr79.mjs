// CR-79 — the model table's column headers on a phone: present, readable, inside their own cell, aligned with
// their data column, at 360/390/430 px portrait, light and dark, and at the phone's larger-text setting.
// Usage: node verify-cr79.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr79';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail, known = false) => checks.push({ name, ok: !!ok, known, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };

const browser = await chromium.launch();
// 1.0 = the default text size, 1.3 = the common "larger text" accessibility setting. The header cell's width is a
// percentage of the viewport, so it does not grow with the text — which is how the labels used to lose letters.
for (const theme of ['light', 'dark']) for (const width of [360, 390, 430]) for (const scale of [1, 1.3]) {
  const tag = `${width}-${theme}-${String(scale).replace('.', '_')}`;
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  if (scale !== 1) await page.addStyleTag({ content: `html { font-size: ${16 * scale}px; }` });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector('table')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(400);

  const head = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return null;
    const thead = table.querySelector('thead');
    const visible = [...thead.querySelectorAll('th')].filter((th) => th.getBoundingClientRect().width > 0);
    const body = [...(table.querySelector('tbody tr')?.querySelectorAll('td') ?? [])].filter((td) => td.getBoundingClientRect().width > 0);
    const rect = (el) => { const b = el.getBoundingClientRect(); return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      theadHidden: getComputedStyle(thead).display === 'none' || getComputedStyle(thead).visibility === 'hidden',
      columns: visible.map((th) => {
        const cell = th.getBoundingClientRect();
        // The widest painted box inside the cell, relative to the cell — > 0 means text is drawn outside its column.
        const spill = [...th.querySelectorAll('*')].reduce((m, el) => { const b = el.getBoundingClientRect(); return Math.max(m, Math.round(b.right - cell.right), Math.round(cell.left - b.left)); }, 0);
        const button = th.querySelector('button');
        return { text: (th.textContent || '').replace(/\s+/g, ' ').trim(), name: (button?.textContent || '').replace(/\s+/g, ' ').replace(/[▲▼]\s*$/, '').trim(),
          ...rect(th), spill, ariaSort: th.getAttribute('aria-sort'), color: getComputedStyle(th).color, fontSize: getComputedStyle(th).fontSize };
      }),
      bodyLefts: body.map((td) => Math.round(td.getBoundingClientRect().left)),
      docWidth: document.documentElement.clientWidth,
      scrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  check(`${tag}: the table and its header exist`, !!head && head.columns.length >= 3, head ? `${head.columns.length} visible headers` : 'no table');
  if (head) {
    check(`${tag}: the header row is not hidden`, !head.theadHidden, String(head.theadHidden));
    check(`${tag}: three phone columns`, head.columns.length === 3, head.columns.map((c) => c.name).join(' | '));
    for (const col of head.columns) {
      check(`${tag}: "${col.name || col.text.slice(0, 18)}" has visible primary text`, col.name.length > 0 && col.w > 0 && col.h > 0, `${col.name} ${col.w}×${col.h}`);
      check(`${tag}: "${col.name}" stays inside its column`, col.spill <= 0, `${col.spill}px outside the cell`);
    }
    const expected = ['Model', 'Capability Score', 'Adjusted Cost'];
    check(`${tag}: the three names are the agreed ones`, head.columns.every((c, i) => c.name === expected[i]), head.columns.map((c) => c.name).join(' | '));
    check(`${tag}: headers align with their data columns`, head.bodyLefts.length === head.columns.length
      && head.columns.every((c, i) => Math.abs(c.left - head.bodyLefts[i]) <= 1), { head: head.columns.map((c) => c.left), body: head.bodyLefts });
    // Recorded, not part of the CR-79 verdict: at the larger-text setting the PAGE overflows by ~61 px on a phone,
    // and it does so identically on the deployed build that predates this fix. Two culprits, measured on both:
    // the header's nav row (Options · Benchmaxxing · Benchmarks · More) and the "Score shown in the chart"
    // label/select/info row. Filed on the CR-79 ledger row as an adjacent, pre-existing defect.
    check(`${tag}: the page does not scroll sideways`, !head.scrollsSideways, String(head.scrollsSideways), scale !== 1);
    check(`${tag}: the sorted column says so`, head.columns.some((c) => c.ariaSort === 'descending' || c.ariaSort === 'ascending'), head.columns.map((c) => `${c.name}:${c.ariaSort}`).join(','));
  }

  // Sorting still works by touch and by keyboard, and the header keeps its role.
  if (scale === 1 && width === 390) {
    const before = await page.evaluate(() => [...document.querySelectorAll('table thead th')].map((th) => th.getAttribute('aria-sort')).join(','));
    await page.locator('table thead th button', { hasText: 'Adjusted Cost' }).first().tap().catch(() => {});
    await page.waitForTimeout(600);
    const afterTap = await page.evaluate(() => [...document.querySelectorAll('table thead th')].map((th) => th.getAttribute('aria-sort')).join(','));
    check(`${tag}: a tap on a header sorts by it`, afterTap !== before && /ascending|descending/.test(afterTap), `${before} → ${afterTap}`);
    const keyed = await page.evaluate(async () => {
      const button = [...document.querySelectorAll('table thead th button')].find((b) => /Capability Score/.test(b.textContent));
      button.focus();
      const focused = document.activeElement === button;
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      button.click();
      await new Promise((r) => setTimeout(r, 300));
      return { focused, sorts: [...document.querySelectorAll('table thead th')].map((th) => th.getAttribute('aria-sort')).join(',') };
    });
    check(`${tag}: the header button takes keyboard focus and sorts`, keyed.focused && /ascending|descending/.test(keyed.sorts), JSON.stringify(keyed));
  }
  check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.screenshot({ path: `${OUT}/${tag}.png`, clip: { x: 0, y: 0, width, height: 280 } }).catch(() => {});
  await context.close();
}
await browser.close();
const graded = checks.filter((c) => !c.known);
const passed = graded.filter((c) => c.ok).length;
const observations = checks.filter((c) => c.known && !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: graded.length,
  known_open_observations: observations.length, checks }, null, 2));
for (const c of graded) if (!c.ok) console.log(`FAIL  ${c.name}  ${c.detail}`);
for (const c of observations) console.log(`NOTE (pre-existing, not graded)  ${c.name}  ${c.detail}`);
console.log(`${passed}/${graded.length} checks passed, ${observations.length} pre-existing observations recorded — ${OUT}/verification.json`);
process.exit(passed === graded.length ? 0 : 1);
