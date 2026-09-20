// Fable pass 27 live verifier: F-147 (phone eyebrow "JevBench v1.2", pill at 10 px), F-148 (two-sentence runner note, harness in the
// runner names' titles), the F-146 follow-up (one status per vendor row), the F-142 follow-up (no repeated sentence in the full unit
// note) and the F-141 follow-up (table honorable row = first sentence). Both hosts, 1440/390 × light/dark. Usage: node <this> <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260920-pass27/verify';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' :: ' + JSON.stringify(detail).slice(0, 300)}`); };
const revision = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`; const errors = [];
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  p.on('pageerror', (e) => errors.push(String(e.message))); p.on('console', (m) => { if (m.type() === 'error' && !/Talisman|extension/i.test(m.text())) errors.push(m.text()); });
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(500); };
  const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  // F-147 + F-142/F-141 follow-ups on /jev-models
  await go('/jev-models');
  const head = await p.evaluate(() => { const badge = document.querySelector('[data-bh-custom-evaluation-badge]'); const row = badge.parentElement; const eyebrow = row.querySelector('span'); const vis = [...eyebrow.querySelectorAll('span')].find((s) => getComputedStyle(s).display !== 'none') || eyebrow; const r = (e) => e.getBoundingClientRect(); const smallest = Math.min(...[...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.trim() && r(e).width > 0 && !e.closest('sup, sub')).map((e) => parseFloat(getComputedStyle(e).fontSize))); return { eyebrow: vis.innerText.trim(), eyebrowH: Math.round(r(vis).height), badgeFs: getComputedStyle(badge).fontSize, badgeText: badge.innerText.trim(), badgeRight: Math.round(r(badge).right), rowRight: Math.round(r(row).right), rowH: Math.round(r(row).height), smallest }; });
  check(`${tag}: eyebrow text is the ${mobile ? 'phone' : 'desktop'} form`, mobile ? head.eyebrow === 'JevBench v1.2'.toUpperCase() || /^JevBench v1\.2$/i.test(head.eyebrow) : /our own benchmark/i.test(head.eyebrow), head);
  check(`${tag}: eyebrow is one line beside the pill`, head.eyebrowH <= 20 && head.rowH <= 26, head);
  check(`${tag}: pill text is 10 px and inside the row`, head.badgeFs === '10px' && head.badgeRight <= head.rowRight + 1, head);
  check(`${tag}: smallest rendered text on the page is ≥ 10 px (sup/sub exponents exempt)`, head.smallest >= 10, head.smallest);
  const notes = await p.$$eval('[data-bh-jev12-cost-unit]', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ')));
  check(`${tag}: no unit note says "whole question" twice`, notes.every((t) => (t.match(/whole question/g) || []).length <= 1) && notes.some((t) => /whole question, not a token/.test(t)), notes.map((t) => t.slice(0, 120)));
  const honHead = await p.$eval('[data-bh-jev12-honorable-head]', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  check(`${tag}: table honorable row carries one rule sentence`, /not ranked against the models\.$/.test(honHead) && !/same model twice/.test(honHead), honHead);
  check(`${tag}: /jev-models no overflow`, (await overflow()) <= 1, await overflow());
  await p.screenshot({ path: `${OUT}/${tag}-jev-head.png` });
  // F-148 on the Benchmaxxing report
  await go(`/benchmaxxing?model=${encodeURIComponent('deepseek-v4-pro-0813::max')}#radar`); await p.waitForTimeout(1500);
  const rd = await p.evaluate(() => { const b = document.querySelector('[data-bmx-runner-disagreement]'); if (!b) return null; const n = b.querySelector('[data-bmx-runner-disagreement-note]'); const lh = parseFloat(getComputedStyle(n).lineHeight) || 16; return { line: b.querySelector('li')?.innerText.replace(/\s+/g, ' '), note: n.innerText, noteLines: Math.round(n.getBoundingClientRect().height / lh), sentences: (n.innerText.match(/[.!?](\s|$)/g) || []).length, titles: [...b.querySelectorAll('[data-bmx-runner-a], [data-bmx-runner-b]')].map((e) => e.getAttribute('title')) }; });
  check(`${tag}: runner line still leads with the points and both ranks`, rd && /\d+ points on Terminal-Bench 2\.1/.test(rd.line) && /ranks it p\d+/.test(rd.line) && /Vals AI p\d+/.test(rd.line), rd?.line);
  check(`${tag}: runner note is two sentences, ≤ 4 lines`, rd && rd.sentences === 2 && rd.noteLines <= 4, rd && { sentences: rd.sentences, lines: rd.noteLines });
  check(`${tag}: harness lives in the runner names' titles`, rd && rd.titles.length === 2 && rd.titles.some((t) => /Terminus 2/.test(t)) && rd.titles.some((t) => /standard error/.test(t)), rd?.titles);
  await p.locator('[data-bmx-runner-disagreement]').first().scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: `${OUT}/${tag}-runner.png` });
  // F-146 follow-up on the Step 5 sheet
  await go('/models/step-5-preview%3A%3Adefault');
  const sheet = await p.evaluate(() => { const uniq = [...document.querySelectorAll('#benchmark-sheet details')].filter((r) => /†/.test(r.textContent)); return { vendorRows: uniq.length, both: uniq.filter((r) => /no percentile/.test(r.textContent) && /developer's claim/.test(r.textContent)).length, claimWords: [...document.querySelectorAll('#benchmark-sheet span')].filter((s) => s.children.length === 0 && s.textContent.trim() === "developer's claim").length, line: document.querySelector('[data-bh-sheet-vendor-line]')?.textContent.trim() }; });
  check(`${tag}: no vendor row says both "no percentile" and "developer's claim"`, sheet.both === 0 && sheet.vendorRows > 0, sheet);
  check(`${tag}: every vendor row says "developer's claim" once (count = † rows)`, sheet.claimWords === sheet.vendorRows, sheet);
  check(`${tag}: the generated count line is still there`, /^\d+ of \d+ values are .* own claims/.test(sheet.line || ''), sheet.line);
  await p.locator('#benchmark-sheet').scrollIntoViewIfNeeded().catch(() => {}); await p.screenshot({ path: `${OUT}/${tag}-step5-sheet.png` });
  check(`${tag}: no page error across the three pages`, errors.length === 0, errors.slice(0, 3));
  await c.close();
}
await b.close();
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 1));
console.log(`${pass}/${checks.length} at ${revision} on ${BASE}`);
process.exit(pass === checks.length ? 0 : 1);
