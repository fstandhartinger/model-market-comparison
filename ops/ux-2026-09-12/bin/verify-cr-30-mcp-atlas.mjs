// CR-30.2 / CR-30.3 (2026-09-21, iteration 143): MCP Atlas, the last collectable board of the CR-30.2
// candidate list, on the deployed site. Checks that the board is a published benchmark row carrying the
// source's own values for catalog models, that the rows the identity rule *refused* carry no value, and
// that the Benchmarks page renders it at 1440 light and 390 dark without overflow or a page error.
// The matrix API truncates a large model list, so the joined models are asked for in batches of five.
// Usage: node verify-cr-30-mcp-atlas.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-30-mcp-atlas';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const FAMILY = 'mcp-atlas';
// Every measured join, with the value the board itself prints. Re-read from the deployed matrix, so a
// silently lost or shifted join fails this check instead of passing it.
const JOINED = [
  ['claude-opus-5::xhigh', 85.8], ['gemini-3.5-flash::high', 83.6], ['kimi-k3::max', 82.3],
  ['claude-opus-4.8::max', 82.2], ['muse-spark::default', 82.2], ['inkling-small::default', 79.2],
  ['claude-opus-4.7::max', 79.1], ['claude-opus-4.6::max', 76.8], ['inkling::xhigh', 76], ['gpt-5.5::xhigh', 75.3],
  ['gpt-5.4::xhigh', 70.6], ['gpt-5.2::xhigh', 67.6], ['gpt-5.4-mini::xhigh', 56.7], ['gpt-5.1::high', 50.1],
  ['o3-pro::default', 44.5],
];
// Rows the board publishes but the identity rule refuses: an unstated setting on a multi-configuration
// family, a setting the catalog does not hold, and the unreviewed "thinking". None may carry a value.
const REFUSED = ['claude-fable-5.1::max', 'claude-sonnet-4.5::reasoning', 'claude-haiku-4.5::reasoning', 'glm-5.2::max', 'kimi-k2.5::reasoning'];

const matrixFor = async (ids) => (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(ids.join(','))}`)).json()).matrix;
const batches = (list, n) => list.reduce((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), []);

const meta = await (await fetch(`${BASE}/api/meta`)).json();
let rowSeen = false;
for (const batch of batches(JOINED, 5)) {
  const matrix = await matrixFor(batch.map(([id]) => id));
  const index = matrix.rows.findIndex((r) => String(r.benchmarkId || '').startsWith(`${FAMILY}::`));
  if (index >= 0) rowSeen = true;
  check(`matrix: MCP Atlas is a published row for ${batch.map(([id]) => id).join(', ')}`, index >= 0,
    index >= 0 ? matrix.rows[index].name : 'absent');
  for (const [id, expected] of batch) {
    const cell = (matrix.values[id] ?? []).find(([i]) => i === index);
    check(`matrix: ${id} = ${expected} (measured)`, cell && Math.abs(cell[1] - expected) < 0.05 && cell[2] === 0, cell ?? 'no cell');
  }
}
check('matrix: the board is published at all', rowSeen, rowSeen);
for (const batch of batches(REFUSED, 5)) {
  const matrix = await matrixFor(batch);
  const index = matrix.rows.findIndex((r) => String(r.benchmarkId || '').startsWith(`${FAMILY}::`));
  for (const id of batch) {
    const cell = index >= 0 ? (matrix.values[id] ?? []).find(([i]) => i === index) : undefined;
    check(`matrix: ${id} carries no MCP Atlas value (refused join)`, !cell, cell ?? 'absent, as intended');
  }
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
  check(`${label}: the Benchmarks page lists MCP Atlas`, /MCP Atlas/i.test(text), text.match(/MCP Atlas[^\n]{0,60}/i)?.[0] ?? 'absent');
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
