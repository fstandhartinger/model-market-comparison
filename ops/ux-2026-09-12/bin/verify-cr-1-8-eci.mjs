// CR-1.8 / CR-9.3 re-check after review gate 213002Z (iteration 58): the two Epoch ECI rows of the
// comparison table must open a detail page with the same value, a basis, an ISO date and an off-site
// source — at 1440 and 390, light and dark. Also: every "other results" link on that page opens a
// result page (no fallback to /models/…), and F-77: the toolbar counts benchmarks like "Choose rows".
// Usage: node verify-cr-1-8-eci.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/tmp/cr-1-8-eci';
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail ?? '' }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const num = (t) => (String(t).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) ?? [null])[0];

const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const ctx = await b.newContext({ viewport, colorScheme: theme });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(900);
  const counts = await p.evaluate(() => ({
    // F-83: the status holds the count <select>; its option texts would otherwise run into the sentence.
    status: (() => { const el = document.querySelector('section[aria-label="Benchmark comparison"] [role="status"]'); if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('select').forEach((x, i) => x.replaceWith(el.querySelectorAll('select')[i].value)); return c.textContent.replace(/\s+/g, ' ').trim(); })(),
    chooser: document.querySelector('.bh-rowpicker summary')?.textContent.replace(/\s+/g, ' ').trim() ?? '',
    rows: document.querySelectorAll('table.bh-matrix tbody tr:not(.bh-matrix-group)').length,
  }));
  const m = counts.status.match(/(\d+) benchmarks across \d+ categories(?: in (\d+) rows)?/), c = counts.chooser.match(/\((\d+) of \d+\)/);
  // F-102: both numbers count boards (family + version); a harness cohort and a cost twin are rows of a
  // board, so the table has at least as many rows as it has benchmarks.
  check(`${tag} F-77 / F-102 toolbar benchmark count equals the row chooser; the table has at least that many rows`,
    m && c && m[1] === c[1] && counts.rows >= Number(m[2] ?? m[1]), `${counts.status} · ${counts.chooser} · rows ${counts.rows}`);
  const links = await p.evaluate(() => [...document.querySelectorAll('table.bh-matrix tbody tr')]
    // The two ECI boards are named "Epoch …"; a benchmark that merely credits Epoch AI as its publisher
    // (DeepSWE, since 2026-09-15) is a different row and is not what E1/CR-1.8 checks here.
    .filter((tr) => /^Epoch/.test((tr.querySelector('.bh-matrix-bench')?.childNodes[0]?.textContent ?? '').trim()))
    .map((tr) => ({ name: tr.querySelector('.bh-matrix-bench')?.childNodes[0]?.textContent ?? '', cells: [...tr.querySelectorAll('a.bh-matrix-link')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() })) })));
  check(`${tag} both Epoch ECI rows are in the default table`, links.length === 2, links.map((l) => l.name).join(' | '));
  const hrefsOk = links.every((l) => l.cells.length > 0 && l.cells.every((x) => x.href.startsWith('/benchmarks/result?')));
  check(`${tag} every Epoch ECI cell links to /benchmarks/result`, hrefsOk, links.map((l) => `${l.name}: ${l.cells.map((x) => x.href.split('?')[0]).join(',')}`).join(' | '));
  for (const [i, l] of links.entries()) {
    const cell = l.cells[0];
    if (!cell) continue;
    await p.goto(BASE + cell.href, { waitUntil: 'networkidle' });
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForTimeout(400);
    const d = await p.evaluate(() => {
      const name = document.querySelector('#bh-result-model a')?.textContent.trim() ?? '';
      const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.querySelector('th')?.childNodes[0]?.textContent.trim() === name);
      const tds = tr ? [...tr.querySelectorAll('td')] : [];
      const ext = tds[1] ? [...tds[1].querySelectorAll('a[href^="http"]')].map((a) => a.href) : [];
      const panel = document.querySelector('section[aria-labelledby="bh-result-model"]')?.innerText ?? '';
      const others = [...document.querySelectorAll('section[aria-labelledby="bh-result-others"] li a')].map((a) => a.getAttribute('href'));
      return { h1: document.querySelector('h1')?.textContent.trim(), value: document.querySelector('[data-bh-result-value]')?.textContent.trim(), result: tds[0]?.textContent.trim() ?? null, meta: tds[1]?.textContent.trim() ?? '', ext, panel, others, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    await p.screenshot({ path: `${OUT}/${tag}-eci-${i}.png`, fullPage: true });
    const software = /Software/.test(l.name);
    check(`${tag} ${l.name}: detail value equals the cell`, num(d.value) === num(cell.text) && num(d.result) === num(cell.text), `cell=${cell.text} page=${d.value} row=${d.result}`);
    check(`${tag} ${l.name}: basis, ISO date and off-site Epoch source`, /published|computed/i.test(d.meta) && /\b20\d\d-\d\d-\d\d\b/.test(d.meta) && d.ext.some((h) => /epoch\.ai\//.test(h)), d.meta);
    check(`${tag} ${l.name}: provenance panel names basis, collection date, licence and source`, (software ? /Computed by Benchmark Heaven.*Epoch does not publish this number/s.test(d.panel) : /Published by Epoch AI/.test(d.panel)) && /Collected\s+20\d\d-\d\d-\d\d/.test(d.panel) && /CC-BY/.test(d.panel) && /epoch\.ai\/data\//.test(d.panel), d.panel.replace(/\s+/g, ' ').slice(0, 160));
    check(`${tag} ${l.name}: every "other result" opens a result page`, d.others.length > 5 && d.others.every((h) => h.startsWith('/benchmarks/result?')), `${d.others.length} links`);
    check(`${tag} ${l.name}: no horizontal page overflow`, !d.overflow, '');
  }
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | ').slice(0, 200));
  await ctx.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
