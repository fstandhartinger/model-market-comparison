// CR-47.1 / F-103 (Fable pass 19): the strong value-tag level is plainly more emphatic than the weak one — solid pill vs
// pale tint, bolder type, AA text contrast on both — in both signal colours, light and dark, 1440 and 390.
// F-105: a best-of row on the Benchmarks page carries no "Version …" sub-line and no visible note sentence.
// Usage: BH_RUNNER=<engine> node verify-cr-47.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-47';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const parse = (s) => { const m = (s || "").match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null; };
const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await goto(page, BASE + path); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };

  await go('/');
  const tags = await page.evaluate(() => [...document.querySelectorAll('.bh-value-tag')].map((t) => { const cs = getComputedStyle(t); const r = t.getBoundingClientRect(); let bg = null; for (let e = t.parentElement; e && !bg; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(\d+, \d+, \d+, 0\)/.test(c) && c !== 'transparent') bg = c; } return { model: t.closest('tr')?.querySelector('td,th')?.innerText.split('\n')[0].replace(/^›/, ''), kind: t.dataset.kind, level: t.dataset.level, color: cs.color, bg: cs.backgroundColor, behind: bg, shadow: cs.boxShadow, weight: +cs.fontWeight, w: r.width, h: r.height, arrow: t.querySelector('[aria-hidden]')?.textContent }; }));
  const strong = tags.filter((t) => t.level === 'strong'), weak = tags.filter((t) => t.level === 'weak');
  check(`${tag} both levels present in the default table`, strong.length > 0 && weak.length > 0, tags.map((t) => [t.model, t.kind, t.level]));
  check(`${tag} strong pills are solid (background alpha 1), weak pills are a pale tint (alpha ≤ 0.2), no outline on either`, strong.every((t) => parse(t.bg)?.a === 1) && weak.every((t) => parse(t.bg)?.a <= 0.2) && tags.every((t) => t.shadow === 'none'), tags.map((t) => [t.level, t.bg, t.shadow]));
  check(`${tag} strong type is heavier than weak (700 vs ≤ 600)`, strong.every((t) => t.weight >= 700) && weak.every((t) => t.weight < 700), tags.map((t) => [t.level, t.weight]));
  const ratios = tags.map((t) => { const fg = parse(t.color), bg = parse(t.bg), behind = parse(t.behind) || { r: 255, g: 255, b: 255, a: 1 }; const pill = bg.a === 1 ? bg : blend(bg, behind); return { level: t.level, kind: t.kind, ratio: +contrast(fg, pill).toFixed(2) }; });
  check(`${tag} text contrast on every pill ≥ 4.5:1 (WCAG AA)`, ratios.every((r) => r.ratio >= 4.5), ratios);
  check(`${tag} strong pill fill is the signal colour, weak text is the signal colour (same hue, two weights of emphasis)`, strong.every((s) => weak.some((w) => w.kind === s.kind ? parse(w.color).r === parse(s.bg).r && parse(w.color).g === parse(s.bg).g : true)), tags.map((t) => [t.level, t.kind, t.color, t.bg]));
  check(`${tag} arrows still tell the levels apart (↑↓ strong, ↗↘ weak)`, strong.every((t) => /^[↑↓]$/.test(t.arrow)) && weak.every((t) => /^[↗↘]$/.test(t.arrow)), tags.map((t) => [t.level, t.arrow]));
  const first = page.locator('.bh-value-tag').first(); if (await first.count()) { await first.scrollIntoViewIfNeeded(); const tbl = page.locator('table').filter({ has: page.locator('tr.bh-ranking-row') }).first(); await tbl.screenshot({ path: `${OUT}/${tag}-table.png` }).catch(() => {}); }
  for (const level of ['strong', 'weak']) { const row = page.locator(`.bh-value-tag[data-level="${level}"]`).first().locator('xpath=ancestor::tr[1]'); if (await row.count()) { await row.scrollIntoViewIfNeeded(); await row.screenshot({ path: `${OUT}/${tag}-${level}-row.png` }).catch(() => {}); } }

  // F-105: best-of rows on the Benchmarks page
  await go('/benchmarks'); await page.waitForTimeout(800);
  const bo = await page.evaluate(() => [...document.querySelectorAll('table.bh-matrix tbody tr')].filter((r) => /^best of/.test(r.querySelector('th .bh-matrix-cohort')?.textContent ?? '')).map((r) => { const th = r.querySelector('th'); return { name: th?.querySelector('.bh-matrix-bench')?.innerText.replace(/\s+/g, ' '), subs: [...th.querySelectorAll('.bh-matrix-sub')].map((s) => s.innerText), noteVisible: !!th.querySelector('.bh-matrix-sub[data-best-of-note]'), hover: th.querySelector('.bh-matrix-desc')?.getAttribute('title') ?? '', lines: Math.round(th.getBoundingClientRect().height) }; }));
  check(`${tag} best-of rows show no "Version …" sub-line and no visible note sentence; the note is on the description's hover`, bo.length > 0 && bo.every((r) => !r.noteVisible && !r.subs.some((s) => /^Version /.test(s)) && /best recorded result/.test(r.hover) && /best of/.test(r.name)), bo);
  const boRow = page.locator('table.bh-matrix tbody tr').filter({ has: page.locator('th .bh-matrix-cohort', { hasText: /^best of/ }) }).first(); if (await boRow.count()) { await boRow.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await boRow.screenshot({ path: `${OUT}/${tag}-bestof-row.png` }).catch(() => {}); }
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 600)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
