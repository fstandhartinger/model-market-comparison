// Live verifier for Fable pass 32's F-167, F-169 and F-170 — for a non-implementing engine to run on both hosts.
//
//   node verify-fable-pass32-f167-f170.mjs <base> <outDir>
//
// Nothing is pinned to a screenshot or to a number written here: every value the pages print is re-derived
// from the host's own payloads (/api/jevbench for the board, /api/benchmark-view for the Compare sub-lines),
// so a re-scored artifact moves the expectation with it.
//   F-167 the per-system page draws its number: a score strip on the 0–100 scale with a tick per ranked
//         system and the reference marked, a band per axis card (3 on the label-only page), the topic radar,
//         two columns at lg+, and at 390 the number and the strip inside the first 844 px.
//   F-169 a system is reached from its row: no "Browse every JevBench system" block, every board row's name
//         is an internal link to its page, the honorable card too.
//   F-170 no registry id and no internal marker as a sub-line; the model sheet's names never clip.
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/tmp/pass32-f167-${new URL(BASE).hostname}`;
await fs.mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' — ' + JSON.stringify(detail ?? null).slice(0, 400)}`); };
const one = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(1));

let meta = null;
try { meta = await (await fetch(`${BASE}/api/meta`)).json(); console.log('revision', meta.revision, 'generated_at', meta.generated_at); } catch { console.log('no /api/meta'); }

// The expectation is the artifact itself, read through the board's own view — F-167's rule: re-derive,
// never pin. `/api/jevbench` is the older v1 board (9 systems) and says nothing about these pages.
const repoRoot = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');
const { readJevbenchV12, jevbenchV12View } = await import(`${repoRoot}/lib/jevbench-v12.mjs`);
const board = jevbenchV12View(await readJevbenchV12(repoRoot));
const rows = [...board.ranked, ...board.honorable, ...board.partial];
check('payload/board-rows', rows.length > 0, `${rows.length} systems, ${board.ranked.length} ranked, revision ${board.revision}`);
const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
// The host publishes the same board at /api/jevbench/v1.2; the expectation is only trustworthy if the two agree.
const served = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const servedScore = Object.fromEntries((served.systems ?? []).map((sysRow) => [sysRow.key, sysRow.jevbench_score]));
check('payload/host-serves-the-same-board', served.revision === board.revision && rows.every((r) => Math.abs((servedScore[r.key] ?? NaN) - r.main) < 1e-9),
  { hostRevision: served.revision, artifactRevision: board.revision, differing: rows.filter((r) => Math.abs((servedScore[r.key] ?? NaN) - r.main) >= 1e-9).map((r) => r.key).slice(0, 5) });
const SAMPLE = ['jev-1.13.0', 'semif-qwen3.5-4b', 'classifier-dev-fast', 'needle-3'].filter((k) => byKey[k]);
check('payload/sample-pages-exist', SAMPLE.length === 4, SAMPLE);

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const width of [1440, 390]) {
    for (const scheme of ['light', 'dark']) {
      const label = `${width === 1440 ? 'desktop' : 'mobile'}-${scheme}`;
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: scheme });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e)));

      // ---------------- F-167 ----------------
      for (const key of SAMPLE) {
        const row = byKey[key];
        await page.goto(`${BASE}/jev-models/${key}`, { waitUntil: 'networkidle', timeout: 90000 });
        await page.waitForTimeout(600);
        const m = await page.evaluate(() => {
          const main = document.querySelector('main') ?? document.body;
          const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
          const strip = main.querySelector('[data-bh-jev-system-strip]');
          const score = main.querySelector('[data-bh-jev-system-score]');
          const radar = main.querySelector('[data-bh-jev-system-radar]');
          return {
            svgs: main.querySelectorAll('svg').length,
            strip: box(strip),
            stripRole: strip?.getAttribute('role') ?? null,
            stripProgressbars: strip ? strip.querySelectorAll('[role=progressbar]').length : -1,
            stripCaption: strip?.querySelector('[data-bh-jev-system-strip-caption]')?.innerText.replace(/\s+/g, ' ').trim() ?? null,
            peerTicks: main.querySelectorAll('[data-bh-jev-system-peer-tick]').length,
            referenceTicks: [...main.querySelectorAll('[data-bh-jev-system-reference-tick]')].map((el) => ({ key: el.dataset.bhJevSystemReferenceTick, title: el.title, left: el.style.left })),
            point: main.querySelector('[data-bh-jev-system-point]')?.dataset.bhJevSystemPoint ?? null,
            pointLeft: main.querySelector('[data-bh-jev-system-point]')?.style.left ?? null,
            bands: [...main.querySelectorAll('[data-bh-jev-system-band]')].map((el) => el.dataset.bhJevSystemBand),
            bandRefTitles: [...main.querySelectorAll('[data-bh-jev-system-band-reference]')].map((el) => el.title),
            cards: main.querySelectorAll('[aria-labelledby="jev-system-axes"] dl > div').length,
            scoreBox: box(score), radarBox: box(radar),
            scoreNumber: score?.querySelector('p.text-3xl')?.innerText.trim() ?? null,
            axisNumbers: [...main.querySelectorAll('[aria-labelledby="jev-system-axes"] dl > div')].map((el) => el.innerText.replace(/\s+/g, ' ').trim()),
            usd: main.querySelector('[data-bh-jev-system-usd]')?.innerText.trim() ?? null,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            widestChild: Math.max(...[...main.querySelectorAll('*')].map((el) => el.getBoundingClientRect().right)),
            bodyText: (document.querySelector('main') ?? document.body).innerText,
          };
        });
        const labelOnly = row.axes.calibration === null;
        // F-167 allows an HTML strip instead of a second svg, as long as it is not faked as a progress bar.
        check(`${label}/${key}/svg-and-strip`, m.svgs >= 1 && !!m.strip && m.stripProgressbars === 0 && m.stripRole !== 'progressbar',
          { svgs: m.svgs, strip: !!m.strip, role: m.stripRole, progressbars: m.stripProgressbars });
        check(`${label}/${key}/peer-tick-per-ranked-system`, m.peerTicks === board.ranked.length, { ticks: m.peerTicks, ranked: board.ranked.length });
        // The browser rounds an inline `left` to six significant digits, so the position is compared as a number.
        const leftPct = Number.parseFloat(m.pointLeft ?? 'NaN');
        check(`${label}/${key}/point-is-the-artifacts-score`, Number(m.point).toFixed(3) === Number(row.main).toFixed(3) && Math.abs(leftPct - Math.max(0, Math.min(100, row.main))) < 0.01, { point: m.point, main: row.main, left: m.pointLeft });
        check(`${label}/${key}/four-axis-cards`, m.cards === 4, m.cards);
        check(`${label}/${key}/bands`, m.bands.length === (labelOnly ? 3 : 4) && !m.bands.includes('calibration') === labelOnly, { bands: m.bands, labelOnly });
        check(`${label}/${key}/score-number-is-the-artifacts`, m.scoreNumber === one(row.main), { shown: m.scoreNumber, artifact: one(row.main) });
        const expectAxes = ['intelligence', 'calibration', 'speed', 'cost'].map((k) => (row.axes[k] === null ? 'none' : one(row.axes[k])));
        check(`${label}/${key}/axis-numbers-are-the-artifacts`, expectAxes.every((v, i) => m.axisNumbers[i]?.includes(v)), { shown: m.axisNumbers, expect: expectAxes });
        const caption = m.stripCaption ?? '';
        const expectCaption = row.ranked ? `Where it sits among the ${board.ranked.length} ranked systems.` : 'Shown, not ranked.';
        check(`${label}/${key}/strip-caption`, caption.startsWith(expectCaption), { caption, expectCaption });
        const refKey = key === 'jev-1.13.0' ? board.ranked.find((r) => r.rank === 2)?.key : 'jev-1.13.0';
        const refRow = byKey[refKey];
        check(`${label}/${key}/reference-tick-is-the-reference`, m.referenceTicks.length === 1 && m.referenceTicks[0].key === refKey && m.referenceTicks[0].title.includes(one(refRow.main)), m.referenceTicks);
        const refName = refRow.display.split(' (')[0].split(', formerly')[0];
        check(`${label}/${key}/reference-named-once-in-the-caption`, caption.includes(refName) && (m.bodyText.match(new RegExp(refName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length <= (key === 'jev-1.13.0' ? 4 : 3), { caption, refName });
        check(`${label}/${key}/band-reference-titles`, m.bandRefTitles.length === (labelOnly ? 3 : 4) && m.bandRefTitles.every((t) => t.startsWith(`${refName}:`)), m.bandRefTitles);
        const usd = row.usd < 0.01 ? row.usd.toFixed(4) : row.usd.toFixed(3);
        check(`${label}/${key}/cost-is-the-artifacts`, (m.usd ?? '').includes(usd), { shown: m.usd, artifact: usd });
        check(`${label}/${key}/no-horizontal-overflow`, m.overflow <= 1, `${m.overflow}px`);
        check(`${label}/${key}/nothing-wider-than-the-viewport`, m.widestChild <= width + 1, { widest: Math.round(m.widestChild), width });
        if (width === 1440) {
          check(`${label}/${key}/two-columns`, !!m.radarBox && !!m.scoreBox && m.radarBox.x > m.scoreBox.x + m.scoreBox.w - 2, { score: m.scoreBox, radar: m.radarBox });
        } else {
          check(`${label}/${key}/number-and-strip-in-the-first-screenful`, (m.strip?.y ?? 1e9) + (m.strip?.h ?? 0) <= 844, m.strip);
          check(`${label}/${key}/strip-at-least-300px`, (m.strip?.w ?? 0) >= 300, m.strip?.w);
        }
        check(`${label}/${key}/no-page-errors`, pageErrors.length === 0, pageErrors.slice(0, 3));
        pageErrors.length = 0;
        // The shot belongs to the page it verified, so it is taken here and not after the last navigation.
        await page.screenshot({ path: `${OUT}/${label}-${key}.png`, fullPage: width === 390 }).catch(() => {});
      }

      // ---------------- F-169 ----------------
      await page.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 120000 });
      await page.waitForTimeout(800);
      const hub = await page.evaluate(() => {
        const main = document.querySelector('main') ?? document.body;
        return {
          browseHeading: [...main.querySelectorAll('h2')].some((h) => /Browse every JevBench system/i.test(h.innerText)),
          linkFarm: !!main.querySelector('[data-bh-jev-system-links]'),
          rowLinks: [...main.querySelectorAll('[data-bh-jev-system-row-link]')].map((a) => ({ key: a.dataset.bhJevSystemRowLink, href: a.getAttribute('href'), target: a.getAttribute('target'), title: a.getAttribute('title') })),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      check(`${label}/hub/no-browse-every-system-block`, !hub.browseHeading && !hub.linkFarm, hub);
      const keys = new Set(hub.rowLinks.map((l) => l.key));
      check(`${label}/hub/every-system-reached-from-its-row`, rows.every((r) => keys.has(r.key)), { linked: keys.size, systems: rows.length, missing: rows.filter((r) => !keys.has(r.key)).map((r) => r.key).slice(0, 5) });
      check(`${label}/hub/row-links-are-internal-and-titled`, hub.rowLinks.every((l) => l.href === `/jev-models/${l.key}` && !l.target && (byKey[l.key] ? l.title === byKey[l.key].display : true)), hub.rowLinks.filter((l) => l.href !== `/jev-models/${l.key}` || l.target).slice(0, 3));
      check(`${label}/hub/no-horizontal-overflow`, hub.overflow <= 1, `${hub.overflow}px`);
      check(`${label}/hub/no-page-errors`, pageErrors.length === 0, pageErrors.slice(0, 3));
      pageErrors.length = 0;

      // ---------------- F-170 ----------------
      const PICKS = ['claude-opus-5.5::max', 'gpt-6-sol::max'];
      await page.goto(`${BASE}/compare?${PICKS.map((id) => `model=${encodeURIComponent(id)}`).join('&')}`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(1000);
      const compare = await page.evaluate(() => {
        const main = document.querySelector('main') ?? document.body;
        return { sublines: [...main.querySelectorAll('span.bh-muted.block.text-xs')].map((el) => el.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean), text: main.innerText };
      });
      // A benchmark version such as `100-tasks` is a human-facing release label, not the
      // machine-shaped `4.0-upstream-timeouts` form this check is meant to catch.
      const machineVersion = /^\d+(?:\.\d+)+-[a-z]/i;
      check(`${label}/compare/no-machine-shaped-version-subline`, !compare.sublines.some((s) => machineVersion.test(s)), compare.sublines.filter((s) => machineVersion.test(s)));
      check(`${label}/compare/no-inspection-marker`, !compare.text.includes('protocol requires individual inspection'), 'absent');
      check(`${label}/compare/no-page-errors`, pageErrors.length === 0, pageErrors.slice(0, 3));
      pageErrors.length = 0;

      if (width === 1440) {
        await page.goto(`${BASE}/models/${encodeURIComponent('claude-opus-5.5::max')}#benchmark-sheet`, { waitUntil: 'networkidle', timeout: 90000 });
        await page.waitForTimeout(1000);
        const sheet = await page.evaluate(() => {
          const cells = [...document.querySelectorAll('#benchmark-sheet summary > span:first-child')];
          return cells.map((el) => ({ text: el.innerText.replace(/\s+/g, ' ').trim(), clipped: el.scrollWidth > el.clientWidth + 1, ellipsis: getComputedStyle(el).textOverflow === 'ellipsis', title: el.getAttribute('title') }));
        });
        check(`${label}/sheet/names-never-clip`, sheet.length > 0 && sheet.every((c) => !c.clipped && !c.ellipsis), { rows: sheet.length, offenders: sheet.filter((c) => c.clipped || c.ellipsis).slice(0, 3) });
        check(`${label}/sheet/names-carry-a-title`, sheet.every((c) => c.title && c.title.length > 0), sheet.filter((c) => !c.title).slice(0, 3));
      }
      await context.close();
    }
  }
} finally { await browser.close(); }

const failed = results.filter((r) => !r.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta?.revision ?? null, generated_at: meta?.generated_at ?? null, at: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 2));
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
