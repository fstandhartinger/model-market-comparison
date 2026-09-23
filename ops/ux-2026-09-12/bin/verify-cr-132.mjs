// CR-132 (/jev-models v1.4 page fixes) — a live receipt for all four sub-items.
//
// Every expected value is re-derived: the board scores, the compare pair and its aggregates come from the
// pinned v1.4 artifact through the same `lib/jevbench-v14.mjs` the page uses, and the set of rows that may
// carry a † comes from `jevV14RowNote`, not from a count typed into this file. The live `/api/jevbench/v1.4`
// bytes are compared with the pinned artifact first, so a host serving a different board cannot pass by
// agreeing with a hard-coded number.
//
// What each check is actually for:
//   CR-132.1  the two-system compare is back, with four radars, the default pair, a selectable pair and the
//             pair in the URL — and the radar values are the artifact's published aggregates.
//   CR-132.2  a † stands exactly on the rows whose footnote has a row-specific part, opens in place, carries
//             the note as a tooltip, and never sits alone on a line (measured, not assumed: the no-wrap box
//             that holds the last word and the marker must produce a single client rect).
//   CR-132.3  the restored v1.3 sections read v1.4 data and stand *outside* the collapsed history, while the
//             v1.3-only material (weightings, per-task grid, topic radars, held-out diagnostic) stays inside
//             it. Containment is asserted on the live DOM with `contains`, so moving a section breaks it.
//   CR-132.4  390×844, 360×800 and 1440 at light and dark on both hosts: no element past the viewport edge
//             outside an intentional scroll container (measured with the document clip removed, because a
//             clipped document reports no overflow whatever it contains), the name column really is sticky
//             (computed position on the live page — the class alone is inert on the wrong table), radar text
//             is legible, and no page or console error.
//
// usage: node verify-cr-132.mjs [outDir] [host ...]
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const REPO = process.env.BH_REPO || '/opt/model-market-comparison';
const { readJevbenchV14, jevbenchV14View, jevV14RowNote } = await import(`${REPO}/lib/jevbench-v14.mjs`);

const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/cr132';
const HOSTS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['https://benchmarkheaven.com', 'https://model-market-comparison.app.mintapis.com'];
const CONTEXTS = [
  { label: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
  { label: 'phone390', viewport: { width: 390, height: 844 }, isMobile: true },
  { label: 'phone360', viewport: { width: 360, height: 800 }, isMobile: true },
];
const THEMES = ['light', 'dark'];
const CHART_TOP = 20;

await mkdir(OUT, { recursive: true });

// ---------------------------------------------------------------- expectations, re-derived
const { artifact, sha256 } = await readJevbenchV14(REPO);
const view = jevbenchV14View({ artifact, sha256 });
const rows = view.systems;                                   // ranked by rank, then unranked by score
const noteOf = new Map(rows.map((row) => [row.key, jevV14RowNote(artifact.footnotes?.[row.key])]));
const noteKeys = rows.filter((row) => noteOf.get(row.key)).map((row) => row.key);
const rankedByRank = view.ranked;
const pairA = rankedByRank.find((row) => row.key === 'jev-1.13.0') ?? rankedByRank[0];
const pairB = rankedByRank.find((row) => row.key !== pairA.key);
// a non-default pair for the deep-link check: two ranked systems that are not the default pair
const deepA = rankedByRank.find((row) => row.key !== pairA.key && row.key !== pairB.key);
const deepB = rankedByRank.find((row) => row.key !== pairA.key && row.key !== pairB.key && row.key !== deepA.key);
const one = (value) => (value == null ? '—' : value.toFixed(1));
const pct0 = (value) => (value == null ? '—' : `${(value * 100).toFixed(0)}%`);
const rowOf = (key) => rows.find((row) => row.key === key);

const HARD_FAMILIES = ['adversarial', 'ambiguous', 'judge_hard', 'long_policy', 'multi_hop', 'probability', 'routing_hard', 'temporal_numeric', 'tradeoff', 'trap'];
const SEALED_FAMILIES = ['ambiguous_abstain', 'judge_hard', 'long_policy', 'multi_hop', 'paraphrase_robustness', 'probability', 'safety_judge', 'temporal_numeric', 'tradeoff', 'trap_adversarial'];

const checks = [];
const check = (scope, name, ok, detail) => {
  checks.push({ scope, name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scope} ${name}${ok ? '' : ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
};

// ---------------------------------------------------------------- the live artifact must be the pinned one
for (const host of HOSTS) {
  const response = await fetch(`${host}/api/jevbench/v1.4`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const live = JSON.parse(bytes.toString('utf8'));
  const liveSha = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  check(host, 'api/pinned-artifact', liveSha === sha256 && live.revision === artifact.revision,
    { liveSha, expected: sha256, revision: live.revision });
}

// ---------------------------------------------------------------- the page, per host × viewport × theme
const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });

for (const host of HOSTS) {
  for (const ctx of CONTEXTS) {
    for (const theme of THEMES) {
      const scope = `${host} ${ctx.label}-${theme}`;
      const context = await browser.newContext({ viewport: ctx.viewport, isMobile: ctx.isMobile, hasTouch: ctx.isMobile, colorScheme: theme, deviceScaleFactor: 1 });
      await context.addInitScript((value) => { localStorage.setItem('theme', value); localStorage.setItem('bh-theme', value); }, theme);
      const page = await context.newPage();
      const problems = [];
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text().slice(0, 160)}`); });
      await page.goto(`${host}/jev-models?review=${Date.now()}`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await page.waitForSelector('[data-bh-jev14-compare]', { timeout: 30000 });
      await page.waitForTimeout(400);

      // ---- CR-132.1 compare view
      const compare = await page.evaluate(() => {
        const section = document.querySelector('[data-bh-jev14-compare]');
        if (!section) return null;
        const radars = [...section.querySelectorAll('[data-bh-jev14-radar]')].map((figure) => {
          const svg = figure.querySelector('svg');
          const box = svg?.getBoundingClientRect();
          const texts = [...(svg?.querySelectorAll('text') ?? [])]
            .filter((node) => !node.querySelector('text') && (node.textContent || '').trim())
            .map((node) => ({ text: (node.textContent || '').trim(), size: parseFloat(getComputedStyle(node).fontSize) || 0 }));
          return {
            key: figure.getAttribute('data-bh-jev14-radar'),
            width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0),
            paths: svg?.querySelectorAll('path, polygon').length ?? 0,
            minFont: texts.length ? Math.min(...texts.map((t) => t.size)) : 0,
            texts: texts.map((t) => t.text),
          };
        });
        const legend = [...section.querySelectorAll('[data-bh-jev14-compare-score]')].map((node) => node.getAttribute('data-bh-jev14-compare-score'));
        const tableRows = [...section.querySelectorAll('[data-bh-jev14-compare-table] tbody tr')].map((tr) => {
          const cells = [...tr.children].map((cell) => (cell.textContent || '').trim());
          return cells.length === 3 ? cells : null;
        }).filter(Boolean);
        return {
          a: section.getAttribute('data-bh-jev14-compare-a'), b: section.getAttribute('data-bh-jev14-compare-b'),
          radars, legend, tableRows,
          picks: [...section.querySelectorAll('[data-bh-jev14-compare-pick]')].length,
          swap: !!section.querySelector('[data-bh-jev14-compare-swap]'),
          copy: !!section.querySelector('[data-bh-jev14-compare-copy]'),
        };
      });
      check(scope, 'compare/present', compare && compare.picks === 2 && compare.swap && compare.copy, compare && { picks: compare.picks, swap: compare.swap, copy: compare.copy });
      check(scope, 'compare/default-pair', compare?.a === pairA.key && compare?.b === pairB.key,
        { got: [compare?.a, compare?.b], expected: [pairA.key, pairB.key] });
      const radarKeys = (compare?.radars ?? []).map((radar) => radar.key);
      check(scope, 'compare/four-radars', JSON.stringify(radarKeys) === JSON.stringify(['axes', 'tiers', 'hard', 'sealed']), radarKeys);
      const drawn = (compare?.radars ?? []).filter((radar) => radar.width > 80 && radar.height > 80 && radar.paths >= 2);
      check(scope, 'compare/radars-drawn', drawn.length === 4, (compare?.radars ?? []).map((radar) => `${radar.key} ${radar.width}×${radar.height} paths ${radar.paths}`));
      const illegible = (compare?.radars ?? []).filter((radar) => radar.minFont < 9);
      check(scope, 'compare/radar-labels-legible', illegible.length === 0, illegible.map((radar) => `${radar.key} min ${radar.minFont}px`));
      check(scope, 'compare/legend-scores', JSON.stringify(compare?.legend) === JSON.stringify([pairA.jevbench_score.toFixed(3), pairB.jevbench_score.toFixed(3)]),
        { got: compare?.legend, expected: [pairA.jevbench_score.toFixed(3), pairB.jevbench_score.toFixed(3)] });

      // the compare table is the radars' own values in text: check the sealed tier and both family radars
      const valueOf = (label) => compare?.tableRows.find((cells) => cells[0] === label);
      const sealedRow = valueOf('Sealed');
      check(scope, 'compare/sealed-tier-aggregate',
        sealedRow && sealedRow[1] === pct0(pairA.sealed_accuracy) && sealedRow[2] === pct0(pairB.sealed_accuracy),
        { got: sealedRow, expected: ['Sealed', pct0(pairA.sealed_accuracy), pct0(pairB.sealed_accuracy)] });
      const familyMismatch = [];
      for (const [families, read, kind] of [
        [HARD_FAMILIES, (row, key) => row.hard?.by_family?.[key]?.accuracy ?? null, 'hard'],
        [SEALED_FAMILIES, (row, key) => row.sealed_aggregate?.by_family?.[key] ?? null, 'sealed'],
      ]) {
        for (const family of families) {
          const expected = [pct0(read(pairA, family)), pct0(read(pairB, family))];
          // the label in the table is the humanised family name; match on the pair of values in order instead
          const hit = compare?.tableRows.some((cells) => cells[1] === expected[0] && cells[2] === expected[1]);
          if (!hit) familyMismatch.push(`${kind}/${family} ${expected.join(' vs ')}`);
        }
      }
      check(scope, 'compare/family-radars-from-artifact', familyMismatch.length === 0, familyMismatch);

      // ---- CR-132.2 row notes
      const notes = await page.evaluate(() => {
        const markers = [...document.querySelectorAll('[data-bh-jev14-table] [data-bh-jev14-note]')];
        return markers.map((marker) => {
          const summary = marker.querySelector('summary');
          const body = marker.querySelector('.bh-jev14-note-body');
          const nowrap = marker.closest('span.whitespace-nowrap');
          const markerRect = summary?.getBoundingClientRect();
          // The word the marker belongs to: the last text node before it inside the no-wrap box. Its own
          // client rect is what "the same line" means — the no-wrap span's box is no use here, because the
          // closed note is still a laid-out block inside it and inflates the box to several line rects.
          let wordRect = null, word = '';
          if (nowrap) {
            const walker = document.createTreeWalker(nowrap, NodeFilter.SHOW_TEXT);
            let last = null;
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (marker.contains(node)) break;
              if ((node.textContent || '').trim()) last = node;
            }
            if (last) {
              const range = document.createRange();
              range.selectNodeContents(last);
              const rects = [...range.getClientRects()];
              wordRect = rects.length ? rects[rects.length - 1].toJSON() : null;
              word = (last.textContent || '').trim();
            }
          }
          return {
            key: marker.getAttribute('data-bh-jev14-note'),
            title: summary?.getAttribute('title') ?? null,
            body: (body?.textContent || '').trim(),
            bodyVisible: body ? body.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }) : null,
            open: marker.hasAttribute('open'),
            word,
            onWordsLine: !!(wordRect && markerRect) && markerRect.top < wordRect.bottom && markerRect.bottom > wordRect.top,
            afterWord: !!(wordRect && markerRect) && markerRect.left >= wordRect.right - 2,
          };
        });
      });
      const gotKeys = notes.map((note) => note.key).sort();
      check(scope, 'notes/exactly-the-rows-with-a-note', JSON.stringify(gotKeys) === JSON.stringify([...noteKeys].sort()),
        { got: gotKeys.length, expected: noteKeys.length, extra: gotKeys.filter((key) => !noteKeys.includes(key)), missing: noteKeys.filter((key) => !gotKeys.includes(key)) });
      const wrongText = notes.filter((note) => note.body !== noteOf.get(note.key) || note.title !== noteOf.get(note.key));
      check(scope, 'notes/text-and-tooltip-match-the-artifact', wrongText.length === 0, wrongText.slice(0, 3).map((note) => note.key));
      const orphaned = notes.filter((note) => !note.word || !note.onWordsLine || !note.afterWord);
      check(scope, 'notes/marker-never-alone-on-a-line', orphaned.length === 0,
        orphaned.slice(0, 3).map((note) => ({ key: note.key, word: note.word, onWordsLine: note.onWordsLine, afterWord: note.afterWord })));
      const shownWhileClosed = notes.filter((note) => !note.open && note.bodyVisible !== false);
      check(scope, 'notes/closed-note-is-not-on-the-page', shownWhileClosed.length === 0, shownWhileClosed.slice(0, 3).map((note) => note.key));
      const opened = await page.evaluate(async (key) => {
        const marker = document.querySelector(`[data-bh-jev14-note="${key}"]`);
        const summary = marker.querySelector('summary');
        const body = marker.querySelector('.bh-jev14-note-body');
        const see = () => body.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true });
        const before = see();
        const cellBefore = Math.round(marker.closest('th').getBoundingClientRect().height);
        summary.click();
        await new Promise((resolve) => setTimeout(resolve, 200));
        const after = see();
        const cellAfter = Math.round(marker.closest('th').getBoundingClientRect().height);
        const inRow = marker.closest('tr') === marker.closest('[data-bh-jev14-table]').querySelector(`[data-bh-jev14-note="${key}"]`).closest('tr');
        marker.open = false;
        return { before, after, cellBefore, cellAfter, inRow, text: (body.textContent || '').trim() };
      }, noteKeys[0]);
      // "in place" = the note appears inside the row's own name cell, which therefore grows; not a popup elsewhere.
      check(scope, 'notes/opens-in-place-on-click',
        opened.before === false && opened.after === true && opened.cellAfter > opened.cellBefore && opened.inRow && opened.text === noteOf.get(noteKeys[0]),
        opened);

      // ---- CR-132.3 restored sections read v1.4 data, outside the collapsed history
      const sections = await page.evaluate(() => {
        const history = document.querySelector('[data-bh-jev13-history]');
        const at = (selector) => {
          const node = document.querySelector(selector);
          return node ? { present: true, inHistory: !!history && history.contains(node), text: (node.textContent || '').trim().slice(0, 400) } : { present: false };
        };
        const bars = [...document.querySelectorAll('[data-bh-jev14-bars] > li')].map((li) => ({
          key: li.getAttribute('data-bh-jev14-bar'), score: li.getAttribute('data-bh-jev14-bar-score'),
        }));
        return {
          chart: at('[data-bh-jev14-chart]'), bars,
          findings: at('[data-bh-jev14-findings]'), faq: at('[data-bh-jev-seo-guide]'), costs: at('[data-bh-jev-costs]'),
          availability: at('[data-bh-jev-availability]'), method: at('#method'), limits: at('#limits'), credit: at('#credit'),
          changes: at('[data-bh-jev14-changes]'),
          v13grid: at('[data-bh-jev12-task-table]'), v13weights: at('[data-bh-jev12-intel-weights]'),
          v13topics: at('#jev12-radar-topics'), v13heldout: at('[data-bh-jev-heldout]'), v13findings: at('#jev12-headline'),
        };
      });
      const restored = ['chart', 'findings', 'faq', 'costs', 'availability', 'method', 'limits', 'credit', 'changes'];
      const missing = restored.filter((key) => !sections[key].present);
      const buried = restored.filter((key) => sections[key].inHistory);
      check(scope, 'sections/restored-outside-history', missing.length === 0 && buried.length === 0, { missing, buried });
      const v13only = ['v13grid', 'v13weights', 'v13topics', 'v13heldout', 'v13findings'];
      const leaked = v13only.filter((key) => sections[key].present && !sections[key].inHistory);
      check(scope, 'sections/v13-only-stays-in-history', leaked.length === 0, { leaked, absent: v13only.filter((key) => !sections[key].present) });
      const expectedBars = rows.slice(0, CHART_TOP).map((row) => ({ key: row.key, score: row.jevbench_score.toFixed(3) }));
      check(scope, 'chart/top20-scores-are-v14', JSON.stringify(sections.bars) === JSON.stringify(expectedBars),
        { got: sections.bars.slice(0, 3), expected: expectedBars.slice(0, 3), n: sections.bars.length });
      const lead = rows[0];
      check(scope, 'findings/lead-reads-v14', sections.findings.text.includes(one(lead.jevbench_score)),
        { want: one(lead.jevbench_score), got: sections.findings.text.slice(0, 120) });

      // ---- CR-132.4 layout, sticky name column, no errors
      const layout = await page.evaluate(() => {
        document.querySelectorAll('details').forEach((node) => { node.open = true; });
        const root = document.documentElement;
        const saved = { root: root.style.overflowX, body: document.body.style.overflowX };
        root.style.overflowX = 'visible';
        document.body.style.overflowX = 'visible';
        void root.offsetWidth;
        const viewport = root.clientWidth;
        const past = [];
        for (const element of document.querySelectorAll('body *')) {
          const rect = element.getBoundingClientRect();
          if (rect.height <= 0 || rect.width <= 0) continue;
          if (Math.round(rect.right - viewport) <= 1) continue;
          let inScroller = false;
          for (let parent = element.parentElement; parent; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll') { inScroller = true; break; }
          }
          if (!inScroller) past.push({ over: Math.round(rect.right - viewport), tag: element.tagName, cls: String(element.className || '').slice(0, 40) });
        }
        const documentOverflow = root.scrollWidth - viewport;
        root.style.overflowX = saved.root;
        document.body.style.overflowX = saved.body;
        document.querySelectorAll('details').forEach((node) => { node.open = false; });
        return { viewport, documentOverflow, past: past.slice(0, 4), pastCount: past.length };
      });
      check(scope, 'layout/nothing-past-the-edge', layout.pastCount === 0 && layout.documentOverflow <= 0, layout);

      const sticky = await page.evaluate(async () => {
        const table = document.querySelector('[data-bh-jev14-table]');
        const cell = table?.querySelector('tbody th.bh-jev-sticky');
        const wrap = table?.closest('.bh-table-wrap');
        if (!cell || !wrap) return { ok: false, why: 'no sticky cell or scroll wrap' };
        cell.scrollIntoView({ block: 'center' });
        const position = getComputedStyle(cell).position;
        const left = () => Math.round(cell.getBoundingClientRect().left - wrap.getBoundingClientRect().left);
        const before = left();
        const scrollable = wrap.scrollWidth - wrap.clientWidth;
        const scrolled = Math.min(240, scrollable);
        wrap.scrollLeft = scrolled;
        await new Promise((resolve) => setTimeout(resolve, 150));
        // Sticky means: scrolled sideways, the name cell stops at the scroll container's left edge and stays
        // whole and opaque there, instead of travelling out of view with the rest of the row.
        const after = left();
        const width = Math.round(cell.getBoundingClientRect().width);
        const opaque = getComputedStyle(cell).backgroundColor;
        wrap.scrollLeft = 0;
        return { position, before, after, scrolled, width, opaque, wouldHaveLeft: before - scrolled };
      });
      // At a width where the table already fits there is nothing to scroll, so the pin cannot be exercised;
      // that is a pass for "the table is usable", and the check says which of the two cases it saw.
      const stickyOk = sticky.position === 'sticky' && sticky.width > 100
        && !/rgba\(0, 0, 0, 0\)|transparent/.test(sticky.opaque || '')
        && (sticky.scrolled === 0 ? sticky.after === sticky.before : sticky.after <= 2 && sticky.after > -2 && sticky.wouldHaveLeft < 0);
      check(scope, 'layout/name-column-is-sticky', stickyOk, { ...sticky, case: sticky.scrolled === 0 ? 'table fits, no sideways scroll' : 'pinned while scrolled' });

      check(scope, 'errors/none', problems.length === 0, problems.slice(0, 3));
      await page.screenshot({ path: `${OUT}/${host.replace(/^https:\/\//, '')}-${ctx.label}-${theme}.png`, fullPage: false });
      await context.close();
    }
  }

  // ---- CR-132.1, the pair in the URL: a deep link restores it, and picking a pair writes it back
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(`${host}/jev-models?compare=${deepA.key},${deepB.key}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('[data-bh-jev14-compare]');
  await page.waitForTimeout(500);
  const deepLinked = await page.evaluate(() => {
    const section = document.querySelector('[data-bh-jev14-compare]');
    return {
      a: section.getAttribute('data-bh-jev14-compare-a'), b: section.getAttribute('data-bh-jev14-compare-b'),
      scores: [...section.querySelectorAll('[data-bh-jev14-compare-score]')].map((node) => node.getAttribute('data-bh-jev14-compare-score')),
      search: window.location.search,
    };
  });
  check(host, 'compare/deep-link-restores-the-pair',
    deepLinked.a === deepA.key && deepLinked.b === deepB.key
    && JSON.stringify(deepLinked.scores) === JSON.stringify([deepA.jevbench_score.toFixed(3), deepB.jevbench_score.toFixed(3)]),
    deepLinked);

  await page.selectOption('[data-bh-jev14-compare-pick="b"]', pairB.key);
  await page.waitForTimeout(400);
  const picked = await page.evaluate(() => {
    const section = document.querySelector('[data-bh-jev14-compare]');
    return { a: section.getAttribute('data-bh-jev14-compare-a'), b: section.getAttribute('data-bh-jev14-compare-b'), search: window.location.search };
  });
  check(host, 'compare/picking-a-pair-writes-the-url',
    picked.b === pairB.key && new URLSearchParams(picked.search).get('compare') === `${deepA.key},${pairB.key}`,
    picked);

  // the default pair carries no query parameter, so a shared default link stays clean
  await page.selectOption('[data-bh-jev14-compare-pick="a"]', pairA.key);
  await page.waitForTimeout(400);
  const backToDefault = await page.evaluate(() => window.location.search);
  check(host, 'compare/default-pair-has-no-query', !new URLSearchParams(backToDefault).has('compare'), backToDefault);
  await context.close();
}

await browser.close();

const failed = checks.filter((entry) => !entry.ok);
await writeFile(`${OUT}/verification.json`, JSON.stringify({
  verifiedAt: new Date().toISOString(), repo: REPO, artifactSha256: sha256, revision: artifact.revision,
  derived: { rows: rows.length, ranked: rankedByRank.length, noteRows: noteKeys.length, defaultPair: [pairA.key, pairB.key], deepLinkPair: [deepA.key, deepB.key] },
  passed: checks.length - failed.length, total: checks.length, checks,
}, null, 2));
console.log(`\n${checks.length - failed.length}/${checks.length} CR-132 checks passed — ${OUT}/verification.json`);
process.exit(failed.length ? 1 : 0);
