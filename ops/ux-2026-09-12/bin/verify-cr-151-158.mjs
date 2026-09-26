// iteration234 (opencode-kimi) live verification: CR-143.1, CR-151.1-.5, CR-152.3/.4, CR-153.1-.3, CR-156.x (page parts), CR-158.1-.3/.5.
// Browser checks against live hosts via CDP 9333. Artifact/file checks run separately (see iteration notes).
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { jevClassRows } from '/opt/model-market-comparison/lib/jevbench-jev-class.mjs';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const ALL_HOSTS = [
  { name: 'canonical', url: 'https://benchmarkheaven.com' },
  { name: 'legacy', url: 'https://model-market-comparison.app.mintapis.com' },
];
const HOSTS = process.env.HOSTS ? ALL_HOSTS.filter((h) => process.env.HOSTS.split(',').includes(h.name)) : ALL_HOSTS;
const OUT_ROOT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/iter234-cr151-158';
const API_PATH = '/api/jevbench/v1.4.2';
const LIVE_SHA = 'ac14e206dde51ae28e40dc1ea2ff1fecc4a449b941d098e9ecb5618bd533e5be';

async function fetchJson(url) {
  const r = await fetch(url);
  if (r.status !== 200) throw new Error(`GET ${url} -> ${r.status}`);
  return { status: r.status, shaHeader: r.headers.get('x-content-sha256'), text: await r.text() };
}

const one = (v) => (v == null ? '—' : v.toFixed(1));

async function main() {
  const api = await fetchJson(`https://benchmarkheaven.com${API_PATH}`);
  if (api.shaHeader !== LIVE_SHA) throw new Error(`live API hash ${api.shaHeader} != expected ${LIVE_SHA}; aborting (deployment in flight?)`);
  const artifact = JSON.parse(api.text);
  const systems = artifact.systems;
  const ranked = systems.filter((s) => s.rank != null).sort((a, b) => a.rank - b.rank);
  const expectedTop5 = ranked.slice(0, 5).map((s) => s.key);
  const cls = jevClassRows(systems);
  const inClassKeys = new Set(cls.rows.filter((r) => r.inClass).map((r) => r.row.key));
  const outClassKeys = new Set(cls.rows.filter((r) => !r.inClass).map((r) => r.row.key));
  const llmKeys = new Set(systems.filter((s) => s.class === 'llm-baseline').map((s) => s.key));

  // iter235 (claude-opus): the draft attached to the shared Hermes agent-profile Chrome on CDP 9333, which
  // other jobs drive at the same time (and browser.close() on a CDP connection clears the contexts it made on
  // that shared browser). Launch our own Chromium by default; set CDP_URL to attach deliberately.
  const browser = process.env.CDP_URL
    ? await chromium.connectOverCDP(process.env.CDP_URL)
    : await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const results = { generated_utc: new Date().toISOString(), hosts: {}, artifact_sha: LIVE_SHA, artifact_systems: systems.length, artifact_ranked: ranked.length, expected_top5: expectedTop5, jev_class_expected: { in: [...inClassKeys], limits: cls.limits } };
  let total = 0, failed = 0;
  const check = (r, name, ok, detail = '') => {
    total += 1;
    if (!ok) failed += 1;
    r.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
  };
  const rect = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom }; }, sel);

  for (const host of HOSTS) {
    const hostRes = {};
    const contexts = [
      { id: 'desktop_light', width: 1440, height: 1000, color: 'light' },
      { id: 'desktop_dark', width: 1440, height: 1000, color: 'dark' },
      { id: 'phone_light', width: 390, height: 844, color: 'light' },
      { id: 'phone_dark', width: 390, height: 844, color: 'dark' },
    ];
    for (const ctx of contexts) {
      const dir = `${OUT_ROOT}/${host.name}/${ctx.id}`;
      mkdirSync(dir, { recursive: true });
      const r = [];
      const page = await browser.newPage().catch(() => null);
      if (!page) { check(r, 'browser-page', false, 'no free CDP page'); hostRes[ctx.id] = r; continue; }
      try {
        await page.setViewportSize({ width: ctx.width, height: ctx.height });
        await page.emulateMedia({ colorScheme: ctx.color });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

        // ---- hub /jev-models ----
        const resp = await page.goto(`${host.url}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
        check(r, 'hub-200', resp && resp.status() === 200, resp && resp.status());
        if (!resp || resp.status() !== 200) { hostRes[ctx.id] = r; continue; }
        await page.waitForSelector('[data-bh-jev-class-list]', { timeout: 30000 });
        await page.waitForSelector('[data-bh-jev14-chart] [data-bh-jev14-bar]', { timeout: 30000 });
        const topBarOk = await page.waitForFunction((k) => { const b = document.querySelector('[data-bh-jev14-chart] [data-bh-jev14-bar]'); return b && b.getAttribute('data-bh-jev14-bar') === k; }, expectedTop5[0], { timeout: 10000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(1800);
        check(r, 'hub-hydrated', topBarOk, `first bar=${await page.evaluate(() => { const b = document.querySelector('[data-bh-jev14-chart] [data-bh-jev14-bar]'); return b ? b.getAttribute('data-bh-jev14-bar') : null; })} expected=${expectedTop5[0]}`);

        // CR-152.3 (read before any state-changing interaction): default view's first five bars are the official top five
        const topBarsFresh = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-bar]')].slice(0, 5).map((el) => el.getAttribute('data-bh-jev14-bar')));
        check(r, 'cr152_3_top5', JSON.stringify(topBarsFresh) === JSON.stringify(expectedTop5), `page=${topBarsFresh} expected=${expectedTop5}`);

        // horizontal overflow (all CRs, 390 budget)
        const ovf = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(r, 'no-h-overflow', ovf <= 1, `scrollWidth-viewport=${ovf}`);

        // CR-158.1: first ranking = Jev-class Capability; rule on page; membership re-derived
        const order = await page.evaluate(() => {
          const y = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : Infinity; };
          return {
            classList: y('[data-bh-jev-class-list]'),
            scatter: y('[data-bh-jev-bubbles]'),
            weightsAbove: y('[data-bh-jev-weights="above"]'),
            compare: y('[data-bh-jev14-compare]'),
            table: y('[data-bh-jev14-table]'),
          };
        });
        check(r, 'cr158_1_order', order.classList < order.scatter && order.scatter < order.weightsAbove && order.weightsAbove < order.compare && order.compare < order.table, JSON.stringify(order));
        const ruleText = await page.locator('[data-bh-jev-class-rule]').textContent().catch(() => '');
        check(r, 'cr158_1_rule', /2\s*×/.test(ruleText) && /1\.13\.0/.test(ruleText), ruleText.slice(0, 140));
        const pageClassKeys = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev-class-list] [data-bh-jev14-capability-row], [data-bh-jev-class-more] [data-bh-jev14-capability-row]')].map((el) => el.getAttribute('data-bh-jev14-capability-row')));
        const pageOutKeys = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev-class-outside] [data-bh-jev14-capability-row]')].map((el) => el.getAttribute('data-bh-jev14-capability-row')));
        const missing = [...inClassKeys].filter((k) => !pageClassKeys.includes(k));
        const extra = pageClassKeys.filter((k) => !inClassKeys.has(k));
        check(r, 'cr158_1_membership', missing.length === 0 && extra.length === 0, `page=${pageClassKeys.length} expected=${inClassKeys.size} missing=${missing.slice(0, 5)} extra=${extra.slice(0, 5)}`);
        const outOverlap = pageOutKeys.filter((k) => inClassKeys.has(k));
        check(r, 'cr158_1_outside', pageOutKeys.length > 0 && outOverlap.length === 0, `outside=${pageOutKeys.length} overlap=${outOverlap.slice(0, 5)}`);

        // CR-158.2: two bubble charts (Capability x Cost, Capability x Speed); top-five permanent Jev-class labels;
        // per-point tooltips (hover/tap) with the system name and values; log axes disclosed.
        const bubbles = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev-bubble]')].map((f) => ({
          kind: f.getAttribute('data-bh-jev-bubble'),
          points: f.querySelectorAll('[data-bh-jev-bubble-point]').length,
          names: [...f.querySelectorAll('[data-bh-jev-bubble-point]')].filter((el) => /Capability/.test(el.getAttribute('aria-label') || '')).length,
          labels: f.querySelectorAll('[data-bh-jev-bubble-label]').length,
          log: /\(log\)|log scale|log of latency/i.test(f.textContent),
        })));
        check(r, 'cr158_2_charts', bubbles.length === 2 && bubbles.some((b) => b.kind === 'cost') && bubbles.some((b) => b.kind === 'speed'), JSON.stringify(bubbles.map((b) => ({ k: b.kind, n: b.points }))));
        check(r, 'cr158_2_leaders', bubbles.length === 2 && bubbles.every((b) => b.labels >= 1 && b.labels <= 5), JSON.stringify(bubbles.map((b) => ({ k: b.kind, labels: b.labels }))));
        check(r, 'cr158_2_tooltips', bubbles.length === 2 && bubbles.every((b) => b.points > 10 && b.names === b.points), JSON.stringify(bubbles.map((b) => ({ k: b.kind, pts: b.points, named: b.names }))));
        check(r, 'cr158_2_log', bubbles.length === 2 && bubbles.every((b) => b.log), JSON.stringify(bubbles.map((b) => ({ k: b.kind, log: b.log }))));
        const firstPt = page.locator('[data-bh-jev-bubble="cost"] [data-bh-jev-bubble-point]').first();
        let tipSeen = 0, tipText = '';
        if (await firstPt.count()) {
          await firstPt.click().catch(() => {});
          await page.waitForTimeout(600);
          tipSeen = await page.locator('[data-bh-jev-bubble-tooltip]').count();
          if (tipSeen) tipText = (await page.locator('[data-bh-jev-bubble-tooltip]').first().textContent() || '').slice(0, 120);
          await page.keyboard.press('Escape').catch(() => {});
        }
        check(r, 'cr158_2_tip-interactive', tipSeen >= 1, `tooltip=${tipSeen} ${tipText}`);

        // CR-158.3: weights above + below, presets, formula, adjacent sort/filter, fairness
        const w = await page.evaluate(() => ({
          above: !!document.querySelector('[data-bh-jev-weights="above"]'),
          below: !!document.querySelector('[data-bh-jev-weights="below"]'),
          formula: !!document.querySelector('[data-bh-jev14-formula]'),
          sortGroup: !!document.querySelector('[data-bh-jev14-chart-sort]'),
          filterGroup: !!document.querySelector('[data-bh-jev-filter]'),
          presets: [...document.querySelectorAll('[data-bh-jev14-chart-sort] [data-bh-jev-preset], [data-bh-jev-preset]')].map((b) => b.textContent.trim()).slice(0, 10),
        }));
        check(r, 'cr158_3_groups', w.above && w.below && w.formula && w.sortGroup, JSON.stringify(w));
        const aboveSlider = '[data-bh-jev-weights="above"] input[type="range"]';
        const belowSlider = '[data-bh-jev-weights="below"] input[type="range"]';
        const before = await page.evaluate(() => ({ a: [...document.querySelectorAll('[data-bh-jev-weights="above"] input[type="range"]')].map((i) => i.value), b: [...document.querySelectorAll('[data-bh-jev-weights="below"] input[type="range"]')].map((i) => i.value) }));
        await page.locator(aboveSlider).first().evaluate((el) => { const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(el, el.max || 100); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => ({ a: [...document.querySelectorAll('[data-bh-jev-weights="above"] input[type="range"]')].map((i) => i.value), b: [...document.querySelectorAll('[data-bh-jev-weights="below"] input[type="range"]')].map((i) => i.value) }));
        check(r, 'cr158_3_sliders-sync', JSON.stringify(before.a) !== JSON.stringify(after.a) && JSON.stringify(after.a) === JSON.stringify(after.b), `before=${JSON.stringify(before.a)} afterAbove=${JSON.stringify(after.a)} afterBelow=${JSON.stringify(after.b)}`);
        const customMark = await page.evaluate(() => /custom weights/i.test(document.body.textContent.slice(0, 200000)));
        check(r, 'cr158_3_custom-mark', customMark);
        await page.locator('[data-bh-jev14-sort-official]').first().click().catch(() => {});
        await page.waitForTimeout(300);

        // CR-152.4: fairness note near top five + Intelligence sort control
        const note = await page.locator('[data-bh-jev14-top-five-note]').textContent().catch(() => '');
        check(r, 'cr152_4_note', /Jev\s*1\.13\.0/.test(note) && /Intelligence/i.test(note), note.slice(0, 160));
        const sortInt = await page.locator('[data-bh-jev14-sort-intelligence]').count();
        check(r, 'cr152_4_sortctl', sortInt >= 1, `controls=${sortInt}`);

        // CR-151.3: View-by above the chart, five views
        const viewby = await page.evaluate(() => {
          const el = document.querySelector('[data-bh-jev-viewby]');
          const firstBar = document.querySelector('[data-bh-jev14-chart] [data-bh-jev14-bar]');
          if (!el || !firstBar) return null;
          return {
            aboveBars: el.getBoundingClientRect().top + window.scrollY < firstBar.getBoundingClientRect().top + window.scrollY,
            inFigure: !!el.closest('[data-bh-jev14-chart]'),
            buttons: [...el.querySelectorAll('button[data-bh-jev-view], a[data-bh-jev-view]')].map((b) => b.getAttribute('data-bh-jev-view')),
          };
        });
        check(r, 'cr151_3_viewby', viewby && viewby.aboveBars && viewby.buttons.filter(Boolean).length >= 5 && ['overall', 'intelligence', 'calibration', 'speed', 'cost'].every((v) => viewby.buttons.includes(v)), JSON.stringify(viewby));

        // CR-151.1: heat shading = rank-in-column shade, verified per cell
        const heat = await page.evaluate(() => {
          const cols = [...document.querySelectorAll('[data-bh-jev14-table] thead th')].map((th) => th.textContent.trim());
          const rows = [...document.querySelectorAll('[data-bh-jev14-table] tbody tr[data-bh-jev14-row]')];
          const cells = [];
          rows.forEach((tr) => {
            const key = tr.getAttribute('data-bh-jev14-row');
            const spans = [...tr.querySelectorAll('span.bh-heat, span.bh-heat-cell')];
            spans.forEach((sp) => {
              const h = sp.style.getPropertyValue('--h');
              cells.push({ key, h: h === '' ? null : Number(h), text: sp.textContent.trim(), cellIndex: sp.closest('td') ? [...sp.closest('td').parentElement.children].indexOf(sp.closest('td')) : -1 });
            });
          });
          return { cols, cells };
        });
        let heatOk = true, heatDetail = '';
        const byCol = new Map();
        for (const c of heat.cells) if (c.h != null && c.cellIndex >= 0) { byCol.set(c.cellIndex, byCol.get(c.cellIndex) || []).push(c); }
        const isUsdLike = (i) => { const t = (heat.cols[i] || '').toLowerCase(); return t.includes('$') || t.includes('latency') || t.includes('p50') || /usd/.test(t); };
        for (const [ci, cells] of byCol) {
          const withVal = cells.filter((c) => { const n = Number(c.text.replace(/[^0-9.-]/g, '')); return Number.isFinite(n) && c.text !== '—'; });
          if (withVal.length < 3) continue;
          const lowerBetter = isUsdLike(ci);
          const vals = withVal.map((c) => Number(c.text.replace(/[^0-9.-]/g, ''))).sort((a, b) => a - b);
          for (const c of withVal) {
            const v = Number(c.text.replace(/[^0-9.-]/g, ''));
            const below = vals.filter((x) => x < v).length;
            const equal = vals.filter((x) => x === v).length;
            const t = (below + Math.max(0, equal - 1) / 2) / (vals.length - 1);
            const expected = lowerBetter ? 1 - t : t;
            if (Math.abs(expected - c.h) > 0.002) { heatOk = false; heatDetail = `col ${ci} (${heat.cols[ci]}) row ${c.key}: expected ${expected.toFixed(3)} got ${c.h}`; break; }
          }
          if (!heatOk) break;
        }
        const legendCount = await page.locator('[data-bh-jev-heat-legend]').count();
        check(r, 'cr151_1_heat', heatOk && legendCount >= 1, heatDetail || `cols=${[...byCol.keys()].length} legends=${legendCount}`);

        // CR-151.2: sortable headers, click + keyboard
        const ariaSortBefore = await page.locator('[data-bh-jev14-table] thead th[aria-sort]').count();
        check(r, 'cr151_2_aria', ariaSortBefore >= 1, `th[aria-sort]=${ariaSortBefore}`);
        const firstRow = async () => page.evaluate(() => { const tr = document.querySelector('[data-bh-jev14-table] tbody tr[data-bh-jev14-row]'); return tr ? tr.getAttribute('data-bh-jev14-row') : null; });
        const rowBefore = await firstRow();
        const sortBtn = page.locator('[data-bh-jev14-table] thead [data-bh-jev-sort="intelligence"]').first();
        if (await sortBtn.count()) {
          await sortBtn.click();
          await page.waitForTimeout(300);
          const rowDesc = await firstRow();
          const dir = await page.locator('[data-bh-jev14-table] thead [data-bh-jev-sort="intelligence"]').first().getAttribute('data-bh-jev-sort-dir').catch(() => null);
          await sortBtn.focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
          const rowAsc = await firstRow();
          const dir2 = await page.locator('[data-bh-jev14-table] thead [data-bh-jev-sort="intelligence"]').first().getAttribute('data-bh-jev-sort-dir').catch(() => null);
          check(r, 'cr151_2_sort', rowBefore !== rowDesc && rowDesc !== rowAsc && dir !== dir2, `before=${rowBefore} desc=${rowDesc} asc=${rowAsc} dir=${dir}->${dir2}`);
        } else {
          check(r, 'cr151_2_sort', false, 'intelligence sort button not found');
        }
        // CR-151.2b: filter by search
        const filterSel = '[data-bh-jev-filters="table"] [data-bh-jev-filter="q"]';
        const countSel = () => page.locator('[data-bh-jev14-table] tbody tr[data-bh-jev14-row]').count();
        const n0 = await countSel();
        const f = page.locator(filterSel).first();
        if (await f.count()) {
          await f.fill('cygnet');
          await page.waitForTimeout(400);
          const n1 = await countSel();
          const names = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev14-table] tbody tr[data-bh-jev14-row]')].map((tr) => tr.textContent.toLowerCase()));
          await f.fill('');
          await page.waitForTimeout(400);
          const n2 = await countSel();
          check(r, 'cr151_2b_filter', n1 >= 1 && n1 < n0 && n2 === n0 && names.every((t) => t.includes('cygnet')), `n0=${n0} filtered=${n1} after-clear=${n2}`);
        } else {
          check(r, 'cr151_2b_filter', false, 'table filter input not found');
        }

        // CR-151.4: axes table after compare section, annotated
        const afterCompare = await page.evaluate(() => {
          const c = document.querySelector('[data-bh-jev14-compare]');
          const t = document.querySelector('[data-bh-jev14-table]');
          if (!c || !t) return false;
          return t.getBoundingClientRect().top + window.scrollY > c.getBoundingClientRect().top + window.scrollY;
        });
        check(r, 'cr151_4_after-compare', afterCompare);
        const tags = await page.evaluate(() => ({ api: document.querySelectorAll('[data-bh-jev14-table] .bh-flag-tag').length, est: document.querySelectorAll('[data-bh-jev14-table] .bh-est-tag').length, newt: document.querySelectorAll('[data-bh-jev14-table] .bh-new-tag').length, thin: document.querySelectorAll('[data-bh-jev14-table] .bh-thin-tag').length }));
        check(r, 'cr151_4_annotate', tags.thin >= 1 && (tags.est >= 1 || tags.api >= 1 || tags.newt >= 1), JSON.stringify(tags));

        // CR-151.5: page numbers == live API for every page row
        const numDiff = await page.evaluate((scores) => {
          const rows = [...document.querySelectorAll('[data-bh-jev14-table] tbody tr[data-bh-jev14-row]')];
          const out = { checked: 0, diffs: [] };
          for (const tr of rows) {
            const key = tr.getAttribute('data-bh-jev14-row');
            const score = scores[key];
            out.checked += 1;
            if (score == null) {
              // Unranked/partial rows have no composite score in the API; the page must show them as not ranked with a dash.
              if (tr.getAttribute('data-bh-jev14-ranked') !== '0' || !tr.textContent.includes('\u2014')) out.diffs.push(`${key}: unranked row not shown as not-ranked`);
              continue;
            }
            const texts = [...tr.querySelectorAll('td')].map((td) => td.textContent.trim());
            const match = texts.some((t) => { const n = Number(String(t).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) && Math.abs(n - score) <= 0.05 + 1e-9; });
            if (!match) out.diffs.push(`${key}: api score ${score.toFixed(1)} not found in row cells`);
          }
          return out;
        }, Object.fromEntries(systems.map((s) => [s.key, s.jevbench_score])));
        check(r, 'cr151_5_scores', numDiff.diffs.length === 0 && numDiff.checked >= ranked.length, `checked=${numDiff.checked} diffs=${numDiff.diffs.slice(0, 4)}`);

        // CR-152.3 (repeat read after interactions): restore the official order, then the official top five must be back on top.
        // iter235 fix: the CR-158.3 slider test left custom weights {100,25,25,25} active, which re-sorts by custom
        // score (classifier-dev-fast lands on top). [data-bh-jev14-sort-official] only exists while
        // view === 'intelligence' (JevBoardInteractive.tsx renders "Sort by Intelligence" otherwise), so the old
        // one-button click was a silent no-op. The genuine restore path is the official-weights preset, which also
        // auto-restores the rank sort; fall back to the explicit restore button when it exists.
        await page.evaluate(() => {
          const preset = [...document.querySelectorAll('[data-bh-jev-preset]')].find((b) => /official/i.test(b.textContent));
          if (preset) preset.click();
          const b = document.querySelector('[data-bh-jev14-sort-official]');
          if (b) b.click();
        }).catch(() => {});
        await page.waitForTimeout(400);
        await page.waitForFunction((want) => { const b = document.querySelector('[data-bh-jev14-chart] [data-bh-jev14-bar]'); return b && b.getAttribute('data-bh-jev14-bar') === want; }, expectedTop5[0], { timeout: 8000 }).catch(() => {});
        const topBars = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-bar]')].slice(0, 5).map((el) => el.getAttribute('data-bh-jev14-bar')));
        check(r, 'cr152_3_top5-restored', JSON.stringify(topBars) === JSON.stringify(expectedTop5), `page=${topBars} expected=${expectedTop5}`);

        // CR-153.1: compare radars, pooled hard radar, pair change
        const radars = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev14-radar]')].map((f) => ({ key: f.getAttribute('data-bh-jev14-radar'), pooled: f.getAttribute('data-bh-jev14-radar-pooled') || '' })));
        check(r, 'cr153_1_radars', radars.length === 4 && radars.some((x) => x.key === 'hard' && x.pooled === '1'), JSON.stringify(radars));
        const pickA = page.locator('[data-bh-jev14-compare-pick="a"]').first();
        const aBefore = await page.locator('[data-bh-jev14-compare]').getAttribute('data-bh-jev14-compare-a');
        if (await pickA.count()) {
          await pickA.click();
          await pickA.fill('cygnet');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
          const aAfter = await page.locator('[data-bh-jev14-compare]').getAttribute('data-bh-jev14-compare-a');
          check(r, 'cr153_1_pair', aAfter === 'cygnet' && aAfter !== aBefore, `a=${aBefore} -> ${aAfter}`);
        } else {
          check(r, 'cr153_1_pair', false, 'compare pick A not found');
        }

        // CR-153.2: Intelligence view, hide-LLMs default on
        await page.locator('[data-bh-jev-view="intelligence"]').first().click();
        await page.waitForTimeout(400);
        const llmState = await page.evaluate(() => {
          const cb = document.querySelector('[data-bh-jev-hide-llms]');
          const bars = [...document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-bar]')].map((el) => el.getAttribute('data-bh-jev14-bar'));
          return { hasCb: !!cb, checked: cb ? cb.checked : null, bars, note: (document.querySelector('[data-bh-jev-llm-toggle-note]') || {}).textContent || '' };
        });
        const hiddenHasLlm = llmState.bars.some((k) => llmKeys.has(k));
        check(r, 'cr153_2_default', llmState.hasCb && llmState.checked === true && !hiddenHasLlm, `checked=${llmState.checked} bars=${llmState.bars.length} llmShown=${hiddenHasLlm}`);
        if (llmState.hasCb) {
          await page.locator('[data-bh-jev-hide-llms]').uncheck();
          await page.waitForTimeout(400);
          const bars2 = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-bar]')].map((el) => el.getAttribute('data-bh-jev14-bar')));
          check(r, 'cr153_2_toggle', bars2.some((k) => llmKeys.has(k)) && bars2.length > llmState.bars.length, `hidden=${llmState.bars.length} shown=${bars2.length}`);
          await page.locator('[data-bh-jev-view="overall"]').first().click();
          await page.waitForTimeout(300);
        }

        // CR-153.3: cost view -> thin red cost bars (both themes)
        await page.locator('[data-bh-jev-view="cost"]').first().click();
        await page.waitForTimeout(400);
        const costBars = await page.evaluate(() => [...document.querySelectorAll('[data-bh-jev14-cost-bar]')].slice(0, 10).map((el) => {
          const bar = el.querySelector('span') || el;
          const cs = getComputedStyle(bar);
          return { h: parseFloat(cs.height), bg: cs.backgroundColor };
        }));
        const red = (bg) => { const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); if (!m) return false; const [, rr, gg, bb] = m.map(Number); return rr > gg + 20 && rr > bb + 20; };
        check(r, 'cr153_3_costbars', costBars.length > 0 && costBars.every((b) => b.h <= 6 && red(b.bg)), JSON.stringify(costBars.slice(0, 3)));
        await page.locator('[data-bh-jev-view="overall"]').first().click().catch(() => {});
        await page.waitForTimeout(200);

        if (ctx.id === 'desktop_light') await page.screenshot({ path: `${dir}/hub-full.png`, fullPage: true }).catch(() => {});
        if (ctx.id === 'phone_light') { await page.screenshot({ path: `${dir}/hub-top.png`, clip: { x: 0, y: 0, width: 390, height: 1400 } }).catch(() => {}); }

        // CR-156.5: no third-party GDPR compliance claim (hub page part; SEO routes checked via curl)
        const gdprClaims = await page.evaluate(() => {
          const sentences = document.body.textContent.replace(/\s+/g, ' ').split(/(?<=[.;:!?])\s+/);
          const claims = sentences.filter((s) => /GDPR[- ]?compliant|GDPR[- ]compliance|GDPR[- ]?konform/i.test(s)).map((s) => s.slice(0, 220));
          const affirmative = claims.filter((s) => {
            const head = s.slice(0, Math.max(0, s.search(/GDPR/i))).toLowerCase();
            return !/not |n't |no |never |without|does not|doesn't|does not by itself|not by itself|neither|nicht|kein/.test(head);
          });
          return { mentions: document.body.textContent.match(/GDPR/g)?.length || 0, affirmative };
        });
        check(r, 'cr156_5_hub_gdpr', gdprClaims.affirmative.length === 0, `affirmative=${JSON.stringify(gdprClaims.affirmative)} mentions=${gdprClaims.mentions}`);

        if (ctx.id === 'desktop_light' && host.name === 'canonical') {
          // CR-158.5: pinned v1.4.2 page shows the live artifact hash, presentation-only
          await page.goto(`${host.url}/jev-models/v1.4.2`, { waitUntil: 'networkidle', timeout: 60000 });
          await page.waitForSelector('[data-bh-jev14-chart] [data-bh-jev14-bar]', { timeout: 30000 }).catch(() => {});
          const pinned = await page.evaluate((sha) => ({
            hash: (document.body.textContent.match(sha) || [null])[0],
            disclosureClosed: !!document.querySelector('details') && !document.querySelector('details').open,
            top5: [...document.querySelectorAll('[data-bh-jev14-chart] [data-bh-jev14-bar]')].slice(0, 5).map((b) => b.getAttribute('data-bh-jev14-bar')),
          }), LIVE_SHA.slice(0, 12));
          check(r, 'cr158_5_pinned', pinned.hash === LIVE_SHA.slice(0, 12) && JSON.stringify(pinned.top5) === JSON.stringify(expectedTop5), JSON.stringify(pinned));
        }

        // CR-143.1 (acceptance: every public host, 1440/390, light/dark): the cost modal on a model page
        const mpage = await page.goto(`${host.url}/models/claude-fable-5.1::max`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null);
        if (mpage && mpage.status() === 200) {
          await page.waitForTimeout(800);
          // Prefer a route row that carries an observed cache-read source (Vertex/Bedrock), so the SHA-256 line renders.
          let dlg = 0;
          const dlgSel = 'dialog[open]';
          const dlgText0 = async () => (await page.locator(dlgSel).first().count()) ? await page.locator(dlgSel).first().textContent() : '';
          const priceBtns = page.locator('button[title="Show how this cost is estimated"][aria-haspopup="dialog"]');
          const rowsWithCache = page.locator('tr:has-text("Vertex") button[title="Show how this cost is estimated"], tr:has-text("Bedrock") button[title="Show how this cost is estimated"]');
          const preferred = (await rowsWithCache.count()) ? rowsWithCache : priceBtns;
          const nTry = await preferred.count();
          for (let i = 0; i < nTry && !dlg; i++) {
            const btn = preferred.nth(i);
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            await btn.click().catch(() => {});
            await page.waitForTimeout(700);
            dlg = await page.locator(dlgSel).count();
            if (dlg && !/SHA-256/i.test(await dlgText0())) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(300); dlg = 0; }
          }
          const dlgText = dlg ? await page.locator(dlgSel).first().textContent() : '';
          const hasSha = /SHA-256/i.test(dlgText);
          const hasRoute = /Vertex|Bedrock|OpenRouter|provider|route/i.test(dlgText);
          const hasDate = /\d{4}-\d{2}-\d{2}/.test(dlgText);
          const hasCache = /cache/i.test(dlgText);
          check(r, 'cr143_1_modal', hasSha && hasRoute && hasDate && hasCache, `sha=${hasSha} route=${hasRoute} date=${hasDate} cache=${hasCache} text=${dlgText.slice(0, 120)}`);
          const dlgOvf = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? d.scrollWidth - d.clientWidth : -1; });
          check(r, 'cr143_1_overflow', dlgOvf <= 1, `dialog overflow=${dlgOvf}`);
          await page.keyboard.press('Escape').catch(() => {});
        } else {
          check(r, 'cr143_1_modal', false, `model page ${mpage ? mpage.status() : 'unreachable'}`);
        }

        check(r, 'no-page-errors', errors.length === 0, errors.slice(0, 3).join(' | '));
      } catch (e) {
        check(r, 'exception', false, String(e).slice(0, 300));
      } finally {
        await page.close().catch(() => {});
      }
      writeFileSync(`${dir}/verification.json`, JSON.stringify({ host: host.name, context: ctx.id, url: `${host.url}/jev-models`, checks: r, pass: r.filter((c) => c.ok).length, total: r.length }, null, 1));
      hostRes[ctx.id] = r;
      console.log(`[${host.name}/${ctx.id}] ${r.filter((c) => c.ok).length}/${r.length}`);
    }
    results.hosts[host.name] = hostRes;
  }

  await browser.close().catch(() => {});
  results.total = total;
  results.failed = failed;
  writeFileSync(`${OUT_ROOT}/summary.json`, JSON.stringify(results, null, 1));
  console.log(`TOTAL ${total - failed}/${total}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
