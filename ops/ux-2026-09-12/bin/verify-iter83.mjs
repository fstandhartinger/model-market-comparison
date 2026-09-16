// Iteration 83: CR-45.1 (link-preview copy), CR-40.1–40.3 (shortlist chart: diagonal names, zoomed axis with a
// stated range, zero-baseline cogwheel persisted), CR-41.1/41.2 (best-of rows for harness/version variants).
// Usage: node verify-iter83.mjs <base> <outdir> [expected-revision-prefix]
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-iter83';
const REV = process.argv[4] || '';
await fs.mkdir(OUT, { recursive: true });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3 || !/ERR_NETWORK_CHANGED|ERR_CONNECTION|ERR_TIMED_OUT|Timeout|ERR_INTERNET/.test(String(e))) throw e; await new Promise((r) => setTimeout(r, 3000 * a)); } } };
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

const meta = await (await fetch(`${BASE}/api/meta`)).json().catch(() => ({}));
check('deployed revision matches the expected commit', !REV || String(meta.revision || '').startsWith(REV), { revision: meta.revision, expected: REV });

// CR-45.1: what a link-preview scraper sees (no JavaScript, bot user agents).
const CLAIM = 'The most detailed cost–capability analysis in AI.';
const LINE = 'Every Benchmark. Actual Costs.';
const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
for (const ua of ['TelegramBot (like TwitterBot)', 'facebookexternalhit/1.1', 'Twitterbot/1.0']) {
  const html = await (await fetch(`${BASE}/`, { headers: { 'user-agent': ua } })).text();
  const tag = (attr, name) => decode((html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)) || [])[1] || '');
  const fields = { description: tag('name', 'description'), og: tag('property', 'og:description'), ogAlt: tag('property', 'og:image:alt'), twitter: tag('name', 'twitter:description'), ogImage: tag('property', 'og:image'), twImage: tag('name', 'twitter:image') };
  const copy = ['description', 'og', 'ogAlt', 'twitter'].every((k) => fields[k].includes(CLAIM) && fields[k].includes(LINE));
  check(`[${ua}] description, og:description, og:image:alt and twitter:description carry the accepted copy`, copy, fields);
  check(`[${ua}] no retired slogan anywhere in the served HTML`, !/benchmark we can find|really costs you/i.test(html), '');
  check(`[${ua}] og:image and twitter:image point at the refreshed share image`, /\/brand\/og-image\.png\?v=2$/.test(fields.ogImage) && /\/brand\/og-image\.png\?v=2$/.test(fields.twImage), fields);
  if (ua.startsWith('Telegram')) {
    const img = await fetch(fields.ogImage.startsWith('http') ? fields.ogImage : `${BASE}${fields.ogImage}`);
    const buf = Buffer.from(await img.arrayBuffer());
    await fs.writeFile(`${OUT}/og-image.png`, buf);
    const { createHash } = await import('node:crypto');
    check('share image is served as a 1200×630 PNG (sha256 recorded)', img.ok && /png/.test(img.headers.get('content-type') || '') && buf.readUInt32BE(16) === 1200 && buf.readUInt32BE(20) === 630, { status: img.status, sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length });
  }
}

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/?v=${Date.now()}`);
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); localStorage.removeItem('bh.shortlistChart.v1'); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  const fig = page.locator('[data-shortlist-columns]');
  await fig.waitFor({ timeout: 30000 });
  await fig.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  const state = async () => page.evaluate(() => {
    const f = document.querySelector('[data-shortlist-columns]');
    const range = f.querySelector('[data-axis-range]');
    const names = [...f.querySelectorAll('[data-name-for]')].map((a) => getComputedStyle(a).transform);
    const ticks = [...f.querySelectorAll('[data-axis-tick]')].map((t) => Number(t.getAttribute('data-axis-tick')));
    const mticks = [...f.querySelectorAll('[data-axis-ticks] span span')].map((s) => s.textContent);
    const values = [...f.querySelectorAll('[data-col]:not([data-no-data]) .tabular')].map((s) => parseFloat(s.textContent)).filter((v) => Number.isFinite(v));
    return { range: range?.textContent ?? '', kind: range?.getAttribute('data-axis-range') ?? null, axisBreak: !!f.querySelector('[data-axis-break]'), names, ticks, mticks, values, label: f.querySelector('[role="img"]')?.getAttribute('aria-label') ?? '', overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  let s = await state();
  const lo = Number((s.range.match(/Axis ([\d.]+)–([\d.]+)/) || [])[1]);
  const hi = Number((s.range.match(/Axis ([\d.]+)–([\d.]+)/) || [])[2]);
  check(`${tag} CR-40.2 default axis is data-driven and not from zero`, s.kind === 'zoomed' && lo > 0 && s.values.length >= 2 && Math.min(...s.values) >= lo && Math.max(...s.values) <= hi, { range: s.range, values: s.values });
  check(`${tag} CR-40.2 the drawn range is stated in words, with an axis-break mark and in the accessible label`, /not at zero/.test(s.range) && s.axisBreak && /not starting at zero/.test(s.label), { range: s.range, label: s.label.slice(0, 160) });
  const shownTicks = mobile ? s.mticks.map(Number) : s.ticks;
  check(`${tag} CR-40.2 axis labels run from the stated start to the stated end`, shownTicks.length >= 3 && shownTicks[0] === lo && shownTicks[shownTicks.length - 1] === hi, { shownTicks, lo, hi });
  if (!mobile) {
    // rotate(-45deg) = matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)
    const diag = s.names.length >= 2 && s.names.every((t) => { const m = t.match(/matrix\(([^,]+), ([^,]+)/); return m && Math.abs(Number(m[1]) - 0.7071) < 0.01 && Math.abs(Number(m[2]) + 0.7071) < 0.01; });
    check(`${tag} CR-40.1 model names are diagonal (−45°)`, diag, s.names.slice(0, 3));
    const clipped = await page.evaluate(() => { const f = document.querySelector('[data-shortlist-columns]'); const scroller = f.querySelector('[role="img"]'); const b = scroller.getBoundingClientRect(); return [...f.querySelectorAll('[data-name-for]')].filter((a) => { const r = a.getBoundingClientRect(); return r.left < b.left - 1 || r.bottom > b.bottom + 1; }).map((a) => a.textContent); });
    check(`${tag} CR-40.1 no diagonal name is cut off by the chart box`, clipped.length === 0, clipped);
  }
  await fig.screenshot({ path: `${OUT}/${tag}-chart-zoomed.png` }).catch(() => {});
  // CR-40.3: the cogwheel switches to a zero baseline, and the choice survives a reload.
  await page.locator('[data-shortlist-settings]').click();
  const box = page.locator('#bh-shortlist-chart-settings');
  check(`${tag} CR-40.3 cogwheel opens a settings group with a clearly named zero-baseline option`, await box.isVisible() && /Start the axis at zero/.test(await box.innerText()), await box.innerText().catch(() => ''));
  await fig.screenshot({ path: `${OUT}/${tag}-chart-settings.png` }).catch(() => {});
  await page.locator('[data-pref="zeroBaseline"]').check();
  await page.waitForTimeout(300);
  s = await state();
  check(`${tag} CR-40.3 zero baseline draws from 0 and says so`, s.kind === 'bar' && /^Axis 0–/.test(s.range) && /start at zero/.test(s.range) && !s.axisBreak, s.range);
  await page.keyboard.press('Escape');
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {});
  await fig.waitFor({ timeout: 30000 }); await fig.scrollIntoViewIfNeeded(); await page.waitForTimeout(800);
  s = await state();
  check(`${tag} CR-40.3 the zero-baseline choice persists after a reload`, s.kind === 'bar' && /^Axis 0–/.test(s.range), s.range);
  await fig.screenshot({ path: `${OUT}/${tag}-chart-zero.png` }).catch(() => {});
  await page.locator('[data-shortlist-settings]').click();
  await page.locator('[data-pref="zeroBaseline"]').uncheck();
  await page.waitForTimeout(300);
  s = await state();
  check(`${tag} CR-40.3 switching back restores the zoomed axis`, s.kind === 'zoomed', s.range);
  check(`${tag} no horizontal page overflow`, s.overflow <= 1, s.overflow);
  check(`${tag} no page errors`, errors.length === 0, errors.join(' | '));
  await context.close();
}
// CR-41.1 / CR-41.2: best-of rows in the API, the Benchmarks tab and on the result page.
const MODELS = ['claude-opus-5::max', 'gpt-5.6-sol::max', 'gpt-6-astra::max', 'claude-fable-5.1::max', 'deepseek-v4-pro-0813::max'];
const api = await (await fetch(`${BASE}/api/benchmark-matrix?models=${encodeURIComponent(MODELS.join(','))}`)).json();
const rows = api.matrix.rows;
for (const key of ['apprenticebench-api', 'aa-coding-agent-index']) {
  const hits = rows.filter((r) => r.key === key);
  check(`API: ${key} is one best-of row (no per-agent/per-version rows left)`, hits.length === 1 && hits[0].bestOf && /^best of/.test(hits[0].cohort), hits.map((r) => [r.id, r.cohort]));
}
const aa = rows.find((r) => r.key === 'aa-coding-agent-index');
const aaIdx = rows.indexOf(aa);
const fable = api.matrix.values['claude-fable-5.1::max']?.find(([i]) => i === aaIdx);
const fableVariant = aa?.bestOf?.variants[aa.bestOf.pick['claude-fable-5.1::max']];
check('API: AA Coding Agent Index keeps both boards and says which run each value is from', aa && aa.boards?.length === 2 && fableVariant && /^1\.[45]$/.test(fableVariant.version) && fableVariant.cohort === 'Claude Code', { boards: aa?.boards, fable, fableVariant });
// the merged value must equal the best of that model's raw runs, read from the per-run scores API
const scores = await (await fetch(`${BASE}/api/benchmark-scores?model_id=${encodeURIComponent('claude-fable-5.1::max')}&limit=500`)).json();
const aaRaw = (scores.observations ?? scores.results ?? []).filter((o) => String(o.benchmark_id).startsWith('aa-coding-agent-index'));
const rawBest = Math.max(...aaRaw.map((o) => Number(o.value ?? o.score)).filter(Number.isFinite));
check('API: the merged AA Coding Agent Index value for Claude Fable 5.1 max equals the best of its published runs', fable && Math.abs(fable[1] - rawBest) < 1e-9 && aaRaw.length >= 2, { merged: fable?.[1], rawBest, runs: aaRaw.map((o) => [o.benchmark_id, o.value ?? o.score]) });

const browser2 = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser2.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/benchmarks?models=${encodeURIComponent(MODELS.join(','))}&rows=all`);
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('table.bh-matrix tbody tr')];
    const pick = (re) => trs.filter((tr) => re.test(tr.querySelector('th')?.textContent ?? ''));
    // F-105 (Fable pass 19): the note sentence moved from a visible sub-line to the description's hover title.
    const describe = (tr) => ({ head: tr.querySelector('th').innerText.replace(/\s+/g, ' ').slice(0, 220), note: tr.querySelector('th .bh-matrix-desc')?.getAttribute('title') ?? '', variants: [...tr.querySelectorAll('[data-variant]')].map((a) => [a.getAttribute('data-variant'), a.getAttribute('href')]) });
    return { apprentice: pick(/^ApprenticeBench API \(NeoCognition\)/).map(describe), aa: pick(/^AA Coding Agent Index/).map(describe) };
  });
  check(`${tag} Benchmarks tab: ApprenticeBench API is one row, marked best of, with the note (on the hover since F-105)`, info.apprentice.length === 1 && /best of Claude Code \/ Codex/.test(info.apprentice[0].head) && /best recorded result/.test(info.apprentice[0].head + ' ' + info.apprentice[0].note), info.apprentice);
  check(`${tag} Benchmarks tab: AA Coding Agent Index is one row across v1.4/v1.5 and agents; each value names its run`, info.aa.length === 1 && /best of v1\.4 \/ v1\.5/.test(info.aa[0].head) && info.aa[0].variants.length >= 3 && info.aa[0].variants.every(([l]) => /^v1\.[45] · (Claude Code|Codex)$/.test(l)), info.aa);
  if (theme === 'light' && info.aa[0]?.variants?.[0]) {
    const [label, href] = info.aa[0].variants[0];
    await page.screenshot({ path: `${OUT}/${tag}-benchmarks-best-of.png`, fullPage: false }).catch(() => {});
    await goto(page, `${BASE}${href}`); await page.waitForLoadState('networkidle').catch(() => {});
    const note = await page.locator('[data-bh-result-best-of]').innerText().catch(() => '');
    const eyebrow = await page.locator('.bh-eyebrow').first().innerText().catch(() => '');
    check(`${tag} result page of a best-of value names the version and agent of the run and the merged row`, note.includes(`This is the ${label} run`) && /best recorded result/.test(note) && /that is this run/.test(note) && /Claude Code|Codex/i.test(eyebrow), { label, note, eyebrow });
    await page.screenshot({ path: `${OUT}/${tag}-result-best-of.png` }).catch(() => {});
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} Benchmarks/result: no horizontal page overflow`, overflow <= 1, overflow);
  check(`${tag} Benchmarks/result: no page errors`, errors.length === 0, errors.join(' | '));
  // Simple: the shortlist table's best-of rows count every board they stand for
  await goto(page, `${BASE}/`); await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('[data-bench-count]').waitFor({ timeout: 30000 }).catch(() => {});
  const simple = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('#benchmarks tbody tr[data-board]')];
    return { count: Number(document.querySelector('[data-bench-count]')?.textContent), boards: new Set(trs.flatMap((tr) => tr.hasAttribute('data-boards') ? JSON.parse(tr.getAttribute('data-boards')) : [tr.getAttribute('data-board')])).size,
      best: trs.filter((tr) => tr.hasAttribute('data-best-of')).map((tr) => tr.querySelector('th').textContent.slice(0, 60)),
      perAgent: trs.filter((tr) => /^(Claude Code|Codex)$/.test(tr.querySelector('.bh-matrix-cohort')?.textContent ?? '')).length };
  });
  check(`${tag} Simple table: no per-agent rows, best-of rows present, the count equals the boards in the table`, simple.perAgent === 0 && simple.best.length >= 1 && simple.count === simple.boards, simple);
  await context.close();
}
await browser2.close();

// CR-46.1 / CR-42.1: the value tags are back in the default table, in two levels, and survive a narrowed table.
const browser3 = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }], ['mobile320', { width: 320, height: 844 }]]) {
  if (kind === 'mobile320' && theme === 'dark') continue;
  const tag = `${kind}_${theme}`, mobile = kind !== 'desktop';
  const context = await browser3.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await goto(page, `${BASE}/`);
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); localStorage.removeItem('mmc.settings.v9'); } catch {} }, theme);
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const tags = async () => page.evaluate(() => [...document.querySelectorAll('.bh-value-tag')].map((t) => { const tr = t.closest('tr'); const cell = t.closest('td').getBoundingClientRect(); const r = t.getBoundingClientRect(); return { model: tr.querySelector('td,th').innerText.split('\n')[0].replace(/^›/, ''), kind: t.getAttribute('data-kind'), level: t.getAttribute('data-level'), visible: r.width > 0 && r.height > 0, inside: r.left >= cell.left - 0.5 && r.right <= cell.right + 0.5, sr: t.querySelector('.sr-only')?.textContent ?? '', arrow: t.querySelector('[aria-hidden]')?.textContent }; }));
  let t = await tags();
  const sortHeader = await page.evaluate(() => document.querySelector('th[aria-sort="descending"]')?.innerText.replace(/\s+/g, ' ') ?? '');
  check(`${tag} CR-46.1 default score-sorted table shows value tags again (pricey and cheap, visible, inside the cost cell)`, /SCORE/i.test(sortHeader) && t.some((x) => x.kind === 'pricey') && t.some((x) => x.kind === 'cheap') && t.every((x) => x.visible && x.inside), { sortHeader, t: t.map((x) => [x.model, x.kind, x.level, x.inside]) });
  check(`${tag} CR-42.1 both levels render, told apart by arrow and screen-reader words, not colour alone`, t.some((x) => x.level === 'strong') && t.some((x) => x.level === 'weak') && t.every((x) => (x.level === 'strong' ? /^[↑↓]$/ : /^[↗↘]$/).test(x.arrow) && (x.level === 'strong' ? /^Notably/ : /^Slightly/).test(x.sr)), t.map((x) => [x.model, x.level, x.arrow, x.sr.slice(0, 40)]));
  await page.locator('td.bh-cost-cell .bh-value-tag').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: `${OUT}/${tag}-value-tags.png` }).catch(() => {});
  // narrow the table the way Florian can: raise the Simple score floor to 80
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('mmc.settings.v9') || '{}'); localStorage.setItem('mmc.settings.v9', JSON.stringify({ ...s, minScore: 80, minScoreTouched: true })); });
  await page.reload(); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
  const rowsShown = await page.evaluate(() => document.querySelectorAll('td.bh-cost-cell').length);
  t = await tags();
  check(`${tag} CR-46.1 a table narrowed to score ≥ 80 keeps its tags`, rowsShown > 0 && rowsShown < 20 && t.length >= 2 && t.some((x) => x.level === 'strong'), { rowsShown, t: t.map((x) => [x.model, x.kind, x.level]) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} value tags: no horizontal page overflow`, overflow <= 1, overflow);
  check(`${tag} value tags: no page errors`, errors.length === 0, errors.join(' | '));
  await page.evaluate(() => localStorage.removeItem('mmc.settings.v9'));
  await context.close();
}
await browser3.close();
await browser.close();

const failed = checks.filter((c) => !c.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision ?? null, runner: process.env.BH_RUNNER || 'claude-opus', at: new Date().toISOString(), passed: checks.length - failed.length, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.ok ? '' : ` — ${c.detail}`}`);
console.log(`${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);
