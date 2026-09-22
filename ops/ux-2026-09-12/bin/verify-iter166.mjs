// Iteration 166 live check (claude-opus): the Qwen releases Epoch spells with a space carry their Epoch ECI on both the
// API and the model page (desktop + phone), and no phantom "epoch-eci" board exists in the benchmark registry API.
// Usage: node verify-iter166.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter166';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const eci = JSON.parse(await fs.readFile(new URL('../../../data/raw/epoch-eci.json', import.meta.url), 'utf8'));
const general = (name) => eci.models.find((m) => m.source_model_name === name)?.general;
const EXPECT = [['Qwen 3.8 Max', 'qwen3.8-max::default'], ['Qwen 3.6 Plus', 'qwen3.6-plus::default'], ['Qwen 3.6 Max (Preview)', 'qwen3.6-max-preview::default'], ['Qwen 3.6 Flash', 'qwen3.6-flash::default']];
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
for (const [name, id] of EXPECT) {
  const r = await (await fetch(`${BASE}/api/models/${encodeURIComponent(id)}?v=${Date.now()}`)).json();
  const m = r.model ?? r;
  check(`API ${id} epoch_eci = ${general(name)}`, m?.benchmarks?.epoch_eci === general(name), String(m?.benchmarks?.epoch_eci));
}
const reg = await (await fetch(`${BASE}/api/benchmarks?v=${Date.now()}`)).json();
const list = reg.benchmarks ?? reg.entries ?? reg;
check('no epoch-eci board in the registry API', Array.isArray(list) && !list.some((b) => String(b.id).startsWith('epoch-eci')), `${list.length} entries`);
const browser = await chromium.launch();
for (const [w, h, theme] of [[1440, 1000, 'light'], [390, 844, 'dark']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/models/${encodeURIComponent('qwen3.8-max::default')}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  const value = general('Qwen 3.8 Max');
  check(`${w}px ${theme}: model page shows Epoch ECI ${value.toFixed(1)}`, /Epoch ECI/.test(text) && text.includes(value.toFixed(1)));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${w}px ${theme}: no horizontal overflow`, overflow <= 1, String(overflow));
  check(`${w}px ${theme}: no page errors`, errors.length === 0, errors.join(' | '));
  await page.screenshot({ path: `${OUT}/qwen38max-${w}-${theme}.png` });
  await ctx.close();
}
await browser.close();
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER ?? null, at: new Date().toISOString(), pass, total: checks.length, checks }, null, 2));
for (const c of checks.filter((c) => !c.ok)) console.log('FAIL', c.name, c.detail);
console.log(`${BASE} @ ${REV}: ${pass}/${checks.length}`);
process.exit(pass === checks.length ? 0 : 1);
