// F-84 / F-85 live check (Fable pass 16): single-value matrix rows carry no data bar; the status line has one total.
// Usage: node verify-f84-f85.mjs <base> <outdir>   (1440/390 × light/dark; writes verification.json + shots)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/tmp/verify-f84-f85';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme });
  const p = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await p.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(1000);
  const s = await p.evaluate(() => {
    // F-84 is about benchmark rows. Category header rows (CR-25.6) carry a category composite and, by the
    // pass-18 rule "a header row shows numbers or nothing", deliberately no data bar — they are excluded
    // here (2026-09-16: this is why the check read 27/37 after the category composites shipped).
    const rows = [...document.querySelectorAll('table.bh-matrix tbody tr')]
      .filter((tr) => tr.querySelector('td') && !tr.classList.contains('bh-matrix-group'));
    let single = 0, singleWithBar = 0, multi = 0, multiWithBar = 0;
    for (const tr of rows) {
      const tds = [...tr.querySelectorAll('td')]; const vals = tds.filter((td) => !td.querySelector('.bh-matrix-missing') && td.innerText.trim() && td.innerText.trim() !== '—').length;
      const bars = tr.querySelectorAll('.bh-matrix-bar').length;
      if (vals === 1) { single++; if (bars) singleWithBar++; } else if (vals >= 2) { multi++; if (bars) multiWithBar++; }
    }
    const status = document.querySelector('[role=status]')?.innerText.replace(/\s+/g, ' ').trim() ?? '';
    const chooser = document.querySelector('.bh-rowpicker summary')?.textContent ?? '';
    return { rows: rows.length, single, singleWithBar, multi, multiWithBar, status, chooser, w: document.documentElement.scrollWidth };
  });
  await p.screenshot({ path: `${OUT}/${tag}-benchmarks.png` });
  const m = s.status.match(/^(\d+) benchmarks across (\d+) categories · /);
  check(`${tag} F-84 rows with one value have no bar (single=${s.single})`, s.single > 0 && s.singleWithBar === 0, JSON.stringify(s));
  check(`${tag} F-84 rows with ≥ 2 values keep their bars`, s.multi > 0 && s.multiWithBar === s.multi, `${s.multiWithBar}/${s.multi}`);
  check(`${tag} F-85 status line: one total, no "rows"`, m && !/\brows\b/.test(s.status), s.status);
  check(`${tag} F-85 table rows ≥ benchmarks; chooser count equals status count`, m && s.rows >= Number(m[1]) && s.chooser.includes(`(${m[1]} of `), `${s.rows} rows · ${s.chooser.trim()}`);
  check(`${tag} no horizontal overflow, no page errors`, s.w <= vp.width && errors.length === 0, `${s.w}px ${errors.join(' | ')}`);
  await c.close();
}
await b.close();
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 1));
for (const x of checks) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.name} — ${String(x.detail).slice(0, 200)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
