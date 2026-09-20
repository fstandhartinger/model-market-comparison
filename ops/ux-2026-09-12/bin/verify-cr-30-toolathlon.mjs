// CR-30.2 live verification (2026-09-20): Toolathlon-Verified, the tier-A tool-use board from
// BENCHMARK-CANDIDATES.md. The published values are checked against the numbers toolathlon.xyz itself
// renders — independently re-readable from data/raw/benchmarks/daily-evidence/2026-09-20-toolathlon/ —
// then the rows are checked in the live UI at 1440/390, light and dark. Rows the board did not evaluate
// itself, and every row of the archived pre-Verified board, must carry no value anywhere.
// Usage: node verify-cr-30-toolathlon.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-30-toolathlon';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000); };

// The Verified board as the page renders it (Pass@1, mean over three runs).
const JOINED = { 'kimi-k3::max': 76.5, 'claude-opus-4.8::max': 76.2, 'muse-spark-1.2::xhigh': 75.9, 'muse-spark-1.1::xhigh': 75.6,
  'deepseek-v4-pro-0813::max': 74.4, 'gpt-5.5::xhigh': 73.5, 'claude-sonnet-5::max': 71.6, 'deepseek-v4-flash-0731::max': 70.7,
  'gemini-3.5-flash::high': 67.3, 'gemini-3.1-pro::high': 61.1, 'glm-5.2::max': 59.9, 'kimi-k2.7-code::default': 58,
  'deepseek-v4-pro::max': 55.9, 'deepseek-v4-flash::max': 50.9, 'mimo-v2.5::default': 49.1, 'minimax-m2.7::default': 47.5,
  'inkling::xhigh': 45.5, 'nemotron-3-ultra::default': 34.3 };
// A stated setting the catalog does not hold for that family, or no setting where the family has more
// than one configuration: none of these may carry a value.
const REFUSED = ['glm-5.3-flash::default', 'gemini-3.5-flash-lite::default', 'hy3::default', 'inkling-small::default', 'kimi-k2.6::default', 'kimi-k2.5::reasoning', 'qwen3.5-397b-a17b::reasoning'];
const ids = [...Object.keys(JOINED), ...REFUSED];
const matrices = [];
for (let i = 0; i < ids.length; i += 5) {
  const answer = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(ids.slice(i, i + 5).join(','))}&rows=all`)).json();
  matrices.push(answer.matrix ?? {});
}
const rowsOf = (m) => (m.rows ?? []).map((r, i) => ({ r, i })).filter(({ r }) => r.benchmarkId === 'toolathlon-verified::2026-06-30');
const first = matrices.find((m) => rowsOf(m).length) ?? {};
check('API: Toolathlon-Verified is a tool-use board with its own description, version and source link', rowsOf(first).length > 0
  && rowsOf(first).every(({ r }) => r.group === 'agentic' && r.unit === 'percent' && r.version === '2026-06-30'
    && r.url === 'https://toolathlon.xyz/docs/leaderboard' && r.description.length > 60 && !r.judged),
  rowsOf(first).map(({ r }) => ({ name: r.name, group: r.group, unit: r.unit, version: r.version, tags: r.tags })));
check('API: the board carries the headline tier tag', rowsOf(first).every(({ r }) => r.tags.includes('headline')), rowsOf(first).map(({ r }) => r.tags));
// One agent configuration on the board means a cohort chip would say "Default" and nothing more.
check('API: no cohort is published while the board has one agent configuration', rowsOf(first).every(({ r }) => !r.cohort), rowsOf(first).map(({ r }) => r.cohort));
const valueOf = (id) => matrices.flatMap((m) => (m.values?.[id] ?? []).filter(([k]) => rowsOf(m).some(({ i }) => i === k)).map(([, v]) => v));
for (const [id, value] of Object.entries(JOINED)) check(`API: ${id} = ${value}`, valueOf(id).includes(value), valueOf(id));
for (const id of REFUSED) check(`API: ${id} carries no Toolathlon-Verified value`, valueOf(id).length === 0, valueOf(id));
const scores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('kimi-k3::max')}&benchmark_id=${encodeURIComponent('toolathlon-verified::2026-06-30')}&limit=500`)).json();
const obs = (scores.observations ?? [])[0];
check('API: the observation is measured, cites the board and keeps the run statistics, the date and the check',
  obs && obs.basis === 'measured' && obs.source?.url === 'https://toolathlon.xyz/docs/leaderboard' && obs.value === 76.5
  && /"stddev_across_runs":1\.9/.test(obs.protocol ?? '') && /"pass_3":83\.3/.test(obs.protocol ?? '') && /"pass_cubed":68\.5/.test(obs.protocol ?? '')
  && /"evaluated_at":"2026-07-16"/.test(obs.protocol ?? '') && /"independently_evaluated":true/.test(obs.protocol ?? ''),
  obs ? { basis: obs.basis, url: obs.source?.url, value: obs.value } : 'missing');
check('API: the protocol says only maintainer-evaluated rows are ingested and the archived series is separate',
  /green check/.test(obs?.protocol ?? '') && /not comparable/.test(obs?.protocol ?? ''), (obs?.protocol ?? '').slice(0, 160));
// A model that only ever appeared on the archived pre-Verified board must have no value at all.
const archived = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.4::xhigh,claude-opus-5::max')}&rows=all`)).json();
check('API: a model of the archived pre-Verified board carries no Toolathlon value',
  rowsOf(archived.matrix ?? {}).length === 0 || !(archived.matrix.values?.['gpt-5.4::xhigh'] ?? []).some(([k]) => rowsOf(archived.matrix).some(({ i }) => i === k)),
  (archived.matrix?.values?.['gpt-5.4::xhigh'] ?? []).length);

const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await context.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    try {
      await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent(['kimi-k3::max', 'claude-opus-4.8::max', 'gpt-5.5::xhigh', 'hy3::default'].join(','))}&rows=all&v=${Date.now()}`);
      await settle(page);
      const rows = await page.evaluate(() => [...document.querySelectorAll('table tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.includes('Toolathlon')));
      check(`${tag}: Toolathlon-Verified renders as a row with its values`, rows.length > 0 && rows.some((r) => /76\.5/.test(r) && /73\.5/.test(r)), rows.slice(0, 3));
      check(`${tag}: the row names the Verified series, not plain Toolathlon`, rows.every((r) => /Toolathlon-Verified/.test(r)), rows.slice(0, 2));
      check(`${tag}: the row does not carry a "Default" cohort chip`, rows.every((r) => !/\bDefault\b/.test(r)), rows.slice(0, 2));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal page overflow`, overflow <= 1, String(overflow));
      await page.locator('table tr', { hasText: 'Toolathlon' }).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${tag}-benchmarks-toolathlon.png` }).catch(() => {});
      check(`${tag}: no page errors`, !errors.length, errors);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name} — ${String(c.detail).slice(0, 220)}`);
console.log(`${BASE}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
