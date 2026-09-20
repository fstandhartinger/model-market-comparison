// CR-83.1 live verification (2026-09-20): RSI-Exam 0.1, the first benchmark from Florian's X bookmark folder "evals".
// The published values are checked against the numbers rsi-exam.ai itself renders — independently re-readable from
// data/raw/benchmarks/daily-evidence/2026-09-20-rsi-exam/ — then the rows are checked in the live UI at 1440/390,
// light and dark. The four rows the source does not let us join honestly must carry no value anywhere.
// Usage: node verify-cr-83.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-83';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000); };

// The board as the page renders it (Full panel, 88 tasks).
const JOINED = { 'gpt-6-astra::max': 0.5126, 'claude-fable-5.1::max': 0.4813, 'claude-opus-5::max': 0.464,
  'gpt-5.6-sol::max': 0.4331, 'glm-5.3::max': 0.4029, 'muse-spark-1.3::max': 0.3907, 'grok-4.6::xhigh': 0.3671,
  'gemini-3.8-flash::high': 0.3406, 'gpt-5.5::xhigh': 0.3312, 'deepseek-v4-pro::max': 0.3225, 'gemini-3.7-flash::high': 0.3088 };
// The source contradicts itself on Kimi K3's effort, and it states xhigh for both Qwen rows, which the catalog
// does not hold for them: no value may appear for these.
const REFUSED = ['kimi-k3::max', 'kimi-k3::default', 'qwen3.8-max::default', 'qwen3.8-max-0902::default'];
// The matrix API answers for a bounded set of columns, so the fifteen rows are checked in batches.
const batches = [];
const ids = [...Object.keys(JOINED), ...REFUSED];
for (let i = 0; i < ids.length; i += 5) batches.push(ids.slice(i, i + 5));
const matrices = [];
for (const batch of batches) {
  const answer = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(batch.join(','))}&rows=all`)).json();
  matrices.push(answer.matrix ?? {});
}
const matrix = matrices[0];
const rsiRows = (matrix.rows ?? []).map((r, i) => ({ r, i })).filter(({ r }) => r.benchmarkId === 'rsi-exam::0.1');
check('API: RSI-Exam is an agentic 0–1 index with its own description and source link', rsiRows.length > 0
  && rsiRows.every(({ r }) => r.group === 'agentic' && r.unit === 'points' && r.range[0] === 0 && r.range[1] === 1
    && r.url === 'https://rsi-exam.ai/' && r.version === '0.1' && r.description.length > 60 && !r.judged),
  rsiRows.map(({ r }) => ({ name: r.name, cohort: r.cohort, group: r.group, unit: r.unit, tags: r.tags })));
check('API: the rows carry the niche tier tag', rsiRows.every(({ r }) => r.tags.includes('niche')), rsiRows.map(({ r }) => r.tags));
check('API: harness cohorts read as the source spells them, capitalised like the rest of the page',
  rsiRows.every(({ r }) => !/^(claude code|kimi cli|qwen coder)$/.test(String(r.cohort))), rsiRows.map(({ r }) => r.cohort));
const valueOf = (id) => matrices.flatMap((m) => {
  const rows = (m.rows ?? []).map((r, i) => ({ r, i })).filter(({ r }) => r.benchmarkId === 'rsi-exam::0.1');
  return (m.values?.[id] ?? []).filter(([k]) => rows.some(({ i }) => i === k)).map(([, v]) => v);
});
for (const [id, value] of Object.entries(JOINED)) check(`API: ${id} = ${value}`, valueOf(id).includes(value), valueOf(id));
for (const id of REFUSED) check(`API: ${id} carries no RSI-Exam value`, valueOf(id).length === 0, valueOf(id));
const scores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('claude-opus-5::max')}&benchmark_id=${encodeURIComponent('rsi-exam::0.1')}&limit=500`)).json();
const obs = (scores.observations ?? scores.results ?? []).find((o) => o.benchmark_id === 'rsi-exam::0.1');
check('API: the observation is measured, cites rsi-exam.ai and keeps the splits, the harness and the resource figures',
  obs && obs.basis === 'measured' && obs.source?.url === 'https://rsi-exam.ai/' && obs.value === 0.464
  && /"full":0\.464/.test(obs.protocol ?? '') && /"public":0\.4613/.test(obs.protocol ?? '') && /"private":0\.4657/.test(obs.protocol ?? '')
  && /"mean_spend_usd":42\.33/.test(obs.protocol ?? '') && /"harness":"claude code"/.test(obs.protocol ?? ''),
  obs ? { basis: obs.basis, url: obs.source?.url, value: obs.value } : 'missing');
check('API: the protocol says the hidden-set anchors and that it is not a Composite input',
  /frontier-calibrated reference 0\.60/.test(obs?.protocol ?? '') && /never a Composite input/.test(obs?.protocol ?? ''), (obs?.protocol ?? '').slice(0, 120));

const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await context.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    try {
      await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent(['gpt-6-astra::max', 'claude-opus-5::max', 'glm-5.3::max', 'kimi-k3::max'].join(','))}&rows=all&v=${Date.now()}`);
      await settle(page);
      const rows = await page.evaluate(() => [...document.querySelectorAll('table tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.includes('RSI-Exam')));
      check(`${tag}: RSI-Exam renders as rows with values on /benchmarks`, rows.length > 0 && rows.some((r) => /0\.51/.test(r) && /0\.46/.test(r)), rows.slice(0, 4));
      check(`${tag}: the values are the source's own 0–1 index, never a percentage`, rows.every((r) => !/51\.\d\s*%/.test(r) && !/46\.\d\s*%/.test(r)), rows.slice(0, 2));
      check(`${tag}: no row shows a value for Kimi K3`, rows.every((r) => !/0\.38/.test(r)), rows.slice(0, 4));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal page overflow`, overflow <= 1, String(overflow));
      const target = page.locator('table tr', { hasText: 'RSI-Exam' }).first();
      await target.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${tag}-benchmarks-rsi-exam.png` }).catch(() => {});
      await goto(page, `${BASE}/models/${encodeURIComponent('claude-opus-5::max')}?v=${Date.now()}`);
      await settle(page);
      const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      check(`${tag}: the model page names RSI-Exam with its value`, /RSI-Exam/.test(body) && /0\.46/.test(body), /RSI-Exam[\s\S]{0,120}/.exec(body)?.[0] ?? body.slice(0, 120));
      check(`${tag}: no page errors`, !errors.length, errors);
      await page.screenshot({ path: `${OUT}/${tag}-model-page.png`, fullPage: false }).catch(() => {});
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name} — ${String(c.detail).slice(0, 220)}`);
console.log(`${BASE}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
