// CR-38.1 (2026-09-21, iteration 144): AA re-versioned GDPval-AA (v2 → v2.1), AA-Briefcase (→ v1.1) and
// GDP.pdf's document delivery under the same source fields. On the deployed site, the retained identities
// must still carry the 2026-09-10 snapshot's own values, and the three successor identities must carry no
// value until a reviewed AA snapshot from 2026-09-21 on exists — a v2.1 Elo may never appear under v2, nor
// a v2 Elo under v2.1. The Benchmarks page renders at 1440 light and 390 dark without overflow or error.
// Usage: node verify-cr-38-aa-reversion.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-38-aa-reversion';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// Values of the 2026-09-10 snapshot (data/raw/benchmarks/aa-observed-fields.json at 76c8942). On AA's
// 2026-09-21 page the same models read 1184.8 / 1107.02 (GDPval v2.1) — those must not appear anywhere yet.
const MODELS = ['gemini-3.5-flash::high', 'mimo-v2.5-pro::default'];
const RETAINED = { 'aa-gdpval::2': { 'gemini-3.5-flash::high': 1259.06, 'mimo-v2.5-pro::default': 1186.32 } };
const SUCCESSORS = ['aa-gdpval::2.1', 'aa-briefcase::1.1', 'aa-gdp-pdf::snapshot-2026-09-21'];

const meta = await (await fetch(`${BASE}/api/meta`)).json();
const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(MODELS.join(','))}`)).json()).matrix;
const rowOf = (id) => matrix.rows.findIndex((r) => r.benchmarkId === id);
for (const [id, want] of Object.entries(RETAINED)) {
  const index = rowOf(id);
  check(`matrix: ${id} is still a published row`, index >= 0, index >= 0 ? matrix.rows[index].name : 'absent');
  for (const [model, value] of Object.entries(want)) {
    const cell = (matrix.values[model] ?? []).find(([i]) => i === index);
    check(`matrix: ${model} on ${id} = ${value} (the 2026-09-10 snapshot, measured)`, cell && Math.abs(cell[1] - value) < 0.05 && cell[2] === 0, cell ?? 'no cell');
  }
}
for (const id of SUCCESSORS) {
  const index = rowOf(id);
  const cells = index < 0 ? [] : MODELS.map((m) => (matrix.values[m] ?? []).find(([i]) => i === index)).filter(Boolean);
  check(`matrix: ${id} carries no value before a reviewed 2026-09-21 AA snapshot`, cells.length === 0, index < 0 ? 'no row, as intended' : cells);
}
const allValues = Object.values(matrix.values).flat().map(([, v]) => v);
check('matrix: no v2.1-scale GDPval value (1184.8 / 1107.02) appears for these models', !allValues.some((v) => Math.abs(v - 1184.8) < 0.005 || Math.abs(v - 1107.02) < 0.005), 'none');

const browser = await chromium.launch();
for (const [label, width, height, scheme] of [['desktop-light', 1440, 1000, 'light'], ['phone-dark', 390, 844, 'dark']]) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/benchmarks`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const text = await page.locator('body').innerText();
  check(`${label}: the Benchmarks page lists GDPval-AA`, /GDPval/i.test(text), text.match(/GDPval[^\n]{0,60}/i)?.[0] ?? 'absent');
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
console.log(`${passed}/${checks.length} ${BASE} @ ${meta.revision}`);
