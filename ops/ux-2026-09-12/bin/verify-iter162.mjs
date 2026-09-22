// Iteration 162 live check (claude-opus): MathArena's deprecated AIME 2026 competition (CR-37.1) is served by the API in
// percent with provenance, joins only the reviewed exact configurations, is listed as retained, refuses the
// item-response-theory row, and renders on the ranking page and on a joined model's page.
// Usage: node verify-iter162.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter162';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BOARDS = {
  'matharena-aime::2026': { rows: 31, joins: 7, sha: 'f7d0b3c430c35476c1ef3ac5535b933a987c524e57fc9d6ed1a64949bf500b9e', comp: 'aime--aime_2026' },
};
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
const byBoard = {};
for (const [bid, want] of Object.entries(BOARDS)) {
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(bid)}&limit=100`);
  const rows = page.observations ?? page.scores ?? page.data ?? [];
  byBoard[bid] = rows;
  const joined = rows.filter((o) => o.subject?.model_id);
  check(`API ${bid}: ${want.rows} measured rows, ${want.joins} exact joins, percent`,
    rows.length === want.rows && joined.length === want.joins && rows.every((o) => o.unit === 'percent' && o.basis === 'measured'), { rows: rows.length, joins: joined.length });
  check(`API ${bid}: provenance names the competition table and the capture hash`,
    rows.every((o) => o.source?.url === `https://matharena.ai/competition_tables/${want.comp}` && o.source?.sha256 === want.sha), rows[0]?.source?.url);
  check(`API ${bid}: no item-response-theory row is served`, !rows.some((o) => /^Qwen3\.5-[24]B$/.test(o.subject?.source_id ?? '')));
  const entry = list.find?.((e) => e.id === bid);
  check(`API ${bid}: registry lists it as retained Math`, entry?.category === 'Math' && entry?.status === 'retained', entry && { category: entry.category, status: entry.status });
}
const aime = byBoard['matharena-aime::2026'];
const at = (src) => aime.find((o) => o.subject?.source_id === src);
const gpt55 = at('GPT-5.5 (xhigh)');
check('API: AIME 2026 GPT-5.5 (xhigh) = 100 → gpt-5.5::xhigh, released-after-competition flag kept',
  gpt55?.value === 100 && gpt55?.subject?.model_id === 'gpt-5.5::xhigh' && /"released_after_competition":true/.test(gpt55?.protocol ?? ''), gpt55 && { v: gpt55.value, m: gpt55.subject.model_id });
const gpt52 = at('GPT-5.2 (high)');
check('API: AIME 2026 GPT-5.2 (high) = 98.33 stays unjoined (the catalog has no gpt-5.2::high), no flag', gpt52?.value === 98.33 && gpt52?.subject?.model_id === null && /"released_after_competition":false/.test(gpt52?.protocol ?? ''), gpt52?.subject);
const kimi = at('Kimi K3 (Think)');
check('API: Kimi K3 (Think) = 96.67 stays unjoined (Think is not a reviewed setting)', kimi?.value === 96.67 && kimi.subject.model_id === null);
const gem = at('Gemini 3.1 Pro Preview'), step = at('Step 3.7 Flash'), dsf = at('DeepSeek-v4-Flash (Max)');
check('API: Gemini 3.1 Pro Preview 98.33 → ::default, Step 3.7 Flash 95 → ::default, DeepSeek-v4-Flash (Max) 95.83 → ::max',
  gem?.value === 98.33 && gem?.subject?.model_id === 'gemini-3.1-pro-preview::default' && step?.value === 95 && step?.subject?.model_id === 'step-3.7-flash::default'
  && dsf?.value === 95.83 && dsf?.subject?.model_id === 'deepseek-v4-flash::max', [gem?.subject?.model_id, step?.subject?.model_id, dsf?.subject?.model_id]);
const aa = list.find?.((e) => e.id === 'aa-aime::2025');
check('API: Artificial Analysis AIME 2025 stays its own identity (different family)', aa && aa.family !== 'matharena-aime', aa && aa.family);
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('gpt-5.4::xhigh,gpt-5.5::xhigh')}`);
const i = matrix?.rows?.findIndex((r) => r.benchmarkId === 'matharena-aime::2026' || (r.boards ?? []).includes('matharena-aime::2026'));
const row = matrix?.rows?.[i], val = (matrix?.values?.['gpt-5.4::xhigh'] ?? []).find((v) => v[0] === i);
check('API: Benchmarks-tab matrix carries the AIME 2026 row in the math group, tagged retired',
  row && /math/i.test(row.group) && JSON.stringify(row).toLowerCase().includes('retired'), row && { group: row.group, tags: row.tags });
check('API: matrix has GPT-5.4 (xhigh) at 99.17 on AIME 2026, measured', val && Math.abs(val[1] - 99.17) < 0.051 && val[2] === 0, val);

// --- UI ---
const BID = 'matharena-aime::2026';
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
      check(`${tag}: ranking page names the board`, /AIME 2026/.test(first), first.slice(0, 200));
      check(`${tag}: default view lists the 7 joined models, two at 100 on top`, /\b7 results\b/.test(first) && /1\s+(GPT-5\.5|Claude Opus 4\.8)[^\n]*[\s\S]{0,60}100(\.00)? percent/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 31 rows, GPT-5.2 (high) at 98.33 as named by the source`, /\b31 results\b/.test(text) && /GPT-5\.2 \(high\)[\s\S]{0,120}98\.33 percent/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('gpt-5.4::xhigh')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: GPT-5.4 (xhigh) page lists its AIME 2026 result next to HMMT`, /AIME 2026/.test(model) && /HMMT February 2026/.test(model), (model.match(/[^\n]*AIME 2026[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
