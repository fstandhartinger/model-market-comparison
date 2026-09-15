// 2026-09-15 change requests: header copy, value map (reversed cost axis, green top-right quadrant, note,
// ≤15 labels, ≤30 models), Benchmark Heaven Score row, category composites, Coding breadth, cost modal.
// Usage: node verify.mjs <base> <outdir>   (1440×1000 and 390×844, light and dark; writes verification.json + PNGs)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-bh-0915';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const PROXY = 'Proxied from publicly available LLM usage statistics from an inference provider';
const browser = await chromium.launch();

async function settle(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); }
async function setTheme(page, theme) {
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} document.documentElement.setAttribute('data-theme', t); }, theme);
}
async function patchSettings(page, patch) {
  await page.evaluate((p) => {
    const key = Object.keys(localStorage).filter((k) => /^mmc\.settings\.v\d+$/.test(k)).sort().pop();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), ...p }));
  }, patch);
}

for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`;
  const context = await browser.newContext({ viewport, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await setTheme(page, theme); await page.reload(); await settle(page);

  // Header copy.
  const h1 = await page.locator('h1').first().innerText();
  check(`${tag} header copy exact`, h1.replace(/\s+/g, ' ').trim() === 'The most detailed cost–capability analysis in AI. Every model. Every benchmark. Actual costs.', h1);

  // Value map.
  const map = await page.evaluate(() => {
    const root = document.querySelector('.bh-value-map');
    if (!root) return null;
    const svg = root.querySelector('svg.recharts-surface');
    const r = svg.getBoundingClientRect();
    const grid = svg.querySelector('.recharts-cartesian-grid')?.getBoundingClientRect();
    const xTicks = [...svg.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick')].map((t) => ({ x: t.getBoundingClientRect().x, text: t.textContent.trim() }));
    const quad = svg.querySelector('.bh-quadrant rect')?.getBoundingClientRect();
    const note = svg.querySelector('.bh-quadrant-note');
    const noteBox = note?.getBoundingClientRect();
    const dots = [...svg.querySelectorAll('.recharts-scatter-symbol circle, .recharts-scatter-symbol rect')].map((d) => d.getBoundingClientRect()).filter((b) => b.width > 0 && b.width < 14);
    const labels = [...svg.querySelectorAll('.bh-point-labels text')].map((t) => ({ text: t.textContent, box: t.getBoundingClientRect() }));
    const quadIndex = [...svg.querySelectorAll('*')].indexOf(svg.querySelector('.bh-quadrant'));
    const firstScatter = [...svg.querySelectorAll('*')].indexOf(svg.querySelector('.recharts-scatter'));
    const stops = [...svg.querySelectorAll('.bh-quadrant stop')].map((s) => getComputedStyle(s).stopOpacity);
    return { svg: { x: r.x, y: r.y, w: r.width, h: r.height }, grid: grid && { x: grid.x, y: grid.y, w: grid.width, h: grid.height }, xTicks, quad: quad && { x: quad.x, y: quad.y, w: quad.width, h: quad.height },
      note: note ? { text: note.textContent, x: noteBox.x, y: noteBox.y, w: noteBox.width, h: noteBox.height } : null, dots: dots.length, dotBoxes: dots.map((b) => [b.x, b.y, b.width, b.height]),
      labels: labels.map((l) => ({ text: l.text, x: l.box.x, y: l.box.y, w: l.box.width, h: l.box.height })), behind: quadIndex >= 0 && quadIndex < firstScatter, stops,
      header: root.querySelector('span')?.textContent ?? '', aria: root.getAttribute('aria-label') ?? '' };
  });
  check(`${tag} value map present`, map, map ? `${map.dots} dots` : 'missing');
  if (map) {
    const parse = (s) => Number(String(s).replace(/[$,]/g, ''));
    const ticks = map.xTicks.filter((t) => Number.isFinite(parse(t.text))).sort((a, b) => a.x - b.x);
    check(`${tag} cost axis reversed: left tick > right tick (cheaper right)`, ticks.length >= 2 && parse(ticks[0].text) > parse(ticks[ticks.length - 1].text), ticks.map((t) => t.text));
    check(`${tag} map caption says cheaper → right`, /cheaper → right/.test(map.header) && !/cheaper ← left/.test(map.header), map.header);
    const g = map.grid ?? (map.quad && { x: map.quad.x - map.quad.w, y: map.quad.y, w: map.quad.w * 2, h: map.quad.h * 2 });
    check(`${tag} green wash covers exactly the top-right quarter`, map.quad && g && Math.abs(map.quad.x - (g.x + g.w / 2)) < 2 && Math.abs(map.quad.y - g.y) < 2 && Math.abs(map.quad.w - g.w / 2) < 2 && Math.abs(map.quad.h - g.h / 2) < 2, { quad: map.quad, grid: g });
    check(`${tag} gradient transparent at bottom-left, visible at top-right; drawn behind data`, map.stops[0] === '0' && Number(map.stops[1]) > 0 && Number(map.stops[1]) <= 0.25 && map.behind, { stops: map.stops, behind: map.behind });
    const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const noteHitsDot = map.note && map.dotBoxes.some(([x, y, w, h]) => overlap(map.note, { x, y, w, h }));
    const noteHitsLabel = map.note && map.labels.some((l) => overlap(map.note, l));
    check(`${tag} "Most attractive quadrant" note present, top-right, above the plot, clear of dots and labels`, map.note?.text === 'Most attractive quadrant' && map.note.x + map.note.w <= map.svg.x + map.svg.w + 1 && map.note.x > map.svg.x + map.svg.w / 2 && (!map.grid || map.note.y + map.note.h <= map.grid.y + 3) && !noteHitsDot && !noteHitsLabel, { note: map.note, noteHitsDot, noteHitsLabel });
    check(`${tag} at most 15 names on the chart`, map.labels.length <= 15, `${map.labels.length} labels`);
    check(`${tag} at most 30 models on the map`, map.dots <= 30 && /(\d+) models/.test(map.header) && Number(map.header.match(/(\d+) models/)[1]) <= 30, map.header);
    check(`${tag} map has an accessible description of the orientation`, /top-right quadrant/.test(map.aria), map.aria);
  }
  await page.screenshot({ path: `${OUT}/${tag}-home.png` });

  // Overview table: widen to show every candidate; the count must stay ≤ 30 and can exceed 15.
  await patchSettings(page, { minScore: 0, minScoreTouched: true, simpleMaxCost: null }); await page.reload(); await settle(page);
  const rows = await page.locator('table[aria-label="Model ranking"] tbody tr.bh-ranking-row').count();
  const hint = await page.evaluate(() => document.querySelector('[aria-label="Recommendation mode"] p')?.textContent ?? '');
  check(`${tag} overview table: up to 30 models (more than 15 when limits are open)`, rows > 15 && rows <= 30, `${rows} rows`);
  if (kind === 'desktop') check(`${tag} Simple hint says up to 30`, /up to 30/.test(hint) && !/15/.test(hint), hint);
  // Pareto halos are a separate, unfilled scatter layer; count only the model points (filled circles).
  const mapAll = await page.evaluate(() => ({ points: [...document.querySelectorAll('.bh-value-map .recharts-scatter-symbol circle')].filter((c) => c.getAttribute('fill') !== 'none').length,
    header: document.querySelector('.bh-value-map span')?.textContent ?? '', labels: document.querySelectorAll('.bh-value-map .bh-point-labels text').length }));
  check(`${tag} open limits: map ≤ 30 model points and ≤ 15 names`, mapAll.points <= 30 && mapAll.labels <= 15 && mapAll.labels > 0, mapAll);

  // Simple benchmark table: score row and category composites.
  const simple = await page.evaluate(() => {
    const t = document.querySelector('#benchmarks table.bh-matrix');
    if (!t) return null;
    const first = t.querySelector('tbody tr');
    const groups = [...t.querySelectorAll('tr.bh-matrix-group')].map((g) => ({ head: g.querySelector('.bh-cat-head')?.textContent.trim(), basis: g.querySelector('.bh-cat-basis')?.textContent.trim(), cells: [...g.querySelectorAll('td')].map((c) => c.textContent.trim()) }));
    const codingRows = (() => { const g = [...t.querySelectorAll('tbody')].find((b) => /Coding/.test(b.querySelector('.bh-cat-head')?.textContent ?? '')); return g ? [...g.querySelectorAll('tr:not(.bh-matrix-group) th .bh-matrix-bench')].map((x) => x.textContent.trim()) : []; })();
    return { firstClass: first?.className, label: first?.querySelector('.bh-hero-label')?.textContent, sub: first?.querySelector('.bh-hero-sub')?.textContent, values: [...(first?.querySelectorAll('td') ?? [])].map((c) => c.textContent.trim()), groups, codingRows, scope: t.querySelector('tr.bh-matrix-group th')?.getAttribute('scope') };
  });
  check(`${tag} Simple table: first row is Benchmark Heaven Score / Main Composite Score`, simple?.firstClass?.includes('bh-matrix-hero') && simple.label === 'Benchmark Heaven Score' && simple.sub === 'Main Composite Score', simple && { label: simple.label, sub: simple.sub });
  check(`${tag} Simple table: category headers carry composite cells and a basis line`, simple?.groups.length && simple.groups.every((g) => g.basis && g.cells.length > 0) && simple.scope === 'rowgroup', simple?.groups);
  check(`${tag} Simple table: Coding shows more than SciCode`, simple && simple.codingRows.length >= 2, simple?.codingRows);
  const home = await page.evaluate(() => document.querySelector('#benchmarks table.bh-matrix tbody tr td')?.textContent.trim());
  await page.locator('#benchmarks').scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/${tag}-simple-benchmarks.png`, fullPage: false });

  // Selecting another score changes the row truthfully.
  await patchSettings(page, { score: 'aa_coding_index' }); await page.reload(); await settle(page);
  const other = await page.evaluate(() => { const r = document.querySelector('#benchmarks table.bh-matrix tr.bh-matrix-hero'); return r && { sub: r.querySelector('.bh-hero-sub')?.textContent, first: r.querySelector('td')?.textContent.trim() }; });
  check(`${tag} another score: subtitle names it, never "Composite"`, other && /Selected score: AA Coding/.test(other.sub) && !/Composite/.test(other.sub), { other, before: home });
  await patchSettings(page, { score: 'composite' });

  // Cost modal (GPT-6 Astra row) and the proxy wording on a fallback route.
  await page.reload(); await settle(page);
  const astra = page.locator('table[aria-label="Model ranking"] tbody tr.bh-ranking-row', { hasText: 'GPT-6 Astra' }).first().locator('button[aria-haspopup="dialog"]').first();
  if (await astra.count()) {
    await astra.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    const modal = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d && { text: d.innerText, links: [...d.querySelectorAll('a')].map((a) => a.textContent.trim()), focus: document.activeElement?.textContent?.trim(), label: d.getAttribute('aria-labelledby') }; });
    check(`${tag} GPT-6 Astra cost modal opens by keyboard with Close focused`, modal && modal.focus === 'Close', modal?.focus);
    check(`${tag} modal names the four inputs in plain English`, modal && /Tokens per task/.test(modal.text) && /Artificial Analysis/.test(modal.text) && /[Cc]ache/.test(modal.text) && /OpenRouter/.test(modal.text) && /cheapest provider that survives your current filters/.test(modal.text) && /strongest reasoning variant of the model present in benchmark data/.test(modal.text) && /estimate/.test(modal.text), modal?.text.slice(0, 600));
    check(`${tag} modal has no "Assumptions and limitations" section, keeps Sources with links`, modal && !/Assumptions and limitations/i.test(modal.text) && /Sources/.test(modal.text) && modal.links.length >= 2, modal?.links);
    await page.screenshot({ path: `${OUT}/${tag}-astra-modal.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check(`${tag} Escape closes the modal`, !(await page.locator('dialog[open]').count()), 'closed');
  } else check(`${tag} GPT-6 Astra row present in Simple table`, false, 'row not found');
  let proxy = null;
  const buttons = page.locator('table[aria-label="Model ranking"] tbody tr.bh-ranking-row button[aria-haspopup="dialog"]');
  for (let i = 0; i < Math.min(await buttons.count(), 30) && !proxy; i++) {
    await buttons.nth(i).click(); await page.waitForTimeout(250);
    proxy = await page.evaluate((P) => { const d = document.querySelector('dialog[open]'); const li = d && [...d.querySelectorAll('li')].find((x) => x.textContent.includes(P)); if (!li) return null;
      const a = li.querySelector('a'); const cs = getComputedStyle(li);
      return { text: li.textContent.replace(/\s+/g, ' ').trim(), anchors: li.querySelectorAll('a').length, anchorText: a?.textContent, underline: getComputedStyle(a).textDecorationLine, bodyWeight: cs.fontWeight, bodyDecoration: cs.textDecorationLine, bold: li.querySelectorAll('b,strong').length, model: d.querySelector('p')?.textContent }; }, PROXY);
    if (proxy) await page.screenshot({ path: `${OUT}/${tag}-proxy-modal.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  }
  check(`${tag} I/O proxy source: exact wording, only "[link]" is a link, body copy otherwise`, proxy && proxy.text.includes(`${PROXY} [link]`) && proxy.anchors === 1 && proxy.anchorText === '[link]' && proxy.bodyDecoration === 'none' && proxy.bold === 0 && !/Chutes LLM usage statistics/.test(proxy.text), proxy);

  // Benchmarks tab.
  await page.goto(`${BASE}/benchmarks`, { waitUntil: 'domcontentloaded' }); await settle(page);
  const bench = await page.evaluate(() => {
    const t = document.querySelector('table.bh-matrix'); if (!t) return null;
    const hero = t.querySelector('tr.bh-matrix-hero');
    const coding = [...t.querySelectorAll('tbody')].find((b) => /Coding/.test(b.querySelector('.bh-cat-head')?.textContent ?? ''));
    return { hero: hero && { label: hero.querySelector('.bh-hero-label')?.textContent, sub: hero.querySelector('.bh-hero-sub')?.textContent, first: t.querySelector('tbody tr') === hero },
      coding: coding ? [...coding.querySelectorAll('tr:not(.bh-matrix-group) .bh-matrix-bench')].map((x) => x.childNodes[0]?.textContent?.trim()) : [],
      codingComposite: coding ? [...coding.querySelectorAll('tr.bh-matrix-group td')].map((c) => c.textContent.trim()) : [], codingBasis: coding?.querySelector('.bh-cat-basis')?.textContent,
      toggle: !!t.querySelector('tr.bh-matrix-group button[aria-expanded]'), w: document.documentElement.scrollWidth };
  });
  check(`${tag} Benchmarks tab: score row first, labelled`, bench?.hero?.first && bench.hero.label === 'Benchmark Heaven Score' && bench.hero.sub === 'Main Composite Score', bench?.hero);
  check(`${tag} Benchmarks tab: broad Coding category incl. DeepSWE / SWE Atlas`, bench && bench.coding.length >= 6 && bench.coding.some((n) => /DeepSWE/.test(n)) && bench.coding.some((n) => /SWE Atlas/.test(n)), bench?.coding);
  check(`${tag} Benchmarks tab: category composite cells and collapsible header remain`, bench && bench.codingComposite.length > 0 && bench.toggle, { cells: bench?.codingComposite, basis: bench?.codingBasis });
  check(`${tag} no horizontal page overflow, no page errors`, bench && bench.w <= viewport.width + 1 && errors.length === 0, `${bench?.w}px ${errors.join(' | ')}`);
  await page.screenshot({ path: `${OUT}/${tag}-benchmarks.png` });
  if (kind === 'desktop') {
    await page.locator('tr.bh-matrix-group').filter({ hasText: 'Coding' }).first().scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${OUT}/${tag}-benchmarks-coding.png` });
  }

  // Advanced expanded row.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await settle(page);
  await page.getByRole('tab', { name: 'Advanced' }).click(); await page.waitForTimeout(800);
  await page.locator('table[aria-label="Model ranking"] tbody tr.bh-ranking-row').first().click(); await page.waitForTimeout(500);
  const adv = await page.evaluate(() => { const r = document.querySelector('tr.bh-score-mini'); return r && { text: r.textContent.replace(/\s+/g, ' ').trim(), firstInBody: r.parentElement.firstElementChild === r }; });
  check(`${tag} Advanced: expanded benchmarks start with Benchmark Heaven Score`, adv && adv.firstInBody && /Benchmark Heaven Score/.test(adv.text) && /Main Composite Score/.test(adv.text), adv);
  await page.screenshot({ path: `${OUT}/${tag}-advanced-expanded.png` });
  await context.close();
}

// Full cost-vs-capability chart page.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await context.newPage();
  await page.goto(`${BASE}/scatter`, { waitUntil: 'domcontentloaded' }); await settle(page);
  const s = await page.evaluate(() => ({ caption: [...document.querySelectorAll('.recharts-label')].map((l) => l.textContent).join(' | '), note: document.querySelector('.bh-quadrant-note')?.textContent, quad: !!document.querySelector('.bh-quadrant rect') }));
  check('scatter page: caption "← more expensive · cheaper →", quadrant and note', /← more expensive/.test(s.caption) && /cheaper →/.test(s.caption) && s.note === 'Most attractive quadrant' && s.quad, s);
  await page.screenshot({ path: `${OUT}/desktop-scatter.png` });
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed, total: checks.length, checks }, null, 1));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${String(c.detail).slice(0, 240)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
