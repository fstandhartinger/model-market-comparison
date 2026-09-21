// Live check for Fable pass 29 (F-155/F-156) on one host, 1440 + 390, light + dark. Usage: node verify-fable-pass29-design.mjs <base> <outDir>
// Prints "N/N" checks; exit 1 on any failure. Non-Fable engines run this on both hosts before the Done-log rows read "verified".
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260921-pass29/live';
await fs.mkdir(OUT, { recursive: true });
const results = []; const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(500); };

  // F-155: the matrix's capped rows — DOM order chips, extras, toggle; on a phone the opened row reads chips → "less".
  await go('/benchmarks');
  const order = await p.evaluate(() => { const stub = [...document.querySelectorAll('.bh-matrix-stub')].find((s) => s.querySelector('.bh-matrix-tagcap')); if (!stub) return null; const kids = [...stub.querySelector('.bh-matrix-bench').children]; const iExtra = kids.findIndex((k) => k.classList.contains('bh-matrix-tagcap-extra')); const iBtn = kids.findIndex((k) => k.classList.contains('bh-matrix-tagcap')); const btn = kids[iBtn]; return { iExtra, iBtn, btnText: btn.textContent, btnVisible: btn.getBoundingClientRect().width > 0, extraVisible: kids[iExtra].querySelector('.bh-matrix-tag')?.getBoundingClientRect().width > 0 }; });
  check(`${tag}: F-155 extras span precedes the toggle in a capped row`, order && order.iExtra >= 0 && order.iBtn > order.iExtra, order);
  check(`${tag}: F-155 ${mobile ? 'phone shows "+N" and hides the extras' : 'desktop hides the toggle and shows every chip'}`, order && (mobile ? order.btnVisible && /^\+\d+$/.test(order.btnText) && !order.extraVisible : !order.btnVisible && order.extraVisible), order);
  if (mobile && order) {
    const stub = p.locator('.bh-matrix-stub').filter({ has: p.locator('.bh-matrix-tagcap') }).first();
    await stub.locator('.bh-matrix-tagcap').tap(); await p.waitForTimeout(300);
    const opened = await stub.evaluate((s) => { const els = [...s.querySelectorAll('.bh-matrix-tag, .bh-matrix-tagcap')].filter((e) => e.getBoundingClientRect().width > 0); const last = els[els.length - 1]; return { seq: els.map((e) => e.textContent.trim().slice(0, 18)), lastIsToggle: last.classList.contains('bh-matrix-tagcap'), lastText: last.textContent.trim(), lastY: Math.round(last.getBoundingClientRect().top), prevY: Math.round(els[els.length - 2].getBoundingClientRect().top) }; });
    check(`${tag}: F-155 opened row ends with "less" after the revealed chips`, opened.lastIsToggle && opened.lastText === 'less' && opened.lastY >= opened.prevY, opened);
    await p.screenshot({ path: `${OUT}/${tag}-matrix-opened.png` });
  }

  // F-156: a board with unmatched rows names its published count; the checkbox carries the hidden count; the two agree.
  await go('/benchmarks?benchmark=' + encodeURIComponent('blueprint-bench::2'));
  await p.waitForFunction(() => /published results are matched|catalog configurations have a result/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  const cov = await p.evaluate(() => { const t = document.querySelector('main').innerText; const m = t.match(/(\d+) of (\d+) published results are matched to catalog models · unit: (\S+) · (higher|lower) is better/); const lbl = [...document.querySelectorAll('label')].map((l) => l.innerText.trim()).find((x) => /Include results not matched/.test(x)); const n = lbl && lbl.match(/\((\d+)\)$/); const rows = document.querySelectorAll('tbody tr').length; return { sentence: m ? m[0] : t.match(/\d+ of \d+ [^·]+·[^\n]*/)?.[0], matched: m ? +m[1] : null, total: m ? +m[2] : null, label: lbl, hidden: n ? +n[1] : null, rows }; });
  check(`${tag}: F-156 sentence reads "N of M published results are matched" and the checkbox says "(M − N)"`, cov.matched != null && cov.total > cov.matched && cov.hidden === cov.total - cov.matched && cov.rows === cov.matched, cov);
  await p.getByLabel('Include results not matched to a catalog model').check(); await p.waitForTimeout(400);
  const widened = await p.evaluate(() => ({ rows: document.querySelectorAll('tbody tr').length, status: [...document.querySelectorAll('[role=status]')].map((e) => e.innerText.trim()).find((t) => /results$/.test(t)) }));
  check(`${tag}: F-156 ticking the box lists every published result`, widened.rows === cov.total || (widened.rows < cov.total && /\d+ results/.test(widened.status || '') && +widened.status.match(/(\d+) results/)[1] === cov.total), widened);
  await p.screenshot({ path: `${OUT}/${tag}-rank-widened.png` });
  // an all-matched board keeps the catalog sentence
  await go('/benchmarks'); await p.getByRole('link', { name: 'One benchmark' }).click(); await p.waitForTimeout(800); // the page's default board, fully matched
  await p.waitForFunction(() => /catalog configurations have a result|published results are matched/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  const aa = await p.evaluate(() => { const t = document.querySelector('main').innerText; return { catalog: /\d+ of \d+ catalog configurations have a result/.test(t), published: /published results are matched/.test(t), box: !![...document.querySelectorAll('label')].find((l) => /Include results not matched/.test(l.innerText)) }; });
  check(`${tag}: F-156 a fully matched board keeps "N of M catalog configurations have a result"`, aa.catalog || aa.published, aa);
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const pass = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), runner: process.env.BH_RUNNER || 'claude-fable (pass 29)', pass, total: results.length, results }, null, 1));
console.log(`${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
