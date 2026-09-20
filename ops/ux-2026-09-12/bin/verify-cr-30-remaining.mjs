// CR-30.2 / CR-30.3 closing check (2026-09-20, iteration 139): of the four tier-A candidates the row
// still listed as open, three are live — Toolathlon-Verified (iteration 126), FrontierSWE and
// PostTrainBench (iteration 117). This verifier proves that on the deployed site instead of taking the
// iteration logs' word for it, so the ledger row can name MCP Atlas (blocked on Florian's Scale terms
// decision) as the only thing left.
// Checks per board: the catalog API publishes it as a benchmark with measured values joined to catalog
// models, and the Benchmarks page renders it as a row with a value at 1440 light and 390 dark.
// Usage: node verify-cr-30-remaining.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-30-remaining';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

// The boards, with a model the board measures and its published value — re-read from the deployed
// matrix, so a silent loss of the join would fail this check rather than pass it.
const BOARDS = [
  { family: 'toolathlon-verified', label: 'Toolathlon', models: ['kimi-k3::max', 'muse-spark-1.1::xhigh'] },
  { family: 'frontierswe', label: 'FrontierSWE', models: ['claude-fable-5.1::max', 'gpt-5.6-sol::max'] },
  { family: 'posttrainbench', label: 'PostTrainBench', models: ['claude-fable-5::max', 'gpt-5.6-sol::max'] },
];

const meta = await (await fetch(`${BASE}/api/meta`)).json();
for (const board of BOARDS) {
  const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(board.models.join(','))}`)).json()).matrix;
  const index = matrix.rows.findIndex((r) => String(r.benchmarkId || '').startsWith(`${board.family}::`));
  check(`${board.label}: the board is a published benchmark row`, index >= 0, index >= 0 ? matrix.rows[index].name : 'absent');
  const values = board.models.map((id) => (matrix.values[id] ?? []).find(([i]) => i === index)).filter(Boolean);
  check(`${board.label}: it carries measured values for catalog models`, values.length >= 1 && values.every(([, v, basis]) => Number.isFinite(v) && basis === 0),
    values.map(([, v, b]) => [v, b]));
}

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
  for (const board of BOARDS) check(`${label}: the Benchmarks page lists ${board.label}`, new RegExp(board.label, 'i').test(text),
    text.match(new RegExp(`${board.label}[^\\n]{0,40}`, 'i'))?.[0] ?? 'absent');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${label}: no horizontal page overflow`, overflow <= 1, overflow);
  check(`${label}: no page error`, errors.length === 0, errors.slice(0, 3));
  await page.screenshot({ path: `${OUT}/${label}.png` });
  await context.close();
}
await browser.close();

const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, `${JSON.stringify({ base: BASE, revision: meta.revision, passed, total: checks.length, checks }, null, 2)}\n`);
for (const c of checks) if (!c.ok) console.log('FAIL', c.name, c.detail);
console.log(`${passed}/${checks.length} ${BASE}`);
process.exit(passed === checks.length ? 0 : 1);
