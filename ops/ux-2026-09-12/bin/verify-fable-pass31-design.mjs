// Live verifier for Fable pass 31 (F-161, F-162, F-166) — for a non-Fable engine to run on both hosts before the Done-log rows read
// `verified`. Usage: node verify-fable-pass31-design.mjs <base> <outDir>
//   F-161: /models/union-alpha::default (0 of 7 Composite inputs) prints no Composite number, no radar and no caption — one sentence
//          with data-bh-no-composite; /models/claude-opus-5.5::max (1 of 7) prints its number with the "◔ Thin data · 1/7" tag beside
//          it (data-bh-composite-thin), the value element itself stays a bare number; a well-measured page (claude-fable-5.1::high)
//          has neither.
//   F-162: /models/union-alpha::default (one free stealth-preview offer, no price) has no "Top 0 cheapest providers" heading; its
//          providers card is headed "Providers" and keeps the CR-60.3 free-preview sentence; a priced model still reads "Top N …".
//   F-166: /compare?model=claude-opus-5.5::max&model=gpt-7-sol — the head says "not measured yet — the numbers land here as soon as they
//          are published" once, the panel does not repeat it, the panel has exactly two muted sentences plus the link, no raw id in the
//          visible copy; the pending chip's title carries the id.
// Plus: no page errors, no horizontal overflow, 1440/390 × light/dark. Exit code 1 on any failed check.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/opt/benchmarkheaven/state/ux-evidence/fable-20260922-pass31/verify-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail).slice(0, 300)}`); };
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const goto = async (p, url) => { for (let a = 1; ; a++) { try { return await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const NONE = 'union-alpha::default', THIN = 'claude-opus-5.5::max', FULL = 'claude-fable-5.1::high';
const meta = await (await fetch(`${BASE}/api/meta`)).json();
console.log('revision', meta.revision, 'generated_at', meta.generated_at);
const modelGeom = () => {
  const main = document.querySelector('main');
  const t = (el) => el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
  const card = [...main.querySelectorAll('section')].find((s) => s.getAttribute('aria-label') === 'Composite and its inputs');
  const value = card && card.querySelector('[data-bh-composite-value]');
  const thin = card && card.querySelector('[data-bh-composite-thin]');
  const none = card && card.querySelector('[data-bh-no-composite]');
  const h2s = [...main.querySelectorAll('h2')].map(t);
  const offersH2 = h2s.find((h) => /cheapest providers|^Providers$/.test(h || ''));
  const noOffersCard = !!main.querySelector('[data-bh-no-offers]');
  const filterLine = [...main.querySelectorAll('p')].some((p) => /Within the active global provider, residency and confidentiality filters/.test(p.textContent));
  const preview = [...main.querySelectorAll('p')].some((p) => /free \(stealth preview\)/.test(p.textContent) && /eventual price is not announced/.test(p.textContent));
  const valueBox = value ? value.getBoundingClientRect() : null, thinBox = thin ? thin.getBoundingClientRect() : null;
  const visible = (el) => el ? [...el.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains('sr-only'))).map((n) => n.textContent).join('').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').trim() : null;
  return { value: t(value), valueFs: value ? getComputedStyle(value).fontSize : null, thin: visible(thin), thinSr: thin ? thin.querySelector('.sr-only')?.textContent : null, thinTitle: thin ? thin.getAttribute('title') : null, sameLine: valueBox && thinBox ? Math.abs((valueBox.bottom) - (thinBox.bottom)) < 20 && thinBox.left > valueBox.right - 2 : null,
    none: t(none), radar: card ? !!card.querySelector('svg') : null, caption: card ? /a gap means not measured/.test(card.textContent) : null, inputs: card ? (card.textContent.match(/(\d+) of 7 inputs/) || [])[1] : null,
    offersH2, noOffersCard, filterLine, preview, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
};
const compareGeom = () => {
  const main = document.querySelector('main');
  const t = (el) => el ? el.innerText.replace(/\s+/g, ' ').trim() : null;
  const lead = t(main.querySelector('.bh-page-head p'));
  const panel = main.querySelector('[data-bh-coming-soon]');
  const ps = panel ? [...panel.querySelectorAll('p')].map((p) => ({ t: t(p), cls: p.className })) : [];
  const chip = main.querySelector('[data-bh-pending-model]');
  const nameSpan = chip ? [...chip.querySelectorAll('span')].find((s) => s.getAttribute('title')) : null;
  return { lead, panelText: t(panel), ps, muted: ps.filter((p) => /bh-muted/.test(p.cls)).length, link: panel ? t(panel.querySelector('a')) : null, chipTitle: nameSpan ? nameSpan.getAttribute('title') : null, chipText: t(chip), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
};
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const tag = `${kind}_${theme}`;
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const settle = async () => { await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };
  const go = async (path) => { await goto(p, `${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await settle(); };
  try {
    await go(`/models/${encodeURIComponent(NONE)}`);
    const none = await p.evaluate(modelGeom);
    check(`${tag}: F-161 ${NONE} — no Composite number, no radar, no caption; the one sentence is there`, none.value == null && none.thin == null && none.radar === false && none.caption === false && /^No Composite yet: none of its 7 inputs is measured/.test(none.none || '') && none.inputs === '0', none);
    check(`${tag}: F-162 ${NONE} — "Providers" heading, no "Top 0", no filter line, the free-preview sentence kept`, none.offersH2 === 'Providers' && !none.noOffersCard && !none.filterLine && none.preview, none);
    check(`${tag}: ${NONE} no horizontal overflow`, none.sw - none.cw <= 1, { sw: none.sw, cw: none.cw });
    await p.screenshot({ path: `${OUT}/${tag}-union.png` }).catch(() => {});
    await go(`/models/${encodeURIComponent(THIN)}`);
    const thin = await p.evaluate(modelGeom);
    check(`${tag}: F-161 ${THIN} — number printed bare, "◔ Thin data · 1/7" beside it with the Overview's note as title`, /^\d+(\.\d)?$/.test(thin.value || '') && thin.thin === '◔ Thin data · 1/7' && /Based on only 1 of 7 Composite inputs/.test(thin.thinTitle || '') && thin.thinSr === thin.thinTitle && thin.sameLine === true && thin.none == null && thin.radar === true && thin.inputs === '1', thin);
    check(`${tag}: F-162 ${THIN} — a priced model still reads "Top N cheapest providers"`, /^Top [1-5] cheapest providers/.test(thin.offersH2 || '') && thin.filterLine, thin);
    await p.screenshot({ path: `${OUT}/${tag}-opus55.png` }).catch(() => {});
    await go(`/models/${encodeURIComponent(FULL)}`);
    const full = await p.evaluate(modelGeom);
    check(`${tag}: F-161 ${FULL} — a well-measured page has neither the tag nor the sentence`, /^\d+(\.\d)?$/.test(full.value || '') && full.thin == null && full.none == null && full.radar === true && Number(full.inputs) >= 3, full);
    await go(`/compare?model=${encodeURIComponent(THIN)}&model=gpt-7-sol`);
    await p.waitForSelector('[data-bh-coming-soon]', { timeout: 30000 }).catch(() => {});
    const cmp = await p.evaluate(compareGeom);
    check(`${tag}: F-166 the head carries the one-line sentence once; the panel does not repeat it`, /GPT-7 Sol is not measured yet — the numbers land here as soon as they are published\./.test(cmp.lead || '') && !/land here as soon as they are published|Coming soon —/.test(cmp.panelText || ''), cmp);
    check(`${tag}: F-166 the panel is two muted sentences plus the link, without the raw id or "announced as"`, cmp.muted === 2 && /^GPT-7 Sol is not in our data yet, so this page shows no score for it — we never estimate one\. The models already measured are compared below as usual\.$/.test(cmp.ps[1]?.t || '') && /^Keep this link: as soon as this model is collected, the same URL shows the real numbers\.$/.test(cmp.ps[2]?.t || '') && cmp.link === 'See how results are collected →' && !/gpt-7-sol|announced as/.test(cmp.panelText || ''), cmp);
    check(`${tag}: F-166 the pending chip's title carries the id and the announcing organisation`, /Announced by OpenAI\. The id in this link is “gpt-7-sol”/.test(cmp.chipTitle || '') && /Coming soon/.test(cmp.chipText || ''), cmp);
    check(`${tag}: /compare no horizontal overflow`, cmp.sw - cmp.cw <= 1, { sw: cmp.sw, cw: cmp.cw });
    await p.locator('[data-bh-coming-soon]').scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: `${OUT}/${tag}-compare-unknown.png` }).catch(() => {});
    check(`${tag}: no page errors`, errors.length === 0, errors);
  } catch (e) { check(`${tag}: run completed`, false, String(e).slice(0, 300)); }
  await c.close();
}
await b.close();
const pass = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, at: new Date().toISOString(), pass, total: results.length, results }, null, 1));
console.log(`${pass}/${results.length} checks passed at ${meta.revision}`);
process.exit(pass === results.length ? 0 : 1);
