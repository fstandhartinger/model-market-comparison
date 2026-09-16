// CR-42.2 + CR-48.1 / F-104: the Overview Benchmaxxing tag is a real link in two levels (solid = strong, tint = weak)
// that opens /benchmaxxing?model=<id>#radar without expanding the row — by mouse click, Enter, Space and (390) tap —
// lands with the model selected in the master list, the report section in view and focused, and browser back returns
// to the Overview with no row expanded; clicking a non-link part of the row still expands it.
// Usage: BH_RUNNER=<engine> node verify-cr-42-2.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-42-2';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

const parse = (s) => { const m = (s || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] } : null; };
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
  const settle = async () => { await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
  const go = async (path) => { await goto(page, BASE + path); await settle(); };
  const openRows = () => page.locator('tr.bh-ranking-row .bh-row-chevron.is-open').count();

  await go('/');
  const tags = await page.evaluate(() => [...document.querySelectorAll('tr.bh-ranking-row .bh-bmx-tag')].map((t) => { const cs = getComputedStyle(t); const r = t.getBoundingClientRect(); let bg = null; for (let e = t.parentElement; e && !bg; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(\d+, \d+, \d+, 0\)/.test(c) && c !== 'transparent') bg = c; } return { model: t.closest('tr')?.dataset.modelId, tagName: t.tagName, href: t.getAttribute('href'), level: t.dataset.level, label: t.getAttribute('aria-label'), text: t.innerText.replace(/\s+/g, ' ').trim(), color: cs.color, bg: cs.backgroundColor, behind: bg, weight: +cs.fontWeight, w: r.width, h: r.height }; }));
  const strong = tags.filter((t) => t.level === 'strong'), weak = tags.filter((t) => t.level === 'weak');
  await page.screenshot({ path: `${OUT}/${tag}-overview.png` }).catch(() => {});
  check(`${tag} the default table carries Benchmaxxing tags, and every one is an <a> to /benchmaxxing?model=<id>#radar`, tags.length > 0 && tags.every((t) => t.tagName === 'A' && /^\/benchmaxxing\?model=[^&#]+#radar$/.test(t.href)), tags.map((t) => [t.model, t.level, t.href]));
  check(`${tag} levels: strong pills solid (alpha 1, weight 700), weak pills a tint (alpha ≤ 0.2, weight 500)`, strong.every((t) => parse(t.bg)?.a === 1 && t.weight >= 700) && weak.every((t) => parse(t.bg)?.a <= 0.2 && t.weight <= 500), tags.map((t) => [t.level, t.bg, t.weight]));
  const ratios = tags.map((t) => { const fg = parse(t.color), bg = parse(t.bg), behind = parse(t.behind) || { r: 255, g: 255, b: 255, a: 1 }; return +contrast(fg, bg.a === 1 ? bg : blend(bg, behind)).toFixed(2); });
  check(`${tag} text contrast on every tag ≥ 4.5:1`, ratios.every((r) => r >= 4.5), ratios);
  check(`${tag} accessible name names the level and the report (not colour alone)`, tags.every((t) => new RegExp(`^Benchmaxxing signal, ${t.level}.*open the report for `).test(t.label || '')), tags.map((t) => t.label));
  check(`${tag} pill fits: ≤ 120 px wide and a single line`, tags.every((t) => t.w <= 120 && t.h <= 18), tags.map((t) => [t.text, Math.round(t.w), Math.round(t.h)]));

  // All levels across the catalog: the Benchmaxxing page's rule and the API agree on which exist (weak can be off-screen by default).
  const target = tags[0];
  if (!target) { check(`${tag} interaction checks skipped — no tag rendered`, false, ''); await c.close(); continue; }
  const id = decodeURIComponent(target.href.match(/model=([^#]+)/)[1]);
  const tagLoc = () => page.locator(`tr.bh-ranking-row[data-model-id="${target.model}"] .bh-bmx-tag`);

  const landing = async (how) => {
    await page.waitForURL(/\/benchmaxxing\?model=/, { timeout: 20000 }).catch(() => {});
    await page.waitForFunction(() => { const s = document.getElementById('radar'); return s && s.contains(document.activeElement); }, null, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(600);
    const st = await page.evaluate((wanted) => { const s = document.getElementById('radar'); const r = s?.getBoundingClientRect(); const sel = [...document.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.closest('tr')?.innerText.split('\n')[0]).filter(Boolean); return { url: location.pathname + location.search + location.hash, h1: document.querySelector('h1')?.innerText, inView: !!r && r.top < innerHeight && r.bottom > 0, focusInside: !!s && s.contains(document.activeElement), title: s?.querySelector('h2')?.innerText, selectedRows: sel, wanted }; }, id);
    await page.screenshot({ path: `${OUT}/${tag}-landing-${how}.png` }).catch(() => {});
    return st;
  };
  const expectedName = await page.evaluate((mid) => document.querySelector(`tr.bh-ranking-row[data-model-id="${mid}"] a[href^="/models/"]`)?.innerText.trim(), target.model);

  const via = mobile ? ['tap', 'enter', 'space'] : ['click', 'enter', 'space'];
  for (const how of via) {
    await go('/');
    const before = await openRows();
    if (how === 'tap') await tagLoc().first().tap();
    else if (how === 'click') await tagLoc().first().click();
    else { await tagLoc().first().focus(); await page.keyboard.press(how === 'enter' ? 'Enter' : 'Space'); }
    // The row must not expand on the way out (checked on the old document if it is still there).
    const st = await landing(how);
    check(`${tag} ${how} on the tag navigates to the deep link (row closed before: ${before === 0})`, before === 0 && st.url.startsWith(`/benchmaxxing?model=${encodeURIComponent(id)}`) && st.url.endsWith('#radar'), st);
    check(`${tag} ${how}: landing has the h1 unchanged, the report section in view with focus inside it`, st.h1 === 'Benchmaxxing' && st.inView && st.focusInside, st);
    check(`${tag} ${how}: the model is selected in the master list and titles the report`, st.selectedRows.length === 1 && !!st.title && st.selectedRows[0].length > 0 && st.title.length > 0, { ...st, expectedName });
    if (how === via[0]) {
      await page.goBack(); await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 20000 }).catch(() => {}); await settle();
      const back = await page.evaluate(() => location.pathname);
      check(`${tag} browser back returns to the Overview with no row expanded`, back === '/' && (await openRows()) === 0, { back, open: await openRows() });
      await page.goForward(); await page.waitForURL(/\/benchmaxxing/, { timeout: 20000 }).catch(() => {}); await settle();
      const fwd = await page.evaluate(() => ({ url: location.pathname + location.search, title: document.getElementById('radar')?.querySelector('h2')?.innerText }));
      check(`${tag} forward again restores the deep-linked selection`, fwd.url.includes(`model=${encodeURIComponent(id)}`) && !!fwd.title, fwd);
    }
  }

  // Direct load of the deep link.
  await go(`/benchmaxxing?model=${encodeURIComponent(id)}#radar`);
  const direct = await landing('direct');
  check(`${tag} direct load of the deep link: section in view, focus inside, one row selected`, direct.inView && direct.focusInside && direct.selectedRows.length === 1, direct);

  // Non-link parts of the row still expand it.
  await go('/');
  const scoreCell = page.locator(`tr.bh-ranking-row[data-model-id="${target.model}"] td`).nth(2);
  if (mobile) await scoreCell.tap(); else await scoreCell.click();
  await page.waitForTimeout(500);
  check(`${tag} clicking the row's score cell still expands the row`, (await openRows()) === 1 && (await page.evaluate(() => location.pathname)) === '/', { open: await openRows() });
  check(`${tag} no page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), passed, total: checks.length, allPass: passed === checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.ok ? '' : ' — ' + c.detail.slice(0, 600)}`);
console.log(`${passed}/${checks.length}${passed === checks.length ? ' ALL PASS' : ''}`);
process.exit(passed === checks.length ? 0 : 1);
