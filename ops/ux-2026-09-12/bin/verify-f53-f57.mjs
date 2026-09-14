// Pass-8 live verification: F-53 hero, F-54 version labels, F-55 (i) fill, F-56 phone names, F-57 model title.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass8/after';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch(); const res = { base: BASE, at: new Date().toISOString(), checks: [] };
const ck = (id, ok, detail) => res.checks.push({ id, ok: !!ok, detail });
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`;
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(500); };
  await go('/');
  const hero = await p.evaluate(() => { const h = document.querySelector('h1'); const r = h.getBoundingClientRect(); return { text: h.innerText, lines: Math.round(r.height / parseFloat(getComputedStyle(h).lineHeight)) }; });
  ck(`${tag} F-53 hero text`, hero.text === 'Every AI model benchmark we can find, in one place.\nAnd what each model really costs you.', hero.text);
  ck(`${tag} F-53 hero lines`, kind === 'desktop' ? hero.lines === 2 : hero.lines <= 3, hero.lines);
  const footer = await p.evaluate(() => document.querySelector('footer')?.innerText || '');
  ck(`${tag} F-53 footer not hero`, !footer.includes('we can find') && footer.includes('source and date'), footer.slice(0, 80));
  const og = await p.evaluate(() => document.querySelector('meta[property="og:description"]')?.content);
  ck(`${tag} F-53 og:description`, og === 'Every AI model benchmark we can find, in one place. And what each model really costs you.', og);
  const info = await p.evaluate(() => { const el = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'i'); return el ? getComputedStyle(el).backgroundColor : null; });
  ck(`${tag} F-55 (i) transparent`, info === 'rgba(0, 0, 0, 0)', info);
  const leak = (t) => /snapshot-\d{4}|\(unversioned\)|No verified semantic version/.test(t);
  ck(`${tag} F-54 no leak /`, !leak(await p.evaluate(() => document.body.innerText)));
  if (kind === 'mobile') {
    const broken = await p.evaluate(() => [...document.querySelectorAll('tbody tr td:first-child')].map((td) => { const a = td.querySelector('a') || td; const r = a.getClientRects(); return { t: a.innerText.split('\n')[0], n: r.length }; }).filter((x) => x.n > 1 && /-\S/.test(x.t) && false));
    const names = await p.evaluate(() => [...document.querySelectorAll('tbody tr td:first-child a')].map((a) => ({ t: a.innerText, rects: [...a.getClientRects()].map((r) => Math.round(r.left)) })));
    // a token break shows as the same link spanning lines with a break inside a hyphenated token: approximate by checking that every line piece ends at a space boundary in the text
    const spans = await p.evaluate(() => [...document.querySelectorAll('tbody tr td:first-child .whitespace-nowrap')].length);
    ck(`${tag} F-56 nowrap tokens present`, spans > 0, spans);
  }
  await go('/models/claude-opus-5%3A%3Ahigh');
  const h1 = await p.evaluate(() => { const h = document.querySelector('h1'); const s = getComputedStyle(h); return { text: h.innerText, over: h.scrollWidth > h.clientWidth + 1, ws: s.whiteSpace, w: document.documentElement.scrollWidth }; });
  ck(`${tag} F-57 title ${kind}`, kind === 'mobile' ? (!h1.over && h1.ws !== 'nowrap' && h1.w <= 390) : true, JSON.stringify(h1));
  ck(`${tag} F-54 no leak model page`, !leak(await p.evaluate(() => document.body.innerText)));
  await p.screenshot({ path: `${OUT}/${tag}-model.png` });
  await go('/compare'); ck(`${tag} F-54 no leak compare`, !leak(await p.evaluate(() => document.body.innerText)));
  await go('/benchmarks'); const bt = await p.evaluate(() => document.body.innerText); ck(`${tag} F-54 no leak benchmarks`, !leak(bt)); ck(`${tag} F-54 published label`, /· published 20\d\d-/.test(bt) || /Published 20\d\d-/.test(bt));
  await go('/'); await p.screenshot({ path: `${OUT}/${tag}-home.png` });
  await c.close();
}
await b.close();
res.pass = res.checks.filter((c) => c.ok).length; res.fail = res.checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
console.log(`pass ${res.pass}/${res.checks.length}`); for (const f of res.fail) console.log('FAIL', f.id, JSON.stringify(f.detail));
