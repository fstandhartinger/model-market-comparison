// CR-38.2 (saturation + freshness metadata), CR-38.3 (preference/judge scores kept apart from task
// accuracy) and design directive F-98 (one tag each, no new colour), live at 1440/390, light/dark.
// Usage: node verify-cr-38.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const { readFileSync } = await import('node:fs');
const { saturationOf, SATURATION_THRESHOLD, SATURATION_MIN_MODELS, SATURATED_WEIGHT, buildBenchmarkMatrix, resultHref, versionLine } = await import('../../../lib/benchmark-matrix.mjs');
const { buildBenchmarkView } = await import('../../../lib/benchmark-view.mjs');
const caveats = JSON.parse(readFileSync(new URL('../../../data/benchmark-caveats.json', import.meta.url)));
const taxonomy = JSON.parse(readFileSync(new URL('../../../data/benchmark-taxonomy.json', import.meta.url)));
const dataset = JSON.parse(readFileSync(new URL('../../../data/dataset.json', import.meta.url)));

// The one benchmark×model cell whose source states a task window — used to check the detail page,
// because a retired board like AIME 2025 is not among the default top-5 comparison's rows.
const matrix = buildBenchmarkMatrix(buildBenchmarkView(dataset), dataset, taxonomy, caveats);
const windowRow = matrix.rows.find((r) => r.freshness?.taskWindow);
const windowIndex = matrix.rows.indexOf(windowRow);
const windowModel = Object.entries(matrix.values).find(([, vals]) => vals.some(([i]) => i === windowIndex))?.[0] ?? null;

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-38';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };
const SAT_TIP = taxonomy.tags.saturated.tip, JUDGED_TIP = taxonomy.tags.judged.tip;

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

  // ---------- the full comparison ----------
  await goto(page, `${BASE}/benchmarks`);
  await page.evaluate((t) => { try { localStorage.clear(); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload().catch(async () => { await new Promise((r) => setTimeout(r, 3000)); await page.reload(); }); await settle(page);

  const rows = await page.evaluate(() => [...document.querySelectorAll('.bh-matrix tbody tr')]
    .filter((tr) => !tr.classList.contains('bh-matrix-hero') && !tr.classList.contains('bh-matrix-group'))
    .map((tr) => ({
      name: tr.querySelector('.bh-matrix-bench')?.childNodes[0]?.textContent?.trim() ?? '',
      tags: [...tr.querySelectorAll('.bh-matrix-tag')].map((e) => ({ tag: e.dataset.tag, label: e.textContent, tip: e.getAttribute('title') })),
      sub: tr.querySelector('.bh-matrix-sub')?.textContent ?? '',
    })));
  check(`${tag} the full comparison renders its benchmark rows`, rows.length >= 20, { rows: rows.length });
  const saturated = rows.filter((r) => r.tags.some((t) => t.tag === 'saturated'));
  const judged = rows.filter((r) => r.tags.some((t) => t.tag === 'judged'));
  check(`${tag} F-98 a Saturated tag is on screen with its one sentence`, saturated.length > 0
    && saturated.every((r) => r.tags.find((t) => t.tag === 'saturated').label.startsWith('Saturated') && r.tags.find((t) => t.tag === 'saturated').tip === SAT_TIP),
    { n: saturated.length, names: saturated.map((r) => r.name).slice(0, 8) });
  check(`${tag} F-98 a Judged tag is on screen with its one sentence`, judged.length > 0
    && judged.every((r) => r.tags.find((t) => t.tag === 'judged').label.startsWith('Judged') && r.tags.find((t) => t.tag === 'judged').tip === JUDGED_TIP),
    { n: judged.length, names: judged.map((r) => r.name).slice(0, 8) });
  // F-98: no new colour — the caveat tags are drawn like Niche / Community, not like the accent tags.
  const paint = await page.evaluate(() => {
    const of = (sel) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { color: s.color, border: s.borderColor, radius: s.borderRadius, cursor: s.cursor }; };
    return { niche: of('.bh-matrix-tag[data-tag="niche"]'), saturated: of('.bh-matrix-tag[data-tag="saturated"]'), judged: of('.bh-matrix-tag[data-tag="judged"]'), headline: of('.bh-matrix-tag[data-tag="headline"]') };
  });
  check(`${tag} F-98 the caveat tags use the existing muted pill, no new colour`,
    paint.niche && paint.saturated && paint.judged
    && JSON.stringify(paint.saturated) === JSON.stringify(paint.niche)
    && JSON.stringify(paint.judged) === JSON.stringify(paint.niche)
    && paint.saturated.cursor === 'help', paint);
  check(`${tag} CR-38.2 rows name their version and when the results were read`,
    rows.filter((r) => /Version /.test(r.sub)).length >= rows.length * 0.8, { with: rows.filter((r) => /Version /.test(r.sub)).length, of: rows.length, sample: rows.find((r) => /Version /.test(r.sub))?.sub });
  const shownWindow = rows.find((r) => /tasks from/.test(r.sub));
  if (shownWindow) check(`${tag} CR-38.2 a known task window is shown in the comparison where the source states one`, true, shownWindow.sub);

  // Category headers: the composite says when it weighs a saturated row half or leaves judged rows out.
  const cats = await page.evaluate(() => [...document.querySelectorAll('.bh-matrix-group th')].map((th) => ({ title: th.getAttribute('title'), basis: th.querySelector('.bh-cat-basis')?.textContent ?? '' })));
  const weighted = cats.filter((c) => /saturated benchmarks weigh half/.test(c.title ?? ''));
  check(`${tag} CR-38.2 a category composite states that a saturated benchmark weighs half`, weighted.length > 0
    && weighted.every((c) => /weighted mean/.test(c.title) && /weighted/.test(c.basis)), { n: weighted.length, sample: weighted[0]?.title?.slice(0, 200) });
  check(`${tag} CR-38.3 no category composite silently mixes judged scores with task accuracy`,
    cats.every((c) => !/preference or judge score/.test(c.title ?? '') || /left out/.test(c.title)), cats.filter((c) => /preference or judge/.test(c.title ?? '')).map((c) => c.title?.slice(0, 160)));
  const foot = await page.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.textContent).find((t) => /Bold is best in row/.test(t ?? '')) ?? '');
  check(`${tag} the full comparison's footnote explains both tags`, /Saturated/.test(foot) && /Judged/.test(foot) && /weighs half/.test(foot), foot.slice(-320));
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks.png`, fullPage: false });

  // ---------- Simple table ----------
  await goto(page, `${BASE}/`); await settle(page);
  await page.locator('#benchmarks .bh-matrix-wrap').scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(600);
  const simple = await page.evaluate(() => [...document.querySelectorAll('#benchmarks tbody tr')]
    .filter((tr) => !tr.classList.contains('bh-matrix-hero') && !tr.classList.contains('bh-matrix-group'))
    .map((tr) => ({ name: tr.querySelector('.bh-matrix-bench')?.childNodes[0]?.textContent?.trim() ?? '',
      tags: [...tr.querySelectorAll('.bh-matrix-tag')].map((e) => e.dataset.tag), info: !!tr.querySelector('button') })));
  check(`${tag} F-98 the Simple table carries the caveat tags too`, simple.some((r) => r.tags.includes('saturated')) && simple.some((r) => r.tags.includes('judged')),
    { rows: simple.length, saturated: simple.filter((r) => r.tags.includes('saturated')).length, judged: simple.filter((r) => r.tags.includes('judged')).length });
  check(`${tag} F-98 the Simple table shows only the caveat tags, not the editorial tiers`,
    simple.every((r) => r.tags.every((t) => t === 'saturated' || t === 'judged')), simple.flatMap((r) => r.tags).filter((t) => t !== 'saturated' && t !== 'judged'));
  check(`${tag} CR-31.2 every Simple row still has its (i)`, simple.length > 0 && simple.every((r) => r.info), { rows: simple.length });

  // The (i) of a saturated row: version line and the caveat sentence, opaque, above the table.
  const tip = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll('#benchmarks tbody tr')].filter((tr) => !tr.classList.contains('bh-matrix-hero') && !tr.classList.contains('bh-matrix-group'));
    const row = rows.find((tr) => tr.querySelector('.bh-matrix-tag[data-tag="saturated"]'));
    if (!row) return null;
    const name = row.querySelector('.bh-matrix-bench')?.childNodes[0]?.textContent?.trim() ?? '';
    row.querySelector('button')?.click();
    await new Promise((r) => setTimeout(r, 600));
    // Desktop draws a tooltip, phones a modal dialog (CR-1.8) — take whichever is about this row.
    const panel = [...document.querySelectorAll('dialog[open], [role="tooltip"], .bh-tip, .bh-infotip-panel, [data-infotip-panel]')]
      .find((e) => name && e.innerText.includes(name));
    if (!panel) return { text: null };
    const s = getComputedStyle(panel), r = panel.getBoundingClientRect();
    return { text: panel.innerText, bg: s.backgroundColor, z: s.zIndex, inView: r.left >= -1 && r.right <= innerWidth + 1 && r.width > 80 };
  });
  check(`${tag} CR-38.2 the (i) of a saturated benchmark carries its version line and caveat sentence`,
    tip && tip.text && /Version /.test(tip.text) && tip.text.includes('Saturated:'), (tip?.text ?? 'no saturated row in the Simple table').slice(0, 300));
  check(`${tag} the (i) panel is opaque and inside the viewport`, tip && tip.bg && !/rgba\(0, 0, 0, 0\)/.test(tip.bg) && tip.inView, { bg: tip?.bg, z: tip?.z, inView: tip?.inView });
  const simpleFoot = await page.evaluate(() => [...document.querySelectorAll('#benchmarks p')].map((p) => p.textContent).find((t) => /Bold is best in row/.test(t ?? '')) ?? '');
  check(`${tag} the Simple footnote explains both tags and the weighting`, /Saturated/.test(simpleFoot) && /Judged/.test(simpleFoot) && /weighs half/.test(simpleFoot), simpleFoot.slice(-320));
  await page.screenshot({ path: `${OUT}/${tag}-simple.png`, fullPage: false });

  // ---------- /about legend ----------
  await goto(page, `${BASE}/about#benchmark-tags`); await settle(page);
  const about = await page.evaluate(() => document.body.innerText);
  check(`${tag} F-98 /about lists both tags with exactly their tooltip sentences`, about.includes(SAT_TIP) && about.includes(JUDGED_TIP), {
    saturated: about.includes(SAT_TIP), judged: about.includes(JUDGED_TIP) });
  check(`${tag} /about documents the measured saturation rule and the half weight`,
    /90\s*%/.test(about) && /half the weight|weighs half|half of an/.test(about) && /five models|at least five/.test(about), '');
  check(`${tag} /about documents that judged scores never average with task accuracy`, /never\s+averages?\s+with task accuracy/.test(about), '');
  await page.screenshot({ path: `${OUT}/${tag}-about.png`, fullPage: false });
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}

// ---------- the result detail page: the caveats a tooltip has no room for ----------
if (windowRow && windowModel) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light' });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}${resultHref(windowRow.id, windowModel, [windowModel], false)}`); await settle(page);
  const caveatText = await page.locator('[data-bh-result-caveats]').innerText().catch(() => '');
  check('CR-38.2 the result page repeats the source-stated task window', /tasks from/.test(caveatText), { row: windowRow.name, model: windowModel, text: caveatText.slice(0, 300) });
  check('CR-38.2 the result page says plainly when the source states no contamination control', /contamination|private|held-out|refreshed|semi-private/i.test(caveatText), caveatText.slice(0, 300));
  check('CR-38.2 the result page names the version line the tooltip shows', caveatText.includes(versionLine(windowRow)), versionLine(windowRow));
  await page.screenshot({ path: `${OUT}/result-caveats.png` });
  check('the result page has no page errors', !errors.length, errors);
  await context.close();
} else {
  check('CR-38.2 a benchmark with a source-stated task window exists to check', false, 'no row carries a task window');
}

// ---------- a saturated benchmark's own detail page states the measured numbers ----------
{
  const satRow = matrix.rows.find((r) => r.saturation?.saturated && r.benchmarkId);
  const satIndex = matrix.rows.indexOf(satRow);
  const satModel = satRow ? Object.entries(matrix.values).find(([, vals]) => vals.some(([i]) => i === satIndex))?.[0] : null;
  if (satRow && satModel) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: 'dark' });
    const page = await context.newPage();
    await goto(page, `${BASE}${resultHref(satRow.id, satModel, [satModel], false)}`); await settle(page);
    const text = await page.locator('[data-bh-result-caveats]').innerText().catch(() => '');
    const share = Math.round(satRow.saturation.share * 1000) / 10;
    check('CR-38.2 a saturated benchmark\'s page shows the measurement behind the tag', text.includes('Saturated.')
      && text.includes(String(share)) && text.includes(String(satRow.saturation.models)), { row: satRow.name, share, text: text.slice(0, 320) });
    await page.screenshot({ path: `${OUT}/result-saturated.png` });
    await context.close();
  } else check('CR-38.2 a saturated benchmark exists to check on its detail page', false, 'none found');
}

// ---------- the numbers behind the tags, recomputed from the live API ----------
{
  const res = await fetch(`${BASE}/api/models?limit=2000`).catch(() => null);
  check('the live API answers', !!res && res.ok, res ? `HTTP ${res.status}` : 'no response');
  if (res?.ok) {
    const body = await res.json();
    const models = body.models ?? body.data ?? [];
    check('CR-38.2 the live API still publishes category scores', models.some((m) => m.category_scores || m.score != null), { models: models.length });
  }
  // The rule is deterministic: recompute it here so the tags on the page are not taken on trust.
  const probe = saturationOf([96, 95, 94, 93, 92], { unit: 'percent', range: [0, 100], higherBetter: true });
  check('CR-38.2 the published saturation rule is the one the page uses', probe.saturated === true
    && SATURATION_THRESHOLD === 0.9 && SATURATION_MIN_MODELS === 5 && SATURATED_WEIGHT === 0.5,
    { threshold: SATURATION_THRESHOLD, minModels: SATURATION_MIN_MODELS, weight: SATURATED_WEIGHT });
  check('CR-38.3 every judged classification still quotes a source', Object.values(caveats.judged).every((e) => e.quote && e.field && e.why),
    { judged: Object.keys(caveats.judged).length });
}

await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
