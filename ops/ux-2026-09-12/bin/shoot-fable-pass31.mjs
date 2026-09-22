// Fable pass-31 screenshot matrix: what changed since pass 30 — the Compare page with mixed measured / self-reported (†) / preliminary (‡)
// rows (CR-127), the "not measured yet" compare state for a launch link naming an unknown id (CR-122), the launch-day model pages
// (CR-123–CR-126: Claude Opus 5.5, GPT-6 Sol/Luna with vendor claims; Union Alpha with chart-read values), the singular counts (D173) and
// the attribution rows (D172) — plus the quick views. 1440/390 × light/dark. Usage: node shoot-fable-pass31.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260922-pass31/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const metrics = { base: BASE, at: new Date().toISOString(), shots: {}, errors: {} };
const measure = (p) => p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const MIXED = ['claude-opus-5.5::max', 'gpt-6-sol::max', 'claude-fable-5::max'];
const MIXED_Q = MIXED.map((id) => `model=${encodeURIComponent(id)}`).join('&');
const UNKNOWN_Q = `model=${encodeURIComponent('claude-opus-5.5::max')}&model=gpt-7-sol`;
const VENDOR = 'claude-opus-5.5::max', VENDOR2 = 'gpt-6-sol::max', PRELIM = 'union-alpha::default', FRONTIER = 'claude-fable-5.1::high', ONE_OFFER = 'grok-4::default';
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : null;
const style = (el, props) => { if (!el) return null; const cs = getComputedStyle(el); return Object.fromEntries(props.map((k) => [k, cs[k]])); };
const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
const minFont = (root) => { let m = 99, who = null; for (const e of (root || document).querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + txt(e).slice(0, 40); } } return { px: m, who }; };
const glyphs = (root) => { const out = { internalArrowUp: [], externalArrowRight: [] }; for (const a of (root || document).querySelectorAll('a[href]')) { const t = txt(a); const href = a.getAttribute('href') || ''; const ext = /^https?:\\/\\//.test(href) && !href.startsWith(location.origin); if (!ext && /↗/.test(t)) out.internalArrowUp.push({ t: t.slice(0, 50), href: href.slice(0, 80) }); if (ext && /→/.test(t)) out.externalArrowRight.push({ t: t.slice(0, 50), href: href.slice(0, 80) }); } return out; };
const overflow = (root) => [...(root || document).querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, cls: (e.className || '').toString().slice(0, 60), sw: e.scrollWidth, cw: e.clientWidth }));
const plural1 = (root) => [...(root || document).querySelectorAll('p, span, td, th, li, h1, h2, h3, summary, div')].map((e) => txt(e)).filter((t) => t && t.length < 200 && /(?<![\\d.])\\b1 (models|offers|benchmarks|results|values|providers|rows)\\b/.test(t)).slice(0, 5);`;
const compareGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const q = (s) => main.querySelector(s);
  const h1 = q('h1'); const lead = q('.bh-page-head p');
  const chips = [...main.querySelectorAll('[aria-label="Selected models"] [role=listitem]')].map((c) => ({ t: txt(c).slice(0, 80), ...bx(c), dashed: getComputedStyle(c).borderStyle }));
  const status = txt(q('[role=status]'));
  const coming = q('[data-bh-coming-soon]');
  const snap = q('[aria-label="Benchmark category snapshots"]');
  const cards = snap ? [...snap.querySelectorAll('article')].map((a) => ({ name: txt(a.querySelector('h3')), items: [...a.querySelectorAll('li')].map((li) => txt(li).slice(0, 90)), ...bx(a) })) : [];
  const noMeasured = snap ? [...snap.querySelectorAll('li')].filter((li) => /No measured result/.test(li.textContent)).length : 0;
  const liTotal = snap ? snap.querySelectorAll('li').length : 0;
  const full = q('#full-comparison'); const table = full ? full.querySelector('table') : null;
  const wrap = table ? table.parentElement : null;
  const ths = [...(table ? table.querySelectorAll('thead th') : [])].map((h) => ({ t: txt(h).slice(0, 60), w: Math.round(h.getBoundingClientRect().width) }));
  const trs = [...(table ? table.querySelectorAll('tbody tr') : [])];
  const dataRows = trs.filter((r) => r.querySelector('td'));
  const groupRows = trs.filter((r) => !r.querySelector('td')).map((r) => txt(r));
  const first = dataRows.slice(0, 6).map((r) => ({ h: Math.round(r.getBoundingClientRect().height), cells: [...r.querySelectorAll('th, td')].map((c) => ({ t: txt(c).slice(0, 70), w: Math.round(c.getBoundingClientRect().width), tint: getComputedStyle(c).backgroundColor, sup: c.querySelector('sup') ? txt(c.querySelector('sup')) : null, note: c.querySelector('[data-bh-percentile-note]') ? { t: txt(c.querySelector('[data-bh-percentile-note]')), fs: getComputedStyle(c.querySelector('[data-bh-percentile-note]')).fontSize, w: Math.round(c.querySelector('[data-bh-percentile-note]').getBoundingClientRect().width), sw: c.querySelector('[data-bh-percentile-note]').scrollWidth } : null })) }));
  const daggers = table ? table.querySelectorAll('sup').length : 0;
  const claimNotes = table ? [...table.querySelectorAll('[data-bh-percentile-note]')].map((n) => txt(n)) : [];
  const claimHist = {}; for (const n of claimNotes) claimHist[n] = (claimHist[n] || 0) + 1;
  const tinted = table ? [...table.querySelectorAll('td')].filter((c) => /accent2/.test(c.className)).length : 0;
  const bars = table ? table.querySelectorAll('td span.bg-accent').length : 0;
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 70), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const legend = full ? [...full.querySelectorAll('details')].map((d) => ({ open: d.open, s: txt(d.querySelector('summary')).slice(0, 80) })) : [];
  const radar = q('svg'); const radarLegend = [...main.querySelectorAll('svg text')].map((t) => txt(t)).slice(0, 12);
  return { h1: { t: txt(h1), ...bx(h1), lines: lines(h1), fs: getComputedStyle(h1).fontSize }, lead: lead ? { t: txt(lead), lines: lines(lead) } : null, chips, status,
    coming: coming ? { ...bx(coming), t: txt(coming).slice(0, 700), ps: [...coming.querySelectorAll('p')].map((p) => ({ lines: lines(p), words: txt(p).split(' ').length })), borderStyle: getComputedStyle(coming).borderStyle } : null,
    snapshot: snap ? { ...bx(snap), cards: cards.length, noMeasured, liTotal, sample: cards.slice(0, 3), badge: txt(snap.querySelector('.bh-badge')) } : null,
    full: full ? { ...bx(full), ths, dataRows: dataRows.length, groupRows, first, daggers, claimHist, tinted, bars, wrap: wrap ? { sw: wrap.scrollWidth, cw: wrap.clientWidth } : null, legend } : null,
    heads, radar: radar ? bx(radar) : null, radarLegend, minFont: minFont(main), glyphs: glyphs(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } };
`);
const modelGeom = new Function(`${bxFn}
  const main = document.querySelector('main');
  const q = (s) => main.querySelector(s);
  const h1 = q('h1'); const sub = h1 ? h1.parentElement.querySelector('p') : null;
  const heads = [...main.querySelectorAll('h1, h2')].map((h) => ({ t: h.tagName + ' ' + txt(h).slice(0, 80), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
  const vendorLine = q('[data-bh-sheet-vendor-line]'); const prelimLine = q('[data-bh-sheet-preliminary-line]');
  const sheet = q('#benchmark-sheet') || (vendorLine || prelimLine ? (vendorLine || prelimLine).closest('section') : null);
  const rows = sheet ? [...sheet.querySelectorAll('li summary')].slice(0, 40).map((s) => ({ t: txt(s).slice(0, 120), h: Math.round(s.getBoundingClientRect().height), sup: s.querySelector('sup') ? txt(s.querySelector('sup')) : null, note: [...s.querySelectorAll('span.bh-muted.text-xs')].map((n) => txt(n)).join(' | ').slice(0, 80) })) : [];
  const noteHist = {}; for (const r of rows) { const k = r.note.replace(/[0-9.]+/g, '#'); noteHist[k] = (noteHist[k] || 0) + 1; }
  const stats = [...main.querySelectorAll('dl, [data-bh-model-stats], .bh-stat')].slice(0, 3).map((e) => txt(e).slice(0, 300));
  const scoreish = [...main.querySelectorAll('p, span, dd, div')].filter((e) => e.children.length < 3 && /^(Score|Composite|Adjusted|—|No (composite|score))/i.test(txt(e) || '')).slice(0, 6).map((e) => ({ tag: e.tagName, t: txt(e).slice(0, 120), ...bx(e) }));
  const firstScreen = [...main.querySelectorAll('h1, h2, h3, p')].filter((e) => e.getBoundingClientRect().top + scrollY < 844).map((e) => e.tagName + ' ' + txt(e).slice(0, 90));
  const empties = [...main.querySelectorAll('*')].filter((e) => e.children.length < 3 && /(Top 0|0 of|No offer|No provider|not measured|No independent|No composite|no score)/i.test(txt(e) || '') && (txt(e) || '').length < 220).map((e) => ({ tag: e.tagName, t: txt(e).slice(0, 200), ...bx(e) })).slice(0, 10);
  return { title: document.title, h1: h1 ? { t: txt(h1), lines: lines(h1) } : null, sub: sub ? txt(sub).slice(0, 200) : null, heads, vendorLine: vendorLine ? { t: txt(vendorLine), lines: lines(vendorLine), ...bx(vendorLine) } : null, prelimLine: prelimLine ? { t: txt(prelimLine), lines: lines(prelimLine) } : null,
    sheet: sheet ? { ...bx(sheet), rows: rows.length, sample: rows.slice(0, 8), noteHist } : null, stats, scoreish, firstScreen, empties, minFont: minFont(main), glyphs: glyphs(main), overflow: overflow(main), plural1: plural1(main), body: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth } };
`);
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const tag = `${kind}_${theme}`;
  metrics.errors[tag] = [];
  p.on('pageerror', (e) => metrics.errors[tag].push({ url: p.url(), type: 'pageerror', message: String(e.message).slice(0, 300) }));
  p.on('console', (m) => { if (m.type() === 'error') metrics.errors[tag].push({ url: p.url(), type: 'console', message: m.text().slice(0, 300) }); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const rec = async (name, full = false) => { await p.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full }); metrics.shots[`${tag}-${name}`] = await measure(p); };
  const recEl = async (name, loc) => { try { await loc.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }); metrics.shots[`${tag}-${name}`] = await loc.first().boundingBox(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const vpAt = async (name, loc, dy = -8) => { try { await loc.first().evaluate((el, d) => { window.scrollTo(0, el.getBoundingClientRect().top + scrollY + d); }, dy); await p.waitForTimeout(400); await rec(name); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 200); } };
  const step = async (name, fn) => { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; try { await fn(); } catch (e) { metrics.shots[`${tag}-${name}-err`] = String(e).slice(0, 300); } };

  await step('cmp', async () => {
    await go('/compare?' + MIXED_Q); await p.waitForFunction(() => document.querySelector('#full-comparison tbody td'), null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(800);
    await rec('cmp'); await rec('cmp-full', true);
    metrics.shots[`${tag}-cmp-geom`] = await p.evaluate(compareGeom);
    await recEl('cmp-select', p.locator('[aria-label="Model selection"]'));
    await vpAt('cmp-snapshot-vp', p.locator('[aria-label="Benchmark category snapshots"]'), -12);
    await vpAt('cmp-table-vp', p.locator('#full-comparison tbody').first(), -120);
    await vpAt('cmp-table2-vp', p.locator('#full-comparison tbody').nth(1), -60);
  });
  await step('unk', async () => {
    await go('/compare?' + UNKNOWN_Q); await p.waitForTimeout(1200);
    await rec('unk'); await rec('unk-full', true);
    metrics.shots[`${tag}-unk-geom`] = await p.evaluate(compareGeom);
    await recEl('unk-coming', p.locator('[data-bh-coming-soon]'));
  });
  for (const [name, id] of [['opus55', VENDOR], ['sol', VENDOR2], ['union', PRELIM]]) {
    await step(name, async () => {
      await go(`/models/${encodeURIComponent(id)}`); await rec(name); await rec(name + '-full', true);
      metrics.shots[`${tag}-${name}-geom`] = await p.evaluate(modelGeom);
      const line = p.locator('[data-bh-sheet-vendor-line], [data-bh-sheet-preliminary-line]');
      if (await line.count()) await vpAt(name + '-sheet-vp', line, -160);
    });
  }
  await step('oneoffer', async () => { await go(`/models/${encodeURIComponent(ONE_OFFER)}`); await rec('oneoffer'); metrics.shots[`${tag}-oneoffer-geom`] = await p.evaluate(modelGeom); });
  await step('simple', async () => { await go('/'); await rec('simple'); metrics.shots[`${tag}-simple-minfont`] = await p.evaluate(new Function(`${bxFn} return { minFont: minFont(document.body), glyphs: glyphs(document.body), plural1: plural1(document.body) };`)); });
  await step('advanced', async () => { await go('/'); await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1500); await rec('advanced'); });
  await step('model', async () => { await go(`/models/${encodeURIComponent(FRONTIER)}`); await rec('model'); });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/metrics${process.env.ONLY ? '-' + process.env.ONLY : ''}.json`, JSON.stringify(metrics, null, 1));
console.log(Object.entries(metrics.shots).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v && v.h != null && v.cw != null ? `${v.w}x${v.h} cw${v.cw}` : JSON.stringify(v).slice(0, 6000)}`).join('\n'));
console.log('errors', JSON.stringify(metrics.errors).slice(0, 3000));
