// Fable pass 25 live verifier: F-136 (ring labels off the 12-o'clock spoke, halo), F-137 (topic caption ≤ 2 visible sentences, notes in
// the "Values and notes" disclosure, "not part of the score" in the heading) and F-138 (compact phone Swap) on /jev-models, 1440/390 ×
// light/dark. Usage: node verify-fable-pass25.mjs <base> <outdir> → <outdir>/verification.json, prints passed/total. 12 checks per
// desktop context, 13 per phone context (50 total).
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass25/verify-canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
const revision = await fetch(`${BASE}/api/meta`).then((r) => r.json()).then((m) => m.revision).catch(() => null);
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(p, `${BASE}/jev-models?v=${Date.now()}`);
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800);
  const sec = p.locator('[data-bh-jev12-compare]').first();
  await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const g = await p.evaluate(() => {
    const bx = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
    const hit = (a, b, pad = 0) => a.x < b.r + pad && a.r > b.x - pad && a.y < b.b + pad && a.b > b.y - pad;
    const lines = (el) => { const lh = parseFloat(getComputedStyle(el).lineHeight) || 16; return Math.round(el.getBoundingClientRect().height / lh); };
    const radars = [...document.querySelectorAll('[data-bh-jev12-radar]')].map((r) => {
      const svg = r.querySelector('svg');
      const rings = [...svg.querySelectorAll('[data-radar-ring]')].map((t) => ({ t: t.textContent, box: bx(t), halo: getComputedStyle(t).paintOrder, fs: getComputedStyle(t).fontSize }));
      const points = [...svg.querySelectorAll('[data-bh-jev12-radar-series] circle, [data-bh-jev12-radar-series] rect')].map(bx);
      const sb = bx(svg); const cx = sb.x + sb.w / 2;
      // the 12-o'clock spoke is the vertical line through the centre: a ring label "on the spoke" straddles cx
      const onSpoke = rings.filter((k) => k.box.x <= cx + 1 && k.box.r >= cx - 1).length;
      const struck = rings.filter((k) => points.some((pt) => hit(k.box, pt))).length;
      const fig = r.querySelector('figcaption');
      const figText = fig.innerText.replace(/\s+/g, ' ').trim();
      const details = r.querySelector('details');
      return { id: r.getAttribute('data-bh-jev12-radar'), h3: r.querySelector('h3').innerText.replace(/\s+/g, ' '), rings: rings.length, onSpoke, struck, halo: rings.every((k) => k.halo === 'stroke'), figLines: lines(fig), figSentences: (figText.match(/[.!?](\s|$)/g) || []).length, figText: figText.slice(0, 300), notesOpen: details.open, notesSummary: details.querySelector('summary').innerText.trim(), notesText: details.textContent.replace(/\s+/g, ' ').slice(0, 600), notesMethodLink: !!details.querySelector('a[href*="TOPICS.md"]') };
    });
    const swap = document.querySelector('[data-bh-jev12-radar-swap]'); const selA = document.querySelector('[data-bh-jev12-radar-pick="a"]');
    return { radars, swap: bx(swap), selA: bx(selA), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const axes = g.radars.find((r) => r.id === 'axes'), topics = g.radars.find((r) => r.id === 'topics');
  check(`${tag}: both radars draw two ring labels (50, 100) with data-radar-ring`, axes?.rings === 2 && topics?.rings === 2, g.radars.map((r) => r.rings));
  check(`${tag}: F-136 no ring label straddles the 12-o'clock spoke`, axes.onSpoke === 0 && topics.onSpoke === 0, g.radars.map((r) => r.onSpoke));
  check(`${tag}: F-136 no ring label box is struck by a series point`, axes.struck === 0 && topics.struck === 0, g.radars.map((r) => r.struck));
  check(`${tag}: F-136 ring labels carry the paint-order halo`, axes.halo && topics.halo, g.radars.map((r) => r.halo));
  check(`${tag}: F-137 the topic caption is at most two sentences`, topics.figSentences <= 2, { n: topics.figSentences, t: topics.figText });
  check(`${tag}: F-137 the topic caption no longer carries the tier-mix, method or held-out sentences`, !/mix tiers|drafted by a model|Held-out/.test(topics.figText), topics.figText);
  check(`${tag}: F-137 the "Values and notes" disclosure is closed on load and holds the method link, the tier mix and the held-out note`, !topics.notesOpen && /Values and notes/.test(topics.notesSummary) && topics.notesMethodLink && /mix tiers differently/.test(topics.notesText) && /Held-out items count/.test(topics.notesText), { open: topics.notesOpen, s: topics.notesSummary, link: topics.notesMethodLink });
  check(`${tag}: F-137 the topic heading says the radar is not part of the score`, /not part of the score/.test(topics.h3), topics.h3);
  check(`${tag}: the axis caption stays at two sentences`, axes.figSentences <= 2, axes.figSentences);
  if (mobile) {
    check(`${tag}: F-137 the topic caption is ≤ 4 rendered lines at 390`, topics.figLines <= 4, topics.figLines);
    check(`${tag}: F-138 the Swap button is content-wide and right-aligned under System A at 390`, g.swap.w < g.selA.w * 0.6 && Math.abs(g.swap.r - g.selA.r) <= 2 && g.swap.y >= g.selA.b, { swap: g.swap, selA: g.selA });
  } else {
    check(`${tag}: F-138 the Swap button sits on the picker row at 1440`, Math.abs(g.swap.y + g.swap.h / 2 - (g.selA.y + g.selA.h / 2)) <= 4 && g.swap.x > g.selA.r, { swap: g.swap, selA: g.selA });
  }
  check(`${tag}: no horizontal overflow`, g.overflow <= 1, g.overflow);
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await sec.screenshot({ path: `${OUT}/${tag}-compare.png` }).catch(() => {});
  await c.close();
}
await b.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name} — ${JSON.stringify(c.detail).slice(0, 300)}`);
console.log(`${BASE} (${revision}): ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
