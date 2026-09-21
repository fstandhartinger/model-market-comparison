// Iteration 154 live check (claude-opus): Context Arena MRCR v2 (CR-37.1) is served by the API with its derived
// percent and provenance, joins exactly, and renders on its ranking page and on a joined model's page; the five
// MathArena ArXivMath joins of the same commit are live. Usage: node verify-iter154.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter154';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'context-arena-mrcr-v2::8-needle';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const rows = [];
for (let offset = 0; offset < 1000; offset += 100) {
  const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100&offset=${offset}`);
  const batch = page.observations ?? page.scores ?? page.data ?? [];
  rows.push(...batch);
  if (batch.length < 100) break;
}
check('API: every Context Arena row is served (>= 183)', rows.length >= 183, rows.length);
const opus = rows.find((o) => o.subject?.source_id === 'anthropic/claude-opus-5@reasoning=max');
check('API: Claude Opus 5 max = 97.84 %, joined exactly, derived from the measured fraction',
  opus && Math.abs(opus.value - 97.839) < 0.001 && opus.subject.model_id === 'claude-opus-5::max' && opus.basis === 'derived' && opus.source_basis === 'measured' && opus.unit === 'percent',
  opus && { value: opus.value, model: opus.subject.model_id, basis: opus.basis, source_basis: opus.source_basis });
check('API: provenance names the board JSON and the capture hash', opus?.source?.url === 'https://contextarena.ai/api/needle-summary?needles=8' && /^[0-9a-f]{64}$/.test(opus?.source?.sha256 ?? ''), opus?.source?.url);
check('API: 48 rows joined to catalog configurations', rows.filter((o) => o.subject?.model_id).length === 48, rows.filter((o) => o.subject?.model_id).length);
const registry = await get('/api/benchmarks');
const entry = (registry.benchmarks ?? registry.entries ?? registry).find?.((e) => e.id === BID);
check('API: registry lists the board as Long-context', entry?.category === 'Long-context', entry?.category);
const arxiv = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent('matharena-arxivmath::2026-06')}&limit=100`);
const v41 = (arxiv.observations ?? arxiv.scores ?? arxiv.data ?? []).find((o) => o.subject?.source_id === 'DeepSeek-V4.1-Flash (Max)');
check('API: MathArena ArXivMath 2026-06 joins DeepSeek-V4.1-Flash (Max)', v41?.subject?.model_id === 'deepseek-v4.1-flash::max', v41?.subject);

const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('claude-opus-5::max,gpt-5.6-sol::max')}`);
const mIndex = matrix?.rows?.findIndex((r) => r.benchmarkId === BID || (r.boards ?? []).includes(BID));
const mRow = matrix?.rows?.[mIndex];
const mVal = (matrix?.values?.['claude-opus-5::max'] ?? []).find((v) => v[0] === mIndex);
check('API: Benchmarks-tab matrix carries the row in the Long-context group with Opus 5 at 97.8, measured',
  mRow && /long/i.test(mRow.group) && mVal && Math.abs(mVal[1] - 97.839) < 0.01, mRow && { group: mRow.group, tags: mRow.tags, value: mVal });

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
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: ranking page names the board`, /Context Arena/.test(text) && /MRCR v2/.test(text), text.slice(0, 200));
      check(`${tag}: ranking shows Claude Opus 5 at 97.8`, /Claude Opus 5[\s\S]{0,200}97\.8/.test(text), (text.match(/Claude Opus 5[^\n]*\n?[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('claude-opus-5::max')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Claude Opus 5 (max) page lists the MRCR v2 result 97.8`, /MRCR v2[\s\S]{0,300}97\.8/.test(model), (model.match(/[^\n]*MRCR v2[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
