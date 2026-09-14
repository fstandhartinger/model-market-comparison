// Live verifier for Fable pass-9 directives F-58 … F-61. Usage: node verify-f58-f61.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass9/verify';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (id, name, ok, detail) => { results.push({ id, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail ?? ''}`); };
const dupRe = /\b(v\d+(?:\.\d+)*)\s+\1\b/i;
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`;
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(600); };
  const noOverflow = async (id) => check(id, `${tag} no page overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  // F-60 + F-61 on the model page
  await go('/models/claude-opus-5%3A%3Ahigh');
  const m = await p.evaluate(() => {
    const tops = (t) => [...document.querySelectorAll('h2')].find((h) => h.textContent.trim().startsWith(t))?.getBoundingClientRect();
    return { composite: tops('Composite')?.top, providers: tops('Top 5 cheapest')?.top, text: document.body.innerText };
  });
  check('F-60', `${tag} Composite ${kind === 'mobile' ? 'before' : 'beside'} providers`, kind === 'mobile' ? m.composite < m.providers : Math.abs(m.composite - m.providers) < 40, `composite=${m.composite} providers=${m.providers}`);
  check('F-61', `${tag} model page has no doubled version token`, !dupRe.test(m.text), (m.text.match(dupRe) || [])[0]);
  await p.screenshot({ path: `${OUT}/${tag}-model.png` });
  // F-58 + F-61 + F-62 on Compare
  await go('/compare');
  const r = await p.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().width > 200 && s.getAttribute('viewBox'));
    const visible = svgs.filter((s) => s.getBoundingClientRect().height > 0);
    const s = visible[0]; if (!s) return { none: true, text: document.body.innerText };
    const wrap = s.parentElement; const region = wrap.closest('[role=region]') || wrap;
    const labels = [...s.querySelectorAll('text')].map((t) => t.textContent.trim()).filter((t) => !/^\d+$/.test(t) || true);
    const list = [...document.querySelectorAll('ol li')].map((li) => li.textContent.trim()).filter((t) => /^\d+\.\s/.test(t));
    const strongest = [...document.querySelectorAll('h2')].find((h) => /strongest/i.test(h.textContent))?.getBoundingClientRect().top;
    return { w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height, viewBox: s.getAttribute('viewBox'), regionScroll: region.scrollWidth, regionClient: region.clientWidth, labels, list, strongest, scrollHint: /Scroll the chart horizontally/.test(document.body.innerText), text: document.body.innerText };
  });
  if (r.none) check('F-58', `${tag} radar present`, false, 'no radar svg');
  else {
    if (kind === 'mobile') {
      check('F-58', `${tag} radar fits (no horizontal scroll)`, r.regionScroll <= r.regionClient + 1 && r.w <= 358, `svg ${Math.round(r.w)}×${Math.round(r.h)} region ${r.regionScroll}/${r.regionClient}`);
      check('F-58', `${tag} six numbered axes + list`, r.labels.filter((t) => /^[1-8]$/.test(t)).length >= 3 && r.list.length >= 3, `axes=${r.labels.filter((t) => /^[1-8]$/.test(t)).length} list=${r.list.length}`);
      check('F-58', `${tag} scroll hint gone`, !r.scrollHint);
    } else {
      check('F-58', `${tag} desktop radar keeps named labels`, r.labels.some((t) => /GPQA|Intelligence|Coding/.test(t)) && r.viewBox === '0 0 720 500', r.labels.slice(4, 7).join(' | '));
      check('F-62', `${tag} desktop radar ≤ 640 px wide`, r.w <= 641, `w=${Math.round(r.w)} strongest at ${Math.round(r.strongest ?? -1)}`);
    }
    check('F-61', `${tag} compare has no doubled version token`, !dupRe.test(r.text), (r.text.match(dupRe) || [])[0]);
  }
  await p.evaluate(() => { const s = [...document.querySelectorAll('svg')].find((s) => s.getBoundingClientRect().width > 200 && s.getBoundingClientRect().height > 0 && s.getAttribute('viewBox')); s?.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${tag}-compare-radar.png` });
  await noOverflow('F-58');
  // F-59 on Charts
  await go('/charts');
  const ch = await p.evaluate(() => {
    const rc = [...document.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.getBoundingClientRect().width);
    const lists = [...document.querySelectorAll('[role=list][aria-label]')].filter((l) => l.getBoundingClientRect().height > 0);
    const bars = lists.map((l) => [...l.querySelectorAll('div[style*="width"]')].map((d) => d.getBoundingClientRect().width));
    return { rechartsVisible: rc.length, firstRc: rc[0], lists: lists.map((l) => l.getAttribute('aria-label')), bars: bars.map((bs) => ({ n: bs.length, max: Math.max(...bs, 0), min: Math.min(...bs.filter((x) => x > 0), 9e9) })) };
  });
  if (kind === 'mobile') {
    check('F-59', `${tag} html bar rows replace recharts on phone`, ch.rechartsVisible === 0 && ch.lists.length >= 2, `recharts=${ch.rechartsVisible} lists=${ch.lists.join(' / ')}`);
    check('F-59', `${tag} longest bar ≥ 240 px, shortest ≥ 2 px`, ch.bars.length >= 2 && ch.bars.every((x) => x.max >= 240 && x.min >= 2), JSON.stringify(ch.bars));
  } else {
    check('F-59', `${tag} desktop recharts unchanged`, ch.rechartsVisible >= 30 && ch.firstRc > 300 && ch.lists.length === 0, `recharts=${ch.rechartsVisible} first=${Math.round(ch.firstRc ?? 0)}`);
  }
  await noOverflow('F-59');
  await p.screenshot({ path: `${OUT}/${tag}-charts.png` });
  await c.close();
}
await b.close();
const fails = results.filter((r) => !r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass: results.length - fails, fail: fails, results }, null, 1));
console.log(`${results.length - fails}/${results.length} passed`);
process.exit(fails ? 1 : 0);
