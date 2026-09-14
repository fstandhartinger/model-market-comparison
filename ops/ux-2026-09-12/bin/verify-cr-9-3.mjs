// CR-9.3 acceptance (review gate 2026-09-14T213002Z): no invented data in the comparison table.
// Opens /benchmarks with the "All" row preset, samples valued cells spread over the whole table,
// opens each cell's detail page and asserts that the selected model's row there shows the same
// value, a basis, an ISO date and an off-site source link. Missing cells must carry no link and
// no data bar. Writes cells.json (axis, model, value) for the offline dataset trace.
// Replaces a corrupted, never-committed draft left by the failed 21:00 Kimi gate.
// Usage: node verify-cr-9-3.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
import fs from 'node:fs/promises';

const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/tmp/cr-9-3';
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail: detail ?? '' }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };
const num = (t) => (String(t).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/) ?? [null])[0];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const rowsBtn = p.locator('.bh-preset[data-preset-kind="rows"] > button');
if (await rowsBtn.count()) {
  await rowsBtn.first().click().catch(() => {});
  const allBtn = p.locator('.bh-preset[data-preset-kind="rows"]').getByRole('button', { name: /^All\b/ });
  if (await allBtn.count()) { await allBtn.first().click(); await p.waitForTimeout(900); }
  await p.keyboard.press('Escape').catch(() => {});
}
const table = await p.evaluate(() => {
  const cells = [...document.querySelectorAll('table.bh-matrix td.bh-matrix-cell')];
  const valued = cells.map((td) => td.querySelector('a.bh-matrix-link')).filter(Boolean).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
  const missing = cells.filter((td) => !td.querySelector('a.bh-matrix-link'));
  const missingBad = missing.filter((td) => !/^[—–-]$/.test(td.textContent.trim()) || getComputedStyle(td).backgroundImage !== 'none' && /gradient/.test(getComputedStyle(td).backgroundImage)).map((td) => td.textContent.trim()).slice(0, 5);
  return { valued, missing: missing.length, missingBad, count: document.body.innerText.match(/\d+ benchmarks? across \d+ categor\w+/)?.[0] ?? '' };
});
check('All preset renders a large table', table.valued.length >= 100, `valued=${table.valued.length} missing=${table.missing} "${table.count}"`);
check('missing cells show only a dash, no link, no bar', table.missingBad.length === 0, JSON.stringify(table.missingBad));

const stride = Math.max(1, Math.floor(table.valued.length / 30));
const sample = table.valued.filter((_, i) => i % stride === 0).slice(0, 30);
const cells = [];
for (const [i, cell] of sample.entries()) {
  const url = new URL(cell.href, BASE);
  const q = await ctx.newPage();
  let d = null;
  try {
    await q.goto(url.href, { waitUntil: 'networkidle' });
    await q.waitForTimeout(300);
    d = await q.evaluate(() => {
      const name = document.querySelector('#bh-result-model a')?.textContent.trim() ?? '';
      const tr = [...document.querySelectorAll('tbody tr')].find((r) => r.querySelector('th')?.childNodes[0]?.textContent.trim() === name);
      const tds = tr ? [...tr.querySelectorAll('td')] : [];
      const ext = tds[1] ? [...tds[1].querySelectorAll('a[href^="http"]')].map((a) => a.href).filter((h) => !/benchmarkheaven|mintapis|localhost/.test(h)) : [];
      return { name, result: tds[0]?.textContent.trim() ?? null, meta: tds[1]?.textContent.trim() ?? '', ext };
    });
  } catch (e) { d = { error: String(e).slice(0, 120) }; }
  await q.close();
  const same = d?.result != null && num(d.result) === num(cell.text);
  const date = /\b20\d\d-\d\d-\d\d\b/.test(d?.meta ?? '');
  const basis = /measured|self[ -]reported|leaderboard|vendor|independent|published|reported/i.test(d?.meta ?? '');
  const source = (d?.ext ?? []).length > 0;
  cells.push({ axis: url.searchParams.get('axis'), model: url.searchParams.get('model'), table: cell.text, detail: d, same, date, basis, source });
  check(`cell ${i + 1} ${url.searchParams.get('axis')} × ${url.searchParams.get('model')}`, same && date && basis && source, `table=${cell.text} detail=${d?.result} meta="${(d?.meta ?? d?.error ?? '').slice(0, 90)}"`);
}
check('no page errors', errors.length === 0, errors.join(' | ').slice(0, 200));
await b.close();
await fs.writeFile(`${OUT}/cells.json`, JSON.stringify(cells, null, 2));
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
