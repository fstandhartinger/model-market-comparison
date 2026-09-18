// Fable pass-23 follow-ups — F-122 (footnote → two sentences + a generated Legend), F-124 (a pin is
// not a version), F-125 (the org line that only repeats the model name).
//
// Per host, for 1440/390 × light/dark (4 contexts):
//   F-122  /benchmarks     visible footnote ≤ 2 sentences and ≤ 48 px; legend collapsed on load;
//                          opens on one click; has a line for every key of the tag set plus the
//                          marks; contains "Retired", "Changed at source", "Saturated", "Judged".
//   F-122  / (Simple)      the same, with the top/low line.
//   F-124  /benchmarks     no "74221fb" printed as a version anywhere on the page.
//   F-125  result page     "Union Alpha" appears once above the value, not "Union Alpha · Union Alpha".
//   F-124  result page     "Pinned revision 74221fb" once, and no "Version 74221FB" in the eyebrow.
// Usage: node verify-fable-pass23b.mjs <base> <out>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/opt/benchmarkheaven/state/ux-evidence/iter109/verify';
await fs.mkdir(OUT, { recursive: true });
const SEL = 'claude-fable-5.1::high,gpt-6-astra::default,union-alpha::default';
// The pinned board has no Union Alpha value — F-124's row needs models that are scored on it.
const PIN_SEL = 'glm-4.5v::non-reasoning,gemini-3.5-flash::high,mimo-v2.5-pro::default';
// The tag keys the full comparison must explain; read from the taxonomy so a new tag fails this too.
const taxonomy = JSON.parse(await fs.readFile(new URL('../../../data/benchmark-taxonomy.json', import.meta.url), 'utf8'));
const TAG_KEYS = Object.keys(taxonomy.tags);

const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
const results = { base: BASE, at: new Date().toISOString(), revision: null, checks: [] };
try { results.revision = (await (await fetch(`${BASE}/api/meta`)).json()).revision; } catch {}
const check = (name, ok, detail) => { results.checks.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${JSON.stringify(detail).slice(0, 240)}`); };

// The footnote's own sentence count: the visible <p>, not the legend inside the same wrapper.
const readFootnote = (el) => {
  const p = el.querySelector('p');
  const text = (p?.innerText ?? '').replace(/\s+/g, ' ').trim();
  const r = p?.getBoundingClientRect();
  const lh = p ? parseFloat(getComputedStyle(p).lineHeight) : NaN;
  return { text, height: r ? Math.round(r.height) : null,
    lines: r && Number.isFinite(lh) && lh > 0 ? Math.round(r.height / lh) : null,
    sentences: text ? text.split(/(?<=[.!?])\s+/).filter((s) => /\w/.test(s)).length : 0 };
};
const readLegend = (el) => {
  const d = el.querySelector('details[data-bh-table-legend]');
  if (!d) return null;
  return { open: d.open, summary: d.querySelector('summary')?.innerText.trim() ?? '',
    entries: [...d.querySelectorAll('[data-bh-legend-entry]')].map((x) => x.getAttribute('data-bh-legend-entry')),
    text: (d.textContent ?? '').replace(/\s+/g, ' ').trim() };
};

for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const mobile = kind === 'mobile';
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const tag = `${kind}_${theme}`; const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  const settle = async () => {
    await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    await p.waitForFunction(() => !document.querySelector('.bh-deferred'), null, { timeout: 90000 }).catch(() => {});
    await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1200);
  };

  // ---- /benchmarks: the full comparison's footnote and legend
  await p.goto(`${BASE}/benchmarks?rows=all&models=${encodeURIComponent(SEL)}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle();
  const foot = await p.evaluate(({ read }) => {
    const el = [...document.querySelectorAll('main div.bh-muted')].find((x) => x.querySelector('details[data-bh-table-legend]'));
    return el ? eval(`(${read})`)(el) : null;
  }, { read: readFootnote.toString() });
  const leg = await p.evaluate(({ read }) => {
    const el = [...document.querySelectorAll('main div.bh-muted')].find((x) => x.querySelector('details[data-bh-table-legend]'));
    return el ? eval(`(${read})`)(el) : null;
  }, { read: readLegend.toString() });
  check(`${tag}: /benchmarks footnote is at most two sentences`, foot && foot.sentences > 0 && foot.sentences <= 2, foot);
  check(`${tag}: /benchmarks footnote is at most 48 px tall`, foot && foot.height != null && foot.height <= 48, { height: foot?.height });
  check(`${tag}: /benchmarks legend is collapsed on load`, leg && leg.open === false, { open: leg?.open, summary: leg?.summary });
  const wanted = ['best-of', 'self-reported', 'preliminary', 'missing', ...TAG_KEYS, 'category'];
  const missing = leg ? wanted.filter((k) => !leg.entries.includes(k)) : wanted;
  check(`${tag}: /benchmarks legend has a line per mark and per tag`, missing.length === 0, { missing, entries: leg?.entries?.length });
  // Open it once and read the words a phone reader could not reach before.
  await p.locator('details[data-bh-table-legend] summary').first().click();
  await p.waitForTimeout(300);
  const opened = await p.evaluate(() => { const d = document.querySelector('main details[data-bh-table-legend]'); return { open: d?.open, text: d?.innerText.replace(/\s+/g, ' ') ?? '' }; });
  const words = ['Retired', 'Changed at source', 'Saturated', 'Judged', '‡', '†'];
  const absent = words.filter((w) => !opened.text.includes(w));
  check(`${tag}: /benchmarks legend opens and explains every mark`, opened.open === true && absent.length === 0, { open: opened.open, absent });
  check(`${tag}: /benchmarks has no page error`, errors.length === 0, errors);
  await p.screenshot({ path: `${OUT}/${tag}-benchmarks-legend.png`, fullPage: false }).catch(() => {});

  // ---- F-124 on the table. The pinned board (aa-terminal-bench-hard::74221fb) has no Union Alpha
  // value, so it needs its own model selection — checking the previous page would have passed
  // vacuously, on a row that was never rendered.
  await p.goto(`${BASE}/benchmarks?rows=all&models=${encodeURIComponent(PIN_SEL)}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle();
  const pinRow = await p.evaluate(() => {
    const th = [...document.querySelectorAll('main table th')].find((x) => /Terminal-Bench Hard/.test(x.textContent ?? ''));
    if (!th) return null;
    const titles = [...th.querySelectorAll('[title]')].map((x) => x.getAttribute('title') ?? '');
    return { text: (th.textContent ?? '').replace(/\s+/g, ' ').trim(), titles, sub: th.querySelector('.bh-matrix-sub')?.textContent ?? null };
  });
  const pinBody = await p.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ') ?? '');
  check(`${tag}: the pinned board is actually on the page`, !!pinRow, { found: !!pinRow });
  check(`${tag}: /benchmarks prints no pin as a version`,
    !!pinRow && !/74221fb/i.test(pinRow.text) && !pinRow.titles.some((t) => /74221fb/i.test(t)) && !/74221fb/i.test(pinBody),
    { sub: pinRow?.sub, hit: (pinBody.match(/.{0,30}74221fb.{0,20}/i) ?? [])[0] ?? null,
      titleHit: pinRow?.titles.find((t) => /74221fb/i.test(t)) ?? null });

  // ---- / (Simple): the same footnote treatment, plus the top/low line
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle();
  const sFoot = await p.evaluate(({ read }) => {
    const el = [...document.querySelectorAll('main div.bh-muted')].find((x) => x.querySelector('details[data-bh-table-legend]'));
    return el ? eval(`(${read})`)(el) : null;
  }, { read: readFootnote.toString() });
  const sLeg = await p.evaluate(({ read }) => {
    const el = [...document.querySelectorAll('main div.bh-muted')].find((x) => x.querySelector('details[data-bh-table-legend]'));
    return el ? eval(`(${read})`)(el) : null;
  }, { read: readLegend.toString() });
  check(`${tag}: Simple footnote is at most two sentences`, sFoot && sFoot.sentences > 0 && sFoot.sentences <= 2, sFoot);
  check(`${tag}: Simple footnote is at most 48 px tall`, sFoot && sFoot.height != null && sFoot.height <= 48, { height: sFoot?.height });
  check(`${tag}: Simple legend is collapsed and lists the caveat tags and top/low`,
    sLeg && sLeg.open === false && ['outlier', 'retired', 'saturated', 'judged', 'source_changed'].every((k) => sLeg.entries.includes(k)),
    { open: sLeg?.open, entries: sLeg?.entries });

  // ---- /compare: the third footnote F-122 shortened
  await p.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle();
  const cFoot = await p.evaluate(({ read }) => {
    const el = [...document.querySelectorAll('#full-comparison div.bh-muted')].find((x) => x.querySelector('details[data-bh-table-legend]'));
    return el ? eval(`(${read})`)(el) : null;
  }, { read: readFootnote.toString() });
  const cLeg = await p.evaluate(({ read }) => {
    const el = [...document.querySelectorAll('#full-comparison div.bh-muted')].find((x) => x.querySelector('details[data-bh-table-legend]'));
    return el ? eval(`(${read})`)(el) : null;
  }, { read: readLegend.toString() });
  check(`${tag}: Compare caption is at most two sentences`, cFoot && cFoot.sentences > 0 && cFoot.sentences <= 2, cFoot);
  check(`${tag}: Compare caption is at most three lines`, cFoot && cFoot.lines != null && cFoot.lines <= 3, { height: cFoot?.height, lines: cFoot?.lines });
  check(`${tag}: Compare legend is collapsed and explains ‡, the percentile bar and significance`,
    cLeg && cLeg.open === false && ['best-of-variants', 'preliminary', 'percentile', 'significance'].every((k) => cLeg.entries.includes(k))
      && /never enters a score or a ranking/.test(cLeg.text) && /not evidence of significance/.test(cLeg.text),
    { open: cLeg?.open, entries: cLeg?.entries });

  // ---- the result detail page: F-124's "Pinned revision", F-125's single org line
  await p.goto(`${BASE}/benchmarks/result?axis=${encodeURIComponent('aa-terminal-bench-hard::74221fb@@Published%20board@@fraction')}&model=${encodeURIComponent('glm-4.5v::non-reasoning')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle();
  const detail = await p.evaluate(() => ({
    eyebrow: document.querySelector('main .bh-eyebrow')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
    text: document.querySelector('main')?.innerText.replace(/\s+/g, ' ') ?? '',
  }));
  check(`${tag}: the pin is named once, as a pinned revision`,
    /Pinned revision 74221fb/.test(detail.text) && (detail.text.match(/74221fb/gi) ?? []).length === 1 && !/74221fb/i.test(detail.eyebrow),
    { eyebrow: detail.eyebrow, hits: (detail.text.match(/.{0,20}74221fb.{0,10}/gi) ?? []) });

  await p.goto(`${BASE}/benchmarks/result?axis=${encodeURIComponent('aa-terminal-bench::4.0@@Published%20board@@fraction')}&model=${encodeURIComponent('union-alpha::default')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await settle();
  const ua = await p.evaluate(() => ({
    head: document.querySelector('#bh-result-model')?.innerText.replace(/\s+/g, ' ').trim() ?? '',
    text: document.querySelector('main')?.innerText.replace(/\s+/g, ' ') ?? '',
  }));
  check(`${tag}: the org line is dropped when it repeats the model name`,
    ua.head === 'Union Alpha' && !/Union Alpha · Union Alpha/.test(ua.text), ua);
  await p.screenshot({ path: `${OUT}/${tag}-result-union-alpha.png`, fullPage: false }).catch(() => {});
  await c.close();
}
await b.close();
const pass = results.checks.filter((c) => c.ok).length;
results.summary = `${pass}/${results.checks.length}`;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(results, null, 1));
console.log(`SUMMARY ${results.summary} at ${results.revision} (${BASE})`);
process.exit(pass === results.checks.length ? 0 : 1);
