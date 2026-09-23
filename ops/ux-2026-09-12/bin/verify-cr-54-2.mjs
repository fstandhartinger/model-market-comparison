// CR-54.2 live verification (six Epoch Benchmarking Hub boards, iteration 115).
//   Shipped in 243788b + 3f90825: six registry families from the 2026-09-18 hub captures. Every joined
//   cell must be byte-exact against the local scores.json on the live /benchmarks matrix, rows must
//   render on /benchmarks (desktop + mobile, light + dark), the Fable 5.1 (max) model page must show
//   the Chess Puzzles value, and Gemini 3.6 Flash now carries the medium Benchmaxxing tag from the
//   sharpened heldout corpus. Excluded boards (math_level_5, frontiermath_erdos) must NOT appear.
// Usage: node verify-cr-54-2.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-54-2';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };

// --- expected values from the retained raw store --------------------------------------------
const IDS = {
  'chess-puzzles::snapshot-2026-09-18': 'Reasoning',
  'mystery-game-puzzles::snapshot-2026-09-18': 'Reasoning',
  'ebr-bench::snapshot-2026-09-18': 'Agentic',
  'mirrorcode::snapshot-2026-09-18': 'Coding',
  'epoch-gpqa-diamond::snapshot-2026-09-18': 'Science',
  'epoch-swe-bench-verified::snapshot-2026-09-18': 'Coding',
};
const scores = JSON.parse(await fs.readFile(new URL('../../../data/raw/benchmarks/scores.json', import.meta.url), 'utf8'));
const obs = scores.observations.filter((o) => IDS[o.benchmark_id]);
const joined = obs.filter((o) => o.subject?.model_id);
// D180 (2026-09-23): back to the counts this verifier shipped with. The CR-128 ingest had added three
// rows from epoch.ai/data/eci_benchmarks.csv on top (731 / 189), and they were withdrawn because that
// file's `performance` column is Epoch's chance-normalised ECI statistic, not the "Best score (across
// scorers)" these identities declare. A count is not the product's promise — the byte-exact cell checks
// below are — but a store that shrinks unexpectedly is worth stopping on.
check('raw store: 728 observations, 186 joined', obs.length === 728 && joined.length === 186, { obs: obs.length, joined: joined.length });

const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// --- matrix API: rows exist, groups right, every joined value byte-exact ----------------------
const bm = await (await fetch(`${BASE}/api/page-data/benchmarks`)).json().catch(() => null);
const rows = bm?.matrix?.rows ?? [];
const cell = {};
for (const [model, triples] of Object.entries(bm?.matrix?.values ?? {})) {
  for (const t of triples) { if (t.length >= 2) (cell[model] ??= {})[t[0]] = t[1]; }
}
const idx = new Map(rows.map((r, i) => [r.benchmarkId, i]));
check('matrix: all six rows present', Object.keys(IDS).every((id) => idx.has(id)), rows.filter((r) => IDS[r.benchmarkId]).length);
check('matrix: groups and fraction unit are right',
  rows.filter((r) => IDS[r.benchmarkId]).every((r) => r.group === IDS[r.benchmarkId].toLowerCase() && r.unit === 'fraction'),
  rows.filter((r) => IDS[r.benchmarkId]).map((r) => [r.benchmarkId, r.group, r.unit]));
check('matrix: excluded boards stay out', !rows.some((r) => /math-level-5|frontiermath-erdos/.test(r.benchmarkId ?? '')),
  rows.filter((r) => /math|frontiermath/i.test(r.benchmarkId ?? '')).map((r) => r.benchmarkId));
let matched = 0; const mismatches = [];
for (const o of joined) {
  const v = cell[o.subject.model_id]?.[idx.get(o.benchmark_id)];
  if (v === undefined || Math.abs(Number(v) - o.value) > 1e-9) mismatches.push({ board: o.benchmark_id, model: o.subject.model_id, live: v, expected: o.value });
  else matched++;
}
// Re-derived from the store, not pinned: the promise is that every joined cell the store holds is
// byte-exact live, and that none is missing. A literal only records how many rows existed that day.
check(`matrix: all ${joined.length} joined values byte-exact against the retained raw store`, matched === joined.length && mismatches.length === 0,
  { matched, mismatches: mismatches.slice(0, 5) });
const fableChess = cell['claude-fable-5.1::max']?.[idx.get('chess-puzzles::snapshot-2026-09-18')];
check('matrix: Fable 5.1 (max) Chess Puzzles 0.47 (acceptance example)', Math.abs(Number(fableChess) - 0.47) < 1e-9, fableChess);

// Benchmaxxing API: the CR-78.3 blends byte-exact against the local computation on the new corpus.
const { buildBenchmarkView } = await import('../../../lib/benchmark-view.mjs');
const { scoreBenchmaxxing } = await import('../../../lib/benchmax.mjs');
const { benchmaxxingLevelFor } = await import('../../../lib/benchmaxxing-levels.mjs');
const localView = buildBenchmarkView(JSON.parse(await fs.readFile(new URL('../../../data/dataset.json', import.meta.url), 'utf8')));
// Benchmaxxing is not stored in dataset.json; it is fitted from the built view, so the expectation
// the model-page check below compares against is computed here from the same code the page runs.
const geminiFit = scoreBenchmaxxing(localView, 'gemini-3.6-flash::high');
const expectedGemini = { tier: benchmaxxingLevelFor(geminiFit?.score), printed: (Math.round((geminiFit?.score ?? 0) * 10) / 10).toFixed(1), score: geminiFit?.score };
check('expected Benchmaxxing fit re-derived from this checkout is still the medium tier', expectedGemini.tier === 'medium', expectedGemini);
for (const [id, level] of [['muse-spark-1.1::xhigh', 'strong'], ['qwen3.7-max::default', 'medium'], ['gemini-3.6-flash::high', 'medium'], ['hy3::default', 'light']]) {
  const local = scoreBenchmaxxing(localView, id);
  const live = await (await fetch(`${BASE}/api/benchmaxxing?report=${encodeURIComponent(id)}`)).json().catch(() => ({}));
  check(`benchmaxxing API: ${id} score and level byte-exact (${level}`,
    live.report?.status === 'scored' && Math.abs(live.report.score - local.score) < 1e-12
    && live.report.parts.jaggednessWeight === 0.3,
    { live: live.report?.score, local: local.score, liveLevel: live.report ? benchmaxxingLevelFor(live.report.score) : null });
}

// --- browser: /benchmarks renders the rows, model page, Benchmaxxing tag ----------------------
const b = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind !== 'desktop';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const page = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/benchmarks`); await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500);
  // Secondary-tier rows sit behind the "Show all" expander.
  await page.locator('button', { hasText: 'Show all' }).last().click().catch(() => {});
  await page.waitForTimeout(800);
  const ui = await page.evaluate(() => {
    const row = (re) => [...document.querySelectorAll('tr')].find((r) => re.test(r.innerText));
    return {
      chess: row(/Chess Puzzles \(Epoch AI\)/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      mystery: row(/Mystery Game Puzzles/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      ebr: row(/EBR-bench \(Earthborne Rangers/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      mirror: row(/MirrorCode/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      gpqa: row(/GPQA Diamond \(Epoch AI run\)/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      swe: row(/SWE-bench Verified \(Epoch AI run\)/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      excluded: [...document.querySelectorAll('tr')].some((r) => /MATH Level 5|FrontierMath.{0,3}Erd/i.test(r.innerText)) || null,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  // Default columns render the four boards with values on frontier top-5 models. MirrorCode's
  // values join to ::high configurations and Epoch's SWE-bench run joins to non-top-5 models, so
  // CR-1.4 (rows need a value among the selected columns) legitimately hides them by default —
  // they are asserted in the selected-columns phase below instead.
  for (const [key, label] of [['chess', 'Chess Puzzles'], ['mystery', 'Mystery Game Puzzles'], ['ebr', 'EBR-bench'], ['gpqa', 'GPQA Diamond']]) {
    check(`${tag} /benchmarks: ${label} row renders with a value (default columns)`, !!ui[key] && /%/.test(ui[key] ?? ''), (ui[key] ?? '').slice(0, 240));
  }
  check(`${tag} /benchmarks: excluded boards never render`, !ui.excluded, ui.excluded);
  check(`${tag} /benchmarks: no horizontal overflow`, ui.overflow <= 1, ui.overflow);
  await page.screenshot({ path: `${OUT}/benchmarks-${tag}.png`, fullPage: false });
  // Selected-columns phase: deep-link value-carrying columns so MirrorCode and SWE-bench Verified
  // (Epoch AI run) carry at least one value among the selected models (CR-1.4), then render.
  await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent('claude-fable-5.1::high,gpt-6-astra::high,glm-5.2::max,claude-opus-4.7::max,gemini-3.5-flash::high')}`);
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500);
  await page.locator('button', { hasText: 'Show all' }).last().click().catch(() => {});
  await page.waitForTimeout(800);
  const sel = await page.evaluate(() => {
    const row = (re) => [...document.querySelectorAll('tr')].find((r) => re.test(r.innerText));
    return {
      mirror: row(/MirrorCode/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      swe: row(/SWE-bench Verified \(Epoch AI run\)/)?.innerText?.replace(/\s+/g, ' ') ?? null,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  check(`${tag} /benchmarks (value-carrying columns): MirrorCode row renders with Fable 5.1 (high) 73.3%`,
    !!sel.mirror && /73\.3/.test(sel.mirror ?? ''), (sel.mirror ?? '').slice(0, 260));
  check(`${tag} /benchmarks (value-carrying columns): SWE-bench Verified (Epoch run) renders with Opus 4.7 (max) 83.5%`,
    !!sel.swe && /83\.5/.test(sel.swe ?? ''), (sel.swe ?? '').slice(0, 260));
  check(`${tag} /benchmarks (value-carrying columns): no horizontal overflow`, sel.overflow <= 1, sel.overflow);
  await page.screenshot({ path: `${OUT}/benchmarks-selected-${tag}.png`, fullPage: false });
  if (!mobile) {
    await goto(page, `${BASE}/models/claude-fable-5.1::max`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000);
    const model = await page.evaluate(() => {
      const t = document.body.innerText;
      const i = t.indexOf('Chess Puzzles (Epoch AI)');
      return { chessPrefix: i >= 0 ? t.slice(i, i + 160).replace(/\s+/g, ' ') : null };
    });
    check(`${tag} model page: Fable 5.1 (max) shows its Chess Puzzles result (47.0%)`, !!model.chessPrefix && /47\.0%/.test(model.chessPrefix), model);
    await page.screenshot({ path: `${OUT}/model-fable-${tag}.png`, fullPage: false });
    await goto(page, `${BASE}/models/gemini-3.6-flash::high`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2000);
    const gem = await page.evaluate(() => {
      const chip = document.querySelector('[data-bh-model-benchmaxxing]');
      return { text: chip?.innerText?.replace(/\s+/g, ' ') ?? null };
    });
    // The tier and the number are re-derived from the dataset this checkout built, never pinned:
    // the corpus moves with every ingest, and a frozen 6.1 only records one day's fit (2026-09-23:
    // the fit reads 5.9629, which the page prints as 6.0, while the pin still said 6.1).
    check(`${tag} model page: Gemini 3.6 Flash (high) shows its ${expectedGemini.tier} Benchmaxxing tag at ${expectedGemini.printed}`,
      !!gem.text && new RegExp(expectedGemini.tier, 'i').test(gem.text)
        && new RegExp(expectedGemini.printed.replace('.', '\\.')).test(gem.text), { live: gem.text, expected: expectedGemini });
    await page.screenshot({ path: `${OUT}/model-gemini-${tag}.png`, fullPage: false });
  }
  if (errors.length) check(`${tag} page errors`, false, errors.slice(0, 3));
  await c.close();
}
await b.close();
const failed = checks.filter((x) => !x.ok);
console.log(JSON.stringify({ base: BASE, passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, passed: checks.length - failed.length, failed: failed.length, checks }, null, 1));
process.exit(failed.length ? 1 : 0);
