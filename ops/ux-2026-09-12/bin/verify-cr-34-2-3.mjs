// CR-34.2 / CR-34.3: OpenRouter's own benchmark runs are live as their own boards, separate from
// Artificial Analysis' same-named ones, with published stddev / task count and the measured
// avg_cost_per_task as a labelled cost signal. API + UI at 1440/390, light and dark.
// Usage: node verify-cr-34-2-3.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-34-2-3';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000); };
const get = async (path) => (await fetch(`${BASE}${path}`)).json();

const VERSION = 'snapshot-2026-09-15';
const BOARDS = {
  'openrouter-gpqa-diamond': { name: 'GPQA Diamond (OpenRouter run)', category: 'Science', min: 100 },
  'openrouter-tau2-bench-airline': { name: 'τ²-Bench Airline (OpenRouter run)', category: 'Agentic', min: 100 },
  'openrouter-search-browsecomp': { name: 'BrowseComp (OpenRouter search run)', category: 'Knowledge', min: 3 },
  'openrouter-search-dsqa': { name: 'DeepSearchQA (OpenRouter search run)', category: 'Knowledge', min: 3 },
  'openrouter-search-hle': { name: 'HLE (OpenRouter search run)', category: 'Knowledge', min: 2 },
  'openrouter-search-widesearch': { name: 'WideSearch (OpenRouter search run)', category: 'Knowledge', min: 3 },
};

// --- Registry: twelve versioned boards, each maintained and attributed to OpenRouter. ---------
const registry = await get('/api/benchmarks');
const byId = new Map((registry.benchmarks ?? registry.entries ?? registry).map((e) => [e.id ?? e.benchmark?.id, e]));
for (const [family, spec] of Object.entries(BOARDS)) {
  const score = byId.get(`${family}::${VERSION}`), cost = byId.get(`${family}-cost::${VERSION}`);
  const s = score?.benchmark ?? score, c = cost?.benchmark ?? cost;
  check(`CR-34.2 ${family} is a registered board maintained by OpenRouter`,
    !!s && s.name === spec.name && s.category === spec.category && s.maintainer === 'OpenRouter'
    && s.scoring.unit === 'fraction' && s.primary_url === 'https://openrouter.ai/benchmarks',
    { name: s?.name, category: s?.category, maintainer: s?.maintainer, unit: s?.scoring?.unit });
  check(`CR-34.3 ${family} has its measured cost board (USD, Efficiency, lower is better)`,
    !!c && c.category === 'Efficiency' && c.scoring.unit === 'USD' && c.scoring.higher_better === false,
    { category: c?.category, unit: c?.scoring?.unit, higher: c?.scoring?.higher_better });
  check(`CR-34.2 ${family} covers the published population (≥ ${spec.min} models)`,
    (score?.coverage?.available ?? 0) >= spec.min, { available: score?.coverage?.available });
}

// --- Separation from Artificial Analysis' same-named boards (the basis differs). --------------
const aaGpqa = [...byId.keys()].filter((id) => String(id).startsWith('aa-gpqa-diamond::'));
check('CR-34.2 the OpenRouter GPQA run is its own identity beside AA GPQA Diamond',
  aaGpqa.length > 0 && byId.has(`openrouter-gpqa-diamond::${VERSION}`), { aa: aaGpqa });

// --- Values: exact, with published stddev, task count and measured cost on the same row. ------
const view = await get(`/api/benchmark-view?model=${encodeURIComponent('gemini-3.7-flash::high')}`);
const axis = view.axes.find((a) => a.benchmarkId === `openrouter-tau2-bench-airline::${VERSION}`);
const row = axis?.scores.find((r) => r.modelId === 'gemini-3.7-flash::high');
check('CR-34.2 τ²-Bench Airline: the published leader value is live and exact (0.805556)',
  Math.abs((row?.value ?? 0) - 0.805556) < 1e-6, { value: row?.value });
check('CR-34.2 the published task count rides on the observation', (row?.sampleSize ?? 0) > 0, { sampleSize: row?.sampleSize });
check('CR-34.3 the measured cost per task rides on the same row, without touching the score',
  typeof row?.costPerRollout === 'number' && row.costPerRollout > 0, { cost: row?.costPerRollout });
// The stddev is published for most, not all, rows: check it over the whole board, and that it
// reaches a score row of the model it belongs to (a missing one must stay missing, never a zero).
const board = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(`openrouter-gpqa-diamond::${VERSION}`)}&limit=500`);
const withSd = (board.observations ?? []).filter((o) => o.published_stddev != null);
check('CR-34.2 published standard deviations survive ingestion, and a missing one stays missing',
  board.total >= 100 && withSd.length >= 50 && withSd.length < board.total
  // A published 0 is a real value (every repeat agreed) and is stored as published, not dropped.
  && withSd.every((o) => Number.isFinite(o.published_stddev) && o.published_stddev >= 0) && (board.observations ?? []).every((o) => o.sample_size > 0),
  { total: board.total, withStddev: withSd.length });
const sdModel = withSd[0]?.subject?.model_id;
const sdView = sdModel ? await get(`/api/benchmark-view?model=${encodeURIComponent(sdModel)}`) : { axes: [] };
const sdRow = sdView.axes.flatMap((a) => a.scores).find((r) => r.modelId === sdModel && r.publishedStddev != null);
check('CR-34.2 the published standard deviation reaches the score row the evidence panel renders',
  sdRow != null && Math.abs(sdRow.publishedStddev - withSd[0].published_stddev) < 1e-12, { model: sdModel, stddev: sdRow?.publishedStddev });
check('CR-34.2 every OpenRouter score is a fraction in 0–1',
  view.axes.filter((a) => a.benchmarkId.startsWith('openrouter-') && !a.benchmarkId.includes('-cost::'))
    .flatMap((a) => a.scores).every((r) => r.value >= 0 && r.value <= 1), '');

// --- The measured cost is its own board and never enters the score or the model's benchmarks. --
const costAxis = view.axes.find((a) => a.benchmarkId === `openrouter-tau2-bench-airline-cost::${VERSION}`);
check('CR-34.3 the measured cost is its own USD axis, lower-is-better, separate from the score axis',
  costAxis?.unit === 'USD' && costAxis.higherBetter === false && costAxis.benchmarkId !== axis?.benchmarkId,
  { unit: costAxis?.unit, higher: costAxis?.higherBetter });
const models = await get('/api/models?score=composite');
const gem = models.models.find((m) => m.id === 'gemini-3.7-flash::high');
check('CR-34.3 no OpenRouter cost value leaks into the model row that feeds the cost model or the Composite',
  gem != null && !Object.keys(gem.benchmarks ?? {}).some((k) => k.includes('openrouter')) && typeof gem.cost_blended_10to1 === 'number',
  { keys: Object.keys(gem?.benchmarks ?? {}).filter((k) => k.includes('openrouter')), blended: gem?.cost_blended_10to1 });

// --- "#benchmarks" counts capability boards only. ----------------------------------------------
const detail = await get(`/api/models/${encodeURIComponent('gemini-3.7-flash::high')}`);
const cov = detail.benchmark_coverage;
check('CR-34.3 cost boards count as cells but never as benchmarks',
  cov.capability_available < cov.available && cov.total_capability_benchmarks < cov.total_benchmarks, cov);

// --- UI: the rows are visible, attributed and readable at both widths and themes. --------------
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent('gemini-3.7-flash::high,claude-opus-5::high')}&rows=all`);
  await settle(page);
  await page.locator('.bh-matrix-wrap').first().waitFor({ timeout: 20000 }).catch(() => {});
  const names = await page.locator('.bh-matrix-wrap tbody th.bh-matrix-stub').allInnerTexts().catch(() => []);
  const text = names.join(' | ');
  for (const spec of Object.values(BOARDS)) {
    const short = spec.name.replace(/ \(OpenRouter[^)]*\)/, '');
    check(`${tag} CR-34.2 the ${short} row is in the full benchmark table`, text.includes(short), short);
  }
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks.png`, fullPage: false });
  check(`${tag} CR-34.2 the full table renders rows at all`, names.length > 22, { rows: names.length });

  // The detail page of one cell carries the source, the task count and the measured cost label.
  const axisId = `openrouter-tau2-bench-airline::${VERSION}@@${encodeURIComponent('Published board')}@@fraction`;
  await goto(page, `${BASE}/benchmarks/result?axis=${encodeURIComponent(axisId)}&model=${encodeURIComponent('gemini-3.7-flash::high')}&models=${encodeURIComponent('gemini-3.7-flash::high,claude-opus-5::high')}`);
  await settle(page);
  const body = await page.locator('body').innerText();
  check(`${tag} CR-34.2 the cell's detail page names OpenRouter as the source`, /openrouter\.ai/i.test(body), body.slice(0, 120));
  check(`${tag} CR-34.2 the detail page states the number of tasks evaluated`, /\b48 tasks\b|Tasks evaluated/.test(body), '');
  check(`${tag} CR-34.3 the measured cost is labelled per task and measured by OpenRouter`, /measured by OpenRouter/.test(body), '');
  await page.screenshot({ path: `${OUT}/${tag}-detail.png`, fullPage: false });
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 200)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
