// CR-85.2 live verification (2026-09-20, iteration 139): the LiveBench board joins the catalog.
// CR-85.2 asks for "other primary sources for V4.1 Flash … LiveBench/SWE-bench/Terminal-Bench
// leaderboards … ingest each with provenance". This verifier checks, live on a deployed host:
//   * the deployed revision is the one under test;
//   * the LiveBench row exists in the benchmark matrix with the exact values re-derived from the
//     committed capture (no rounding drift, no bridge estimate standing in for a published value);
//   * a slug the rule deliberately refuses (kimi-k3, a dated checkpoint, an unstated setting) is
//     still unjoined — the board must not have been joined by approximation;
//   * the two models whose Benchmaxxing level moved sit where the published blend puts them;
//   * the model page renders the board, at 1440 light and 390 dark, with no page error and no
//     horizontal overflow.
// Usage: node verify-cr-85-2-livebench.mjs <base> <outdir> [revision]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-85-2';
const REV = process.argv[4] || null;
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// Values re-derived from ops/rebuild-2026-09/evidence/phase-04/sources/final-e70f40005b36.gz
// (sha256 186ca65e…) under LiveBench's documented formula, not copied from our own dataset.
const EXPECTED = {
  'deepseek-v4.1-flash::max': 81.11,
  'glm-5.3-flash::default': 71.59,
  'gemini-3.6-flash::high': 73.59,
  'claude-fable-5.1::max': 83.41,
  'gpt-6-astra::max': 82.16,
};
const REFUSED = ['kimi-k3::max', 'glm-5.2::max'];

const meta = await (await fetch(`${BASE}/api/meta`)).json();
check('the host serves the revision under test', !REV || meta.revision === REV, meta.revision);

// --- the board is on the matrix with the published values -------------------------------------
const ids = Object.keys(EXPECTED);
const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(ids.join(','))}`)).json()).matrix;
// values[modelId] is a list of [rowIndex, value, basisCode]; basisCode 0 is `measured`
// (BASIS_CODE in lib/benchmark-matrix.mjs), which is what separates a published value from a bridge estimate.
const lbIndex = matrix.rows.findIndex((r) => /^livebench::/.test(r.benchmarkId || ''));
const lbCount = matrix.rows.filter((r) => /^livebench::/.test(r.benchmarkId || '')).length;
check('the matrix carries exactly one LiveBench row', lbCount === 1, lbCount);
const row = matrix.rows[lbIndex];
check('the row names the board and its captured release', row && row.name === 'LiveBench' && row.version === '2026-06-25', row && [row.name, row.version]);
check('the row is published with its unit and direction', row && row.unit === 'points' && row.higherBetter === true, row && [row.unit, row.higherBetter]);
const cellFor = (m, index, id) => (m.values[id] ?? []).find(([i]) => i === index);
for (const [id, want] of Object.entries(EXPECTED)) {
  const cell = cellFor(matrix, lbIndex, id);
  check(`${id}: LiveBench ${want} is published`, cell && Math.abs(cell[1] - want) < 0.005, cell);
  check(`${id}: the value is a measurement, not an estimate`, cell && cell[2] === 0, cell && cell[2]);
}
const refusedMatrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(REFUSED.join(','))}`)).json()).matrix;
const refusedIndex = refusedMatrix.rows.findIndex((r) => /^livebench::/.test(r.benchmarkId || ''));
check('a slug the rule refuses stays unjoined (no LiveBench value)', refusedIndex === -1
  || REFUSED.every((id) => !cellFor(refusedMatrix, refusedIndex, id)), refusedIndex === -1 ? 'no row at all'
  : REFUSED.map((id) => cellFor(refusedMatrix, refusedIndex, id)));

// --- the two Benchmaxxing levels that moved ------------------------------------------------------
for (const [id, want] of [['gemini-3.6-flash::high', 5.92], ['qwen3.6-plus::default', 5.90]]) {
  const report = (await (await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(id)}`)).json()).report;
  check(`${id}: the published blend is ${want}`, report && report.status === 'scored' && Math.abs(report.score - want) < 0.05, report && report.score);
  check(`${id}: the blend is under the medium line, so the tag is light`, report && report.score < 6 && report.score >= 3, report && report.score);
  check(`${id}: score is still gap + jaggedness term`, report && Math.abs(report.score - (report.parts.gap + report.parts.jaggednessTerm)) < 1e-9, report && [report.parts.gap, report.parts.jaggednessTerm]);
}

// --- the model page renders the board -------------------------------------------------------------
const browser = await chromium.launch();
for (const [label, width, height, scheme] of [['desktop-light', 1440, 1000, 'light'], ['phone-dark', 390, 844, 'dark']]) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/models/deepseek-v4.1-flash::max`, { waitUntil: 'networkidle', timeout: 60000 });
  // The full benchmark sheet is lazy; open every disclosure that offers all benchmarks.
  for (const name of [/all benchmarks/i, /benchmark results/i]) {
    const toggle = page.getByRole('button', { name }).first();
    if (await toggle.count() && await toggle.isVisible()) { await toggle.click().catch(() => {}); await page.waitForTimeout(600); }
  }
  await page.waitForTimeout(800);
  const text = await page.locator('body').innerText();
  check(`${label}: the model page names LiveBench`, /LiveBench/i.test(text), text.match(/LiveBench[^\n]{0,40}/)?.[0] ?? 'absent');
  // The sheet prints the site's one-decimal display of the published 81.11, next to the release it came from.
  check(`${label}: the published value is on the page as 81.1 (2026-06-25)`, /81\.1\b/.test(text) && /2026-06-25/.test(text),
    text.match(/LiveBench[\s\S]{0,80}/)?.[0]?.replace(/\n/g, ' ') ?? 'absent');
  check(`${label}: the page calls the value measured, not estimated`, !/LiveBench[\s\S]{0,120}(estimate|bridge)/i.test(text), '');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal page overflow`, overflow <= 1, overflow);
  check(`${label}: no page error`, errors.length === 0, errors.slice(0, 3));
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: false });
  await context.close();
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, revision: meta.revision, generated_at: meta.generated_at, passed, total: checks.length, checks }, null, 2)}\n`);
for (const c of checks) if (!c.ok) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} ${BASE}`);
process.exit(passed === checks.length ? 0 : 1);
