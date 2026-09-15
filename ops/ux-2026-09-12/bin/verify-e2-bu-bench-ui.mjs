// Live UI check for the E2 BU Bench V1 board (pattern of verify-e2-bullshitbench-ui, per-cohort design of
// verify-e2-benchmarks-ui for multi-harness boards like FrontierCode): the board opens on the larger evaluation
// group (BrowserUse 0.13.7 · BrowserUseCloud browser, 7 runs), the harness select lists both evaluation groups,
// switching to the CloudAPI v4 group renders its 2 runs; one notice line, unmatched source labels included, no
// overflow, no page errors; both hosts, 1440/390, light/dark.
// Usage: node ops/ux-2026-09-12/bin/verify-e2-bu-bench-ui.mjs OUT_DIR
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter64-e2-bubench-v1/ui';
mkdirSync(OUT, { recursive: true });
const HOSTS = { canonical: 'https://benchmarkheaven.com', legacy: 'https://model-market-comparison.app.mintapis.com' };
const BOARD = { key: 'bu-bench-v1', q: 'bu-bench-v1::snapshot-2026-09-09', name: /BU Bench V1/, cohorts: 2, first: { rows: 7, spot: ['claude-opus-4-7', '0.74'] }, second: { match: 'BrowserUseCloudAPI', rows: 2, spot: ['bu-v4-opus-4-8', '0.85'] } };
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
    harness: [...document.querySelectorAll('label')].filter((l) => /Evaluation group/.test(l.innerText)).map((l) => [...l.querySelectorAll('option')].map((o) => ({ value: o.value, text: o.textContent })))[0] ?? [],
    boxes: [...document.querySelectorAll('input[type=checkbox]')].map((i) => ({ label: i.closest('label')?.innerText.trim(), checked: i.checked })),
    sw: document.documentElement.scrollWidth, vw: window.innerWidth }));
  await p.screenshot({ path: `${OUT}/${hn}-${kind}_${theme}-${BOARD.key}.png` });
  check(`${tag}: board named`, BOARD.name.test(s.txt));
  check(`${tag}: ${BOARD.cohorts} evaluation groups`, s.harness.length === BOARD.cohorts, `options=${JSON.stringify(s.harness)}`);
  check(`${tag}: opening cohort renders ${BOARD.first.rows} runs on first load`, s.rows === BOARD.first.rows, `rows=${s.rows}`);
  check(`${tag}: opening spot value ${BOARD.first.spot[0]} = ${BOARD.first.spot[1]}`, s.txt.includes(BOARD.first.spot[0]) && s.txt.includes(BOARD.first.spot[1]), BOARD.first.spot.join(' '));
  check(`${tag}: no "No results in this view"`, !/No results in this view/.test(s.txt));
  const notices = (s.txt.match(/Showing self-reported results|Listed under the names the source publishes/g) || []).length;
  check(`${tag}: exactly one notice line`, notices === 1, `notices=${notices}`);
  check(`${tag}: unmatched box ticked`, s.boxes.some((x) => /not matched/.test(x.label || '') && x.checked), JSON.stringify(s.boxes));
  check(`${tag}: no overflow`, s.sw <= s.vw, `${s.sw}/${s.vw}`);
  check(`${tag}: no page errors`, errs.length === 0, errs.join(' | '));
  const second = s.harness.find((o) => o.text.includes(BOARD.second.match));
  check(`${tag}: second evaluation group present (${BOARD.second.match})`, !!second, JSON.stringify(s.harness));
  if (second) {
    await p.selectOption('label:has-text("Evaluation group / harness") select', second.value);
    await p.waitForTimeout(1200);
    const t = await p.evaluate(() => ({ txt: document.body.innerText, rows: document.querySelectorAll('table tbody tr').length, sw: document.documentElement.scrollWidth }));
    await p.screenshot({ path: `${OUT}/${hn}-${kind}_${theme}-${BOARD.key}-cloudapi.png` });
    check(`${tag}: CloudAPI cohort renders ${BOARD.second.rows} runs`, t.rows === BOARD.second.rows, `rows=${t.rows}`);
    check(`${tag}: CloudAPI spot value ${BOARD.second.spot[0]} = ${BOARD.second.spot[1]}`, t.txt.includes(BOARD.second.spot[0]) && t.txt.includes(BOARD.second.spot[1]), BOARD.second.spot.join(' '));
    check(`${tag}: CloudAPI cohort no overflow`, t.sw <= s.vw, `${t.sw}/${s.vw}`);
  }
  await c.close();
}
await b.close();
writeFileSync(`${OUT}/verification.json`, JSON.stringify({ at: new Date().toISOString(), fails, results }, null, 1) + '\n');
for (const r of results) if (!r.ok) console.log('FAIL', r.name, r.detail);
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
