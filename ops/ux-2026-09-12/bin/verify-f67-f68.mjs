// F-67/F-68 live check. Usage: node verify-f67-f68.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass12/verify-f67-f68';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const res = { base: BASE, at: new Date().toISOString(), checks: [] };
const ok = (name, pass, detail) => { res.checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`;
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(800); };
  await go('/');
  ok(`${tag} stylesheet applied`, await p.evaluate(() => getComputedStyle(document.body).fontFamily !== '' && document.querySelector('.bh-value-map') !== null));
  const info = await p.evaluate(() => {
    const map = document.querySelector('.bh-value-map'); if (!map) return null;
    const svg = map.querySelector('svg'); const sb = svg.getBoundingClientRect();
    const labels = [...map.querySelectorAll('.bh-point-labels text')].map((t) => { const r = t.getBoundingClientRect(); return { text: t.textContent, l: r.left - sb.left, t: r.top - sb.top, r: r.right - sb.left, b: r.bottom - sb.top }; });
    // top-most passing model = first row of the Simple table (sorted by cost, so take the max score cell instead)
    const rows = [...document.querySelectorAll('tbody tr')].map((tr) => ({ name: tr.querySelector('th, td')?.innerText.split('\n')[0].replace(/^[^A-Za-z0-9]+/, '').trim(), score: parseFloat((tr.innerText.match(/\b(\d{2}\.\d)\b/) || [])[1]) })).filter((r) => r.name && r.score);
    const best = rows.sort((a, b) => b.score - a.score)[0];
    const overlap = labels.some((a, i) => labels.some((q, j) => j > i && a.l < q.r && q.l < a.r && a.t < q.b && q.t < a.b));
    const inside = labels.every((l) => l.l >= -1 && l.r <= sb.width + 1 && l.t >= -1 && l.b <= sb.height + 1);
    return { labels: labels.map((l) => l.text), best, overlap, inside, w: document.documentElement.scrollWidth };
  });
  ok(`${tag} value map rendered`, !!info);
  if (info) {
    ok(`${tag} best model (${info.best?.name}) is labelled`, info.labels.some((t) => info.best && t.startsWith(info.best.name.slice(0, 12))), info.labels.join(' | '));
    ok(`${tag} labels do not overlap`, !info.overlap);
    ok(`${tag} labels stay inside the svg`, info.inside);
    ok(`${tag} no horizontal overflow`, info.w <= vp.width, String(info.w));
  }
  await p.screenshot({ path: `${OUT}/${tag}-simple.png` });
  await go('/benchmaxxing');
  const bx = await p.evaluate(() => {
    const cells = [...document.querySelectorAll('tbody th[scope=row] > span:first-of-type')];
    return { n: cells.length, clipped: cells.filter((s) => s.scrollWidth > s.clientWidth + 1).length, w: document.documentElement.scrollWidth, names: cells.slice(0, 2).map((s) => s.textContent) };
  });
  ok(`${tag} Benchmaxxing names not clipped (${bx.clipped}/${bx.n})`, bx.n > 0 && bx.clipped === 0, bx.names.join(' | '));
  ok(`${tag} Benchmaxxing no overflow`, bx.w <= vp.width, String(bx.w));
  await p.screenshot({ path: `${OUT}/${tag}-benchmaxxing.png` });
  await c.close();
}
await b.close();
res.summary = `${res.checks.filter((c) => c.pass).length}/${res.checks.length}`;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
console.log('SUMMARY', res.summary);
