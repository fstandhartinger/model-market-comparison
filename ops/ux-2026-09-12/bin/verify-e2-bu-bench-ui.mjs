// Live UI check for the E2 BU Bench V1 board (pattern of verify-e2-bullshitbench-ui): the board opens with all 9
// runs on first load, one notice line, unmatched source labels included, no overflow, no page errors; both hosts,
// 1440/390, light/dark. Usage: node ops/ux-2026-09-12/bin/verify-e2-bu-bench-ui.mjs OUT_DIR
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter64-e2-bubench-v1/ui';
mkdirSync(OUT, { recursive: true });
const HOSTS = { canonical: 'https://benchmarkheaven.com', legacy: 'https://model-market-comparison.app.mintapis.com' };
const BOARD = { key: 'bu-bench-v1', q: 'bu-bench-v1::snapshot-2026-09-09', name: /BU Bench V1/, rows: 9 };
const results = []; let fails = 0;
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); if (!ok) fails++; };
const b = await chromium.launch();
for (const [hn, base] of Object.entries(HOSTS)) for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${hn} ${kind}_${theme} ${BOARD.key}`; const errs = [];
  p.on('pageerror', (e) => errs.push(String(e.message)));
  await p.goto(`${base}/benchmarks?benchmark=${encodeURIComponent(BOARD.q)}`, { waitUntil: 'networkidle', timeout: 90_000 });
  await p.waitForTimeout(900);
  const s = await p.evaluate(() => ({
    txt: document.body.innerText, rows: document.querySelectorAll('table tbody tr').length,
    boxes: [...document.querySelectorAll('input[type=checkbox]')].map((i) => ({ label: i.closest('label')?.innerText.trim(), checked: i.checked })),
    sw: document.documentElement.scrollWidth, vw: window.innerWidth }));
  await p.screenshot({ path: `${OUT}/${hn}-${kind}_${theme}-${BOARD.key}.png` });
  check(`${tag}: board named`, BOARD.name.test(s.txt));
  check(`${tag}: all ${BOARD.rows} runs on first load`, s.rows >= BOARD.rows, `rows=${s.rows}`);
  check(`${tag}: no "No results in this view"`, !/No results in this view/.test(s.txt));
  const notices = (s.txt.match(/Showing self-reported results|Listed under the names the source publishes/g) || []).length;
  check(`${tag}: exactly one notice line`, notices === 1, `notices=${notices}`);
  check(`${tag}: unmatched box ticked`, s.boxes.some((x) => /not matched/.test(x.label || '') && x.checked), JSON.stringify(s.boxes));
  check(`${tag}: no overflow`, s.sw <= s.vw, `${s.sw}/${s.vw}`);
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | '));
  await c.close();
}
await b.close();
writeFileSync(`${OUT}/verification.json`, JSON.stringify({ at: new Date().toISOString(), fails, results }, null, 1) + '\n');
for (const r of results) if (!r.ok) console.log('FAIL', r.name, r.detail);
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
