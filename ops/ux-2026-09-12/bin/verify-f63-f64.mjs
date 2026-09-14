// Fable pass-10 live verifier for F-63 (theme-aware bar tracks on Charts) and F-64 (plain-language
// Composite coverage line on the model page). Usage: node verify-f63-f64.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260914-pass10/verify';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const res = { base: BASE, at: new Date().toISOString(), engine: 'claude-fable', pass: 0, fail: 0, results: [] };
const check = (id, name, ok, detail = '') => { res.results.push({ id, name, ok, detail }); res[ok ? 'pass' : 'fail']++; console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${name} ${detail}`); };
const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(600); };
  await go('/charts');
  const ch = await p.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const tracks = [...document.querySelectorAll('[role=list] .h-1\\.5')].filter(vis).map((e) => getComputedStyle(e).backgroundColor);
    const strips = [...document.querySelectorAll('[role=img].h-6')].filter(vis).map((e) => getComputedStyle(e).backgroundColor);
    return { bg, tracks: [...new Set(tracks)], nTracks: tracks.length, strips: [...new Set(strips)], w: document.documentElement.scrollWidth };
  });
  const visible = (col, bg) => { const a = parse(col), b2 = parse(bg); if (!a || !b2) return false; if (a.a === 0) return false; const blend = (x, y) => Math.round(a.a * x + (1 - a.a) * y); const d = Math.abs(blend(a.r, b2.r) - b2.r) + Math.abs(blend(a.g, b2.g) - b2.g) + Math.abs(blend(a.b, b2.b) - b2.b); return d >= 12; };
  if (kind === 'mobile') check('F-63', `${tag} phone bar tracks visible against the page (${ch.nTracks} rows)`, ch.nTracks >= 20 && ch.tracks.length >= 1 && ch.tracks.every((t) => visible(t, ch.bg)), `bg=${ch.bg} tracks=${ch.tracks.join('|')}`);
  check('F-63', `${tag} open/closed strips visible against the page`, ch.strips.length >= 1 && ch.strips.every((t) => visible(t, ch.bg)), `bg=${ch.bg} strips=${ch.strips.join('|')}`);
  check('overflow', `${tag} charts no overflow`, ch.w <= vp.width, `w=${ch.w}`);
  await p.screenshot({ path: `${OUT}/${tag}-charts.png` });
  await go('/models/claude-opus-5%3A%3Ahigh');
  const mp = await p.evaluate(() => { const s = [...document.querySelectorAll('section[aria-label="Composite and its inputs"] span')].map((e) => e.textContent.trim()); return { line: s.find((t) => /of 7 inputs/.test(t)) || null, stale: document.body.innerText.includes('exact inputs'), w: document.documentElement.scrollWidth }; });
  check('F-64', `${tag} Composite coverage in plain language`, !!mp.line && /^[0-7] of 7 inputs( · [1-7] from the model family)?$/.test(mp.line) && !mp.stale, `line="${mp.line}" stale=${mp.stale}`);
  check('overflow', `${tag} model page no overflow`, mp.w <= vp.width, `w=${mp.w}`);
  await p.screenshot({ path: `${OUT}/${tag}-model.png` });
  check('errors', `${tag} no page errors`, errors.length === 0, errors.join('; ').slice(0, 200));
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
console.log(`${res.pass}/${res.pass + res.fail} passed`);
process.exit(res.fail ? 1 : 0);
