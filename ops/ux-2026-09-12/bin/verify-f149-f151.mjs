// Fable pass 27 work-engine directives F-149/F-150/F-151 live verifier.
// F-149: custom-evaluation actions inside the first viewport, one mailto, code block without sideways scroll at 390.
// F-150: JevBench table head ≤ 68 px at 1440 (every th ≤ 3 lines), ≤ 70 px at 390; pinned name column kept.
// F-151: the four scope buttons two rows of two at 390, one row at 1440.
// Usage: node <this> <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/work-f149-f151/verify';
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
  // F-149 — custom-evaluation page
  await go('/jev-models/custom-evaluation');
  const custom = await p.evaluate(() => {
    const r = (e) => e.getBoundingClientRect();
    const row = document.querySelector('[data-bh-custom-actions]');
    const links = [...(row?.querySelectorAll('a') ?? [])].map((a) => ({ text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), h: r(a).height, bottom: r(a).bottom }));
    const pre = document.querySelector('pre');
    const smallest = Math.min(...[...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.trim() && r(e).width > 0 && !e.closest('sup, sub')).map((e) => parseFloat(getComputedStyle(e).fontSize)));
    return { count: links.length, links, mailtos: [...new Set([...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href')))].length, pre: pre ? { sw: pre.scrollWidth, cw: pre.clientWidth } : null, smallest, vh: innerHeight, emailSentence: document.body.innerText.includes('Custom evaluations and consulting are arranged by email.') };
  });
  check(`${tag}: F-149 two actions, mail first, inside the first viewport`, custom.count === 2 && /^mailto:/.test(custom.links[0]?.href) && /github\.com\/fstandhartinger\/jevbench/.test(custom.links[1]?.href) && custom.links.every((l) => l.h >= 40 && l.bottom <= custom.vh), custom.links);
  check(`${tag}: F-149 exactly one mailto, GitHub opens in a new tab`, custom.mailtos === 1 && custom.links[1]?.target === '_blank', { mailtos: custom.mailtos, target: custom.links[1]?.target });
  check(`${tag}: F-149 shortened email sentence present`, custom.emailSentence, null);
  check(`${tag}: F-149 code block does not scroll sideways`, custom.pre && custom.pre.sw <= custom.pre.cw + 1, custom.pre);
  check(`${tag}: F-149 no text under 10 px`, custom.smallest >= 10, custom.smallest);
  await p.screenshot({ path: `${OUT}/${tag}-custom.png` });
  // F-150 + F-151 on /jev-models
  await go('/jev-models');
  const jev = await p.evaluate(() => {
    const r = (e) => e.getBoundingClientRect();
    const table = document.querySelector('[data-bh-jev12-table]');
    const wrap = table?.closest('.bh-table-wrap');
    const head = table?.querySelector('thead tr');
    const ths = [...(head?.querySelectorAll('th') ?? [])].map((th) => { const range = document.createRange(); range.selectNodeContents(th); const tops = [...range.getClientRects()].filter((x) => x.height >= 8).map((x) => Math.round(x.top / 8)); range.detach(); return { text: th.innerText.replace(/\s+/g, ' ').slice(0, 40), h: Math.round(r(th).height), lines: new Set(tops).size }; });
    const sticky = table?.querySelector('thead th.bh-jev-sticky');
    const stickyPinned = sticky && wrap ? (() => { wrap.scrollLeft = 400; const left = r(sticky).left - r(wrap).left; wrap.scrollLeft = 0; return { left, w: r(sticky).width }; })() : null;
    const group = document.querySelector('[data-bh-jev12-difficulty] [role="group"]');
    const buttons = [...(group?.querySelectorAll('[data-bh-jev12-scope-option]') ?? [])].map((btn) => ({ label: btn.innerText.trim(), y: Math.round(r(btn).top), w: r(btn).width }));
    return { headH: head ? r(head).height : null, ths, stickyPinned, buttons, ys: [...new Set(buttons.map((x) => x.y))], overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const maxLines = Math.max(...jev.ths.map((t) => t.lines), 0);
  check(`${tag}: F-150 head in budget (${mobile ? '70' : '68'} px), every th ≤ 3 lines`, jev.headH !== null && jev.headH <= (mobile ? 70 : 68) && maxLines <= 3, { headH: jev.headH, maxLines, ths: jev.ths.filter((t) => t.lines > 1) });
  check(`${tag}: F-150 pinned name column keeps its offset`, jev.stickyPinned && Math.abs(jev.stickyPinned.left) <= 1 && jev.stickyPinned.w > 100, jev.stickyPinned);
  check(`${tag}: F-151 scope buttons ${mobile ? 'two rows of two' : 'one row'}`, mobile ? (jev.buttons.length === 4 && jev.ys.length === 2 && jev.ys.every((y) => jev.buttons.filter((x) => x.y === y).length === 2)) : jev.ys.length === 1 && jev.buttons.length === 4, jev.buttons);
  check(`${tag}: /jev-models no overflow`, jev.overflow <= 1, jev.overflow);
  check(`${tag}: no page error on the two pages`, errors.length === 0, errors);
  await p.screenshot({ path: `${OUT}/${tag}-jev.png` });
  await c.close();
}
await b.close();
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision, at: new Date().toISOString(), passed: checks.filter((x) => x.ok).length, total: checks.length, checks }, null, 1));
const bad = checks.filter((x) => !x.ok);
console.log(`${checks.length - bad.length}/${checks.length} at ${revision} on ${BASE}`);
process.exit(bad.length ? 1 : 0);
