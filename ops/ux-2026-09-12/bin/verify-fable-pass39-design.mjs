// Fable pass-39 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass39-design.mjs <base> <outDir>   ONLY=F-206d (or F-210, F-211) restricts the groups.
// Groups (all on the hidden v1.5 preview, /wip-oiifi41ouv1f/jevbench-v15):
//   F-206d  the leader line names the tied systems (PR #53 had put the artifact's bare "joint leaders (statistical tie)" first) — shipped by Fable;
//   F-211   a pill is a word, never a key, and an addendum row wears one pill — shipped by Fable;
//   F-210   the roster addendum is a table (one row per newcomer, the placement and the score with its interval as columns), not six paragraphs — directed.
// Fixed 2026-09-27 (iteration 251, claude-opus): F-210's intro check carried a template-literal escape (/v1\\.5\\.0/) into plain
// code, where it matches nothing — the group was unsatisfiable. The regex is now the intended one; no check was weakened.
// Launches its own Chromium. Writes <outDir>/verification.json, exits 1 on any failing check.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass39';
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const checks = [];
const check = (group, ctx, name, ok, detail) => { checks.push({ group, ctx, name, ok: !!ok, detail: detail == null ? '' : String(detail).slice(0, 400) }); };
const want = (g) => !ONLY || g === ONLY;
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : '';
const vis = (el) => !!(el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }));`;
const scrollThrough = async (p) => { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo(0, 0); }); await p.waitForTimeout(800); };

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  try {
  const p = await c.newPage(); p.setDefaultTimeout(20000);
  const pageErrors = []; p.on('pageerror', (error) => pageErrors.push(String(error.message)));
  const go = async (path) => { for (let a = 1; ; a++) { try { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(3000); } } await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(500); };

  await go('/wip-oiifi41ouv1f/jevbench-v15'); await scrollThrough(p);
  // F-223 (Fable pass 42, implemented iteration 269): the static official order and the weight-options table now sit in
  // closed <details>. Every marker F-206 a–e reads is still in the document; the fold is opened here so the checks below
  // measure rendered boxes rather than a collapsed one. Nothing about what is asserted changed.
  await p.evaluate(() => { for (const d of document.querySelectorAll('[data-bh-jev15-bars-fold], [data-bh-jev15-options-fold]')) d.open = true; });
  await p.waitForTimeout(400);
  const m = await p.evaluate(new Function(`${bxFn}
    const main = document.querySelector('main') || document.body; const all = (s) => [...main.querySelectorAll(s)];
    const leader = txt(main.querySelector('[data-bh-jev15-leader]'));
    const bars = all('[data-bh-jev15-bar]');
    const names = bars.slice(0, 3).map((b) => txt(b.querySelector('[title]')).replace(/\\s*(API|tariff)$/, '')).filter(Boolean);
    const pills = all('.bh-thin-tag').map(txt).filter((t) => t && !t.startsWith('Official'));
    const keyPills = [...new Set(pills.filter((t) => /_/.test(t)))];
    const addSec = main.querySelector('[data-bh-jev15-addendum-section]');
    const addRows = all('[data-bh-jev15-addendum-row]').map((r) => ({ pills: [...r.querySelectorAll('.bh-thin-tag')].map(txt), t: txt(r).slice(0, 500), h: bx(r).h, wouldPlace: (txt(r).match(/would place/gi) || []).length }));
    const honorable = all('[data-bh-jev15-honorable-row]').map((r) => [...r.querySelectorAll('.bh-thin-tag')].map(txt));
    const table = addSec ? addSec.querySelector('[data-bh-jev15-addendum-table]') : null;
    const ths = table ? [...table.querySelectorAll('thead th')].map(txt) : [];
    const trs = table ? [...table.querySelectorAll('tbody tr')].map((r) => ({ cells: [...r.querySelectorAll('td, th')].map(txt), pills: [...r.querySelectorAll('.bh-thin-tag')].map(txt), h: bx(r).h })) : [];
    const secP = addSec ? [...addSec.querySelectorAll(':scope > p')].map(txt) : [];
    const wrap = table ? table.parentElement : null;
    return { leader, names, keyPills, pillsN: pills.length, addSec: addSec ? bx(addSec) : null, addRows, honorable, table: !!table, ths, trs, secP, tableWrap: wrap ? { sw: wrap.scrollWidth, cw: wrap.clientWidth, ox: getComputedStyle(wrap).overflowX } : null, bodySw: document.documentElement.scrollWidth, bodyCw: document.documentElement.clientWidth };`));
  await p.screenshot({ path: `${OUT}/${ctx}-v15.png` });
  if (m.addSec) { await p.evaluate((y) => window.scrollTo(0, Math.max(0, y - 20)), m.addSec.y); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${ctx}-F-210.png` }); }
  if (want('F-206d')) {
    check('F-206d', ctx, 'the leader line does not open with a subjectless "joint leaders"', !!m.leader && !/^joint leaders/i.test(m.leader), m.leader);
    check('F-206d', ctx, 'the leader line names at least two systems that head the board', m.names.length >= 2 && m.names.filter((n) => m.leader.includes(n)).length >= 2, `${m.leader} :: ${m.names.join(' | ')}`);
    check('F-206d', ctx, 'the leader line says it is a tie', /tie/i.test(m.leader), m.leader);
  }
  if (want('F-211')) {
    check('F-211', ctx, 'no pill prints a key with an underscore', m.keyPills.length === 0, m.keyPills.join(', '));
    check('F-211', ctx, 'the honorable-mention row\'s listing pill reads as words', m.honorable.length >= 1 && m.honorable.every((ps) => ps.some((t) => /^honorable mention$/i.test(t))), JSON.stringify(m.honorable));
    const rows = m.table ? m.trs : m.addRows;
    check('F-211', ctx, 'every addendum row wears exactly one addendum pill (the addendum label), plus API at most', rows.length >= 1 && rows.every((r) => r.pills.filter((t) => /addendum/i.test(t)).length === 1), JSON.stringify(rows.map((r) => r.pills)));
  }
  if (want('F-210')) {
    check('F-210', ctx, 'the roster addendum is a table', m.table, m.addSec ? 'no [data-bh-jev15-addendum-table]' : 'no addendum section');
    check('F-210', ctx, 'one row per newcomer (6 today)', m.trs.length >= 6, String(m.trs.length));
    check('F-210', ctx, 'columns: system, would place (A), A score with interval, would place (B), B score with interval', /system/i.test(m.ths.join(' ')) && m.ths.filter((t) => /would place|placement|#/i.test(t)).length >= 2 && m.ths.filter((t) => /95%|interval|CI/i.test(t)).length >= 2, m.ths.join(' | '));
    check('F-210', ctx, 'the placement is a cell, not a sentence — no "would place" prose in a row', m.trs.length > 0 && m.trs.every((r) => !r.cells.some((t) => /would place/i.test(t))), JSON.stringify(m.trs.slice(0, 2).map((r) => r.cells)));
    check('F-210', ctx, 'the frozen-order sentence is said once, in the section intro, not per row', m.secP.some((t) => /outside the v1\.5\.0 order/i.test(t)) && m.trs.every((r) => !r.cells.some((t) => /stay outside/i.test(t))), m.secP.join(' // ').slice(0, 200));
    check('F-210', ctx, 'a row is one line at 1440 (≤ 48 px) and ≤ 96 px at 390', m.trs.length > 0 && m.trs.every((r) => r.h <= (mobile ? 96 : 48)), m.trs.map((r) => r.h).join(','));
    check('F-210', ctx, 'the table scrolls inside its own wrapper on a phone; the page never scrolls sideways', m.bodySw <= m.bodyCw + 1 && (!mobile || !m.tableWrap || m.tableWrap.sw <= m.tableWrap.cw + 1 || /auto|scroll/.test(m.tableWrap.ox)), JSON.stringify({ body: [m.bodySw, m.bodyCw], wrap: m.tableWrap }));
  }
  check(ONLY || 'page', ctx, 'no page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 300));
  } finally { await c.close(); }
}
} finally { await browser.close(); }
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
for (const c of checks.filter((c) => !c.ok)) console.log(`FAIL ${c.group} ${c.ctx} ${c.name} :: ${String(c.detail).slice(0, 200)}`);
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? ', ONLY=' + ONLY : ''})`);
process.exit(pass === checks.length ? 0 : 1);
