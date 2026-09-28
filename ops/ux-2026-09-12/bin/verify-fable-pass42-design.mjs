// Fable pass-42 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass42-design.mjs <base> <outDir>   ONLY=F-221|F-222|F-226 restricts the groups.
// On the public hub (/jev-models) and the pinned /jev-models/v1.5.0, at 1440 and 390:
//   F-221 the header prints no full 64-hex hash; the sha prefix is 12 chars + … with the full value in its title, one line tall.
//   F-222 the live h1 is "JevBench by Benchmark Heaven" (one line at 390); the first sentence is the definition; the hero holds no
//         release notes; the first Capability row starts within the phone's first viewport (≤ 760 px, the v1.4.2.2 hub measured 727);
//         "View live board" is absent on the live board and present on the pinned page; the pinned h1 keeps the release name.
//   F-226 no legend or compare item prints "unclassified" in code font; "Unclassified" appears as a label.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass42';
const ONLY = process.env.ONLY || null;
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (group, ctx, name, ok, detail = '') => { checks.push({ group, ctx, name, ok: !!ok, detail: String(detail).slice(0, 400) }); if (!ok) console.log(`FAIL ${group} ${ctx} ${name} :: ${String(detail).slice(0, 200)}`); };
const want = (g) => !ONLY || g === ONLY;
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const probe = () => {
  const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '';
  const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.y + scrollY), h: Math.round(r.height) }; };
  const lines = (el) => el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : null;
  const header = document.querySelector('[data-bh-jev15-release-header]');
  const h1 = header ? header.querySelector('h1') : null;
  const own = header ? header.querySelector('[data-bh-jev-own]') : null;
  const meta = header ? header.querySelector('[data-bh-jev-meta]') : null;
  const codes = header ? [...header.querySelectorAll('code')].map((c) => ({ t: txt(c), title: c.getAttribute('title') || '', lines: lines(c) })) : [];
  const capH2 = [...document.querySelectorAll('h2')].find((h) => /Capability ranking/.test(txt(h)));
  const firstRow = capH2 && capH2.parentElement.querySelector('ol li, table tbody tr, [role=row]');
  const legendCodes = [...document.querySelectorAll('main code')].filter((c) => txt(c) === 'unclassified').length;
  const unclassifiedLabels = [...document.querySelectorAll('main li, main option, main span')].filter((e) => !e.children.length && txt(e) === 'Unclassified').length;
  return { hero: header ? header.getAttribute('data-bh-jev15-hero') : null, h1: txt(h1), h1Lines: lines(h1), own: txt(own), headerText: txt(header), metaText: txt(meta), codes,
    liveLink: !!document.querySelector('[data-bh-jev-live-link]'), firstRowY: firstRow ? bx(firstRow).y : null, legendCodes, unclassifiedLabels };
};
for (const [kind, theme] of [['desktop', 'light'], ['mobile', 'dark']]) {
  const ctx = `${kind}_${theme}`;
  const browser = await chromium.launch({ headless: true });
  const bctx = await browser.newContext({ viewport: kind === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, deviceScaleFactor: kind === 'mobile' ? 2 : 1, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  const p = await bctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error' && !/status of 50[0-9]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  try {
    for (const [path, live] of [['/jev-models', true], ['/jev-models/v1.5.0', false]]) {
      await goto(p, `${BASE}${path}`); await p.waitForTimeout(1800);
      const m = await p.evaluate(probe);
      const tag = `${ctx} ${path}`;
      if (want('F-221')) {
        check('F-221', tag, 'header prints no full 64-hex hash', !/[0-9a-f]{64}/.test(m.headerText), m.headerText.slice(0, 120));
        const sha = m.codes.find((c) => /^[0-9a-f]{12}…$/.test(c.t));
        check('F-221', tag, 'the sha prefix is 12 chars + … with the full value in its title', !!sha && /^[0-9a-f]{64}$/.test(sha.title) && sha.title.startsWith(sha.t.slice(0, 12)), JSON.stringify(m.codes));
        check('F-221', tag, 'the prefix is one line tall', !!sha && sha.lines <= 1, JSON.stringify(sha));
      }
      if (want('F-222')) {
        check('F-222', tag, 'hero marker names the route kind', m.hero === (live ? 'live' : 'pinned'), m.hero);
        check('F-222', tag, live ? 'live h1 is the product name' : 'pinned h1 keeps the release name', live ? m.h1 === 'JevBench by Benchmark Heaven' : /^JevBench v1\.5\.0 — Jev alternatives ranking$/.test(m.h1), m.h1);
        if (live) check('F-222', tag, 'h1 is one line', m.h1Lines === 1, m.h1Lines);
        check('F-222', tag, 'the first sentence says what JevBench is', /^JevBench is Benchmark Heaven's own benchmark for Jev-class decision models/.test(m.own), m.own);
        check('F-222', tag, 'no release notes in the hero', !/doubles the sample|option B remains|natively/.test(m.headerText), m.headerText.slice(0, 200));
        check('F-222', tag, 'the meta line carries decisions, roster and the JSON link', /decisions per system/.test(m.metaText) && /ranked of \d+ roster systems/.test(m.metaText) && /aggregate results JSON/.test(m.metaText), m.metaText.slice(0, 200));
        check('F-222', tag, live ? 'the live board does not link to itself' : 'the pinned page links to the live board', m.liveLink === !live, m.liveLink);
        if (live && kind === 'mobile') check('F-222', tag, 'first Capability row starts within the first viewport (≤ 760 px)', m.firstRowY != null && m.firstRowY <= 760, m.firstRowY);
      }
      if (want('F-226') && live) {
        check('F-226', tag, 'no code-font "unclassified" on the page', m.legendCodes === 0, m.legendCodes);
        check('F-226', tag, 'an "Unclassified" label exists', m.unclassifiedLabels >= 1, m.unclassifiedLabels);
      }
      check(ONLY || 'F-222', tag, '0 page errors', errors.length === 0, JSON.stringify(errors.slice(0, 3)));
      await p.screenshot({ path: `${OUT}/${ctx}${path.replace(/\//g, '_')}-hero.png` }).catch(() => {});
    }
  } catch (e) { check(ONLY || 'F-222', ctx, 'run', false, String(e)); }
  await bctx.close(); await browser.close();
}
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? `, ONLY=${ONLY}` : ''})`);
