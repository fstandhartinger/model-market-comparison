// CR-38.1 (2026-09-21, iteration 148): AA rewrote its Terminal-Bench 4.0 harness paragraph (the mini-SWE-agent v2.4.6
// pin and the 30 s command timeout became "the mini-swe-agent harness" and upstream task timeouts), so the field is
// split by collection window. On the deployed site, until a reviewed AA snapshot from 2026-09-21T10:31:33Z on exists,
// the retained aa-terminal-bench::4.0 row still carries the 2026-09-10 snapshot's measured values and is tagged
// retired, and aa-terminal-bench::4.0-upstream-timeouts carries no value. After that snapshot publishes, run with
// --published: the successor carries the same values and the old row none of them.
// Usage: node verify-cr-38-tb40-split.mjs <base> <outdir> [--published]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-38-tb40-split';
const published = process.argv.includes('--published');
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// Values of the 2026-09-10 snapshot (data/raw/benchmarks/scores.json at e4dd106); AA's 2026-09-21 page has the same.
const WANT = { 'gpt-6-astra::xhigh': 0.595959595959596, 'claude-fable-5.1::xhigh': 0.55050505050505 };
const OLD = 'aa-terminal-bench::4.0', NEW = 'aa-terminal-bench::4.0-upstream-timeouts';
const meta = await (await fetch(`${BASE}/api/meta?v=${Date.now()}`, { cache: 'no-store' })).json();
const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(Object.keys(WANT).join(','))}&v=${Date.now()}`, { cache: 'no-store' })).json()).matrix;
const rowOf = (id) => matrix.rows.findIndex((r) => r.benchmarkId === id);
const [holder, empty] = published ? [NEW, OLD] : [OLD, NEW];
const index = rowOf(holder);
check(`matrix: ${holder} holds the AA values`, index >= 0, index >= 0 ? matrix.rows[index].name : 'absent');
for (const [model, value] of Object.entries(WANT)) {
  const cell = (matrix.values[model] ?? []).find(([i]) => i === index);
  check(`matrix: ${model} on ${holder} = ${value.toFixed(4)} (measured)`, cell && Math.abs(cell[1] - value) < 1e-6 && cell[2] === 0, cell ?? 'no cell');
}
const other = rowOf(empty);
const leaked = other < 0 ? [] : Object.keys(WANT).map((m) => (matrix.values[m] ?? []).find(([i]) => i === other)).filter(Boolean);
check(`matrix: ${empty} carries none of these values`, leaked.length === 0, other < 0 ? 'no row' : leaked);
const oldRow = matrix.rows[rowOf(OLD)];
if (oldRow) check(`matrix: ${OLD} is tagged retired`, oldRow.retired === true && oldRow.tags.includes('retired'), oldRow.tags);

const browser = await chromium.launch();
for (const [label, width, height, scheme] of [['desktop-light', 1440, 1000, 'light'], ['phone-dark', 390, 844, 'dark']]) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/benchmarks?v=${Date.now()}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const text = await page.locator('body').innerText();
  check(`${label}: the Benchmarks page lists Terminal-Bench v4.0 (AA)`, /Terminal-Bench v4\.0 \(AA/.test(text), text.match(/Terminal-Bench v4\.0[^\n]{0,60}/)?.[0] ?? 'absent');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal page overflow`, overflow <= 1, overflow);
  check(`${label}: no page error`, errors.length === 0, errors.slice(0, 3));
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: false });
  await context.close();
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, revision: meta.revision, generated_at: meta.generated_at, published, passed, total: checks.length, checks }, null, 2)}\n`);
for (const c of checks) if (!c.ok) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} ${BASE} @ ${meta.revision}`);
