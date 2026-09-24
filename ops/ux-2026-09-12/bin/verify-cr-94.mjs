// CR-94 verification (2026-09-19): the two-system radars on /jev-models (score axes + subject topics) and the rewritten
// latency limitation. Radar numbers must equal the table / the topic artifact; default pair = Jev 1.13 vs the #2; swap and
// picking work; partial runs grey out thin topics; no page errors; 1440 + 390, light + dark. Run verify-cr-92.mjs as well.
// Usage: node verify-cr-94.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-94';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const a = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const topics = JSON.parse(await fs.readFile(new URL('../../../data/raw/benchmarks/jevbench/v1.2/jevbench-v1.2-topics.json', import.meta.url), 'utf8'));
const byKey = Object.fromEntries(a.systems.map((s) => [s.key, s]));
const ranked = a.systems.filter((s) => s.ranked).sort((x, y) => x.rank - y.rank);
const f1 = (v) => (v === null ? 'none (0)' : v.toFixed(1));
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const AX = ['intelligence', 'calibration', 'speed', 'cost'];
const expectAxes = (k) => AX.map((x) => f1(byKey[k].axes[x]));
const expectTopics = (k) => topics.topics.map((t) => { const c = topics.systems[k].topics[t.key]; return c.attempted < topics.min_attempted ? `n=${c.attempted}` : pct(c.accuracy); });
const b = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const m = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: m, hasTouch: m, colorScheme: theme, deviceScaleFactor: m ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (msg) => { if (msg.type() === 'error') errs.push(msg.text()); });
    try {
      await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
      // F-179 (PR #7, 2026-09-24): the v1.2/v1.3 historical board now mounts only when the
      // `jev13-history` disclosure is first opened, so every read below needs that click first.
      const f179History = p.locator('[data-bh-jev13-history]');
      if (await f179History.count()) {
        if (!(await f179History.evaluate((element) => element.hasAttribute('open')))) await f179History.locator('summary').click();
        await p.waitForSelector('[data-bh-jev12-task-table]', { state: 'attached', timeout: 30000 });
      }
      const sec = p.locator('[data-bh-jev12-compare]');
      await sec.scrollIntoViewIfNeeded();
      const vals = async (radar, side, keys) => Promise.all(keys.map(async (k) => ((await p.textContent(`[data-bh-jev12-radar="${radar}"] [data-bh-jev12-radar-value="${side}:${k}"]`)) || '').replace(/^ · /, '').trim()));
      const pair = async () => [await sec.getAttribute('data-bh-jev12-compare-a'), await sec.getAttribute('data-bh-jev12-compare-b')];
      const [A, B] = await pair();
      check(`${tag}: default pair = Jev 1.13 vs #2`, A === 'jev-1.13.0' && B === ranked.find((s) => s.key !== 'jev-1.13.0').key, [A, B]);
      const verify = async (label) => {
        const [x, y] = await pair();
        check(`${tag} ${label}: axis radar A = table (${x})`, JSON.stringify(await vals('axes', 'a', AX)) === JSON.stringify(expectAxes(x)), [await vals('axes', 'a', AX), expectAxes(x)]);
        check(`${tag} ${label}: axis radar B = table (${y})`, JSON.stringify(await vals('axes', 'b', AX)) === JSON.stringify(expectAxes(y)), [await vals('axes', 'b', AX), expectAxes(y)]);
        // the same system's row in the main table shows the same axis values
        const row = await p.$$eval(`[data-bh-jev12-table] tr[data-bh-jev12-row="${x}"] td`, (tds) => tds.slice(2, 6).map((t) => t.textContent.trim()));
        check(`${tag} ${label}: radar A = its row in the table`, JSON.stringify(row.map((t) => t.replace('none (label only)', 'none (0)'))) === JSON.stringify(expectAxes(x)), row);
        const tk = topics.topics.map((t) => t.key);
        check(`${tag} ${label}: topic radar A = artifact`, JSON.stringify(await vals('topics', 'a', tk)) === JSON.stringify(expectTopics(x)), await vals('topics', 'a', tk));
        check(`${tag} ${label}: topic radar B = artifact`, JSON.stringify(await vals('topics', 'b', tk)) === JSON.stringify(expectTopics(y)), await vals('topics', 'b', tk));
        const legend = (await p.textContent('[data-bh-jev12-radar-legend]')) || '';
        check(`${tag} ${label}: legend shows both JevBench Scores`, legend.includes(byKey[x].jevbench_score.toFixed(1)) && legend.includes(byKey[y].jevbench_score.toFixed(1)), legend.slice(0, 200));
      };
      await verify('default');
      // Review gate 20260919T233002Z: two systems of the same family share a colour, so the pair must still be told apart —
      // by colour when the families differ, by a dashed second outline when they do not. CR-97 changed which pair is the
      // default (classifier.dev is no longer ranked, so #2 is a rebuild), so the check states the intent, not one case.
      const defaultStrokes = await p.$$eval('[data-bh-jev12-radar="axes"] [data-bh-jev12-radar-series] polygon', (nodes) => nodes.map((n) => [getComputedStyle(n).stroke, getComputedStyle(n).strokeDasharray]));
      check(`${tag}: the default pair is separated by line style or colour`, defaultStrokes.length === 2
        && (defaultStrokes[0][0] !== defaultStrokes[1][0] || /6px,\s*4px|6 4/.test(defaultStrokes[1][1])), defaultStrokes);
      await p.locator('[data-bh-jev12-compare] .bh-panel').screenshot({ path: `${OUT}/${tag}-radars-default.png` });
      await p.click('[data-bh-jev12-radar-swap]');
      const [A2, B2] = await pair();
      check(`${tag}: swap exchanges A and B`, A2 === B && B2 === A, [A2, B2]);
      await verify('swapped');
      // same type (both Jev rebuilds) → B dashed; a partial run → thin topics greyed
      await p.selectOption('[data-bh-jev12-radar-pick="a"]', 'djev');
      await p.selectOption('[data-bh-jev12-radar-pick="b"]', 'needle-3');
      await verify('djev vs Needle 3 (partial)');
      check(`${tag}: thin topics of a partial run are marked`, (await p.$$('[data-bh-jev12-radar-thin]')).length === 1, '');
      await p.selectOption('[data-bh-jev12-radar-pick="b"]', 'semif-qwen3.5-4b');
      const dash = await p.getAttribute('[data-bh-jev12-radar="axes"] [data-bh-jev12-radar-series="b"] polygon', 'stroke-dasharray');
      check(`${tag}: same-type pair → B is dashed`, dash === '6 4', dash);
      await p.locator('[data-bh-jev12-compare] .bh-panel').screenshot({ path: `${OUT}/${tag}-radars-same-type.png` });
      // svg is labelled, value tables exist
      // Scoped to CR-94's own compare panel (2026-09-24): the unscoped selector also counted the four
      // `jev14-radar-*` SVGs the later V14 suite added elsewhere on the page, so it read 6 and failed on a
      // defect that is not there. Both v1.2 radars are labelled and both have value tables.
      check(`${tag}: radars are labelled images with value tables`, (await p.$$('[data-bh-jev12-compare] [data-bh-jev12-radar-svg][role="img"][aria-labelledby]')).length === 2 && (await p.$$('[data-bh-jev12-compare] [data-bh-jev12-radar-table]')).length === 2, '');
      // no horizontal overflow on the page at 390
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`${tag}: no horizontal page overflow`, over <= 1, over);
      const lim = (await p.textContent('[data-bh-jev12-latency-limit]')) || '';
      check(`${tag}: limitation explains parallelism 1, SemiAnalysis, infra, assumption`, /parallelism 1/.test(lim) && /SemiAnalysis/.test(lim) && /far more than 2×/.test(lim) && /authentication, load balancing, logging/.test(lim) && /assumption/.test(lim) && !/about half/i.test(lim), lim.slice(0, 120));
      check(`${tag}: SemiAnalysis link`, (await p.$$('[data-bh-jev12-latency-limit] a[href="https://newsletter.semianalysis.com/p/nvidia-blackwell-perf-tco-analysis"]')).length === 1, '');
      check(`${tag}: no page or console errors`, errs.length === 0, errs);
      await p.evaluate(() => { const d = document.getElementById('limits'); if (d) d.open = true; });
      await p.locator('#limits').screenshot({ path: `${OUT}/${tag}-limits.png` });
    } finally { await c.close(); }
  }
} finally { await b.close(); }
const bad = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - bad.length, total: checks.length, checks }, null, 1));
console.log(`${checks.length - bad.length}/${checks.length} passed`); for (const x of bad) console.log('FAIL', x.name, x.detail);
process.exit(bad.length ? 1 : 0);
