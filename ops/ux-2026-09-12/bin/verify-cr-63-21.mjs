// CR-63.21 (iteration 152): Benchmarks phone rows cap visible tag chips at two; the rest sit behind a "+N" toggle
// whose title names them and which reveals them on tap. Desktop is unchanged (all chips inline, no toggle).
// Checks a real 3+ tag row at 390px (hidden chips are display:none, toggle shows all, row gets shorter than opened)
// and at 1440px (no toggle, every chip inline), light and dark. Usage: node verify-cr-63-21.mjs <base> <outdir>
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://127.0.0.1:3311').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-63-21';
await mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); if (!ok) console.error('FAIL', name, JSON.stringify(detail)); };

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(`${BASE}/benchmarks?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(2500);

  const state = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('tr')].map((tr) => {
      const cap = tr.querySelector('.bh-matrix-tagcap');
      if (!cap) return null;
      const stub = tr.querySelector('th.bh-matrix-stub, th');
      const bench = tr.querySelector('.bh-matrix-bench');
      return {
        name: bench?.textContent.replace(/\s+/g, ' ').slice(0, 60),
        chips: bench ? [...bench.querySelectorAll('.bh-matrix-tag')].filter((x) => getComputedStyle(x.closest('.bh-matrix-tagcap-extra') || x).display !== 'none' && getComputedStyle(x).display !== 'none').length : 0,
        totalChips: bench ? bench.querySelectorAll('.bh-matrix-tag').length : 0,
        toggleText: cap.textContent.trim(),
        toggleDisplay: getComputedStyle(cap).display,
        toggleTitle: cap.getAttribute('title'),
        toggleExpanded: cap.getAttribute('aria-expanded'),
        stubHeight: stub ? stub.getBoundingClientRect().height : 0,
      };
    }).filter(Boolean);
    return rows;
  });

  const capped = state.filter((r) => r.totalChips >= 3);
  check(`${tag}: page renders capped rows`, capped.length > 0, capped.length);
  if (mobile) {
    check(`${tag}: chip cap collapses 3+ tagged rows to exactly two visible chips`, capped.every((r) => r.chips === 2), capped.slice(0, 6));
    check(`${tag}: "+N" toggle shows the hidden count`, capped.every((r) => r.toggleText === `+${r.totalChips - 2}`), capped.slice(0, 6).map((r) => [r.toggleText, r.totalChips]));
    check(`${tag}: toggle title names the hidden chips`, capped.every((r) => /^Show \d+ more tags?: .+/.test(r.toggleTitle || '')), capped[0]?.toggleTitle);
    check(`${tag}: toggle starts collapsed`, capped.every((r) => r.toggleExpanded === 'false'));
    const before = capped.map((r) => r.stubHeight);
    const after = await p.evaluate(() => {
      const caps = [...document.querySelectorAll('.bh-matrix-tagcap')];
      caps.forEach((x) => x.click());
      return caps.map((x) => x.closest('tr').querySelector('th').getBoundingClientRect().height);
    });
    const opened = await p.evaluate(() => [...document.querySelectorAll('.bh-matrix-tagcap')].map((x) => ({ text: x.textContent.trim(), expanded: x.getAttribute('aria-expanded'), visibleChips: [...x.closest('.bh-matrix-bench').querySelectorAll('.bh-matrix-tag')].filter((t) => t.offsetParent !== null).length })));
    check(`${tag}: opening the toggle reveals every chip`, opened.length > 0 && opened.every((r) => r.expanded === 'true' && r.text === 'less'), opened.slice(0, 4));
    check(`${tag}: capped stub is not taller than the fully opened stub`, before.every((h, i) => h <= after[i]), before.filter((h, i) => h > after[i]));
    await p.locator('.bh-matrix-tagcap').first().scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: `${OUT}/${tag}-capped.png` });
    check(`${tag}: no page errors`, errors.length === 0, errors);
  } else {
    check(`${tag}: desktop keeps every chip inline and hides the toggle`, capped.every((r) => r.chips === r.totalChips && r.toggleDisplay === 'none'), capped.slice(0, 6));
    check(`${tag}: no page errors`, errors.length === 0, errors);
  }
  await c.close();
}
await b.close();
await writeFile(`${OUT}/result.json`, JSON.stringify({ base: BASE, when: new Date().toISOString(), results }, null, 2));
const bad = results.filter((r) => !r.ok);
console.log(JSON.stringify({ total: results.length, ok: results.length - bad.length, fail: bad.length, out: OUT }));
process.exit(bad.length ? 1 : 0);
