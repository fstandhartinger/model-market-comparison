// Live verifier for Fable pass 30 (F-157, F-158, F-159) — for a non-Fable engine to run on both hosts before the Done-log rows read
// `verified`. Usage: node verify-fable-pass30-design.mjs <base> <outDir>
//   F-157: on /jev-models the "What changed in the score" note sits below the board's ranking chart (chart top < note top) and above
//          "What the run says"; wording intact; the note is one element.
//   F-158: on /jev-models/multimodal-preview the banner text is exactly the one required sentence; the ranking table has no
//          "Calibration" header and no cell reading "Not measured" outside the price column; the sentence about calibration stays.
//   F-159: every ranking row's "All real" cell has a bar whose width matches the row's accuracy (±1.5 pt), the first row's bar is the
//          widest, and the bars are visible at 390 without sideways scrolling.
// Plus: no page errors, no horizontal overflow, 1440/390 × light/dark. Exit code 1 on any failed check.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/opt/benchmarkheaven/state/ux-evidence/fable-20260922-pass30/verify-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail).slice(0, 300)}`); };
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const REQUIRED = 'Preview — multimodal JevBench, results may change; not part of the JevBench Score';
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };
  const go = async (path) => { await goto(p, `${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  try {
    // F-157
    await go('/jev-models');
    const jev = await p.evaluate(() => {
      const top = (el) => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
      const notes = document.querySelectorAll('[data-bh-jev-score-change]');
      const note = notes[0];
      const chart = document.querySelector('[data-bh-jev12-main-chart]');
      const findings = document.querySelector('[aria-labelledby="jev12-headline"]');
      const h1 = document.querySelector('main h1');
      return { notes: notes.length, noteTop: top(note), chartTop: top(chart), chartBottom: chart ? Math.round(chart.getBoundingClientRect().bottom + scrollY) : null, findingsTop: top(findings), h1Top: top(h1), text: note ? note.innerText.replace(/\s+/g, ' ').trim() : '' };
    });
    check(`${tag}: F-157 one note, below the ranking chart and above "What the run says"`, jev.notes === 1 && jev.chartTop != null && jev.noteTop > jev.chartBottom - 4 && jev.findingsTop != null && jev.noteTop < jev.findingsTop, jev);
    check(`${tag}: F-157 wording intact`, /^What changed in the score A system that is cheap and fast but barely better than guessing could rank high; intelligence is now measured above chance, and systems below half-way get a growing penalty\. The tasks, Calibration, Speed, Cost and ranking eligibility are unchanged\.$/.test(jev.text), jev.text);
    check(`${tag}: /jev-models no horizontal overflow`, (await overflow()) <= 1, await overflow());
    await p.locator('[data-bh-jev-score-change]').scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: `${OUT}/${tag}-jev-note.png` }).catch(() => {});
    // F-158 / F-159
    await go('/jev-models/multimodal-preview');
    const mm = await p.evaluate(() => {
      const banner = document.querySelector('[data-bh-mm-preview-banner]');
      const table = document.querySelector('[data-bh-mm-overall]');
      const ths = [...table.querySelectorAll('thead th')].map((t) => t.innerText.trim());
      const rows = [...table.querySelectorAll('tbody tr')].map((tr) => {
        const cell = tr.querySelector('[data-bh-mm-real]');
        const track = cell && cell.querySelector('span[aria-hidden]');
        const bar = track && track.firstElementChild;
        const cellR = cell ? cell.getBoundingClientRect() : null;
        const cells = [...tr.querySelectorAll('td')].map((td) => td.innerText.trim());
        return { acc: cell ? Number(cell.getAttribute('data-bh-mm-real')) : null, trackW: track ? track.getBoundingClientRect().width : 0, barW: bar ? bar.getBoundingClientRect().width : 0, barH: bar ? bar.getBoundingClientRect().height : 0, cellRight: cellR ? Math.round(cellR.right) : null, notMeasured: cells.slice(0, -1).filter((t) => /Not measured/i.test(t)).length };
      });
      const sub = [...document.querySelectorAll('main p')].map((e) => e.innerText).find((t) => /Calibration was not measured/.test(t)) || '';
      return { banner: banner ? banner.innerText.replace(/\s+/g, ' ').trim() : '', ths, rows, sub, cw: document.documentElement.clientWidth };
    });
    check(`${tag}: F-158 banner is exactly the required sentence`, mm.banner === REQUIRED, mm.banner);
    check(`${tag}: F-158 no Calibration column, no constant "Not measured" cell`, !mm.ths.includes('Calibration') && mm.rows.length >= 5 && mm.rows.every((r) => r.notMeasured === 0), { ths: mm.ths, rows: mm.rows.map((r) => r.notMeasured) });
    check(`${tag}: F-158 the calibration sentence stays above the table`, /Calibration was not measured because these runs returned labels rather than probability distributions/.test(mm.sub), mm.sub.slice(0, 120));
    const widths = mm.rows.map((r) => ({ want: Math.max(2, r.acc * 100), got: r.trackW ? (r.barW / r.trackW) * 100 : -1, barH: r.barH }));
    check(`${tag}: F-159 every row's bar width matches its accuracy (±1.5 pt)`, widths.length >= 5 && widths.every((w) => Math.abs(w.want - w.got) <= 1.5 && w.barH >= 5), widths);
    check(`${tag}: F-159 the first row's bar is the widest and bars fit the viewport`, mm.rows[0].barW >= Math.max(...mm.rows.map((r) => r.barW)) - 0.5 && mm.rows.every((r) => r.cellRight != null && r.cellRight <= mm.cw), { cw: mm.cw, rights: mm.rows.map((r) => r.cellRight) });
    check(`${tag}: /jev-models/multimodal-preview no horizontal page overflow`, (await overflow()) <= 1, await overflow());
    await p.locator('[data-bh-mm-overall]').scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: `${OUT}/${tag}-mm-table.png` }).catch(() => {});
    await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${OUT}/${tag}-mm-top.png` }).catch(() => {});
    check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
  } finally { await c.close(); }
}
await b.close();
const pass = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/results.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, total: results.length, results }, null, 1));
console.log(`${pass}/${results.length} checks passed — ${OUT}`);
process.exit(pass === results.length ? 0 : 1);
