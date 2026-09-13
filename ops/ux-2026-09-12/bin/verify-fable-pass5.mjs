// Fable pass-5 independent verification of F-31…F-38 (implemented by Codex Luna) on the live site.
// Usage: node verify-fable-pass5.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260913-pass5/verify-f31-f38';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch(); const out = { base: BASE, checked_at: new Date().toISOString(), fails: [] };
const expect = (k, ok, detail) => { out[k] = { ok, detail }; if (!ok) out.fails.push(k); };
for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile' }); const p = await c.newPage();
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
  // F-38 Simple small print
  await go('/');
  const s = await p.evaluate(() => { const sp = [...document.querySelectorAll('p')].find((e) => /How we calculate adjusted cost/.test(e.innerText) && /Underlined prices/.test(e.innerText)); return { len: sp ? sp.innerText.length : null, link: !!sp?.querySelector('a'), label: document.body.innerText.includes('Minimum Capability Score') }; });
  expect(`${kind}/F-38 small print ≤ 200 chars with link`, s.len != null && s.len <= 200 && s.link, s);
  expect(`${kind}/F-38 slider label (R5.7 wording)`, s.label, s);
  // F-37 subscriptions disclosure
  const sub = p.locator('summary', { hasText: 'Would a subscription be cheaper' }).first();
  await sub.click(); await p.waitForTimeout(500);
  const f37 = await p.evaluate(() => { const d = [...document.querySelectorAll('details')].find((e) => /Would a subscription be cheaper/.test(e.innerText)); const t = d.innerText; return { warn: d.querySelectorAll('.text-warn').length, notCollected: (t.match(/not collected/gi) || []).length, rows: d.querySelectorAll('tbody tr').length }; });
  expect(`${kind}/F-37 no orange text, one uncollected footnote`, f37.warn === 0 && f37.notCollected === 1, f37);
  await p.screenshot({ path: `${OUT}/${kind}-subscriptions.png` });
  // F-31 / F-32 Advanced
  await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(900);
  const adv = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')];
    const est = rows.filter((r) => /\best\.\b/.test(r.innerText)).length;
    const inputsTxt = rows.filter((r) => /\/7 inputs/.test(r.innerText)).length;
    const pips = document.querySelectorAll('[aria-label$="Composite inputs"]').length;
    const header = [...document.querySelectorAll('th')].map((t) => t.innerText).join(' | ');
    const bad = [];
    for (const r of rows) { const pip = r.querySelector('[aria-label$="Composite inputs"]'); if (!pip) continue; const n = Number(pip.getAttribute('aria-label').match(/^(\d+)/)?.[1]); const tds = r.querySelectorAll('td'); const bc = Number(tds[4]?.innerText.trim()); if (Number.isFinite(bc) && bc < n) bad.push({ name: tds[0].innerText.split('\n')[0], n, bc }); }
    return { rows: rows.length, est, inputsTxt, pips, header, bad, assumed: document.body.innerText.includes('assumed task') };
  });
  expect(`${kind}/F-31 no est. and no /7 inputs text in cells`, adv.est === 0 && adv.inputsTxt === 0, adv);
  expect(`${kind}/F-31 header says modeled $/task`, /modeled \$\/task/.test(adv.header), adv.header);
  if (kind === 'desktop') { expect('desktop/F-31 pip rows present', adv.pips > 0, adv.pips); expect('desktop/F-32 # benchmarks ≥ exact Composite inputs on every row', adv.bad.length === 0, adv.bad); }
  await p.screenshot({ path: `${OUT}/${kind}-advanced.png` });
  // F-33 Benchmaxxing
  await go('/benchmaxxing');
  const bmx = await p.evaluate(() => { const aside = [...document.querySelectorAll('aside')].find((a) => /Benchmaxxing signal/i.test(a.innerText)); const labels = ['Writing', 'Agentic', 'Coding'].map((t) => { const el = [...document.querySelectorAll('span')].find((e) => e.textContent.trim() === t && e.closest('.relative')); return { t, h: el ? Math.round(el.getBoundingClientRect().height) : null }; }); return { asideH: aside ? Math.round(aside.getBoundingClientRect().height) : null, labels, sw: document.documentElement.scrollWidth }; });
  if (kind === 'desktop') expect('desktop/F-33 signal card ≤ 360 px', bmx.asideH != null && bmx.asideH <= 360, bmx.asideH);
  if (kind === 'mobile') expect('mobile/F-33 sector labels ≥ 10 px', bmx.labels.every((l) => l.h != null && l.h >= 10), bmx.labels);
  expect(`${kind}/F-33 no horizontal overflow`, bmx.sw <= vp.width + 1, bmx.sw);
  // F-34 Benchmarks
  await go('/benchmarks');
  const bm = await p.evaluate(() => { const t = document.body.innerText; return { noBox: !t.includes('Source identities not yet matched'), noCov: !t.includes('Coverage above uses'), line: /of \d+ catalog configurations have a result/.test(t), bars: document.querySelectorAll('table span[style*="width"]').length, h: document.documentElement.scrollHeight }; });
  expect(`${kind}/F-34 one coverage line, ≥ 25 bars`, bm.noBox && bm.noCov && bm.line && bm.bars >= 25, bm);
  // F-36 model page
  await go('/models/claude-opus-5%3A%3Ahigh');
  const mp = await p.evaluate(() => { const t = document.body.innerText; const cop = [...document.querySelectorAll('section, div')].find((e) => /^\s*SUBSCRIPTION PLAN\s*\n\s*GitHub Copilot/i.test(e.innerText)); const tok = [...document.querySelectorAll('summary')].find((e) => /Token offers by platform/.test(e.innerText)); return { noProto: !t.includes('Protocol-compatible'), eyebrow: !!cop, order: cop && tok ? cop.getBoundingClientRect().top < tok.getBoundingClientRect().top : null, top5: /\$4\.378/.test(t) }; });
  expect(`${kind}/F-36 no empty protocol copy, Copilot eyebrow above token offers`, mp.noProto && mp.eyebrow && mp.order === true, mp);
  // F-35 compare
  await go('/compare');
  const cmp = await p.evaluate(() => { const t = document.body.innerText; const tables = [...document.querySelectorAll('table')]; const full = tables.sort((a, b) => b.rows.length - a.rows.length)[0]; const rows = full ? [...full.querySelectorAll('tbody tr')].filter((r) => r.querySelector('td')) : []; const bold = rows.filter((r) => r.querySelector('td b, td strong, td .font-semibold, td .font-bold')).length; const bars = full ? full.querySelectorAll('span[style*="width"], div[style*="width"]').length : 0; return { observed: (t.match(/observed 2026-/g) || []).length, rows: rows.length, bold, bars, h: document.documentElement.scrollHeight }; });
  expect(`${kind}/F-35 no provenance text outside expands, bars and bold best per row`, cmp.observed === 0 && cmp.rows > 10 && cmp.bars >= cmp.rows && cmp.bold >= cmp.rows * 0.5, cmp);
  await p.screenshot({ path: `${OUT}/${kind}-compare-table.png`, fullPage: true });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
