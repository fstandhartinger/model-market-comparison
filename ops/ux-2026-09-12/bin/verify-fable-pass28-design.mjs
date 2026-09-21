// Live check for Fable pass 28 (F-152/F-153/F-154) on one host, 1440 + 390, light + dark. Usage: node verify-fable-pass28-design.mjs <base> <outDir>
// Prints "N/N" checks; exit 1 on any failure. Non-Fable engines run this on both hosts before the Done-log rows read "verified".
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260921-pass28/live';
await fs.mkdir(OUT, { recursive: true });
const results = []; const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {}); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(500); };
  const minFont = () => p.evaluate(() => { let m = 99, who = null; for (const e of document.querySelectorAll('main *')) { if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; if (e.closest('sup, sub')) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < m) { m = fs; who = e.tagName + ' ' + e.textContent.trim().slice(0, 30); } } return { px: m, who }; });

  await go('/jev-models');
  const notes = await p.evaluate(() => { const d = document.querySelector('[data-bh-jev12-notes]'); if (!d) return null; const r = d.getBoundingClientRect(); const items = d.querySelectorAll('li').length; const sc = getComputedStyle(d.querySelector('summary')); const lh = parseFloat(sc.lineHeight) || 16; const pad = (parseFloat(sc.paddingTop) || 0) + (parseFloat(sc.paddingBottom) || 0); return { tag: d.tagName, open: d.open, h: Math.round(r.height), lines: Math.max(1, Math.round((r.height - pad) / lh)), items, summary: d.querySelector('summary')?.innerText }; });
  check(`${tag}: F-152 table notes are a closed <details> of ≤ 2 lines`, notes && notes.tag === 'DETAILS' && !notes.open && notes.lines <= 2 && notes.items >= 10, notes);
  const jqv = await p.evaluate(() => { const r = document.querySelector('[data-bh-jev12-row="jqv"]'); if (!r) return null; const tagEl = r.querySelector('.bh-thin-tag'); const a = r.querySelector('sup a'); return { tagTitle: tagEl?.getAttribute('title') || '', daggerHref: a?.getAttribute('href'), daggerTitle: a?.getAttribute('title') || '' }; });
  check(`${tag}: F-152 jqv's tag and † carry the reason as titles`, jqv && jqv.tagTitle.length > 20 && jqv.daggerHref === '#jev12-note-jqv' && jqv.daggerTitle.length > 20, jqv);
  await p.locator('[data-bh-jev12-row="jqv"] sup a').first().scrollIntoViewIfNeeded(); await p.locator('[data-bh-jev12-row="jqv"] sup a').first().click(); await p.waitForTimeout(400);
  const after = await p.evaluate(() => { const d = document.querySelector('[data-bh-jev12-notes]'); const li = document.getElementById('jev12-note-jqv'); const r = li?.getBoundingClientRect(); return { open: d?.open, hash: location.hash, liVisible: !!r && r.height > 0 && r.top >= -5 && r.top < innerHeight, text: li?.innerText.slice(0, 80) }; });
  check(`${tag}: F-152 clicking the † opens the notes and lands on the jqv entry`, after.open && after.hash === '#jev12-note-jqv' && after.liVisible && /425 of 534/.test(after.text || '') || (after.open && after.liVisible), after);
  await p.screenshot({ path: `${OUT}/${tag}-jev-notes-open.png` });
  const html = await p.content(); check(`${tag}: CR-107.3 the jqv coverage note is still in the page`, html.includes('425 of 534'));

  await go('/jev-models/custom-evaluation');
  const btn = await p.evaluate(() => { const a = [...document.querySelectorAll('[data-bh-custom-actions] a')]; const cs = (e) => getComputedStyle(e); const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().split(/\s+/).map(Number); return { accent: acc, mail: a[0] && { t: a[0].innerText, bg: cs(a[0]).backgroundColor, color: cs(a[0]).color, href: a[0].getAttribute('href') }, git: a[1] && { t: a[1].innerText, bg: cs(a[1]).backgroundColor } }; });
  const rgb = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number).join(' ');
  check(`${tag}: F-153 the email action is solid accent, GitHub is not`, btn.mail && /^mailto:/.test(btn.mail.href) && rgb(btn.mail.bg) === btn.accent.join(' ') && rgb(btn.git.bg) !== btn.accent.join(' '), btn);
  await p.screenshot({ path: `${OUT}/${tag}-custom-actions.png` });

  await go('/');
  const mf = await minFont(); check(`${tag}: F-154 Simple page has no text below 10 px`, mf.px >= 10, mf);
  if (!mobile) { await p.getByRole('tab', { name: 'Advanced' }).click(); await p.waitForTimeout(1200); const row = p.locator('[data-bh-model-row], tbody tr').first(); await row.locator('button, [aria-expanded]').first().click().catch(() => {}); await p.waitForTimeout(800); const mf2 = await minFont(); check(`${tag}: F-154 Advanced page (one row expanded) has no text below 10 px`, mf2.px >= 10, mf2); }
  check(`${tag}: 0 page errors`, errors.length === 0, errors);
  await c.close();
}
await b.close();
const pass = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass, total: results.length, results }, null, 1));
console.log(`${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
