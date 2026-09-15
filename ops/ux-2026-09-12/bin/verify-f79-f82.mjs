// Fable pass 15 acceptance for F-79..F-82 (live, both widths, both themes). Usage: node verify-f79-f82.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/fable-20260915-pass15/after/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const res = { base: BASE, at: new Date().toISOString(), buildId: null, checks: [], errors: {} };
const ok = (name, pass, detail) => res.checks.push({ name, pass: !!pass, detail });
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`; res.errors[tag] = [];
  p.on('pageerror', (e) => res.errors[tag].push(String(e.message).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error') res.errors[tag].push(m.text().slice(0, 300)); });
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForTimeout(900); };
  await go('/benchmarks');
  if (!res.buildId) res.buildId = await p.evaluate(async () => ((await (await fetch('/')).text()).match(/<!--([A-Za-z0-9_-]{15,})-->/) || [])[1] || null);
  await p.screenshot({ path: `${OUT}/${tag}-benchmarks.png` });
  const m = await p.evaluate(() => {
    const bars = [...document.querySelectorAll('.bh-matrix-bar')].map((e) => Math.round(e.getBoundingClientRect().height));
    const descs = [...document.querySelectorAll('.bh-matrix-desc')].filter((e) => e.getClientRects().length > 0);
    const labels = [...document.querySelectorAll('table.bh-matrix tbody th.bh-matrix-stub .bh-matrix-bench')].map((e) => e.childNodes[0]?.textContent?.trim() ?? '');
    // F-81: per tbody, value counts per row in order
    const groups = [...document.querySelectorAll('table.bh-matrix tbody')].map((tb) => [...tb.querySelectorAll('tr:not(.bh-matrix-group)')].map((tr) => tr.querySelectorAll('td a.bh-matrix-link').length));
    const rowH = [...document.querySelectorAll('table.bh-matrix tbody tr:not(.bh-matrix-group)')].map((tr) => Math.round(tr.getBoundingClientRect().height));
    return { bars, descVisible: descs.length, labels, groups, rowH, docW: document.documentElement.scrollWidth };
  });
  ok(`${tag} F-79 every bar is 22 px tall (${m.bars.length} bars)`, m.bars.length > 0 && m.bars.every((h) => h === 22), { min: Math.min(...m.bars), max: Math.max(...m.bars) });
  if (kind === 'mobile') ok(`${tag} F-79 no description rendered below md`, m.descVisible === 0, m.descVisible);
  else ok(`${tag} F-79 descriptions rendered at 1440`, m.descVisible > 0, m.descVisible);
  ok(`${tag} F-79 tallest row`, kind === "mobile" ? Math.max(...m.rowH) <= 120 : Math.max(...m.rowH) <= 90 /* name + cohort + description = 84 px */, { max: Math.max(...m.rowH), median: m.rowH.sort((a, b) => a - b)[m.rowH.length >> 1] });
  ok(`${tag} F-80 no label starts with "Artificial Analysis"`, m.labels.length > 0 && !m.labels.some((l) => /^Artificial Analysis/.test(l)), m.labels.filter((l) => /Coding Agent/.test(l)));
  ok(`${tag} F-80 "AA Coding Agent Index" present`, m.labels.some((l) => /^AA Coding Agent Index/.test(l)));
  const bad = m.groups.map((g) => { let seenSingle = false; for (const n of g) { if (n < 2) seenSingle = true; else if (seenSingle) return true; } return false; });
  ok(`${tag} F-81 no single-value row before a comparable row in any category`, !bad.some(Boolean), m.groups);
  ok(`${tag} no horizontal page overflow`, m.docW <= vp.width, m.docW);
  // F-82: Simple landing section
  await go('/');
  const s2 = await p.evaluate(() => {
    const sec = document.querySelector('#benchmarks'); if (!sec) return null;
    const heads = [...sec.querySelectorAll('thead th.bh-matrix-model')].map((e) => e.innerText.replace(/\n/g, ' / '));
    const h = sec.querySelector('thead tr')?.getBoundingClientRect().height;
    return { heads, headH: Math.round(h ?? 0) };
  });
  if (s2) { sec: { const el = await p.locator('#benchmarks').first(); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${tag}-simple-section2.png` }); } }
  ok(`${tag} F-82 Simple section present`, !!s2, s2?.heads);
  ok(`${tag} F-82 no "(Adaptive" / "Effort" in Simple column headers`, s2 && !s2.heads.some((h) => /\(Adaptive|Effort/.test(h)), s2?.heads);
  ok(`${tag} F-82 Simple header row height`, s2 && (kind === 'mobile' ? s2.headH <= 150 : s2.headH <= 110), s2?.headH);
  await c.close();
}
await b.close();
res.pass = res.checks.filter((c) => c.pass).length; res.total = res.checks.length;
res.pageErrors = Object.values(res.errors).flat().length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(res, null, 1));
for (const c of res.checks) if (!c.pass) console.log('FAIL', c.name, JSON.stringify(c.detail).slice(0, 300));
console.log(`${BASE} build ${res.buildId}: ${res.pass}/${res.total} pass, page errors ${res.pageErrors}`);
