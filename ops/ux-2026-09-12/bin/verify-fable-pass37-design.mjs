// Fable pass-37 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass37-design.mjs <base> <outDir>   ONLY=F-201 (or F-202 … F-206) restricts the groups.
// Groups: F-201 the 3D top-five labels sit beside their spheres (shipped by Fable); F-202 bubble hint text at the 10 px floor on phones
// (shipped by Fable); F-203 the input-length chart's bucket ticks at 10 px; F-204 one name per axis (3D legend box + caption gone, no
// arrow twice on the flat charts); F-205 phone bubble labels whose leaders do not cross; F-206 the hidden v1.5 preview's cost cells,
// header and tie markers. Launches its own Chromium. Writes <outDir>/verification.json and exits 1 on any failing check in the selected groups.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass37';
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const checks = [];
const check = (group, ctx, name, ok, detail) => { checks.push({ group, ctx, name, ok: !!ok, detail: detail == null ? '' : String(detail).slice(0, 400) }); };
const want = (g) => !ONLY || g === ONLY;
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), vy: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : '';
const vis = (el) => !!(el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }));
const boxesOverlap = (a, b) => a.w > 0 && b.w > 0 && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const segCross = (p, q) => { const o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)); const A = { x: p.x1, y: p.y1 }, B = { x: p.x2, y: p.y2 }, C = { x: q.x1, y: q.y1 }, D = { x: q.x2, y: q.y2 }; return o(A, B, C) !== o(A, B, D) && o(C, D, A) !== o(C, D, B) && o(A, B, C) !== 0 && o(C, D, A) !== 0; };
const lineOf = (l) => { const s = l.ownerSVGElement; const m = l.getScreenCTM(); const pt = (x, y) => { const p = s.createSVGPoint(); p.x = x; p.y = y; const t = p.matrixTransform(m); return { x: t.x, y: t.y }; }; const a = pt(+l.getAttribute('x1'), +l.getAttribute('y1')), b = pt(+l.getAttribute('x2'), +l.getAttribute('y2')); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; };`;
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
  const go = async (path) => { for (let a = 1; ; a++) { try { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(3000); } } await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };

  if (want('F-201') || want('F-202') || want('F-203') || want('F-204') || want('F-205')) {
    await go('/jev-models'); await scrollThrough(p);
    if (want('F-201') || want('F-204')) {
      await p.evaluate(() => { const b = document.querySelector('[data-bh-jev14-capability-3d]'); if (b) window.scrollTo(0, b.getBoundingClientRect().top + scrollY - 20); });
      await p.waitForSelector('[data-bh-jev14-3d-model-label]', { timeout: 45000, state: 'attached' }).catch(() => {});
      await p.waitForTimeout(2500);
      const m = await p.evaluate(new Function(`${bxFn}
        const box = document.querySelector('[data-bh-jev14-capability-3d-view]') || document.querySelector('[data-bh-jev14-capability-3d]'); const B = bx(box);
        const labels = [...document.querySelectorAll('[data-bh-jev14-3d-model-label]')].map((e) => ({ t: txt(e).slice(0, 40), ...bx(e) }));
        const axes = [...document.querySelectorAll('[data-bh-jev14-3d-axis-label]')].map((e) => ({ t: txt(e).slice(0, 60), ...bx(e) }));
        const fig = document.querySelector('[data-bh-jev14-capability-3d]');
        return { B, labels, axes, canvas: !!(box && box.querySelector('canvas')), legend: !!document.querySelector('[data-bh-jev14-3d-axes]'), figText: fig ? txt(fig).slice(0, 3000) : '' };`));
      await p.screenshot({ path: `${OUT}/${ctx}-F-201.png` });
      if (want('F-201')) {
        check('F-201', ctx, 'five top-five labels rendered', m.labels.length === 5, JSON.stringify(m.labels.map((l) => l.t)));
        check('F-201', ctx, 'each label is a nowrap pill (width under 260 px), not a full-width block', m.labels.length > 0 && m.labels.every((l) => l.w > 20 && l.w < 260), JSON.stringify(m.labels.map((l) => [l.t, l.w])));
        check('F-201', ctx, 'no label starts left of the 3D box (nothing clipped at the left edge)', m.B && m.labels.every((l) => l.x >= m.B.x), JSON.stringify({ box: m.B && m.B.x, xs: m.labels.map((l) => l.x) }));
        check('F-201', ctx, 'labels sit at distinct positions (beside their spheres, not stacked at one edge)', new Set(m.labels.map((l) => Math.round(l.x / 12))).size >= 3, JSON.stringify(m.labels.map((l) => [l.x, l.y])));
        check('F-201', ctx, 'three axis labels present', m.axes.length === 3, JSON.stringify(m.axes.map((a) => a.t)));
      }
      if (want('F-204')) {
        check('F-204', ctx, 'the top-left legend box is gone (the axis labels name the axes)', !m.legend, '');
        check('F-204', ctx, 'no "Vertical: Capability · Right: cheaper · Toward you: faster" caption', !/Toward you/.test(m.figText), '');
        check('F-204', ctx, 'the 3D figure says "decisions", never "$/1k tasks"', !/\$\/1k tasks/.test(m.figText), '');
      }
    }
    if (want('F-202') || want('F-204') || want('F-205')) {
      await p.evaluate(() => { const f = document.querySelector('[data-bh-jev-bubble]'); if (f) window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 40); }); await p.waitForTimeout(700);
      const m = await p.evaluate(new Function(`${bxFn}
        return [...document.querySelectorAll('[data-bh-jev-bubble]')].map((sec) => { const svg = sec.querySelector('svg'); if (!svg) return null;
          const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => ({ t: txt(t).slice(0, 40), fs: parseFloat(getComputedStyle(t).fontSize), ...bx(t) }));
          const sep = sec.querySelector('[data-bh-jev-separator]'); const sepTexts = sep ? [...sep.querySelectorAll('text')].map((t) => txt(t)) : [];
          const axisTitles = texts.filter((t) => /per 1,000 decisions|Median-latency speed/.test(t.t)).map((t) => t.t);
          const groups = [...svg.querySelectorAll('[data-bh-jev-bubble-label]')];
          const labelTexts = groups.map((g) => { const t = g.querySelector('text'); return { t: txt(t), ...bx(t) }; });
          const leaders = groups.map((g) => g.querySelector('line')).filter(Boolean).map(lineOf);
          let textOverlaps = 0; for (let i = 0; i < labelTexts.length; i++) for (let j = i + 1; j < labelTexts.length; j++) if (boxesOverlap(labelTexts[i], labelTexts[j])) textOverlaps++;
          let crossings = 0; for (let i = 0; i < leaders.length; i++) for (let j = i + 1; j < leaders.length; j++) if (segCross(leaders[i], leaders[j])) crossings++;
          return { kind: sec.getAttribute('data-bh-jev-bubble'), minFs: Math.min(...texts.map((t) => t.fs)), small: texts.filter((t) => t.fs < 10).map((t) => t.t + '@' + t.fs), sepTexts, axisTitles, labels: labelTexts.length, leaders: leaders.length, textOverlaps, crossings }; }).filter(Boolean);`));
      await p.screenshot({ path: `${OUT}/${ctx}-F-202.png` });
      if (want('F-202')) for (const ch of m) {
        check('F-202', ctx, `${ch.kind}: no SVG text under 10 px`, ch.minFs >= 10, JSON.stringify(ch.small));
        check('F-202', ctx, `${ch.kind}: the 2× label and both direction hints are present`, ch.sepTexts.length === 3 && ch.sepTexts.some((t) => /2×/.test(t)) && ch.sepTexts.some((t) => /←/.test(t)) && ch.sepTexts.some((t) => /→/.test(t)), JSON.stringify(ch.sepTexts));
      }
      if (want('F-204')) for (const ch of m) check('F-204', ctx, `${ch.kind}: the axis title names the axis without repeating the arrow hint`, ch.axisTitles.length === 1 && !/→/.test(ch.axisTitles[0]), JSON.stringify(ch.axisTitles));
      if (want('F-205')) for (const ch of m) {
        check('F-205', ctx, `${ch.kind}: five labelled leaders`, ch.labels === 5, JSON.stringify({ labels: ch.labels, leaders: ch.leaders }));
        check('F-205', ctx, `${ch.kind}: no label text overlaps another`, ch.textOverlaps === 0, `overlaps ${ch.textOverlaps}`);
        check('F-205', ctx, `${ch.kind}: no two leader lines cross`, ch.crossings === 0, `crossings ${ch.crossings}`);
      }
    }
    if (want('F-203')) {
      const m = await p.evaluate(new Function(`${bxFn}
        const svg = document.querySelector('#jev-context-svg-title') ? document.querySelector('#jev-context-svg-title').closest('svg') : null; if (!svg) return null;
        const texts = [...svg.querySelectorAll('text')].filter(vis).map((t) => ({ t: txt(t).slice(0, 20), fs: parseFloat(getComputedStyle(t).fontSize), ...bx(t) }));
        const ticks = texts.filter((t) => /^\\d[\\d,]*[–-]|^\\d[\\d,]*\\+|^[<>≥≤]/.test(t.t));
        let ov = 0; for (let i = 0; i < ticks.length; i++) for (let j = i + 1; j < ticks.length; j++) if (boxesOverlap(ticks[i], ticks[j])) ov++;
        return { minFs: Math.min(...texts.map((t) => t.fs)), small: texts.filter((t) => t.fs < 10).map((t) => t.t + '@' + t.fs), ticks: ticks.map((t) => t.t), ov };`));
      check('F-203', ctx, 'input-length chart found', !!m, '');
      if (m) { check('F-203', ctx, 'no SVG text under 10 px in the input-length chart', m.minFs >= 10, JSON.stringify(m.small)); check('F-203', ctx, 'bucket tick labels do not overlap', m.ov === 0 && m.ticks.length >= 3, JSON.stringify(m.ticks)); }
    }
  }
  if (want('F-206')) {
    await go('/wip-oiifi41ouv1f/jevbench-v15'); await scrollThrough(p);
    const m = await p.evaluate(new Function(`${bxFn}
      const main = document.querySelector('main') || document.body;
      const bars = [...document.querySelectorAll('[data-bh-jev15-bar]')];
      const tilde = bars.filter((b) => /~\\$/.test(txt(b))).length;
      const approx = bars.filter((b) => /≈/.test(txt(b))).length;
      const whiskers = document.querySelectorAll('[data-bh-jev15-ci]').length;
      const ths = [...main.querySelectorAll('table th')].map(txt).filter((t) => /\\$\\/1k|USD/.test(t));
      const costCells = [...main.querySelectorAll('[data-bh-jev15-cost-cell]')].map((c) => { const pill = c.querySelector('.bh-thin-tag'); const cb = bx(c), pb = pill ? bx(pill) : null; return { t: txt(c).slice(0, 30), pill: pill ? txt(pill) : null, pillLeft: pb ? pb.x + pb.w <= cb.x + cb.w - 20 : null }; });
      const leader = document.querySelector('[data-bh-jev15-leader]');
      return { bars: bars.length, tilde, approx, whiskers, ths, costCells: costCells.length, pills: costCells.filter((c) => c.pill).length, pillsRight: costCells.filter((c) => c.pill && c.pillLeft === false).length, leader: leader ? txt(leader) : null, penalty: [...main.querySelectorAll('table th')].some((h) => /^Penalty/.test(txt(h))) };`));
    await p.screenshot({ path: `${OUT}/${ctx}-F-206.png` });
    check('F-206', ctx, 'headline bars present', m.bars >= 80, String(m.bars));
    check('F-206', ctx, 'no "~$" cost text in the bars (the estimate is a pill, not a tilde)', m.tilde === 0, `rows with ~$: ${m.tilde}`);
    check('F-206', ctx, 'the per-row ≈ marker is gone; the 95% interval is drawn as a whisker on every ranked bar', m.approx === 0 && m.whiskers >= m.bars, JSON.stringify({ approx: m.approx, whiskers: m.whiskers, bars: m.bars }));
    check('F-206', ctx, 'cost headers say "$/1k decisions"', m.ths.length > 0 && m.ths.every((t) => /decisions/.test(t)), JSON.stringify(m.ths));
    check('F-206', ctx, 'cost cells carry their tag as a pill left of the number', m.costCells > 0 && m.pillsRight === 0, JSON.stringify({ cells: m.costCells, pills: m.pills, pillsRight: m.pillsRight }));
    check('F-206', ctx, 'the leader sentence names the tied systems', !!m.leader && !/^joint leaders/i.test(m.leader) && /tie/i.test(m.leader), m.leader);
    check('F-206', ctx, 'the Penalty column stays (its values vary in v1.5)', m.penalty, '');
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
