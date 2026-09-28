// Fable pass-42 live verifier for the three DIRECTED rows (F-223, F-224, F-225), implemented by the work iteration
// (iteration 269, claude-opus). A non-implementer engine runs this before flipping any of the three to verified.
// Usage: node verify-fable-pass42-directed.mjs <base> <outDir>   ONLY=F-223|F-224|F-225 restricts the groups.
// Clear <outDir> before re-running: a crashed run leaves the previous verification.json behind.
//
//   F-223 One ranking, one figure. At 1440 the hub is <= 18,500 px tall and at 390 <= 27,000 (it was 25,332 / 38,411);
//         the whisker-and-tie sentence sits within 120 px below the interactive chart's leader sentence; with the
//         official weights every ranked bar in that chart carries the 95% interval, and its left/right match the folded
//         official order's own interval to 0.1; the "Option B" preset draws none; both folds are closed but present.
//   F-224 The axes table fits its panel at 1440 in both views (Axes / Types & cost), scrolls inside its wrapper at 390,
//         shows the same 100 rows in both, and ?axes=types deep-links the second view.
//   F-225 On a phone neither bubble chart prints a label over a bubble or over another label; 1440 stays clean.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass42-directed';
const ONLY = process.env.ONLY || null;
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (group, ctx, name, ok, detail = '') => {
  checks.push({ group, ctx, name, ok: !!ok, detail: String(detail).slice(0, 400) });
  if (!ok) console.log(`FAIL ${group} ${ctx} ${name} :: ${String(detail).slice(0, 200)}`);
};
const want = (g) => !ONLY || g === ONLY;
const HEIGHT_MAX = { desktop: 18500, mobile: 27000 };

const goto = async (p, url) => {
  for (let a = 1; ; a++) {
    try { await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(3000); }
  }
  await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {});
  // Every lazy panel below the fold has to have rendered before the page height is a number worth asserting.
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(800);
};

// The label/point collision probe is the one that found F-225: a text box that contains a bubble's centre, or two text
// boxes that overlap by more than 3 px in both directions.
const svgProbe = () => {
  const vis = (el) => !!(el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }));
  const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  const out = [];
  for (const svg of [...document.querySelectorAll('[data-bh-jev-bubble] svg')].filter(vis)) {
    const r = svg.getBoundingClientRect(); if (r.width < 200 || r.height < 120) continue;
    const kind = svg.closest('[data-bh-jev-bubble]').getAttribute('data-bh-jev-bubble');
    const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => { const b = t.getBoundingClientRect(); return { t: txt(t).slice(0, 30), x: b.x, y: b.y + scrollY, w: b.width, h: b.height }; });
    const pts = [...svg.querySelectorAll('circle')].filter(vis).map((c) => { const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + scrollY + b.height / 2, r: b.width / 2 }; });
    const hits = [];
    for (const t of texts) for (const c of pts) { if (c.r > 14) continue; if (c.x > t.x - 2 && c.x < t.x + t.w + 2 && c.y > t.y - 2 && c.y < t.y + t.h + 2) hits.push({ label: t.t, at: [c.x | 0, c.y | 0] }); }
    const overlaps = [];
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j]; if (!a.t || !b.t) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 3 && oy > 3) overlaps.push([a.t, b.t, ox | 0, oy | 0]);
    }
    out.push({ kind, texts: texts.length, hits: hits.slice(0, 6), overlaps: overlaps.slice(0, 6) });
  }
  return out;
};

const pageProbe = () => {
  const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
  const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  const fold = (sel) => { const d = document.querySelector(sel); return d ? { open: d.open, summary: txt(d.querySelector('summary')), rows: d.querySelectorAll('[data-bh-jev15-bar], [data-bh-jev15-option-row]').length } : null; };
  const leader = document.querySelector('[data-bh-jev14-top-five-note]');
  const ties = document.querySelector('[data-bh-jev14-ties]');
  return {
    scrollHeight: document.documentElement.scrollHeight,
    bodySw: document.documentElement.scrollWidth, bodyCw: document.documentElement.clientWidth,
    leaderBox: bx(leader), leaderText: txt(leader), tiesBox: bx(ties), tiesText: txt(ties),
    barsFold: fold('[data-bh-jev15-bars-fold]'), optionsFold: fold('[data-bh-jev15-options-fold]'),
    panes: [...document.querySelectorAll('[data-bh-jev15-axes-pane]')].map((e) => ({ pane: e.getAttribute('data-bh-jev15-axes-pane'), hidden: e.hasAttribute('hidden') })),
    btns: [...document.querySelectorAll('[data-bh-jev15-axes-view-btn]')].map((b) => ({ v: b.getAttribute('data-bh-jev15-axes-view-btn'), pressed: b.getAttribute('aria-pressed'), t: txt(b) })),
  };
};

// The chart's whiskers against the folded official order's own intervals, per system key.
const ciProbe = () => {
  const num = (v) => v == null ? null : Number.parseFloat(v);
  const chart = {};
  for (const e of document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-ci]')) {
    chart[e.getAttribute('data-bh-jev14-ci')] = { lo: num(e.getAttribute('data-bh-jev14-ci-lo')), hi: num(e.getAttribute('data-bh-jev14-ci-hi')) };
  }
  const official = {};
  for (const e of document.querySelectorAll('[data-bh-jev15-ci]')) {
    const lo = num(e.style.left), w = num(e.style.width);
    official[e.getAttribute('data-bh-jev15-ci')] = { lo, hi: lo == null || w == null ? null : lo + w };
  }
  // A ranked bar is one whose accessible name states an official rank; the rest say "..., not ranked".
  const rankedBars = [...document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-bar]')]
    .filter((b) => /, rank \d+/.test(b.getAttribute('aria-label') || ''))
    .map((b) => b.getAttribute('data-bh-jev14-bar'));
  return { chart, official, rankedBars, chartCount: Object.keys(chart).length };
};

const browser = await chromium.launch({ headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const [kind, vp, theme] of [['desktop', { width: 1440, height: 1000 }, 'light'], ['mobile', { width: 390, height: 844 }, 'dark']]) {
    const ctx = `${kind}_${theme}`;
    const c = await browser.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); p.setDefaultTimeout(30000);
    const pageErrors = []; p.on('pageerror', (e) => pageErrors.push(String(e.message)));
    await goto(p, `${BASE}/jev-models`);
    const m = await p.evaluate(pageProbe);
    await p.screenshot({ path: `${OUT}/${ctx}-hub.png` });
    await fs.writeFile(`${OUT}/${ctx}-page.json`, JSON.stringify(m, null, 1));

    if (want('F-223')) {
      check('F-223', ctx, `the page is at most ${HEIGHT_MAX[kind]} px tall`, m.scrollHeight <= HEIGHT_MAX[kind], `scrollHeight ${m.scrollHeight}`);
      check('F-223', ctx, 'the official-order fold is present and closed', m.barsFold && m.barsFold.open === false && m.barsFold.rows > 0, JSON.stringify(m.barsFold));
      check('F-223', ctx, 'the weight-options fold is present and closed', m.optionsFold && m.optionsFold.open === false && m.optionsFold.rows > 0, JSON.stringify(m.optionsFold));
      check('F-223', ctx, 'the whisker-and-tie sentence names the interval and the tie count', /95% bootstrap intervals/.test(m.tiesText) && /statistical ties/.test(m.tiesText), m.tiesText);
      const gap = m.tiesBox && m.leaderBox ? m.tiesBox.y - (m.leaderBox.y + m.leaderBox.h) : null;
      check('F-223', ctx, 'it sits within 120 px below the leader sentence', gap != null && gap >= 0 && gap <= 120, `gap ${gap} (leader ${JSON.stringify(m.leaderBox)}, ties ${JSON.stringify(m.tiesBox)})`);
      // Open both the chart's "show all" fold and the official-order fold, then compare the intervals per system.
      await p.evaluate(() => { for (const d of document.querySelectorAll('[data-bh-jev14-bars-more], [data-bh-jev15-bars-fold]')) d.open = true; });
      await p.waitForTimeout(500);
      const ci = await p.evaluate(ciProbe);
      await fs.writeFile(`${OUT}/${ctx}-ci.json`, JSON.stringify(ci, null, 1));
      const missing = ci.rankedBars.filter((k) => !ci.chart[k]);
      check('F-223', ctx, 'every ranked bar in the interactive chart carries the 95% interval', ci.rankedBars.length > 50 && missing.length === 0, `${ci.rankedBars.length} ranked bars, ${missing.length} without an interval: ${missing.slice(0, 5).join(', ')}`);
      const off = Object.keys(ci.official);
      const wrong = off.filter((k) => ci.chart[k] && (Math.abs(ci.chart[k].lo - ci.official[k].lo) > 0.1 || Math.abs(ci.chart[k].hi - ci.official[k].hi) > 0.1));
      check('F-223', ctx, "the chart's whiskers match the official order's own intervals to 0.1", off.length > 50 && wrong.length === 0, `${off.length} official intervals, ${wrong.length} mismatched: ${wrong.slice(0, 5).join(', ')}`);
      // Option B is a re-scored ranking; the published interval belongs to the official score, so no whisker is drawn.
      const hasB = await p.$('[data-bh-jev-preset^="Option B"]');
      if (hasB) {
        await hasB.click();
        await p.waitForTimeout(500);
        const after = await p.evaluate(() => document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-ci]').length);
        check('F-223', ctx, 'the Option B preset draws no whisker', after === 0, `${after} whiskers under Option B`);
        await goto(p, `${BASE}/jev-models`);
      } else {
        check('F-223', ctx, 'the Option B preset exists on the chart', false, 'no [data-bh-jev-preset^="Option B"] button');
      }
    }

    if (want('F-224')) {
      check('F-224', ctx, 'the axes section offers both views as pills', m.btns.length === 2 && m.btns.map((b) => b.v).join(',') === 'axes,types', JSON.stringify(m.btns));
      check('F-224', ctx, 'Axes is the default view', m.btns[0] && m.btns[0].pressed === 'true' && m.btns[1] && m.btns[1].pressed === 'false', JSON.stringify(m.btns));
      const measure = async (view) => p.evaluate((v) => {
        const w = document.querySelector(`[data-bh-jev15-axes-wrap="${v}"]`);
        if (!w) return null;
        return { sw: w.scrollWidth, cw: w.clientWidth, rows: w.querySelectorAll('tbody tr').length, ox: getComputedStyle(w).overflowX, visible: w.checkVisibility() };
      }, view);
      const seen = {};
      for (const view of ['axes', 'types']) {
        if (view === 'types') {
          const pill = await p.$('[data-bh-jev15-axes-view-btn="types"]');
          if (!pill) { check('F-224', ctx, 'the Types & cost pill exists', false, 'no [data-bh-jev15-axes-view-btn="types"] button'); continue; }
          await pill.click(); await p.waitForTimeout(400);
        }
        const g = await measure(view);
        seen[view] = g;
        check('F-224', ctx, `the ${view} view is the rendered one when its pill is pressed`, !!g && g.visible, JSON.stringify(g));
        check('F-224', ctx, `the ${view} view shows every measured system`, !!g && g.rows === 100, JSON.stringify(g));
        if (kind === 'desktop') check('F-224', ctx, `the ${view} view fits its panel at 1440`, !!g && g.sw <= g.cw + 2, JSON.stringify(g));
        else check('F-224', ctx, `the ${view} view scrolls inside its own wrapper at 390`, !!g && g.sw > g.cw && g.ox === 'auto', JSON.stringify(g));
      }
      await fs.writeFile(`${OUT}/${ctx}-axes.json`, JSON.stringify(seen, null, 1));
      check('F-224', ctx, 'the page itself never scrolls sideways', m.bodySw <= m.bodyCw + 2, `${m.bodySw} in ${m.bodyCw}`);
      // The deep link opens the second view on a fresh load (a fragment-free reload, not a same-page navigation).
      await goto(p, `${BASE}/jev-models?axes=types`);
      const deep = await p.evaluate(() => [...document.querySelectorAll('[data-bh-jev15-axes-view-btn]')].map((b) => `${b.getAttribute('data-bh-jev15-axes-view-btn')}=${b.getAttribute('aria-pressed')}`).join(','));
      check('F-224', ctx, '?axes=types deep-links the second view', deep === 'axes=false,types=true', deep);
      await goto(p, `${BASE}/jev-models`);
    }

    if (want('F-225')) {
      const svgs = await p.evaluate(svgProbe);
      await fs.writeFile(`${OUT}/${ctx}-bubbles.json`, JSON.stringify(svgs, null, 1));
      check('F-225', ctx, 'both bubble charts are measured', svgs.length === 2, JSON.stringify(svgs.map((s) => `${s.kind}:${s.texts}`)));
      for (const s of svgs) {
        check('F-225', ctx, `the ${s.kind} chart prints no label over a bubble`, s.hits.length === 0, JSON.stringify(s.hits));
        check('F-225', ctx, `the ${s.kind} chart prints no label over another label`, s.overlaps.length === 0, JSON.stringify(s.overlaps));
      }
      const bubble = await p.$('[data-bh-jev-bubble="speed"]');
      if (bubble) await bubble.screenshot({ path: `${OUT}/${ctx}-bubble-speed.png` });
      const costBubble = await p.$('[data-bh-jev-bubble="cost"]');
      if (costBubble) await costBubble.screenshot({ path: `${OUT}/${ctx}-bubble-cost.png` });
    }

    check('page', ctx, 'the hub raises no page error', pageErrors.length === 0, pageErrors.join(' | '));
    await c.close();
  }
} finally { await browser.close(); }

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE})`);
process.exit(pass === checks.length ? 0 : 1);
