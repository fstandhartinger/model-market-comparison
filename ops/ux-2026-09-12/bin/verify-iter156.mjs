// Iteration 156 live check (claude-opus): the maintainers' archived pre-Verified Toolathlon board (CR-37.1) is served
// as its own retained identity with provenance, joins exactly 13 catalog configurations, keeps the page's † and ‡
// footnotes per row, and renders on its ranking page and on a joined model's page. Usage: node verify-iter156.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter156';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'toolathlon::pre-verified';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();
const JOINS = ['DeepSeek-V4-Flash Max→deepseek-v4-flash::max=48.2', 'DeepSeek-V4-Pro Max→deepseek-v4-pro::max=52.8', 'GPT-5-high→gpt-5::high=37.7',
  'GPT-5.1-high→gpt-5.1::high=37', 'GPT-5.2-xhigh→gpt-5.2::xhigh=43.8', 'Gemini-3-Flash→gemini-3-flash::default=49.4', 'Gemini-3-Pro→gemini-3-pro::default=36.4',
  'Grok-4→grok-4::default=27.5', 'Grok-Code-Fast-1→grok-code-fast-1::default=18.5', 'Kimi-K2-0905→kimi-k2-0905::default=13', 'Kimi-K2-thinking→kimi-k2-thinking::default=17.6',
  'MiniMax-M2.1→minimax-m2.1::default=40.7', 'o3→o3::default=17'].sort();

// --- API ---
const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
const rows = page.observations ?? page.scores ?? page.data ?? [];
check('API: the 36 badged Default-agent rows are served, no vendor-sourced or SDK-scaffold row', rows.length === 36 && !rows.some((o) => ['GPT-5.5-xhigh', 'GPT-5.4-xhigh', 'Kimi-K2.6', 'Claude-Opus-4.6'].includes(o.subject?.source_id)), rows.length);
const gem = rows.find((o) => o.subject?.source_id === 'Gemini-3.5-Flash');
check('API: Gemini-3.5-Flash = 56.5 %, measured, unjoined (no setting stated, three catalog configurations)',
  gem && gem.value === 56.5 && gem.unit === 'percent' && gem.basis === 'measured' && gem.subject.model_id === null, gem && { value: gem.value, unit: gem.unit, basis: gem.basis, model: gem.subject.model_id });
check('API: provenance names the toolathlon.xyz leaderboard and the committed capture hash',
  gem?.source?.url === 'https://toolathlon.xyz/docs/leaderboard' && gem?.source?.sha256 === '20d48e79f2e25ec87d815aaa490b31dc04c3a79eb950e210027b9b1a12fde2ab', gem?.source?.url);
const joined = rows.filter((o) => o.subject?.model_id).map((o) => `${o.subject.source_id}→${o.subject.model_id}=${o.value}`).sort();
check('API: exactly the 13 reviewed exact joins', JSON.stringify(joined) === JSON.stringify(JOINS), joined);
const opus = rows.find((o) => o.subject?.source_id === 'Claude-Opus-4.7');
check('API: the † single-run footnote stays on Claude-Opus-4.7 (52.8)', opus?.value === 52.8 && /† the page: Claude-Opus was evaluated once/.test(opus?.protocol ?? ''), opus?.value);
const gpt = rows.find((o) => o.subject?.source_id === 'GPT-5.2-xhigh');
check('API: the ‡ Responses-API footnote stays on GPT-5.2-xhigh (43.8)', gpt?.value === 43.8 && /‡ the page: OpenAI models were re-run/.test(gpt?.protocol ?? ''), gpt?.value);
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
const entry = list.find?.((e) => e.id === BID);
check('API: registry lists it as retained Tool-use, superseded by Toolathlon-Verified',
  entry?.category === 'Tool-use' && entry?.status === 'retained' && entry?.superseded_by === 'toolathlon-verified::2026-06-30', entry && { category: entry.category, status: entry.status, sup: entry.superseded_by });
const verified = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent('toolathlon-verified::2026-06-30')}&limit=100`);
check('API: Toolathlon-Verified still serves its own 25 rows', (verified.observations ?? verified.scores ?? verified.data ?? []).length === 25);
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('deepseek-v4-pro::max,gpt-5.2::xhigh')}`);
const mIndex = matrix?.rows?.findIndex((r) => r.benchmarkId === BID || (r.boards ?? []).includes(BID));
const mRow = matrix?.rows?.[mIndex];
const mVal = (matrix?.values?.['deepseek-v4-pro::max'] ?? []).find((v) => v[0] === mIndex);
check('API: Benchmarks-tab matrix carries the row in the agentic group with DeepSeek V4 Pro (max) at 52.8, measured',
  mRow && /agentic/i.test(mRow.group) && mVal && mVal[1] === 52.8 && mVal[2] === 0, mRow && { group: mRow.group, tags: mRow.tags, label: mRow.label, value: mVal });

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
      check(`${tag}: ranking page names the original-release board`, /Toolathlon, original release/.test(first), first.slice(0, 200));
      check(`${tag}: version shown as pre-verified, never "vpre-verified"`, /pre-verified/.test(first) && !/vpre-verified/.test(first));
      check(`${tag}: default view lists the 13 joined models, DeepSeek V4 Pro first at 52.8`, /\b13 results\b/.test(first) && /DeepSeek V4 Pro[\s\S]{0,200}52\.8/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 36 rows, Gemini-3.5-Flash on top at 56.5`, /\b36 results\b/.test(text) && /Gemini-3\.5-Flash[\s\S]{0,200}56\.5/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('deepseek-v4-pro::max')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: DeepSeek V4 Pro (max) page lists both Toolathlon series`, /Toolathlon, original release/.test(model) && /Toolathlon-Verified/.test(model), (model.match(/[^\n]*Toolathlon, original[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
