// Fable pass-26 verifier — F-145: a model with no provider offer shows a one-sentence Providers card, never "Top 0 cheapest providers",
// and no empty "Token offers by platform · 0 offers" disclosure; a model with offers is unchanged.
// Usage: node verify-fable-pass26.mjs <base> [outDir]   → expects 16/16 per host (4 checks × 4 contexts).
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || null;
if (OUT) await fs.mkdir(OUT, { recursive: true });
const NO_OFFERS = 'step-5-preview::default';
const WITH_OFFERS = 'claude-fable-5.1::high';
const SENTENCE = 'No provider publishes an API price for this model yet, so no cost can be modeled.';
let pass = 0, fail = 0; const lines = [];
const check = (name, ok, detail = '') => { (ok ? pass++ : fail++); lines.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(800); };
  await go(`/models/${encodeURIComponent(NO_OFFERS)}`);
  const a = await p.evaluate((S) => { const h2 = [...document.querySelectorAll('main h2')].map((h) => h.innerText.trim()); const card = document.querySelector('[data-bh-no-offers]'); const r = card?.getBoundingClientRect(); const sums = [...document.querySelectorAll('main details summary')].map((x) => x.innerText.trim()); return { h2, card: !!card, cardText: card?.innerText.replace(/\s+/g, ' ') || '', cardH: r ? Math.round(r.height) : null, cardW: r ? Math.round(r.width) : null, hasSentence: !!card && card.innerText.includes(S), sums, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }; }, SENTENCE);
  if (OUT) await p.screenshot({ path: `${OUT}/${tag}-step5-top.png` });
  check(`${tag} no-offers page: no heading starts with "Top 0"`, !a.h2.some((t) => /^Top 0\b/.test(t)), a.h2.slice(0, 4).join(' | '));
  check(`${tag} no-offers page: one-sentence Providers card (≤ 120 px tall, ≤ viewport wide)`, a.card && a.hasSentence && a.cardH <= 120 && a.cardW <= vp.width && !a.overflow, `h=${a.cardH} w=${a.cardW} text="${a.cardText.slice(0, 90)}"`);
  check(`${tag} no-offers page: no "Token offers by platform · 0 offers" disclosure, no page error`, !a.sums.some((t) => /Token offers by platform\s*·\s*0\b/.test(t)) && errors.length === 0, `${a.sums.filter((t) => /Token offers/.test(t)).join(' | ') || 'none'} errors=${errors.length}`);
  await go(`/models/${encodeURIComponent(WITH_OFFERS)}`);
  const bb = await p.evaluate(() => { const h2 = [...document.querySelectorAll('main h2')].map((h) => h.innerText.trim()); const top = h2.find((t) => /^Top \d+ cheapest providers/.test(t)); const n = top ? Number(top.match(/^Top (\d+)/)[1]) : 0; const sums = [...document.querySelectorAll('main details summary')].map((x) => x.innerText.trim()); return { top, n, hasAll: sums.some((t) => /Token offers by platform\s*·\s*[1-9]\d*/.test(t)), card: !!document.querySelector('[data-bh-no-offers]') }; });
  check(`${tag} with-offers page unchanged: "Top N cheapest providers" (N ≥ 1) and the offers disclosure, no no-offers card`, bb.n >= 1 && bb.hasAll && !bb.card && errors.length === 0, `${bb.top} all=${bb.hasAll} errors=${errors.length}`);
  await c.close();
}
await b.close();
console.log(lines.join('\n'));
console.log(`\n${pass}/${pass + fail} passed on ${BASE}`);
if (OUT) await fs.writeFile(`${OUT}/verify-fable-pass26.log`, lines.join('\n') + `\n${pass}/${pass + fail} passed on ${BASE}\n`);
process.exit(fail ? 1 : 0);
