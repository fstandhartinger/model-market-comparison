// Fable pass-22 screenshot matrix: what changed since pass 21 — iterations 96–101. CR-69/71/74/77/78 (signed Benchmaxxing
// score, three tag levels, Featured/Top 50/All scored presets, multi-expand rows), F-112 (diverging Signal bar), F-113 (ring
// labels off the spoke), F-114 (one explainer, one status line), F-115 (Full scale on the control row), CR-72 (hero wrap),
// CR-75 (section headers, green-line caption, Capability Score column), CR-76 (value-map axis labels), CR-77.3 (grace band),
// CR-79 (+ follow-up: two-line header at 1.3× text), CR-74.3 (Thin data badge), CR-74.5 (Advanced options inline).
// Usage: node shoot-fable-pass22.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260918-pass22';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const FRONTIER = 'claude-fable-5.1::high', WIDE = 'minimax-m2.7::default', TAGGED = 'deepseek-v4.1-flash::default';
const txt = (s) => s.replace(/\s+/g, ' ').trim();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = 'element'; } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };
  const radarGeom = (el) => { const s = el.querySelector('svg'); if (!s) return null; const sb = s.getBoundingClientRect(); const wrap = (s.closest('[data-radar-wrap]') || s.parentElement).getBoundingClientRect(); const texts = [...s.querySelectorAll('text')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent.trim().slice(0, 28), x: Math.round(r.left - sb.left), y: Math.round(r.top - sb.top), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.t); const rings = texts.filter((x) => /^(0|50|100|p\d+|avg p-?\d+|[AB] avg p\d+|percentile|position)$/.test(x.t)); const pts = [...s.querySelectorAll('circle')].filter((c) => !c.getAttribute('stroke-dasharray') && +c.getAttribute('r') <= 6 && +c.getAttribute('r') >= 2).map((c) => { const r = c.getBoundingClientRect(); return { x: r.left - sb.left, y: r.top - sb.top, w: r.width, h: r.height }; }); const hit = rings.filter((l) => pts.some((q) => !(q.x > l.x + l.w || q.x + q.w < l.x || q.y > l.y + l.h || q.y + q.h < l.y))).map((l) => l.t); return { svg: [Math.round(sb.width), Math.round(sb.height)], wrap: Math.round(wrap.width), rings: rings.map((r) => `${r.t}@${r.x},${r.y}`), ringHitsPoint: hit, points: pts.length, dashed: [...s.querySelectorAll('circle')].filter((c) => c.getAttribute('stroke-dasharray')).length, outside: [...s.parentElement.querySelectorAll('span, text')].map((t) => { const r = t.getBoundingClientRect(); return { t: t.textContent.trim().slice(0, 20), o: r.left < wrap.left - 1 || r.right > wrap.right + 1 }; }).filter((x) => x.t && x.o).map((x) => x.t) }; };

  // ---- Overview Simple: hero (CR-72), section headers + caption (CR-75), value map axes (CR-76) + grace band (CR-77.3), phone headers (CR-79) ----
  await step('simple', async () => {
    await go('/'); await rec('simple'); await rec('simple-full', true);
    metrics.shots[`${tag}-hero`] = await p.evaluate(() => { const h = document.querySelector('h1'); if (!h) return null; const lines = (el) => { const r = el.getClientRects(); return r.length; }; const spans = [...h.querySelectorAll('span, strong, em, b')]; return { text: h.innerText.replace(/\s+/g, ' | ').slice(0, 200), fs: getComputedStyle(h).fontSize, h: Math.round(h.getBoundingClientRect().height), parts: spans.map((s) => ({ t: s.innerText.slice(0, 60), fs: getComputedStyle(s).fontSize, rects: lines(s) })) }; });
    metrics.shots[`${tag}-headings`] = await p.evaluate(() => [...document.querySelectorAll('main h2, main h3')].map((h) => `${h.tagName} ${h.innerText.replace(/\s+/g, ' ').trim().slice(0, 90)} @${Math.round(h.getBoundingClientRect().top + scrollY)}`).slice(0, 20));
    metrics.shots[`${tag}-table-head`] = await p.evaluate(() => { const ths = [...document.querySelectorAll('main table thead th')]; return ths.map((th) => { const r = th.getBoundingClientRect(); return `${th.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)} [${Math.round(r.width)}x${Math.round(r.height)}]`; }); });
    metrics.shots[`${tag}-first-row-top`] = await p.evaluate(() => { const td = document.querySelector('main table tbody tr td'); return td ? Math.round(td.getBoundingClientRect().top + scrollY) : null; });
    const map = p.locator('svg').filter({ has: p.locator('[data-frontier-id], polyline, path[stroke]') }).first();
    const fig = map.locator('xpath=ancestor::*[self::figure or self::section or self::div[contains(@class,"card") or contains(@class,"bh-card")]][1]');
    if (await fig.count()) { await recEl('simple-map', fig); metrics.shots[`${tag}-map-text`] = txt(await fig.innerText()).slice(0, 700); }
    metrics.shots[`${tag}-map-axes`] = await p.evaluate(() => { const s = [...document.querySelectorAll('main svg')].find((x) => x.querySelector('[data-frontier-id]') || x.querySelectorAll('circle').length > 5); if (!s) return null; const sb = s.getBoundingClientRect(); const wrap = s.parentElement.getBoundingClientRect(); const t = [...s.querySelectorAll('text')].map((x) => ({ t: x.textContent.trim(), fs: getComputedStyle(x).fontSize, x: Math.round(x.getBoundingClientRect().left - sb.left), y: Math.round(x.getBoundingClientRect().top - sb.top) })); const axes = t.filter((x) => /capab|cost|task|score/i.test(x.t)); const onLine = [...s.querySelectorAll('[data-frontier-id]')].map((x) => x.getAttribute('data-frontier-id')); const htmlAxes = [...s.parentElement.parentElement.querySelectorAll('span, p, div, figcaption')].map((x) => x.innerText?.replace(/\s+/g, ' ').trim()).filter((x) => x && x.length < 80 && /capab|cost|task|green|line/i.test(x)).slice(0, 8); return { svg: [Math.round(sb.width), Math.round(sb.height)], wrap: Math.round(wrap.width), axes, onLine, htmlAxes, labels: t.filter((x) => !/^[\d$.,]+[kM]?$/.test(x.t)).length }; });
    metrics.shots[`${tag}-simple-tags`] = await p.evaluate(() => [...document.querySelectorAll('table a[href*="benchmaxxing"], table [data-bh-tag]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20));
    metrics.shots[`${tag}-score-head`] = await p.evaluate(() => { const th = [...document.querySelectorAll('main table thead th')].find((x) => /score/i.test(x.innerText)); if (!th) return null; return { text: th.innerText.replace(/\n/g, ' | '), html: th.innerHTML.replace(/\s+/g, ' ').slice(0, 500) }; });
    await recEl('simple-table-head', p.locator('main table thead').first());
  });
  if (mobile) await step('simple-large-text', async () => {
    await go('/'); await p.evaluate(() => { document.documentElement.style.fontSize = '20.8px'; }); await p.waitForTimeout(800);
    await rec('simple-largetext'); await recEl('simple-largetext-header', p.locator('header').first()); await recEl('simple-largetext-thead', p.locator('main table thead').first());
    metrics.shots[`${tag}-largetext`] = await p.evaluate(() => { const hd = document.querySelector('header'); const nav = hd?.querySelector('nav'); const links = [...(hd?.querySelectorAll('a, button') || [])].map((a) => { const r = a.getBoundingClientRect(); return `${a.innerText.replace(/\s+/g, ' ').trim().slice(0, 18) || a.getAttribute('aria-label')}@${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`; }); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, headerH: Math.round(hd?.getBoundingClientRect().height || 0), navH: Math.round(nav?.getBoundingClientRect().height || 0), links, ths: [...document.querySelectorAll('main table thead th')].map((th) => `${th.innerText.replace(/\s+/g, ' ').trim().slice(0, 50)} [${Math.round(th.getBoundingClientRect().width)}x${Math.round(th.getBoundingClientRect().height)}]`) }; });
  });
  // ---- Advanced: Thin data badge (CR-74.3), options inline (CR-74.5) ----
  await step('advanced', async () => {
    await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced');
    metrics.shots[`${tag}-advanced-controls`] = await p.evaluate(() => { const main = document.querySelector('main'); const tbl = main.querySelector('table'); const top = tbl ? tbl.getBoundingClientRect().top + scrollY : 0; const ctl = [...main.querySelectorAll('button, select, input, summary, label')].filter((e) => e.getBoundingClientRect().top + scrollY < top && e.getBoundingClientRect().width > 0).map((e) => `${e.tagName.toLowerCase()}:${(e.innerText || e.getAttribute('aria-label') || e.type || '').replace(/\s+/g, ' ').trim().slice(0, 30)}`); return { tableTop: Math.round(top), n: ctl.length, ctl: ctl.slice(0, 60) }; });
    const thin = p.locator('table').locator('text=/Thin data/i').first(); if (await thin.count()) { await thin.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await rec('advanced-thin'); metrics.shots[`${tag}-thin`] = await p.evaluate(() => { const els = [...document.querySelectorAll('table *')].filter((e) => e.children.length === 0 && /thin data/i.test(e.textContent)); return { n: els.length, first: els[0] ? { cls: els[0].className, title: els[0].getAttribute('title') || els[0].closest('[title]')?.getAttribute('title'), row: els[0].closest('tr')?.innerText.replace(/\s+/g, ' ').slice(0, 160), rowIdx: [...els[0].closest('tbody').children].indexOf(els[0].closest('tr')) } : null }; }); }
    const better = p.getByRole('button', { name: /Better than a model/ }).first(); if (await better.count()) { const before = await p.evaluate(() => [...document.querySelectorAll('main button')].slice(0, 12).map((b) => Math.round(b.getBoundingClientRect().left))); await better.click(); await p.waitForTimeout(600); const after = await p.evaluate(() => [...document.querySelectorAll('main button')].slice(0, 12).map((b) => Math.round(b.getBoundingClientRect().left))); metrics.shots[`${tag}-popover-shift`] = { before, after, shifted: before.some((v, i) => v !== after[i]) }; await rec('advanced-popover'); await p.keyboard.press('Escape'); }
    metrics.shots[`${tag}-advanced-tags`] = await p.evaluate(() => [...document.querySelectorAll('table a[href*="benchmaxxing"]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 30));
  });

  // ---- Benchmaxxing: presets, signed bars (F-112), status line + intro (F-114), multi-expand (CR-71.4), radar rings (F-113) ----
  await step('benchmaxxing', async () => {
    await go('/benchmaxxing'); await p.waitForTimeout(1200); await rec('benchmaxxing'); await rec('benchmaxxing-full', true);
    metrics.shots[`${tag}-bmx`] = await p.evaluate(() => { const main = document.querySelector('main'); const tbl = main.querySelector('table'); const firstTd = tbl?.querySelector('tbody td'); const presets = [...main.querySelectorAll('button[aria-pressed], [role=tab]')].map((b) => `${b.innerText.trim()}${b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true' ? '*' : ''}`); const status = [...main.querySelectorAll('p, div')].map((x) => x.innerText?.replace(/\s+/g, ' ').trim()).filter((t) => t && /carry|tag|threshold|≥|light|medium/i.test(t) && t.length < 400 && t.length > 30); const intro = main.innerText.replace(/\s+/g, ' ').slice(0, 700); const rows = [...(tbl?.querySelectorAll('tbody tr') || [])].slice(0, 20).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 120)); const bars = [...(tbl?.querySelectorAll('tbody tr') || [])].slice(0, 20).map((r) => { const bar = r.querySelector('[data-signal-bar], [class*=signal] [style*=width], [style*="width"]'); return bar ? bar.getAttribute('style')?.slice(0, 80) : null; }); const ths = [...(tbl?.querySelectorAll('thead th') || [])].map((t) => t.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)); const checks = [...main.querySelectorAll('input[type=checkbox]')].map((c) => c.closest('label')?.innerText.trim().slice(0, 40)); return { firstRowTop: firstTd ? Math.round(firstTd.getBoundingClientRect().top + scrollY) : null, presets, status: status.slice(0, 4), intro, ths, rows, bars, checks }; });
    const sig = p.locator('main table thead th').filter({ hasText: /signal/i }).first(); if (await sig.count()) { const iBtn = sig.locator('button').first(); if (await iBtn.count()) { await iBtn.click(); await p.waitForTimeout(500); await rec('bmx-signal-info'); metrics.shots[`${tag}-bmx-signal-info`] = await p.evaluate(() => (document.querySelector('[role=tooltip], [role=dialog]')?.innerText || '').replace(/\s+/g, ' ').slice(0, 600)); await p.keyboard.press('Escape'); await p.waitForTimeout(300); } }
    await recEl('bmx-table', p.locator('main table').first());
    const expanders = p.locator('main table tbody button[aria-expanded]');
    const n = await expanders.count(); metrics.shots[`${tag}-bmx-expanders`] = n;
    if (n >= 2) { await expanders.nth(0).click(); await p.waitForTimeout(800); await expanders.nth(1).click(); await p.waitForTimeout(1200); metrics.shots[`${tag}-bmx-open`] = await p.evaluate(() => [...document.querySelectorAll('main table tbody button[aria-expanded="true"]')].length); await rec('bmx-two-open'); const fr = p.locator('main table tbody tr').first(); await recEl('bmx-two-open-el', p.locator('main table').first()); }
    for (const preset of ['Top 50', 'All scored']) { const btn = p.getByRole('button', { name: new RegExp(`^${preset}`) }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(1200); await rec(`bmx-${preset.replace(/\W+/g, '').toLowerCase()}`); metrics.shots[`${tag}-bmx-${preset.replace(/\W+/g, '').toLowerCase()}`] = await p.evaluate(() => ({ status: [...document.querySelectorAll('main p, main div')].map((x) => x.innerText?.replace(/\s+/g, ' ').trim()).filter((t) => t && /carry|threshold/i.test(t) && t.length < 400).slice(0, 2), rows: [...document.querySelectorAll('main table tbody tr')].length, first: [...document.querySelectorAll('main table tbody tr')].slice(0, 6).map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 100)) })); } }
  });
  for (const [name, id] of [['tagged', TAGGED], ['frontier', FRONTIER], ['wide', WIDE]]) await step(`bmx-${name}`, async () => {
    await go(`/benchmaxxing?model=${encodeURIComponent(id)}#radar`); await p.waitForTimeout(1500);
    const radar = p.locator('#radar').first(); if (await radar.count()) { await recEl(`bmx-radar-${name}`, radar); metrics.shots[`${tag}-bmx-radar-${name}-geom`] = await radar.evaluate(radarGeom); metrics.shots[`${tag}-bmx-radar-${name}-copy`] = await radar.evaluate((el) => [...el.querySelectorAll('p, figcaption, [data-jagged-note]')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)); }
    if (name === 'tagged') { await rec('bmx-report'); await rec('bmx-report-full', true); }
  });

  // ---- Compare: control row with Full scale (F-115), ring labels (F-113) ----
  await step('compare', async () => {
    await go('/compare'); await p.waitForTimeout(1800); await rec('compare');
    const radar = p.locator('svg').filter({ has: p.locator('polygon') }).first();
    if (await radar.count()) {
      const fig = radar.locator('xpath=ancestor::*[self::figure or self::section][1]');
      await recEl('compare-radar', fig); metrics.shots[`${tag}-compare-radar-text`] = txt(await fig.innerText()).slice(0, 700);
      metrics.shots[`${tag}-compare-controls`] = await p.evaluate(() => { const btns = [...document.querySelectorAll('button[aria-pressed]')]; const cb = document.querySelector('input[type=checkbox]'); const lab = cb?.closest('label'); return { btns: btns.map((b) => { const r = b.getBoundingClientRect(); return `${b.innerText.trim()}${b.getAttribute('aria-pressed') === 'true' ? '*' : ''}@${Math.round(r.left)},${Math.round(r.top + scrollY)} h${Math.round(r.height)}`; }).slice(0, 12), checkbox: lab ? `${lab.innerText.trim()}@${Math.round(lab.getBoundingClientRect().left)},${Math.round(lab.getBoundingClientRect().top + scrollY)} h${Math.round(lab.getBoundingClientRect().height)}` : null }; });
      metrics.shots[`${tag}-compare-radar-geom`] = await fig.evaluate(radarGeom);
      const detailed = p.getByRole('button', { name: /^Detailed$/ }).first(); if (await detailed.count()) { await detailed.click(); await p.waitForTimeout(1200); await recEl('compare-radar-detailed', fig); metrics.shots[`${tag}-compare-detailed-geom`] = await fig.evaluate(radarGeom); }
    }
  });

  // ---- Model page, Guided ----
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); await rec('model-full', true); metrics.shots[`${tag}-model-bmx`] = await p.evaluate(() => [...document.querySelectorAll('a[href*="benchmaxxing"]')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)); });
  await step('guided', async () => { await go('/'); await p.getByRole('tab', { name: 'Guided' }).click(); await p.waitForTimeout(1000); await rec('guided'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 2500)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
