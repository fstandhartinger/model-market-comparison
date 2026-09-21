// Iteration 155 live check (claude-opus): Andon Labs' Blueprint-Bench 2 (CR-37.1) is served by the API on the
// source's 0–1 points scale with provenance, joins exactly two single-default families, keeps the ** floor marker,
// and renders on its ranking page and on a joined model's page. Usage: node verify-iter155.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter155';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'blueprint-bench::2';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();
const FLOORED = ['Claude Haiku 4.5', 'Gemini 3 Flash', 'Gemini Robotics-ER 1.6', 'Grok 4.20 Reasoning', 'Grok 4.3'];

// --- API ---
const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
const rows = page.observations ?? page.scores ?? page.data ?? [];
check('API: all 26 Blueprint-Bench 2 model rows are served, no human baseline', rows.length === 26 && !rows.some((o) => /human/i.test(o.subject?.name ?? '')), rows.length);
const astra = rows.find((o) => o.subject?.source_id === 'GPT-6 Astra');
check('API: GPT-6 Astra = 0.497 points, measured, unjoined (the page states no setting)',
  astra && astra.value === 0.497 && astra.unit === 'points' && astra.basis === 'measured' && astra.subject.model_id === null,
  astra && { value: astra.value, unit: astra.unit, basis: astra.basis, model: astra.subject.model_id });
check('API: provenance names the Andon Labs page and the capture hash',
  astra?.source?.url === 'https://andonlabs.com/evals/blueprint-bench-2' && astra?.source?.sha256 === 'f1ae172f38a9a3246282d938b51c3d61ac548a66ca932adf368e036338bf8d83', astra?.source?.url);
const joined = rows.filter((o) => o.subject?.model_id).map((o) => `${o.subject.source_id}→${o.subject.model_id}=${o.value}`).sort();
check('API: exactly two single-default joins (Gemini 3 Flash, Grok 4.20 Reasoning), both floored at 0',
  JSON.stringify(joined) === JSON.stringify(['Gemini 3 Flash→gemini-3-flash::default=0', 'Grok 4.20 Reasoning→grok-4.20-reasoning::default=0']), joined);
const marked = rows.filter((o) => /"marker":"at or below the random baseline/.test(o.protocol ?? '')).map((o) => o.subject.source_id).sort();
check('API: the five ** rows carry the at-or-below-random-baseline marker in their protocol', JSON.stringify(marked) === JSON.stringify(FLOORED), marked);
const registry = await get('/api/benchmarks');
const entry = (registry.benchmarks ?? registry.entries ?? registry).find?.((e) => e.id === BID);
check('API: registry lists the board as Vision on a 0–1 points scale', entry?.category === 'Vision' && entry?.scoring?.unit === 'points', entry && { category: entry.category, unit: entry.scoring?.unit });
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('gemini-3-flash::default,grok-4.20-reasoning::default')}`);
const mIndex = matrix?.rows?.findIndex((r) => r.benchmarkId === BID || (r.boards ?? []).includes(BID));
const mRow = matrix?.rows?.[mIndex];
const mVal = (matrix?.values?.['gemini-3-flash::default'] ?? []).find((v) => v[0] === mIndex);
check('API: Benchmarks-tab matrix carries the row in the vision group with Gemini 3 Flash at 0, measured',
  mRow && /vision/i.test(mRow.group) && mVal && mVal[1] === 0 && mVal[2] === 0, mRow && { group: mRow.group, tags: mRow.tags, value: mVal });

// --- UI ---
const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
    const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    try {
      await p.goto(`${BASE}/benchmarks?benchmark=${encodeURIComponent(BID)}&v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      const first = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: ranking page names the board`, /Blueprint-Bench 2/.test(first), first.slice(0, 200));
      check(`${tag}: default view lists the two joined models, both at 0 points`, /\b2 results\b/.test(first) && /Gemini 3 Flash/.test(first) && /Grok 4\.20 Reasoning/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      const fullBars = await p.evaluate(() => [...document.querySelectorAll('main table span.bg-accent[aria-hidden="true"]')].filter((b) => b.style.width === '100%').length);
      check(`${tag}: a board whose best shown value is 0 draws no full-width bars`, fullBars === 0, String(fullBars));
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 26 rows`, /\b26 results\b/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      check(`${tag}: ranking lists GPT-6 Astra as named by the source with 0.497`, /GPT-6 Astra[\s\S]{0,200}0\.497/.test(text), (text.match(/GPT-6 Astra[^\n]*\n?[^\n]*\n?[^\n]*\n?[^\n]*/) ?? [''])[0]);
      check(`${tag}: ranking lists Kimi K2.6 with 0.039`, /Kimi K2\.6[\s\S]{0,200}0\.039/.test(text));
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('gemini-3-flash::default')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Gemini 3 Flash page lists its Blueprint-Bench 2 result`, /Blueprint-Bench 2/.test(model), (model.match(/[^\n]*Blueprint-Bench 2[^\n]*\n?[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-model.png` }).catch(() => {});
      check(`${tag}: no page errors`, errors.length === 0, errors.slice(0, 3));
    } finally { await c.close(); }
  }
} finally { await browser.close(); }
const passed = checks.filter((x) => x.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const x of checks) if (!x.ok) console.log(`FAIL ${x.name} — ${JSON.stringify(x.detail).slice(0, 300)}`);
console.log(`${BASE} @ ${REV}: ${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
