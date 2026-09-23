// CR-25.6 (Florian 2026-09-15): the category composite scores (Coding, Agentic & tool use, Science,
// Long context) are selectable like any other score, and drive table, sort, map and score rows.
// Usage: node verify-cr-25-6.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-25-6';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3) throw e; } } };
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); };
const CATEGORIES = ['cat_coding', 'cat_agentic', 'cat_science', 'cat_long_context'];

// --- Data: every category score is offered, and its value is the mean of its anchor benchmarks. ----
const scored = {};
for (const key of CATEGORIES) {
  const data = await (await fetch(`${BASE}/api/models?score=${key}`)).json();
  const withValue = data.models.filter((m) => m.score != null);
  scored[key] = withValue;
  check(`data ${key} is a selectable score with values`, data.score === key && withValue.length > 0, { count: withValue.length });
  check(`data ${key} values sit on a 0–100 scale`, withValue.every((m) => m.score >= 0 && m.score <= 100), withValue.slice(0, 3).map((m) => m.score));
}
// Independent recompute from a different endpoint: the exact model's own benchmark rows.
// 2026-09-16 (CR-38.2): anchors are weighted, not averaged flat — a saturated anchor counts at half.
// Which anchors are saturated is read from the LIVE page (the category header's own (i) names them), so
// this stays an independent recompute: the arithmetic below must agree with what the product tells a user.
// 2026-09-23 (iteration 180): this read `${BASE}/benchmarks` as raw HTML and regexed the prose
// "saturated benchmarks weigh half (…)". Two things had moved underneath it: the heavy props now travel
// as /api/page-data, so that word is not in the server HTML at all, and the page states the rule on
// /about while marking the individual boards with a Saturated tag instead of listing them in a
// parenthetical. The list came back empty, every anchor was therefore weighted 1, and the recompute
// reported the *site* as wrong on cat_science. The site was right: with GPQA Diamond at half,
// (29.714 + 93.737/2)/1.5 = 51.05, which is what it publishes (51.1).
// It now reads the live matrix API's own `saturation.saturated`, which is the product's machine-readable
// answer to exactly this question — still the live site, and no longer a sentence that can be reworded.
const browser = await chromium.launch();
const matrixModels = [...new Set(CATEGORIES.flatMap((k) => (scored[k] ?? []).slice(0, 2).map((m) => m.id)))].slice(0, 5);
const matrix = (await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(matrixModels.join(','))}`)).json()).matrix;
const halfWeighted = (matrix?.rows ?? []).filter((r) => r?.saturation?.saturated).map((r) => r.name);
const SATURATED_WEIGHT = 0.5;
// 2026-09-23 (iteration 180): the anchors were local regexes, and /^GPQA Diamond/ matches two live
// boards — "GPQA Diamond (AA)" and "GPQA Diamond (Epoch AI run)". The tie was broken by the later
// version string, so for gpt-6-astra::max the recompute used Epoch's 94.36 while the site uses AA's
// 96.06, and the check reported the *site* as wrong by 0.6. It is not: (31.714 + 96.0606/2)/1.5 =
// 53.16, which is what it publishes (53.2). The anchor set is read from the methodology page, which
// publishes it by exact name for exactly this reason, and matched exactly — a benchmark whose name
// the page states but the data does not carry is now a finding rather than a silent substitution.
const anchorsPublished = await (async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await goto(page, `${BASE}/about`); await settle(page);
  const items = await page.locator('[data-category-anchors] li').allInnerTexts();
  await context.close();
  return items.map((t) => t.replace(/\s+/g, ' ').trim());
})();
const CATEGORY_LABEL = { cat_coding: /^Coding:/, cat_agentic: /^Agentic/, cat_science: /^Science:/, cat_long_context: /^Long context:/ };
const anchorNames = Object.fromEntries(Object.entries(CATEGORY_LABEL).map(([key, label]) => {
  const line = anchorsPublished.find((t) => label.test(t)) ?? '';
  return [key, line.slice(line.indexOf(':') + 1).split(/,\s*(?=[^)]*(?:\(|$))/).map((n) => n.trim()).filter(Boolean)];
}));
check('CR-25.6 the methodology page publishes an anchor set for every category',
  Object.values(anchorNames).every((names) => names.length > 0), anchorNames);
/** Half weight when the live page itself lists this axis as a saturated benchmark of its category. */
const axisWeight = (axis) => (axis && halfWeighted.some((n) => n === axis.name) ? SATURATED_WEIGHT : 1);
check('CR-38.2 the live page names its half-weighted (saturated) benchmarks', halfWeighted.length > 0, halfWeighted);

for (const [key, patterns] of Object.entries(anchorNames)) {
  const sample = (scored[key] ?? []).slice(0, 3);
  const wrong = [];
  for (const m of sample) {
    const view = await (await fetch(`${BASE}/api/benchmark-view?model=${encodeURIComponent(m.id)}`)).json();
    const weights = [];
    const values = patterns.map((name) => {
      const axis = view.axes.filter((a) => a.name === name && a.scores.some((r) => r.modelId === m.id))
        .sort((a, b) => String(b.version).localeCompare(String(a.version)))[0];
      weights.push(axisWeight(axis));
      if (!axis) return null;
      const rows = axis.scores.filter((r) => r.modelId === m.id);
      const measured = rows.filter((r) => r.basis === 'measured');
      const row = (measured.length ? measured : rows).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))[0];
      return row ? (axis.unit === 'fraction' ? row.value * 100 : row.value) : null;
    });
    if (values.some((v) => v == null)) { wrong.push({ id: m.id, values, note: 'anchor missing in view' }); continue; }
    const want = Number((values.reduce((s, v, i) => s + weights[i] * v, 0) / weights.reduce((s, w) => s + w, 0)).toFixed(1));
    if (Math.abs(want - m.score) > 0.15) wrong.push({ id: m.id, want, got: m.score, values });
  }
  check(`data ${key} = weighted mean of its anchor benchmarks, a saturated anchor at half (independent recompute for ${sample.length} models)`, sample.length > 0 && !wrong.length, wrong.slice(0, 2));
}
// Honesty: a model without a result on every anchor gets no score, never a partial average.
const codingIds = new Set(scored.cat_coding.map((m) => m.id));
const all = (await (await fetch(`${BASE}/api/models?score=cat_coding`)).json()).models;
check('data models missing an anchor have no Coding score (no partial average)', all.some((m) => !codingIds.has(m.id) && m.score == null), { total: all.length, scored: codingIds.size });

for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // The methodology page publishes the anchor set (data honesty: the definition is inspectable).
  await goto(page, `${BASE}/about`); await settle(page);
  const anchors = await page.locator('[data-category-anchors] li').allInnerTexts();
  check(`${tag} CR-25.6 /about lists every category's anchor benchmarks`, anchors.length === 4
    && anchors.some((t) => /Coding/.test(t) && /Terminal-Bench v4/.test(t) && /SciCode/.test(t))
    && anchors.some((t) => /Long context/.test(t) && /AA-LCR/.test(t)), anchors);

  await goto(page, `${BASE}/`); await settle(page);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await settle(page);

  // Simple's score picker offers the category composites (CR-32.1 list + CR-25.6).
  const scoreBtn = page.locator('[data-label-picker="Capability score"]');
  await scoreBtn.click(); await page.waitForTimeout(300);
  const items = await page.locator('[role=menu][aria-label="Capability score"] [role=menuitemradio]').allInnerTexts();
  check(`${tag} CR-25.6 the score picker offers the four category composites`,
    CATEGORIES.every((k) => items.some((t) => new RegExp(k === 'cat_coding' ? '^Coding' : k === 'cat_agentic' ? 'Agentic' : k === 'cat_science' ? 'Science' : 'Long context').test(t))), items);
  await page.screenshot({ path: `${OUT}/${tag}-score-menu.png` });

  // Choosing Coding drives label, score rows, slider, table header, sort and the value map.
  await page.locator('[role=menuitemradio][data-choice=cat_coding]').click(); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    sub: document.querySelector('[data-min-score-sub]')?.textContent ?? '',
    hero: [...document.querySelectorAll('#benchmarks tr.bh-matrix-hero')].map((tr) => tr.dataset.score),
    header: [...document.querySelectorAll('thead th')].map((th) => th.textContent).find((t) => /Score/.test(t)) ?? '',
    rows: [...document.querySelectorAll('tr.bh-ranking-row')].filter((r) => r.offsetParent).map((r) => ({ id: r.dataset.model, score: Number(r.dataset.score) })),
    yTop: Math.max(...[...document.querySelectorAll('.bh-value-map .recharts-yAxis .recharts-cartesian-axis-tick-value')].map((t) => Number(t.textContent))),
  }));
  check(`${tag} CR-25.6 label and table header name the Coding category score`, /Coding/.test(after.sub) && /Coding/.test(after.header), { sub: after.sub, header: after.header });
  check(`${tag} CR-25.6 the Main Composite row stays first, the selected category score sits below it (CR-33.3)`,
    after.hero[0] === 'composite' && after.hero[1] === 'cat_coding', after.hero);
  const desc = after.rows.every((r, i) => i === 0 || after.rows[i - 1].score >= r.score);
  check(`${tag} CR-25.6 the table sorts by the selected category score, descending`, after.rows.length > 1 && desc, after.rows.slice(0, 4));
  check(`${tag} CR-25.6 the value map's Y axis follows the category score's range`, Number.isFinite(after.yTop) && after.yTop <= 100, after.yTop);
  // Every shown value matches the API's value for that model (no fabricated numbers).
  const api = new Map((await (await fetch(`${BASE}/api/models?score=cat_coding`)).json()).models.map((m) => [m.id, m.score]));
  const mismatched = after.rows.filter((r) => Math.abs((api.get(r.id) ?? NaN) - r.score) > 0.051);
  check(`${tag} CR-25.6 every score shown in the table equals the model's Coding score`, after.rows.length > 0 && !mismatched.length, mismatched.slice(0, 3));
  await page.screenshot({ path: `${OUT}/${tag}-coding-selected.png`, fullPage: false });

  await page.reload(); await settle(page);
  check(`${tag} CR-25.6 the chosen category score persists like other settings`, /Coding/.test(await page.locator('[data-min-score-sub]').first().innerText().catch(() => '')), '');

  // CR-25.6's own wording: the Options panel's Score dropdown lists the category composites.
  const optBtn = page.locator('header button[data-bh-filters-toggle]').first();
  await optBtn.click(); await page.locator('#global-filters').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  const optScores = await page.locator('#global-filters select[aria-label="Score"] option').allInnerTexts();
  check(`${tag} CR-25.6 the Options panel's Score dropdown lists the category composites`,
    ['Coding', 'Agentic & tool use', 'Science', 'Long context'].every((n) => optScores.includes(n)), optScores);
  await page.screenshot({ path: `${OUT}/${tag}-options-score.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);

  // The shortlist column chart offers it too (CR-33.2).
  const chartScores = await page.locator('[data-shortlist-score] option').allInnerTexts();
  check(`${tag} CR-33.2 the shortlist column chart offers the category composites`, CATEGORIES.every((k) => chartScores.some((t) => /category composite/.test(t))) && chartScores.some((t) => /^Coding/.test(t)), chartScores);
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), total: checks.length, passed: checks.length - failed.length, checks }, null, 2));
console.log(`${checks.length - failed.length}/${checks.length} passed`); for (const f of failed) console.log('FAIL', f.name, f.detail.slice(0, 300));
process.exit(failed.length ? 1 : 0);
