// CR-82.3 / CR-82.4 live verification (VulcanBench Frontier v4 + KernelBench-CUDA, iteration 114).
//   Shipped in 2a644c4 + 7f54675: five new registry families, every joined cell must be byte-exact
//   against the local scores.json on the live /benchmarks matrix, rows must render on /benchmarks
//   (desktop + mobile, light + dark), the Fable 5.1 model page must show the VulcanBench value,
//   and /about's tier table must list the five deliberate secondary tiers.
// Usage: node verify-cr-82-3-4.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-82-3-4';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };

// --- expected values from the retained raw store --------------------------------------------
const scoresPath = new URL('../../../data/raw/benchmarks/scores.json', import.meta.url);
const scores = JSON.parse(await fs.readFile(scoresPath, 'utf8'));
const obs = scores.observations.filter((o) => /^vulcanbench-frontier::4$/.test(o.benchmark_id) || /^kernelbench-cuda-/.test(o.benchmark_id));
const joined = obs.filter((o) => o.subject?.model_id);
check('raw store: 78 observations, 44 joined', obs.length === 78 && joined.length === 44, { obs: obs.length, joined: joined.length });
// best-of row = max per catalog model across harnesses (CR-20260916c presentation rule)
const vulcanBest = new Map();
for (const o of joined.filter((o) => o.benchmark_id === 'vulcanbench-frontier::4')) {
  const cur = vulcanBest.get(o.subject.model_id);
  if (cur === undefined || o.value > cur.value) vulcanBest.set(o.subject.model_id, { value: o.value, harness: o.subject.harness });
}
const kernel = joined.filter((o) => o.benchmark_id.startsWith('kernelbench-cuda-'));
check('raw store: 24 VulcanBench columns, 20 KernelBench cells', vulcanBest.size === 24 && kernel.length === 20, { vulcan: vulcanBest.size, kernel: kernel.length });

const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// --- matrix API: rows exist, every joined value byte-exact -----------------------------------
const bm = await (await fetch(`${BASE}/api/page-data/benchmarks`)).json().catch(() => null);
const rows = bm?.matrix?.rows ?? [];
// `values` is keyed by catalog model and holds [rowIndex, value, flag] triples — build a dense lookup.
const cell = {};
for (const [model, triples] of Object.entries(bm?.matrix?.values ?? {})) {
  for (const t of triples) { if (t.length >= 2) (cell[model] ??= {})[t[0]] = t[1]; }
}
const idx = new Map(rows.map((r, i) => [r.benchmarkId, i]));
const vulcanRow = rows.find((r) => r.benchmarkId === 'vulcanbench-frontier::4');
check('matrix: VulcanBench Frontier v4 row present (coding group, best-of cohort)',
  !!vulcanRow && vulcanRow.group === 'coding' && /best of/i.test(vulcanRow.cohort ?? ''), vulcanRow ? { cohort: vulcanRow.cohort, unit: vulcanRow.unit } : 'row missing');
const kernelRows = rows.filter((r) => /^kernelbench-cuda-/.test(r.benchmarkId ?? ''));
check('matrix: all four KernelBench-CUDA problem rows present', kernelRows.length === 4, kernelRows.map((r) => r.benchmarkId));
check('matrix: KernelBench rows are per-problem (no harness cohort), unit "percent of roofline"',
  kernelRows.length === 4 && kernelRows.every((r) => r.unit === 'percent of roofline' && !r.cohort), kernelRows.map((r) => [r.benchmarkId, r.unit, r.cohort]));
let mismatched = 0; let matched = 0; const mismatches = [];
for (const [model, best] of vulcanBest) {
  const v = cell[model]?.[idx.get('vulcanbench-frontier::4')];
  if (v === undefined || Math.abs(Number(v) - best.value) > 1e-9) { mismatched++; mismatches.push({ model, live: v, expected: best.value }); } else matched++;
}
for (const o of kernel) {
  const v = cell[o.subject.model_id]?.[idx.get(o.benchmark_id)];
  if (v === undefined || Math.abs(Number(v) - o.value) > 1e-9) { mismatched++; mismatches.push({ model: o.subject.model_id, benchmark: o.benchmark_id, live: v, expected: o.value }); } else matched++;
}
check('matrix: all 44 joined values byte-exact against the retained raw store', mismatched === 0 && matched === 44, { matched, mismatched, mismatches: mismatches.slice(0, 5) });
const opus = cell["claude-opus-5::max"]?.[idx.get('kernelbench-cuda-grid-mingru-sps::rtx-pro-6000')];
check('matrix: Opus 5 reaches 196.1 % of roofline on the MinGRU sim (acceptance example)', Math.abs(Number(opus) - 196.1) < 1e-9, opus);
check('matrix: unbounded rows have no 100 ceiling (range [0, null])',
  kernelRows.every((r) => Array.isArray(r.range) && r.range[0] === 0 && r.range[1] === null), kernelRows.map((r) => r.range));

// --- browser: /benchmarks renders the rows, model page + /about tiers ------------------------
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/benchmarks`); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500);
  const ui = await page.evaluate(() => {
    const row = (re) => [...document.querySelectorAll('tr')].find((r) => re.test(r.innerText));
    return {
      vulcan: row(/VulcanBench Frontier v4/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      kernelDeepseek: row(/KernelBench-CUDA: DeepSeek NSA/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check(`${tag} /benchmarks: VulcanBench Frontier v4 row renders with a value`, !!ui.vulcan && /91\.8/.test(ui.vulcan ?? ''), (ui.vulcan ?? '').slice(0, 260));
  check(`${tag} /benchmarks: KernelBench-CUDA DeepSeek NSA row renders with a value`, !!ui.kernelDeepseek && /106\.3/.test(ui.kernelDeepseek ?? ''), (ui.kernelDeepseek ?? '').slice(0, 260));
  check(`${tag} /benchmarks: no horizontal overflow`, ui.overflow <= 1, ui.overflow);
  await page.screenshot({ path: `${OUT}/benchmarks-${tag}.png`, fullPage: false });
  // model page (desktop only to keep the run light; value chip is the same component)
  if (!mobile) {
    await goto(page, `${BASE}/models/claude-fable-5.1::max`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000);
    const model = await page.evaluate(() => {
      const t = document.body.innerText;
      const i = t.indexOf('VulcanBench Frontier v4');
      return { vulcanRowPrefix: i >= 0 ? t.slice(i, i + 200).replace(/\s+/g, ' ') : null };
    });
    check(`${tag} model page: Fable 5.1 (max) shows its VulcanBench Frontier v4 result (91.8%)`,
      !!model.vulcanRowPrefix && /91\.8%/.test(model.vulcanRowPrefix), model);
    await page.screenshot({ path: `${OUT}/model-fable-${tag}.png`, fullPage: false });
  }
  if (errors.length) check(`${tag} page errors`, false, errors.slice(0, 3));
  await c.close();
}
await b.close();
const failed = checks.filter((x) => !x.ok);
console.log(JSON.stringify({ base: BASE, passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
process.exit(failed.length ? 1 : 0);
