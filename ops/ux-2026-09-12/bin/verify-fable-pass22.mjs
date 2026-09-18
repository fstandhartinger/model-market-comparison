// Fable pass 22 verifier (F-116–F-119) for a non-implementer: table-header (i) placement, Compare ring labels off the spoke,
// Signal (i) length, quick-look link; plus the CR-72.1 hero-orphan and CR-79 header checks at 360/390/430 and 1.3× text.
// Usage: node verify-fable-pass22.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'http://127.0.0.1:3123').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260918-pass22/after';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const res = { base: BASE, at: new Date().toISOString(), checks: [], errors: [] };
const check = (name, ok, detail) => { res.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'ok ' : 'NOT'} ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''}`); };
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile', tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  p.on('pageerror', (e) => res.errors.push({ tag, url: p.url(), message: String(e.message).slice(0, 300) }));
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1000); };
  const go = async (path) => { await goto(p, BASE + path); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  const shot = (name, loc) => (loc ? loc.first().screenshot({ path: `${OUT}/${tag}-${name}.png` }) : p.screenshot({ path: `${OUT}/${tag}-${name}.png` })).catch((e) => res.errors.push({ tag, shot: name, message: String(e).slice(0, 200) }));
  const headerGeom = () => p.evaluate(() => { const thead = document.querySelector('main table thead'); if (!thead) return null; const ths = [...thead.querySelectorAll('th')].filter((t) => t.getBoundingClientRect().width > 0); return { height: Math.round(thead.getBoundingClientRect().height), ths: ths.map((th) => { const btn = th.querySelector('button:not([data-bh-infotip-trigger])'); const info = th.querySelector('[data-bh-infotip-trigger]'); const br = btn?.getBoundingClientRect(), ir = info?.getBoundingClientRect(); const lh = btn ? parseFloat(getComputedStyle(btn).lineHeight) || 16 : 16; return { text: th.innerText.replace(/\s+/g, ' ').trim().slice(0, 50), w: Math.round(th.getBoundingClientRect().width), empty: !th.innerText.trim(), caretGlued: !btn || !/[▲▼]/.test(btn.textContent) || / [▲▼]$/.test(btn.textContent), infoOnLastLine: !info || !btn || (ir.top >= br.bottom - lh - 2 && ir.top < br.bottom + 2 && ir.left >= br.left - 2), infoLone: !!(info && btn && ir.top >= br.bottom - 1) }; }) }; });
  // ---- F-116 on / ----
  await go('/'); const hg = await headerGeom(); await shot('header', p.locator('main table thead'));
  check(`F-116 ${tag}: no header (i) on a line of its own`, hg && hg.ths.every((t) => !t.infoLone), hg && hg.ths.filter((t) => t.infoLone).map((t) => t.text));
  check(`F-116 ${tag}: every (i) sits on its label's last line`, hg && hg.ths.every((t) => t.infoOnLastLine), hg && hg.ths.filter((t) => !t.infoOnLastLine).map((t) => t.text));
  check(`F-116 ${tag}: the sort caret is glued to the last word`, hg && hg.ths.every((t) => t.caretGlued));
  check(`F-116 ${tag}: header row height ≤ ${mobile ? 80 : 68} px`, hg && hg.height <= (mobile ? 80 : 68), hg && hg.height);
  check(`CR-79 ${tag}: every visible header has text`, hg && hg.ths.every((t) => !t.empty && t.w > 0), hg && hg.ths.map((t) => `${t.text} ${t.w}`));
  if (mobile) for (const w of [360, 390, 430]) for (const scale of [1, 1.3]) {
    await p.setViewportSize({ width: w, height: 844 }); await go('/'); if (scale > 1) { await p.evaluate(() => { document.documentElement.style.fontSize = '20.8px'; }); await p.waitForTimeout(600); }
    const g = await headerGeom(); const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    check(`CR-79/F-116 ${tag} ${w}px ×${scale}: no sideways scroll, headers visible, no lone (i)`, ov.sw === ov.cw && g && g.ths.every((t) => !t.empty && t.w > 0 && !t.infoLone), { ...ov, h: g?.height, lone: g?.ths.filter((t) => t.infoLone).map((t) => t.text) });
    if (scale === 1) { const orphan = await p.evaluate(() => { const h = document.querySelector('h1'); if (!h) return null; const out = []; for (const el of h.querySelectorAll('span, strong, em, b')) { if (!el.textContent.trim() || el.children.length) continue; const r = document.createRange(); const node = el.firstChild; const words = el.textContent.split(/(\s+)/); let pos = 0; const lines = new Map(); for (const wd of words) { if (wd.trim()) { r.setStart(node, pos); r.setEnd(node, pos + wd.length); const top = Math.round(r.getBoundingClientRect().top); lines.set(top, (lines.get(top) || 0) + 1); } pos += wd.length; } const arr = [...lines.entries()].sort((a, b) => a[0] - b[0]); out.push({ t: el.textContent.slice(0, 40), lines: arr.map((x) => x[1]) }); } return out; }); check(`CR-72.1 ${tag} ${w}px: no hero sentence ends in a one-word line`, orphan && orphan.length >= 2 && orphan.every((o) => o.lines.length === 1 || o.lines[o.lines.length - 1] >= 2), orphan); }
    if (scale === 1 && w === 390) await shot('hero-390', p.locator('h1'));
  }
  if (mobile) { await p.setViewportSize(vp); }
  // ---- F-116 / F-118 / F-119 on /benchmaxxing ----
  await go('/benchmaxxing');
  const sig = await p.evaluate(() => { const th = [...document.querySelectorAll('main table thead th')].find((t) => /^Signal/.test(t.innerText.trim())); if (!th) return null; const info = th.querySelector('[data-bh-infotip-trigger]'); const r = th.getBoundingClientRect(), ir = info?.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(th.querySelector('span') || th); const tr = range.getBoundingClientRect(); return { thH: Math.round(r.height), infoTop: ir && Math.round(ir.top - r.top), textTop: Math.round(tr.top - r.top), nowrap: !!th.querySelector('.whitespace-nowrap') }; });
  check(`F-116 ${tag}: "Signal" and its (i) share a line`, sig && sig.nowrap && sig.infoTop != null && Math.abs(sig.infoTop - sig.textTop) < 14, sig);
  const trig = p.locator('main table thead th').filter({ hasText: /^Signal/ }).locator('[data-bh-infotip-trigger]').first();
  if (await trig.count()) { await trig.click(); await p.waitForTimeout(600); const tip = await p.evaluate(() => { const el = [...document.querySelectorAll('[data-bh-infotip-panel]')].find((x) => /Benchmaxxing signal/.test(x.textContent)); if (!el) return null; const link = el.querySelector('a[href*="benchmaxxing"]'); const clone = el.cloneNode(true); clone.querySelectorAll('button, strong, b, h2, h3, [data-bh-infotip-title]').forEach((x) => x.remove()); document.body.appendChild(clone); const body = clone.innerText.replace(/\s+/g, ' ').trim(); clone.remove(); const t = el.innerText.replace(/\s+/g, ' ').trim(); return { words: body.split(' ').filter((w) => /[a-z]{2}/i.test(w)).length, tokens: body.split(' ').length, blocks: el.querySelectorAll('.block').length, linkBottom: link ? Math.round(link.getBoundingClientRect().bottom) : null, vh: innerHeight, has: ['scored once it has at least', 'follow the score alone', 'uncertain', 'catalog-wide scale', 'How the signal works'].filter((s) => t.includes(s)) }; }); await shot('signal-info');
    check(`F-118 ${tag}: Signal (i) ≤ 90 words, four lines + link, link inside the viewport, required strings`, tip && tip.words <= 90 && tip.blocks >= 4 && tip.linkBottom != null && tip.linkBottom <= tip.vh && tip.has.length === 5, tip); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const exp = p.locator('main table tbody button[aria-expanded]').first(); if (await exp.count()) { await exp.click(); await p.waitForTimeout(900); const q = await p.evaluate(() => { const a = document.querySelector('[data-quick-report]'); if (!a) return null; const r = a.getBoundingClientRect(); const row = a.closest('tr')?.previousElementSibling; const nameCell = row?.querySelector('td:nth-child(2), th'); const sub = nameCell?.querySelector('.truncate'); return { text: a.innerText.trim(), aria: a.getAttribute('aria-label') || '', h: Math.round(r.height), nameH: nameCell ? Math.round(nameCell.getBoundingClientRect().height) : null, subOneLine: sub ? Math.round(sub.getBoundingClientRect().height) <= 18 : false, subTitle: !!sub?.getAttribute('title') }; }); await shot('quick-look', p.locator('main table').first());
    check(`F-119 ${tag}: quick-look link is "Open the full report ↓", one line, model name in aria-label`, q && q.text === 'Open the full report ↓' && q.h <= 44 && /Open the full report for .+/.test(q.aria), q);
    check(`F-119 ${tag}: the variant sub-line is one line with a title`, q && q.subOneLine && q.subTitle, q && { subOneLine: q.subOneLine, subTitle: q.subTitle, nameH: q.nameH }); }
  // ---- F-117 on /compare ----
  await go('/compare'); await p.waitForTimeout(800);
  for (const conv of ['Percentile', 'Native']) { const btn = p.getByRole('button', { name: new RegExp(`^${conv}$`) }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(700); }
    const g = await p.evaluate(() => { const svg = [...document.querySelectorAll('svg')].find((s) => s.querySelector('[data-radar-ring]') && s.getBoundingClientRect().width > 50); if (!svg) return null; const sb = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal; const k = sb.width / vb.width; const labels = [...svg.querySelectorAll('[data-radar-ring]')].map((t) => ({ t: t.textContent, r: t.getBoundingClientRect() })); const pts = [...svg.querySelectorAll('circle')].filter((c) => +c.getAttribute('r') <= 8).map((c) => c.getBoundingClientRect()); const line = svg.querySelector('line'); const cx = line ? sb.left + (+line.getAttribute('x1')) * k : null; const hit = (a, b) => !(a.left > b.right || a.right < b.left || a.top > b.bottom || a.bottom < b.top); return { n: labels.length, texts: labels.map((l) => l.t), hitsPoint: labels.filter((l) => pts.some((q) => hit(l.r, q))).map((l) => l.t), onSpoke: cx == null ? null : labels.filter((l) => l.r.left <= cx + 1).map((l) => l.t), halo: labels.every((l) => /stroke/.test((svg.querySelector('[data-radar-ring]').getAttribute('style') || '') + getComputedStyle(svg.querySelector('[data-radar-ring]')).paintOrder)) }; });
    check(`F-117 ${tag} ${conv}: Compare ring labels off the 12-o'clock spoke, touching no point, with a halo`, g && g.n >= 3 && g.hitsPoint.length === 0 && g.onSpoke && g.onSpoke.length === 0 && g.halo, g);
    if (conv === 'Percentile') await shot('compare-radar', p.locator('svg:visible').filter({ has: p.locator('[data-radar-ring]') }).first()); }
  await c.close();
}
await b.close();
res.summary = { pass: res.checks.filter((c) => c.ok).length, total: res.checks.length, errors: res.errors.length };
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
console.log('SUMMARY', JSON.stringify(res.summary), 'errors', JSON.stringify(res.errors).slice(0, 800));
