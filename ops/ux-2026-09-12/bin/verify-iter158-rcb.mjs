// Iteration 158 live check (claude-opus), part 2: ResearchClawBench (CR-37.1) is served by the API on its 0–100 points
// scale with provenance, only ResearchHarness rows, exactly five single-default joins, coverage in the protocol, the Judged
// tag; renders on its ranking page and a joined model's page; /jev-models (CR-115 follow-up) shows zerank-2.
// Usage: node verify-iter158-rcb.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter158-rcb';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'researchclawbench::40-tasks';
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
const rows = page.observations ?? page.scores ?? page.data ?? [];
check('API: all 21 ResearchHarness rows are served, every one on the ResearchHarness harness', rows.length === 21 && rows.every((o) => o.subject?.harness === 'ResearchHarness'), rows.length);
const opus = rows.find((o) => o.subject?.source_id === 'Claude-Opus-4.8');
check('API: Claude-Opus-4.8 = 21.12 points (mean of 39 scored tasks), measured, unjoined',
  opus && opus.value.toFixed(2) === '21.12' && opus.unit === 'points' && opus.basis === 'measured' && opus.subject.model_id === null && /"tasks_scored":39/.test(opus.protocol),
  opus && { value: opus.value, unit: opus.unit, model: opus.subject.model_id });
check('API: provenance names the leaderboard data file and the capture hash',
  opus?.source?.url === 'https://internscience.github.io/ResearchClawBench-Home/data/leaderboard.json' && opus?.source?.sha256 === '5d538e012068a8fec9fe974c4080b78879e92f3cc0ba412934cda59a7a087320', opus?.source?.url);
const joined = rows.filter((o) => o.subject?.model_id).map((o) => `${o.subject.source_id}→${o.subject.model_id}=${o.value.toFixed(2)}`).sort();
check('API: exactly five single-default joins',
  JSON.stringify(joined) === JSON.stringify(['MiMo-V2-Pro→mimo-v2-pro::default=15.34', 'MiMo-V2.5→mimo-v2.5::default=16.91', 'MiniMax-M3→minimax-m3::default=19.82', 'Qwen3.6-Plus→qwen3.6-plus::default=18.00', 'Qwen3.7-Max→qwen3.7-max::default=18.71']), joined);
check('API: no agent-product row is served', !rows.some((o) => /Claude Code|InnoClaw|Qiushi|EvoLab/.test(o.subject?.source_id ?? '')));
const registry = await get('/api/benchmarks');
const entry = (registry.benchmarks ?? registry.entries ?? registry).find?.((e) => e.id === BID);
check('API: registry lists the board as Science in points', entry?.category === 'Science' && entry?.scoring?.unit === 'points', entry && { category: entry.category, unit: entry.scoring?.unit });
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('minimax-m3::default,qwen3.6-plus::default')}`);
const mIndex = matrix?.rows?.findIndex((r) => r.benchmarkId === BID || (r.boards ?? []).includes(BID));
const mRow = matrix?.rows?.[mIndex];
const mVal = (matrix?.values?.['minimax-m3::default'] ?? []).find((v) => v[0] === mIndex);
check('API: Benchmarks-tab matrix carries the row tagged Judged, with MiniMax M3 measured',
  mRow && JSON.stringify(mRow).toLowerCase().includes('judged') && mVal && Math.abs(mVal[1] - 19.82) < 0.06 && mVal[2] === 0, mRow && { group: mRow.group, tags: mRow.tags, value: mVal });
const jev = await (await fetch(`${BASE}/jev-models?v=${Date.now()}`)).text();
check('/jev-models (CR-115 follow-up) serves and lists zerank-2', /zerank-2/i.test(jev), jev.length);

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
      check(`${tag}: ranking page names the board`, /ResearchClawBench/.test(first), first.slice(0, 200));
      check(`${tag}: default view lists the five joined models and says 5 of 21 are matched`, /\b5 results\b/.test(first) && /5 of 21 published results are matched/.test(first) && /MiniMax[- ]M3[\s\S]{0,200}19\.8/.test(first), (first.match(/\d+ results/) ?? [''])[0]);
      await p.getByLabel('Include results not matched to a catalog model').check();
      await p.waitForTimeout(800);
      const text = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: with unmatched results included, 21 rows`, /\b21 results\b/.test(text), (text.match(/\d+ results/) ?? [''])[0]);
      check(`${tag}: ranking lists Claude-Opus-4.8 as named by the source with 21.1`, /Claude-Opus-4\.8[\s\S]{0,200}21\.1/.test(text), (text.match(/Claude-Opus-4\.8[^\n]*\n?[^\n]*\n?[^\n]*\n?[^\n]*/) ?? [''])[0]);
      check(`${tag}: ranking lists Hy3-Preview with 12.88`, /Hy3-Preview[\s\S]{0,200}12\.88/.test(text));
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('minimax-m3::default')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: MiniMax M3 page lists its ResearchClawBench result`, /ResearchClawBench/.test(model), (model.match(/[^\n]*ResearchClawBench[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
