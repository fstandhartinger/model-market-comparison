// F-65 live acceptance: boards never open empty. Usage: node verify-f65.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass11/verify-f65';
await fs.mkdir(OUT, { recursive: true });
const BOARDS = [
  { key: 'vals-code-migration', q: 'vals-index-code-migration::2', unmatched: true },
  { key: 'cursorbench', q: 'cursorbench::4.0', unmatched: true },
  { key: 'apprentice-cua', q: 'apprenticebench-cua::snapshot-2026-09-14', unmatched: true },
  { key: 'frontiercode', q: 'frontiercode::1.1', unmatched: true },
];
const b = await chromium.launch(); const results = []; let fails = 0;
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); if (!ok) fails++; };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`; const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(900); };
  const state = () => p.evaluate(() => {
    const txt = document.body.innerText;
    const sel = [...document.querySelectorAll('select')].map((s) => s.options[s.selectedIndex]?.text || '');
    const boxes = [...document.querySelectorAll('input[type=checkbox]')].map((i) => ({ label: i.closest('label')?.innerText.trim(), checked: i.checked }));
    const panel = document.querySelector('.bh-panel'); const styled = !!panel && parseFloat(getComputedStyle(panel).borderRadius || '0') > 0 && !/Times/i.test(getComputedStyle(document.body).fontFamily);
    return { styled, rows: document.querySelectorAll('table tbody tr').length, txt, sel, boxes, status: [...document.querySelectorAll('[role=status]')].map((e) => e.innerText.trim()), sw: document.documentElement.scrollWidth, vw: window.innerWidth };
  });
  await go('/benchmarks'); let s = await state();
  check(`${tag} AA index: stylesheet applied`, s.styled);
  check(`${tag} AA index: Measured only`, s.sel.some((t) => /Measured only/.test(t)), s.sel.join(' | '));
  check(`${tag} AA index: 641 results`, /641 results/.test(s.txt), s.status.join(' | '));
  check(`${tag} AA index: no widening notice`, !/Showing self-reported|Listed under the names/.test(s.txt));
  check(`${tag} AA index: no overflow`, s.sw <= s.vw, `${s.sw}/${s.vw}`);
  for (const bd of BOARDS) {
    await go(`/benchmarks?benchmark=${encodeURIComponent(bd.q)}`); s = await state();
    await p.screenshot({ path: `${OUT}/${tag}-${bd.key}.png` });
    check(`${tag} ${bd.key}: stylesheet applied`, s.styled);
    check(`${tag} ${bd.key}: >=1 row on first load`, s.rows >= 1, `rows=${s.rows}`);
    check(`${tag} ${bd.key}: no "0 of" coverage sentence`, !/\b0 of \d+ catalog/.test(s.txt));
    check(`${tag} ${bd.key}: no "No results in this view"`, !/No results in this view/.test(s.txt));
    const notices = (s.txt.match(/Showing self-reported results|Listed under the names the source publishes/g) || []).length;
    check(`${tag} ${bd.key}: exactly one notice line`, notices === 1, `notices=${notices}`);
    check(`${tag} ${bd.key}: Evidence = All · prefer measured`, s.sel.some((t) => /All/.test(t)), s.sel.join(' | '));
    if (bd.unmatched) check(`${tag} ${bd.key}: unmatched box ticked`, s.boxes.some((x) => /not matched/.test(x.label || '') && x.checked), JSON.stringify(s.boxes));
    check(`${tag} ${bd.key}: no jargon`, !/nmatched source identit/.test(s.txt));
    check(`${tag} ${bd.key}: no overflow`, s.sw <= s.vw, `${s.sw}/${s.vw}`);
  }
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | '));
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), fails, results }, null, 1));
for (const r of results) if (!r.ok) console.log('FAIL', r.name, r.detail || '');
console.log(`${results.length - fails}/${results.length} passed (${BASE})`);
process.exit(fails ? 1 : 0);
