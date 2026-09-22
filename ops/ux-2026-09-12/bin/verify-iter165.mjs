// Iteration 165 live check (claude-opus): MLS-Bench-Lite (CR-37.1) is served by the API with provenance, joins only the
// reviewed exact configurations (the fallback Fable 5 run never joins), stays separate from StepFun's vendor snapshot, and
// renders on the ranking page and on a joined model's page at desktop and phone width in both themes.
// Usage: node verify-iter165.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter165';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;
const BID = 'mls-bench-lite::30-tasks', SHA = 'c7e3934636b87819424c9ce1a01f11b49f9ea0f98cc6b81f0f6c12a3a1ea8379';
const JOINS = { 'Claude Fable 5.1|Claude Code (max effort)': ['claude-fable-5.1::max', 50.3], 'Qwen3.8-Max-0902|Claude Code': ['qwen3.8-max-0902::default', 50.1],
  'Claude Opus 5|Claude Code (max effort)': ['claude-opus-5::max', 49.8], 'Kimi K3|Kimi-Code (max)': ['kimi-k3::max', 48.3], 'GPT 5.6 Sol|Codex (max)': ['gpt-5.6-sol::max', 46.2],
  'Claude Opus 4.8|Claude Code (max effort)': ['claude-opus-4.8::max', 42.8], 'Qwen3.8-Max|Claude Code': ['qwen3.8-max::default', 41], 'GLM 5.2|Claude Code (max effort)': ['glm-5.2::max', 40.4],
  'GPT-5.5|Codex (xhigh)': ['gpt-5.5::xhigh', 35.5], 'Kimi K2.7 Code|Kimi-Code': ['kimi-k2.7-code::default', 35.1], 'Qwen3.7-Max|Claude Code': ['qwen3.7-max::default', 31.7],
  'Claude Sonnet 5|Claude Code (max effort)': ['claude-sonnet-5::max', 31.4] };
const UNJOINED = { 'Claude Fable 5|Claude Code (max effort, with fallback)': 49.9, 'Kimi K2.6|Kimi-Code': 26.7, 'DeepSeek-V4 Pro Preview|Claude Code': 24.4 };
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(1500));
const get = async (path) => (await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}v=${Date.now()}`)).json();

// --- API ---
const registry = await get('/api/benchmarks');
const list = registry.benchmarks ?? registry.entries ?? registry;
const page = await get(`/api/benchmark-scores?benchmark_id=${encodeURIComponent(BID)}&limit=100`);
const rows = page.observations ?? page.scores ?? page.data ?? [];
const joined = rows.filter((o) => o.subject?.model_id);
check('API: 15 measured rows, 12 exact joins, points', rows.length === 15 && joined.length === 12 && rows.every((o) => o.unit === 'points' && o.basis === 'measured'), { rows: rows.length, joins: joined.length });
check('API: provenance names the leaderboard and the capture hash', rows.every((o) => o.source?.url === 'https://mls-bench.com/leaderboard' && o.source?.sha256 === SHA), rows[0]?.source?.url);
const at = (src) => rows.find((o) => o.subject?.source_id === src);
const badJoin = Object.entries(JOINS).filter(([src, [m, v]]) => at(src)?.subject?.model_id !== m || at(src)?.value !== v).map(([s]) => s);
check('API: every joined row has the board value and the exact reviewed configuration', badJoin.length === 0, badJoin);
const badOpen = Object.entries(UNJOINED).filter(([src, v]) => !at(src) || at(src).subject.model_id !== null || at(src).value !== v).map(([s]) => s);
check('API: Fable 5 "with fallback", Kimi K2.6 and DeepSeek-V4 Pro Preview stay unjoined, values kept', badOpen.length === 0, badOpen);
check('API: harness and stated effort kept per row, with the human-SOTA reference', /"stated_effort":"max"/.test(at('Kimi K3|Kimi-Code (max)')?.protocol ?? '') && at('GPT-5.5|Codex (xhigh)')?.subject?.harness === 'Codex (xhigh)' && /"human_sota_reference":44\.66/.test(at('Kimi K3|Kimi-Code (max)')?.protocol ?? ''));
const entry = list.find?.((e) => e.id === BID), step = list.find?.((e) => e.id === 'stepfun-mls-bench-lite::snapshot-2026-09-20');
check('API: registry lists MLS-Bench-Lite as an active Coding leaderboard beside StepFun\'s separate vendor snapshot', entry?.category === 'Coding' && entry?.status === 'active' && step && step.family !== entry.family, entry && { category: entry.category, status: entry.status, step: step?.family });
const { matrix } = await get(`/api/benchmark-matrix?models=${encodeURIComponent('claude-opus-5::max,kimi-k3::max')}`);
const idx = (matrix?.rows ?? []).map((r, i) => [r, i]).filter(([r]) => JSON.stringify(r).includes('mls-bench-lite::')).map(([, i]) => i);
const vals = (matrix?.values?.['claude-opus-5::max'] ?? []).filter((v) => idx.includes(v[0]));
check('API: Benchmarks-tab matrix has Claude Opus 5 (max) at 49.8 on MLS-Bench-Lite, measured', vals.some((v) => Math.abs(v[1] - 49.8) < 0.051 && v[2] === 0), { idx, vals });

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
      const appliedTheme = await p.evaluate(() => document.documentElement.dataset.theme || getComputedStyle(document.documentElement).colorScheme);
      check(`${tag}: page theme is ${theme}`, String(appliedTheme).includes(theme), appliedTheme);
      const first = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: ranking page names the board`, /MLS-Bench-Lite/.test(first), first.slice(0, 200));
      check(`${tag}: default view shows Claude Fable 5.1 at 50.3 on top`, /1\s+Claude Fable 5\.1[\s\S]{0,160}50\.3/.test(first), (first.match(/[^\n]*Fable 5\.1[^\n]*/) ?? [''])[0]);
      await p.screenshot({ path: `${OUT}/${tag}-ranking.png` }).catch(() => {});
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: ranking page has no horizontal overflow`, overflow <= 1, String(overflow));
      await p.goto(`${BASE}/models/${encodeURIComponent('claude-opus-5::max')}?v=${Date.now()}`, { waitUntil: 'domcontentloaded' });
      await settle(p);
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await p.waitForTimeout(600);
      const model = await p.locator('main').innerText().catch(() => '');
      check(`${tag}: Claude Opus 5 (max) page lists MLS-Bench-Lite at 49.8`, /MLS-Bench-Lite[\s\S]{0,200}49\.8/.test(model), (model.match(/[^\n]*MLS-Bench-Lite[^\n]*\n?[^\n]*/) ?? [''])[0]);
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
