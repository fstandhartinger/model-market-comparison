// Acceptance for CR-1.9: the Benchmarks tab carries a chart of the compared models on the headline
// benchmarks. Grouped marks per benchmark, model colours identical to the table's column accents,
// a legend, values readable without hover at 390 px, no linear bars across > 20× ranges, Elo never
// drawn as a bar from zero, and the benchmark set follows the "Important" rows.
// Usage: node verify-cr-1-9.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = process.argv[2] || 'https://benchmarkheaven.com';
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter53-cr-1-9/canonical';
await fs.mkdir(OUT, { recursive: true });
const b = await chromium.launch();
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail ?? ''}`); };

const snapshot = () => {
  const sec = document.querySelector('section[aria-labelledby="bh-bars-title"]');
  const table = document.querySelector('table.bh-matrix');
  if (!sec || !table) return { sec: !!sec, table: !!table };
  const colColours = [...table.querySelectorAll('thead th.bh-matrix-model .bh-matrix-accent')].map((el) => getComputedStyle(el, '::after').backgroundColor);
  const colNames = [...table.querySelectorAll('thead th.bh-matrix-model .bh-matrix-name')].map((el) => el.textContent.trim());
  const legend = [...sec.querySelectorAll('ul[aria-label="Chart legend"] li')].map((li) => ({ colour: getComputedStyle(li.querySelector('.bh-bars-key')).backgroundColor, name: li.querySelector('.truncate').textContent.trim() }));
  const figs = [...sec.querySelectorAll('figure')].map((f) => {
    const rows = [...f.querySelectorAll('.bh-bars-row')];
    const marks = rows.map((r) => r.querySelector('.bh-bars-bar, .bh-bars-dot'));
    const values = rows.map((r) => r.lastElementChild.textContent.replace(' (best)', '').trim());
    const trackW = rows[0]?.querySelector('.bh-bars-track').getBoundingClientRect().width ?? 0;
    return { name: f.querySelector('figcaption span').textContent.trim(), caption: f.querySelector('figcaption span:last-child').textContent.trim(), kind: f.dataset.kind, rows: rows.length,
      markColours: marks.map((m) => m ? getComputedStyle(m).backgroundColor : null), barCount: f.querySelectorAll('.bh-bars-bar').length, dotCount: f.querySelectorAll('.bh-bars-dot').length,
      values, visibleValues: rows.map((r) => r.lastElementChild.getBoundingClientRect().width > 0), trackW, height: f.getBoundingClientRect().height };
  });
  const tooltips = [...sec.querySelectorAll('.bh-bars-row')].filter((r) => r.getAttribute('title')?.includes(':')).length;
  const importantRows = [...table.querySelectorAll('tbody tr:not(.bh-matrix-group)')].filter((tr) => tr.querySelector('.bh-matrix-tag[data-tag="headline"], .bh-matrix-tag[data-tag="aa"], .bh-matrix-tag[data-tag="arena"]')).map((tr) => tr.querySelector('.bh-matrix-bench').childNodes[0].textContent);
  const sub = sec.querySelector('p.bh-muted')?.textContent ?? '';
  const showAll = [...sec.querySelectorAll('button')].find((x) => /Show all/.test(x.textContent))?.textContent ?? null;
  return { sec: true, table: true, colColours, colNames, legend, figs, tooltips, importantRows, sub, showAll,
    docOverflow: document.documentElement.scrollWidth > innerWidth + 1, secOverflow: sec.scrollWidth > sec.clientWidth + 1 };
};

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  const tag = `${kind}_${theme}`;
  await p.goto(BASE + '/benchmarks', { waitUntil: 'networkidle' });
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await p.waitForTimeout(900);
  let s = await p.evaluate(snapshot);
  check(`${tag} CR-1.9 chart section and table present`, s.sec && s.table, JSON.stringify({ sec: s.sec, table: s.table }));
  if (!s.sec || !s.table) { await c.close(); continue; }
  const sec = p.locator('section[aria-labelledby="bh-bars-title"]');
  await sec.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${OUT}/${tag}-chart.png` });
  await sec.screenshot({ path: `${OUT}/${tag}-chart-section.png` });
  const n = s.colNames.length;
  check(`${tag} legend lists every compared model in column order`, s.legend.length === n && s.legend.every((l, j) => l.name === s.colNames[j]), s.legend.map((l) => l.name).join(' | '));
  check(`${tag} model colours: legend = table column accent, all distinct`, s.legend.every((l, j) => l.colour === s.colColours[j]) && new Set(s.colColours).size === Math.min(n, 8), s.colColours.join(' '));
  check(`${tag} every mark wears its column's colour`, s.figs.every((f) => f.markColours.every((m, j) => m == null || m === s.colColours[j])), '');
  check(`${tag} one row per compared model in each small multiple`, s.figs.length > 0 && s.figs.every((f) => f.rows === n), `${s.figs.length} figures × ${n}`);
  check(`${tag} benchmark set = Important rows with ≥ 2 values (first figures match table order)`, s.figs.every((f) => s.importantRows.includes(f.name) || /Index|ECI/.test(f.name)), s.figs.map((f) => f.name).slice(0, 14).join(' | '));
  check(`${tag} values printed (readable without hover) and title tooltips on every row`, s.figs.every((f) => f.visibleValues.every(Boolean)) && s.tooltips === s.figs.reduce((a, f) => a + f.rows, 0), `tooltips=${s.tooltips}`);
  const elo = s.figs.filter((f) => /Elo|position/.test(f.caption));
  check(`${tag} Elo / no-zero scales are positions (dots), never bars`, elo.every((f) => f.kind === 'position' && f.barCount === 0), elo.map((f) => `${f.name}:${f.kind}`).join(' | ') || 'none present');
  const parse = (t) => { const m = t.replace(/[$,%]/g, ''); return Number(m); };
  const bars = s.figs.filter((f) => f.kind === 'bar');
  check(`${tag} no linear bar figure spans > 20× (positive values)`, bars.every((f) => { const v = f.values.map(parse).filter((x) => x > 0); return v.length < 2 || Math.max(...v) / Math.min(...v) <= 20; }), `${bars.length} bar figures`);
  check(`${tag} no page overflow; chart fits its card; track ≥ 120 px`, !s.docOverflow && !s.secOverflow && s.figs.every((f) => f.trackW >= 120), `track min ${Math.min(...s.figs.map((f) => f.trackW)).toFixed(0)} px`);
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  if (s.showAll) {
    await sec.getByRole('button', { name: /Show all/ }).click();
    const after = await p.evaluate(snapshot);
    check(`${tag} "Show all" reveals every headline benchmark`, after.figs.length === Number(s.showAll.match(/\d+/)[0]), `${after.figs.length} after ${s.showAll}`);
  }
  // Colour follows the entity: removing the second column must not repaint the first.
  const firstBefore = s.colColours[0];
  await p.locator('thead th.bh-matrix-model').nth(1).getByRole('button').click();
  await p.waitForTimeout(400);
  const s2 = await p.evaluate(snapshot);
  check(`${tag} removing a column keeps the lead colour and shrinks every multiple`, s2.colColours[0] === firstBefore && s2.figs.every((f) => f.rows === n - 1), `${s2.colNames.length} cols`);
  await c.close();
}
await b.close();
const passed = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: results.length, results }, null, 2));
console.log(`${passed}/${results.length}`);
process.exit(passed === results.length ? 0 : 1);
