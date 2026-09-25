// Live verifier for Fable pass 34 — for a non-Fable engine to run on both hosts. Groups follow the directives; ONLY=<F-nnn> runs one group.
// Usage: node verify-fable-pass34-design.mjs <base> <outDir>   (exit code 1 on any failed check in the groups run)
//   F-176 (b, shipped by Fable): on /jev-models the capability suite has no "three.js … is included" sentence; the Credit disclosure carries "3D view: three.js".
//   F-181 (shipped by Fable): no rendered text below 10 px inside the cost axis and the context axis rows.
//   F-186 (shipped by Fable): the Vertex cost modal on /models/claude-fable-5.1::max has no horizontal overflow at 390 and still shows the full SHA-256.
//   F-180: on /jev-models the "Context limits by system" table is inside a closed disclosure and the page has ≤ 1 "Basis, training and serving notes" summary.
//   F-182: the hub's visible text (outside <code> formulas) has no "long_policy", "max_seq_len" or "usage.input_tokens".
//   F-183: on /jev-models/jevk5-v02 the sentence "hash-checked" is absent and no H2 reads "Accuracy per tier, incl. sealed".
//   F-184: in "Capability with cost alongside" at 1440 every row has the same height (± 2 px).
//   F-185: the input-length chart's x axis has no bucket that is empty for every plotted system, and points from fewer than 20 items are marked hollow (data-bh-thin).
//   F-188: /jev-models/alternatives has the hub's column header line ("Intel." … "$/1k dec.") above its bars; /jev-models/how-to-choose has no "/ 100 benchmark score".
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass34';
const ONLY = process.env.ONLY || '';
await fs.mkdir(OUT, { recursive: true });
const results = []; let failed = 0;
const check = (group, name, ok, detail) => { results.push({ group, name, ok: !!ok, detail }); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'} [${group}] ${name}${ok ? '' : ' ' + JSON.stringify(detail).slice(0, 300)}`); };
const want = (g) => !ONLY || ONLY === g;
const txt = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const scrollThrough = async (p) => { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } window.scrollTo(0, 0); }); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500); };
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const b = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await scrollThrough(p); };
  if (['F-176', 'F-181', 'F-180', 'F-182', 'F-184', 'F-185'].some(want)) {
    await go('/jev-models');
    const hub = await p.evaluate(() => {
      const t = (el) => (el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '');
      const suite = document.querySelector('[data-bh-jev14-capability-suite]');
      const credit = document.querySelector('#credit');
      const small = (root) => [...root.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width > 1).map((e) => ({ px: parseFloat(getComputedStyle(e).fontSize), t: t(e).slice(0, 30) })).filter((x) => x.px < 10);
      const costAxis = document.querySelector('[data-bh-jev14-cost-axis]');
      const ctxAxis = document.querySelector('ol[aria-label="Published context limits by system"]')?.previousElementSibling;
      const notes = [...document.querySelectorAll('summary')].filter((s) => /Basis, training and serving notes/.test(t(s))).length;
      const ctxPanel = [...document.querySelectorAll('h2, h3, summary')].find((e) => /Context limits by system/.test(t(e)));
      // The panel keeps its title line; the table itself is the disclosure ("All N limits as a table").
      const ctxTableEl = [...document.querySelectorAll('table')].find((el) => el.querySelectorAll('tbody tr').length > 20 && /Maximum input context/.test(String(el.textContent || '')));
      const ctxTable = ctxTableEl ? ctxTableEl.closest('details') : null;
      const ctxTableSummary = ctxTable ? t(ctxTable.querySelector(':scope > summary')) : null;
      const bodyText = [...document.querySelectorAll('main *')].filter((e) => !e.closest('code, pre, script, style') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' ');
      const fieldNames = ['long_policy', 'max_seq_len', 'usage.input_tokens'].filter((w) => bodyText.includes(w));
      const capRows = [...document.querySelectorAll('[data-bh-jev14-capability-row]')].map((r) => Math.round(r.getBoundingClientRect().height));
      const acc = [...document.querySelectorAll('h3')].find((e) => /Public accuracy by actual input length/.test(t(e)));
      const accSec = acc && acc.closest('section, div');
      const accSvg = accSec && accSec.querySelector('svg');
      const buckets = accSvg ? [...accSvg.querySelectorAll('text')].map((x) => t(x)).filter((x) => /k|M/.test(x) && x.length < 10) : [];
      const titles = accSvg ? [...accSvg.querySelectorAll('title')].map((x) => t(x)) : [];
      const usedBuckets = new Set(titles.map((x) => (x.match(/· ([^:]+) tokens:/) || [])[1]).filter(Boolean));
      const thin = titles.filter((x) => { const m = x.match(/\((\d+)\/(\d+)\)/); return m && Number(m[2]) < 20; }).length;
      const thinMarked = accSvg ? accSvg.querySelectorAll('[data-bh-thin]').length : 0;
      return { capability3d: !!document.querySelector('[data-bh-jev14-capability-3d]'), smallSuite: suite ? small(suite) : null, suiteText: suite ? t(suite) : null, creditText: credit ? String(credit.textContent || '').replace(/\s+/g, ' ').trim() : null, smallCost: costAxis ? small(costAxis) : null, smallCtx: ctxAxis ? small(ctxAxis) : null, notes, ctxTableClosed: ctxTable ? !ctxTable.open : false, ctxTableFound: !!ctxPanel && !!ctxTableEl, ctxTableSummary, fieldNames, capRows, buckets, usedBuckets: [...usedBuckets], thin, thinMarked };
    });
    if (want('F-176')) {
      check('F-176', `${tag} (b) capability suite present`, !!hub.suiteText, {});
      check('F-176', `${tag} (b) no licence sentence beside the chart`, hub.suiteText && !/three\.js r\d+ is included/i.test(hub.suiteText), { hit: (hub.suiteText || '').match(/three\.js[^.]*\./)?.[0] });
      check('F-176', `${tag} (b) Credit names three.js`, hub.creditText && /3D view: three\.js/.test(hub.creditText), { credit: (hub.creditText || '').slice(0, 120) });
    }
    if (want('F-181')) {
      // 2026-09-25, iteration 230: this group read `small: null` in all four contexts on both hosts for
      // days. That was never a finding about type size — CR-158 made the hub render the capability suite
      // 3D-only, so `[data-bh-jev14-cost-axis]` is not on this page at all and the old check could not
      // pass. The directive is about the 10 px tick floor, not about the hub, so the floor is now checked
      // where those ticks actually render — the pinned version page, below — and the hub gets a check of
      // its own instead of a hole: the suite is the 3D view CR-158 asks for, and none of its text is
      // under 10 px. Stricter than before; do not relax it back to "absent counts as pass".
      check('F-181', `${tag} hub capability suite is CR-158's 3D-only view`, hub.capability3d === true && hub.smallCost === null, { threeD: hub.capability3d, costAxisOnHub: hub.smallCost });
      check('F-181', `${tag} hub capability suite has no text under 10 px`, hub.smallSuite && hub.smallSuite.length === 0, { small: hub.smallSuite });
      check('F-181', `${tag} context axis has no text under 10 px`, hub.smallCtx && hub.smallCtx.length === 0, { small: hub.smallCtx });
    }
    if (want('F-180')) {
      check('F-180', `${tag} context table is behind a closed disclosure`, hub.ctxTableFound && hub.ctxTableClosed && /limits as a table/.test(hub.ctxTableSummary || ''), { found: hub.ctxTableFound, closed: hub.ctxTableClosed, summary: hub.ctxTableSummary });
      check('F-180', `${tag} at most one row-notes disclosure`, hub.notes <= 1, { notes: hub.notes });
    }
    if (want('F-182')) check('F-182', `${tag} no field name as copy`, hub.fieldNames.length === 0, { fieldNames: hub.fieldNames });
    if (want('F-184') && !mobile) check('F-184', `${tag} capability rows share one height`, hub.capRows.length > 5 && Math.max(...hub.capRows) - Math.min(...hub.capRows) <= 2, { rows: hub.capRows });
    if (want('F-185')) {
      const empty = hub.buckets.filter((bk) => !hub.usedBuckets.some((u) => u === bk));
      check('F-185', `${tag} no empty bucket on the input-length axis`, hub.buckets.length > 0 && empty.length === 0, { buckets: hub.buckets, used: hub.usedBuckets, empty });
      check('F-185', `${tag} thin points are marked`, hub.thin === hub.thinMarked, { thin: hub.thin, marked: hub.thinMarked });
    }
    await p.screenshot({ path: `${OUT}/${tag}-hub.png` });
    if (want('F-181')) {
      // The cost axis lives on the pinned version pages since CR-158 (components/JevCapabilityChart.tsx
      // renders it only outside `only3d`). This is where F-181's 10 px floor is now proven.
      await go('/jev-models/v1.4.2');
      const pinned = await p.evaluate(() => {
        const ax = document.querySelector('[data-bh-jev14-cost-axis]');
        if (!ax) return { found: false, small: null };
        const small = [...ax.querySelectorAll('*')]
          .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width > 1)
          .map((e) => ({ px: parseFloat(getComputedStyle(e).fontSize), t: String(e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30) }));
        return { found: true, n: small.length, min: small.length ? Math.min(...small.map((x) => x.px)) : null, small: small.filter((x) => x.px < 10) };
      });
      check('F-181', `${tag} pinned v1.4.2 still renders the cost axis`, pinned.found && pinned.n > 0, pinned);
      check('F-181', `${tag} pinned v1.4.2 cost axis has no text under 10 px`, pinned.found && pinned.small.length === 0, pinned);
      await p.screenshot({ path: `${OUT}/${tag}-pinned-cost-axis.png` });
    }
  }
  if (want('F-183')) {
    await go('/jev-models/jevk5-v02');
    const leaf = await p.evaluate(() => { const t = (el) => (el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : ''); return { hash: /hash-checked|name-only/.test(t(document.querySelector('main'))), h2: [...document.querySelectorAll('main h2')].map(t) }; });
    check('F-183', `${tag} no provenance paragraph above the hero`, !leaf.hash, {});
    check('F-183', `${tag} no H2 named after one of its radars`, !leaf.h2.includes('Accuracy per tier, incl. sealed'), { h2: leaf.h2 });
  }
  if (want('F-186')) {
    await go('/models/claude-fable-5.1::max');
    const opened = await p.evaluate(() => { const b = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find((x) => /Google Vertex AI \/ Google Vertex AI/.test(x.getAttribute('aria-label') || '')); if (!b) return false; b.click(); return true; });
    await p.waitForTimeout(1200);
    const modal = await p.evaluate(() => { const d = document.querySelector('dialog[open]') || [...document.querySelectorAll('[role=dialog]')].find((x) => x.querySelector('[data-testid="cost-sources"]')); if (!d) return null; const over = [...d.querySelectorAll('*')].concat([d]).filter((e) => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).map((e) => ({ tag: e.tagName, sw: e.scrollWidth, cw: e.clientWidth })); return { over, sha: /SHA-256 [0-9a-f]{64}/.test(d.textContent || ''), w: d.getBoundingClientRect().width }; });
    check('F-186', `${tag} cost modal opened`, opened && modal, {});
    check('F-186', `${tag} modal has no horizontal scroll container`, modal && modal.over.length === 0, { over: modal?.over });
    check('F-186', `${tag} full SHA-256 still shown`, modal && modal.sha, {});
    await p.screenshot({ path: `${OUT}/${tag}-cost-modal.png` });
  }
  if (want('F-188')) {
    await go('/jev-models/alternatives');
    const alt = await p.evaluate(() => { const t = (el) => (el ? String(el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : ''); const list = document.querySelector('[data-bh-jev-alternatives-bars]'); const head = list && list.previousElementSibling; return { head: t(head), listRows: list ? list.children.length : 0 }; });
    check('F-188', `${tag} alternatives bars carry the hub's header line`, /Intel\./.test(alt.head) && /\$\/1k dec\./.test(alt.head), { head: alt.head.slice(0, 100) });
    await go('/jev-models/how-to-choose');
    const choose = await p.evaluate(() => (document.querySelector('main')?.innerText || '').includes('/ 100 benchmark score'));
    check('F-188', `${tag} chooser has no "/ 100 benchmark score"`, !choose, {});
  }
  check('errors', `${tag} no page errors`, errs.length === 0, { errs });
  await c.close(); await b.close();
}
await fs.writeFile(`${OUT}/verification${ONLY ? '-' + ONLY : ''}.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), pass: results.filter((r) => r.ok).length, fail: failed, results }, null, 1));
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
