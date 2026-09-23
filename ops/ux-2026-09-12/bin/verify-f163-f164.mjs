// Live verifier for F-163 and F-164 (Fable pass 31 directives, implemented in iteration 177) — for a
// non-implementing engine to run on both hosts. Usage:
//   node verify-f163-f164.mjs <base> <outDir>
//
// Nothing is pinned. Every expected number is re-derived here from the host's own
// /api/benchmark-view payload with this file's own implementation of the two rules the page uses:
//   * which row a cell shows  — measured beats a developer's claim beats a preliminary figure,
//     then the newest date, then the lower id;
//   * whether a row is placeable — a percentile needs at least two measured peers and a range.
// So a wrong number on the page cannot fold into a right one here, and the script can be copied
// anywhere: it never reads the repository.
//
//   F-164: the status line qualifies its row count with the totals ("23 of 67 values are …"), and a
//          paragraph under it carries one clause per model whose values are the developer's own (†)
//          or announced, chart-read figures (‡): "<name>: <n> of <total> …". Every n and total must
//          equal the re-derived counts, the mark must match the basis, a measured-only selection
//          must carry neither, and the live region must stay within three lines at 390 px.
//   F-163: a selected model with no placeable measured result in any topic is named once under the
//          snapshot intro and appears in no card; inside a card, a model with nothing in that topic
//          is one muted line with no progress bar; a card line that does have an average states the
//          re-derived "n of m measured".
// Plus: no page errors, no horizontal overflow, at 1440 and 390 px in light and dark.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/tmp/f163-f164-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail ?? null).slice(0, 400)}`); };

// The claim rows the page has to explain: two launch-day models whose vendor numbers are carried as
// claims, and one whose only values are chart-read. Any selection with the same shape would do.
const CLAIMS_PICKS = ['claude-opus-5.5::max', 'gpt-6-sol::max', 'union-alpha::default'];

const api = async (path) => { const r = await fetch(`${BASE}${path}`); if (!r.ok) throw new Error(`${path} → ${r.status}`); return r.json(); };
const viewOf = (picks) => api(`/api/benchmark-view?${picks.map((id) => `model=${encodeURIComponent(id)}`).join('&')}&collapse=1`);

/** The page's own row choice, re-implemented: basis tier, then newest, then lowest id. */
const tier = (r) => (r.basis === 'measured' ? 2 : r.basis === 'preliminary' ? 0 : 1);
function shownRow(axis, modelId) {
  let best = null;
  for (const r of axis.scores) {
    if (r.modelId !== modelId) continue;
    if (!best || tier(r) > tier(best) || (tier(r) === tier(best) && (r.date > best.date || (r.date === best.date && r.id < best.id)))) best = r;
  }
  return best;
}
/** Measured-only choice — what the snapshot cards average. */
function shownMeasured(axis, modelId) {
  let best = null;
  for (const r of axis.scores) {
    if (r.modelId !== modelId || r.basis !== 'measured') continue;
    if (!best || r.date > best.date || (r.date === best.date && r.id < best.id)) best = r;
  }
  return best;
}
const placeable = (row, axis) => {
  if (!row || row.lowSample) return false;
  const s = axis.stats;
  return Number.isFinite(row.value) && s && s.n >= 2 && s.min !== s.max && axis.higherBetter != null;
};

/** Everything the two surfaces are generated from, derived from the payload alone. */
function expected(view, picks) {
  const ids = picks.filter((id) => view.models.some((m) => m.id === id));
  const visible = view.axes.filter((a) => a.scores.some((r) => r.modelId && ids.includes(r.modelId)));
  const byId = new Map(view.models.map((m) => [m.id, m]));
  const models = ids.map((id) => {
    const rows = visible.map((a) => shownRow(a, id)).filter(Boolean);
    const topics = new Map();
    for (const a of visible) {
      const t = topics.get(a.category) ?? { axes: 0, measured: 0 };
      t.axes += 1;
      if (placeable(shownMeasured(a, id), a)) t.measured += 1;
      topics.set(a.category, t);
    }
    return { id, name: byId.get(id)?.name ?? id, org: byId.get(id)?.org ?? null,
      total: rows.length,
      selfReported: rows.filter((r) => r.basis === 'self_reported').length,
      preliminary: rows.filter((r) => r.basis === 'preliminary').length,
      measuredAnywhere: [...topics.values()].reduce((n, t) => n + t.measured, 0),
      topics: [...topics].map(([name, t]) => ({ name, ...t })) };
  });
  return { ids, visibleAxes: visible.length, models };
}

const readCompare = () => {
  const text = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
  const main = document.querySelector('main');
  const status = main.querySelector('[role="status"]');
  const claims = main.querySelector('[data-bh-compare-claims]');
  const claimsInStatus = !!(status && status.querySelector('[data-bh-compare-claims]'));
  const statusBox = status ? status.getBoundingClientRect() : null;
  const section = [...main.querySelectorAll('section')].find((s) => s.getAttribute('aria-label') === 'Benchmark category snapshots');
  const notice = section ? section.querySelector('[data-bh-snapshot-unmeasured]') : null;
  const cards = section ? [...section.querySelectorAll('article')].map((article) => ({
    topic: text(article.querySelector('h3')),
    heading: text(article.querySelector('h3 + span, .bh-muted')),
    rows: [...article.querySelectorAll('li')].map((li) => ({
      none: li.hasAttribute('data-bh-snapshot-none'),
      text: text(li),
      bars: li.querySelectorAll('[role="progressbar"]').length,
    })),
  })) : [];
  return {
    statusText: text(status),
    claimsText: text(claims),
    claimsInStatus,
    hasClaims: !!claims,
    statusHeight: statusBox ? statusBox.height : null,
    statusLineHeight: status ? parseFloat(getComputedStyle(status).lineHeight) : null,
    // The element is padded; lines are what is left once the padding is taken off.
    statusLines: status ? Math.round((statusBox.height - parseFloat(getComputedStyle(status).paddingTop) - parseFloat(getComputedStyle(status).paddingBottom)) / parseFloat(getComputedStyle(status).lineHeight)) : null,
    noticeText: text(notice),
    hasNotice: !!notice,
    emptyBox: section ? !!section.querySelector('.bh-empty') : null,
    cards,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const goto = async (page, url) => { for (let a = 1; ; a++) { try { return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch (e) { if (a >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); } } };
const open = async (context, url) => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await goto(page, url);
  await page.waitForSelector('main [role="status"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  return { page, errors };
};

const meta = await api('/api/meta');
console.log('base', BASE, 'revision', meta.revision, 'generated_at', meta.generated_at);

const claimsView = await viewOf(CLAIMS_PICKS);
const exp = expected(claimsView, CLAIMS_PICKS);
check('setup: the claim selection resolves and has both bases to explain',
  exp.ids.length === CLAIMS_PICKS.length && exp.models.some((m) => m.selfReported > 0) && exp.models.some((m) => m.preliminary > 0),
  exp.models.map((m) => ({ id: m.id, total: m.total, self: m.selfReported, prel: m.preliminary, measured: m.measuredAnywhere })));

// A selection whose models have no claim at all — the page must then say nothing about claims. The
// two models are found in the host's own family list, so the negative case survives any ingest.
let measuredPicks = [];
for (const family of (claimsView.families ?? []).filter((f) => f.current).slice(0, 40)) {
  if (CLAIMS_PICKS.includes(family.id)) continue;
  const v = await viewOf([family.id]).catch(() => null);
  if (!v) continue;
  const m = expected(v, [family.id]).models[0];
  if (m && m.total >= 5 && !m.selfReported && !m.preliminary && m.measuredAnywhere > 0) measuredPicks.push(family.id);
  if (measuredPicks.length === 2) break;
}
if (measuredPicks.length !== 2) measuredPicks = null;
check('setup: two measured-only models found for the negative case', !!measuredPicks && measuredPicks.length === 2, measuredPicks);

const CONTEXTS = [
  { name: 'desktop_light', width: 1440, height: 1000, scheme: 'light' },
  { name: 'desktop_dark', width: 1440, height: 1000, scheme: 'dark' },
  { name: 'mobile_light', width: 390, height: 844, scheme: 'light' },
  { name: 'mobile_dark', width: 390, height: 844, scheme: 'dark' },
];
const claimsUrl = `${BASE}/compare?${CLAIMS_PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&')}`;

for (const ctx of CONTEXTS) {
  const context = await b.newContext({ viewport: { width: ctx.width, height: ctx.height }, colorScheme: ctx.scheme, deviceScaleFactor: 1 });
  const { page, errors } = await open(context, claimsUrl);
  const dom = await page.evaluate(readCompare);
  await page.screenshot({ path: `${OUT}/${ctx.name}-compare-claims.png`, fullPage: false });
  await fs.writeFile(`${OUT}/${ctx.name}-dom.json`, JSON.stringify(dom, null, 1));

  // ---- F-164 -------------------------------------------------------------------------------
  const claimModels = exp.models.filter((m) => m.selfReported || m.preliminary);
  check(`${ctx.name}: F-164 the per-model claim sentence is on the page`, dom.hasClaims, dom.statusText);
  const claimTotals = exp.models.reduce((acc, m) => ({ n: acc.n + m.selfReported + m.preliminary, total: acc.total + m.total }), { n: 0, total: 0 });
  check(`${ctx.name}: F-164 the status line qualifies its row count with ${claimTotals.n} of ${claimTotals.total} values`,
    (dom.statusText || '').includes(`${claimTotals.n} of ${claimTotals.total} value`), dom.statusText);
  for (const m of claimModels) {
    const n = m.selfReported || m.preliminary;
    const clause = (dom.claimsText || '').split(' · ').find((c) => c.startsWith(`${m.name}:`));
    const counts = clause && clause.match(/(\d+) of (\d+)/);
    check(`${ctx.name}: F-164 ${m.name} states ${n} of ${m.total}`,
      !!counts && Number(counts[1]) === n && Number(counts[2]) === m.total, { clause, expected: `${n} of ${m.total}` });
    if (m.selfReported && m.org) check(`${ctx.name}: F-164 ${m.name} names ${m.org} and marks the claim †`,
      !!clause && clause.includes(m.org) && (clause.includes('†') || /’s$/.test(clause.trim())), clause);
    if (m.preliminary && !m.selfReported) check(`${ctx.name}: F-164 ${m.name} marks its announced figures ‡`,
      !!clause && clause.includes('‡') && /announced/.test(clause), clause);
  }
  for (const m of exp.models.filter((x) => !x.selfReported && !x.preliminary)) {
    check(`${ctx.name}: F-164 the measured-only model ${m.name} is not mentioned`, !(dom.claimsText || '').includes(m.name), dom.claimsText);
  }
  check(`${ctx.name}: F-164 the row count is the axis count the view returns`,
    (dom.statusText || '').includes(`${exp.visibleAxes} evaluation rows`) || (exp.visibleAxes === 1 && (dom.statusText || '').includes('1 evaluation row')),
    { expected: exp.visibleAxes, statusText: dom.statusText });
  check(`${ctx.name}: F-164 the live region stays short — the clauses are not inside it`, !dom.claimsInStatus, dom.statusText);
  if (ctx.width === 390) check(`${ctx.name}: F-164 the status line stays within three lines`,
    dom.statusLines != null && dom.statusLines <= 3,
    { lines: dom.statusLines, height: dom.statusHeight, lineHeight: dom.statusLineHeight });

  // ---- F-163 -------------------------------------------------------------------------------
  const unmeasured = exp.models.filter((m) => !m.measuredAnywhere);
  const measuredSomewhere = exp.models.filter((m) => m.measuredAnywhere);
  check(`${ctx.name}: F-163 the notice is present exactly when a selected model has nothing measured`,
    dom.hasNotice === unmeasured.length > 0, { hasNotice: dom.hasNotice, unmeasured: unmeasured.map((m) => m.id) });
  for (const m of unmeasured) {
    check(`${ctx.name}: F-163 the notice names ${m.name}`, (dom.noticeText || '').includes(m.name), dom.noticeText);
    const listed = dom.cards.filter((card) => card.rows.some((r) => r.text && r.text.includes(m.name)));
    check(`${ctx.name}: F-163 ${m.name} is in no snapshot card`, listed.length === 0, listed.map((c) => c.topic));
  }
  for (const m of measuredSomewhere) {
    check(`${ctx.name}: F-163 ${m.name} keeps its cards`, !(dom.noticeText || '').includes(m.name), dom.noticeText);
  }
  // Every card row without an average is one muted line and draws no bar; every row with one states
  // the re-derived count for that topic.
  let noneRows = 0, checkedCounts = 0, badCounts = [];
  for (const card of dom.cards) {
    for (const row of card.rows) {
      if (row.none) {
        noneRows += 1;
        if (row.bars !== 0 || !/No measured result in this topic/.test(row.text || '')) badCounts.push({ topic: card.topic, row });
        continue;
      }
      const model = measuredSomewhere.find((m) => row.text && row.text.startsWith(m.name));
      const topic = model && model.topics.find((t) => t.name === card.topic);
      if (!model || !topic) continue;
      checkedCounts += 1;
      const stated = (row.text.match(/(\d+) of (\d+) benchmarks? measured/) || []).slice(1).map(Number);
      if (stated.length !== 2 || stated[0] !== topic.measured || stated[1] !== topic.axes) badCounts.push({ topic: card.topic, model: model.id, stated, expected: [topic.measured, topic.axes] });
    }
  }
  check(`${ctx.name}: F-163 every card row is consistent with the view (${checkedCounts} counted, ${noneRows} muted)`, badCounts.length === 0, badCounts.slice(0, 5));
  check(`${ctx.name}: F-163 a muted line never draws a bar`, dom.cards.every((c) => c.rows.every((r) => !r.none || r.bars === 0)), null);

  check(`${ctx.name}: no horizontal overflow`, dom.overflow <= 1, dom.overflow);
  check(`${ctx.name}: no page errors`, errors.length === 0, errors.slice(0, 5));
  await context.close();
}

// The negative case: a selection with no claim carries no claim sentence.
if (measuredPicks) {
  const context = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const { page, errors } = await open(context, `${BASE}/compare?${measuredPicks.map((id) => `model=${encodeURIComponent(id)}`).join('&')}`);
  const dom = await page.evaluate(readCompare);
  await page.screenshot({ path: `${OUT}/desktop_light-compare-measured-only.png` });
  await fs.writeFile(`${OUT}/measured-only-dom.json`, JSON.stringify({ picks: measuredPicks, ...dom }, null, 1));
  check('F-164 a measured-only comparison carries no claim sentence', !dom.hasClaims, dom.statusText);
  check('F-164 a measured-only status line says nothing about claims', !/value(s)? are|\u2020|\u2021/.test(dom.statusText || ''), dom.statusText);
  check('F-163 a measured-only comparison carries no unmeasured notice', !dom.hasNotice, dom.noticeText);
  check('measured-only: no page errors', errors.length === 0, errors.slice(0, 5));
  await context.close();
}

// F-163 (c): a selection whose only model has nothing measured renders the line and no cards.
const soloId = exp.models.find((m) => !m.measuredAnywhere)?.id;
if (soloId) {
  const context = await b.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const { page, errors } = await open(context, `${BASE}/compare?model=${encodeURIComponent(soloId)}`);
  const dom = await page.evaluate(readCompare);
  await page.screenshot({ path: `${OUT}/desktop_light-compare-unmeasured-only.png` });
  await fs.writeFile(`${OUT}/unmeasured-only-dom.json`, JSON.stringify({ pick: soloId, ...dom }, null, 1));
  check('F-163 a selection with nothing measured shows the line and no cards', dom.hasNotice && dom.cards.length === 0, { notice: dom.noticeText, cards: dom.cards.length });
  check('F-163 that section does not also show the empty-state box', dom.emptyBox === false, dom.emptyBox);
  check('unmeasured-only: no page errors', errors.length === 0, errors.slice(0, 5));
  await context.close();
}

await b.close();
const pass = results.filter((r) => r.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, generated_at: meta.generated_at, at: new Date().toISOString(), picks: CLAIMS_PICKS, measuredPicks, expected: exp, pass, total: results.length, results }, null, 1));
console.log(`\n${pass}/${results.length} checks passed · ${OUT}`);
process.exit(pass === results.length ? 0 : 1);
