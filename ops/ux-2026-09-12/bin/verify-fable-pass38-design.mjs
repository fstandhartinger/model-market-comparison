// Fable pass-38 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass38-design.mjs <base> <outDir>   ONLY=F-207 (or F-207b, F-208) restricts the groups.
// Groups: F-207 the 3D top-five labels sit on a plate and carry a bar marker (shipped by Fable); F-207b the labelled sphere wears a
// halo and the label is tied to it (directed); F-208 the input-length chart draws at its pixel width, so its text is the hub's chart
// type scale at every width (directed). Launches its own Chromium. Writes <outDir>/verification.json, exits 1 on any failing check.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass38';
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const checks = [];
const check = (group, ctx, name, ok, detail) => { checks.push({ group, ctx, name, ok: !!ok, detail: detail == null ? '' : String(detail).slice(0, 400) }); };
const want = (g) => !ONLY || g === ONLY;
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : '';
const vis = (el) => !!(el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }));
const boxesOverlap = (a, b) => a.w > 0 && b.w > 0 && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const alphaOf = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c || ''); if (!m) return 0; const parts = m[1].split(/[\\s,\\/]+/).filter(Boolean); return parts.length >= 4 ? parseFloat(parts[3]) : 1; };`;
const scrollThrough = async (p) => { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo(0, 0); }); await p.waitForTimeout(800); };

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  try {
  const p = await c.newPage(); p.setDefaultTimeout(20000);
  const pageErrors = []; p.on('pageerror', (error) => pageErrors.push(String(error.message)));
  const go = async (path) => { for (let a = 1; ; a++) { try { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(3000); } } await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForTimeout(500); };

  await go('/jev-models'); await scrollThrough(p);
  if (want('F-207') || want('F-207b')) {
    await p.evaluate(() => { const b = document.querySelector('[data-bh-jev14-capability-3d]'); if (b) window.scrollTo({ top: b.getBoundingClientRect().top + scrollY - 20, behavior: 'instant' }); });
    await p.waitForSelector('[data-bh-jev14-3d-model-label]', { timeout: 45000, state: 'attached' }).catch(() => {});
    // The section is below the lazy 3D fallback. A smooth scroll could still be travelling when
    // the old 2.5 s capture ran, which read the page top as an empty chart. Jump to the target and
    // leave the canvas time to render before sampling the labels and halos.
    await p.waitForTimeout(5500);
    const m = await p.evaluate(new Function(`${bxFn}
      const view = document.querySelector('[data-bh-jev14-capability-3d-view]'); const B = bx(view);
      const canvas = !!(view && view.querySelector('canvas'));
      const labels = [...document.querySelectorAll('[data-bh-jev14-3d-model-label]')].map((e) => { const cs = getComputedStyle(e); const dot = e.querySelector('.bh-jev-3d-model-dot'); const d = dot ? bx(dot) : null; return { t: txt(e).slice(0, 40), ...bx(e), svg: e.namespaceURI === 'http://www.w3.org/2000/svg', alpha: alphaOf(cs.backgroundColor), radius: cs.borderRadius, dot: d ? { w: d.w, h: d.h, radius: getComputedStyle(dot).borderRadius } : null }; });
      let overlaps = 0; for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (boxesOverlap(labels[i], labels[j])) overlaps++;
      // F-207b, strengthened by iteration 245: the ring's paint is read, not just its box. A
      // "border: 2px solid rgb(var(--muted))" shorthand shipped with the ring invisible -- --muted is a
      // hex colour in this stylesheet, rgb(#4c5e75) is not a colour, and an invalid colour inside a border
      // shorthand invalidates the whole declaration, so width and style fell back to the initial none.
      // The old check counted five elements and passed. (The D215 lesson: read rendered paint and boxes.)
      const halos = [...document.querySelectorAll('[data-bh-jev14-3d-halo]')].map((e) => { const cs = getComputedStyle(e);
        const svg = e.namespaceURI === 'http://www.w3.org/2000/svg';
        return { k: e.getAttribute('data-bh-jev14-3d-halo'), ...bx(e), svg,
          ring: svg ? parseFloat(e.getAttribute('stroke-width') ?? cs.strokeWidth) : parseFloat(cs.borderTopWidth),
          ringColor: svg ? cs.stroke : cs.borderTopColor, inside: svg ? cs.fill : cs.backgroundColor, opacity: parseFloat(cs.opacity),
          ringAlpha: alphaOf(svg ? cs.stroke : cs.borderTopColor), insideAlpha: alphaOf(svg ? cs.fill : cs.backgroundColor) }; });
      // The directive's distance is from the plate to the ring's edge; a label further than that must
      // carry its own drawn leader -- that key's leader, with paint and length, not five of any leader.
      const leaders = Object.fromEntries([...document.querySelectorAll('[data-bh-jev14-3d-leader-line]')].map((e) => {
        const cs = getComputedStyle(e); const svg = e.namespaceURI === 'http://www.w3.org/2000/svg';
        const length = svg ? Math.hypot(e.x2.baseVal.value - e.x1.baseVal.value, e.y2.baseVal.value - e.y1.baseVal.value) : parseFloat(cs.width);
        return [e.getAttribute('data-bh-jev14-3d-leader-line'),
          { drawn: parseFloat(cs.opacity) > 0.1 && length > 1 && alphaOf(svg ? cs.stroke : cs.backgroundColor) > 0.1, length: Math.round(length) }]; }));
      const ties = labels.map((l) => { const key = [...document.querySelectorAll('[data-bh-jev14-3d-model-label]')].find((e) => txt(e).slice(0, 40) === l.t)?.getAttribute('data-bh-jev14-3d-model-label'); const h = halos.find((x) => x.k === key); if (!h) return null; const cx = h.x + h.w / 2, cy = h.y + h.h / 2; const lx = Math.max(l.x, Math.min(cx, l.x + l.w)), ly = Math.max(l.y, Math.min(cy, l.y + l.h)); return { key, edge: Math.round((Math.hypot(cx - lx, cy - ly) - h.w / 2) * 10) / 10, leader: leaders[key] ?? null }; });
      return { B, canvas, labels, overlaps, halos, ties, leaders };`));
    await p.screenshot({ path: `${OUT}/${ctx}-F-207.png` });
    const dom = m.labels.filter((l) => !l.svg);
    if (want('F-207')) {
      check('F-207', ctx, 'five top-five labels rendered', m.labels.length === 5, JSON.stringify(m.labels.map((l) => l.t)));
      check('F-207', ctx, 'no label box overlaps another', m.overlaps === 0, `overlaps ${m.overlaps}`);
      if (m.canvas) {
        check('F-207', ctx, 'each DOM label sits on a translucent plate (background alpha 0.7–0.95, rounded)', dom.length === 5 && dom.every((l) => l.alpha >= 0.7 && l.alpha <= 0.95 && parseFloat(l.radius) >= 3), JSON.stringify(dom.map((l) => [l.t, l.alpha, l.radius])));
        check('F-207', ctx, 'the class marker is a bar (≤ 4 px wide, ≥ 10 px tall), not a disc', dom.every((l) => l.dot && l.dot.w <= 4 && l.dot.h >= 10 && !/9999/.test(l.dot.radius)), JSON.stringify(dom.map((l) => l.dot)));
      } else {
        check('F-207', ctx, 'SVG fallback in use: labels are text (plate and marker do not apply)', m.labels.every((l) => l.svg), JSON.stringify(m.labels.map((l) => l.svg)));
      }
      check('F-207', ctx, 'no label starts left of the 3D box', m.B && m.labels.every((l) => l.x >= m.B.x), JSON.stringify({ box: m.B && m.B.x, xs: m.labels.map((l) => l.x) }));
    }
    if (want('F-207b')) {
      check('F-207b', ctx, 'five halos, one per labelled sphere ([data-bh-jev14-3d-halo])', m.halos.length === 5, JSON.stringify(m.halos.map((h) => h.k)));
      check('F-207b', ctx, 'every halo is a ring 12–40 px across inside the 3D box', m.halos.length === 5 && m.halos.every((h) => h.w >= 12 && h.w <= 40 && m.B && h.x >= m.B.x && h.x + h.w <= m.B.x + m.B.w), JSON.stringify(m.halos.map((h) => [h.w, h.h])));
      check('F-207b', ctx, 'every halo is really drawn: a visible 2 px ring, transparent inside', m.halos.length === 5
        && m.halos.every((h) => h.ring >= 2 && h.ringAlpha > 0.1 && h.opacity > 0.1 && h.insideAlpha < 0.1),
        JSON.stringify(m.halos.map((h) => [h.k, h.ring, h.ringColor, h.inside, h.opacity])));
      check('F-207b', ctx, 'each label is within 24 px of its halo\'s edge, or joined to it by its own drawn leader',
        m.ties.length === 5 && m.ties.every((t) => t != null && (t.edge <= 24 || (t.leader && t.leader.drawn))),
        JSON.stringify(m.ties));
    }
  }
  if (want('F-208')) {
    const m = await p.evaluate(new Function(`${bxFn}
      const title = document.querySelector('#jev-context-svg-title'); const svg = title ? title.closest('svg') : null; if (!svg) return null;
      const vb = (svg.getAttribute('viewBox') || '').split(/\\s+/).map(Number); const S = bx(svg); const wrap = svg.parentElement; const W = bx(wrap);
      const scale = vb[2] ? S.w / vb[2] : null;
      const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => ({ t: txt(t).slice(0, 20), css: parseFloat(getComputedStyle(t).fontSize), ...bx(t) }));
      const ticks = texts.filter((t) => /^\\d[\\d,]*[–-]\\d|^\\d[\\d,]*\\+|^\\d+%$/.test(t.t));
      let ov = 0; for (let i = 0; i < ticks.length; i++) for (let j = i + 1; j < ticks.length; j++) if (boxesOverlap(ticks[i], ticks[j])) ov++;
      const bubble = document.querySelector('[data-bh-jev-bubble="cost"] svg'); const bubTicks = bubble ? [...bubble.querySelectorAll('text')].filter((t) => vis(t) && /^\\d+$/.test(txt(t))).map((t) => bx(t).h) : [];
      return { vb, svgW: S.w, wrapW: W.w, wrapClientW: wrap.clientWidth, scale: scale && Math.round(scale * 100) / 100, ticks: ticks.map((t) => [t.t, t.css, t.h]), maxTickH: Math.max(...ticks.map((t) => t.h)), minCss: Math.min(...texts.map((t) => t.css)), bubbleTickH: bubTicks.length ? Math.max(...bubTicks) : null, ov };`));
    await p.evaluate(() => { const t = document.querySelector('#jev-context-svg-title'); const s = t && t.closest('svg'); if (s) window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 120); }); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${ctx}-F-208.png` });
    check('F-208', ctx, 'input-length chart found', !!m, '');
    if (m) {
      check('F-208', ctx, 'the chart draws at its pixel width: viewBox width equals the rendered width (scale 0.98–1.02)', m.scale != null && m.scale >= 0.98 && m.scale <= 1.02, JSON.stringify({ vb: m.vb, svgW: m.svgW, scale: m.scale }));
      check('F-208', ctx, 'no chart text under the 10 px floor (CSS size)', m.minCss >= 10, String(m.minCss));
      check('F-208', ctx, 'tick text renders at the hub chart scale: box height ≤ 14 px, within 2 px of the bubble charts\' ticks', m.maxTickH <= 14 && (m.bubbleTickH == null || Math.abs(m.maxTickH - m.bubbleTickH) <= 2), JSON.stringify({ maxTickH: m.maxTickH, bubbleTickH: m.bubbleTickH, ticks: m.ticks }));
      check('F-208', ctx, 'bucket tick labels do not overlap', m.ov === 0 && m.ticks.length >= 3, JSON.stringify(m.ticks.map((t) => t[0])));
      if (mobile) check('F-208', ctx, 'on a phone the chart keeps ≥ 740 px and scrolls inside its wrapper', m.svgW >= 740 && m.wrapClientW < m.svgW, JSON.stringify({ svgW: m.svgW, wrapClientW: m.wrapClientW }));
    }
  }
  check('errors', ctx, 'no page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
  } finally { await c.close(); }
}
} finally { await browser.close(); }
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
for (const c of checks.filter((c) => !c.ok)) console.log(`FAIL ${c.group} ${c.ctx} ${c.name} :: ${String(c.detail).slice(0, 200)}`);
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? ', ONLY=' + ONLY : ''})`);
process.exit(pass === checks.length ? 0 : 1);
