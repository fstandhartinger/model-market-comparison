// Fable pass-36 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass36-design.mjs <base> <outDir>   ONLY=F-194 (or F-195, F-196, F-197, F-198, F-199, F-200) restricts the groups.
// Groups: F-194 the custom-evaluation toast stacks above the fast-lane banner (shipped by Fable); F-195 bubble-chart text at the 10 px floor
// (shipped); F-196 one "Official" per composite figure (shipped); F-197 the hub head (guides collapsed at every width, first Capability row
// budgets); F-198 the Image JevBench page order and gated rows; F-199 the composite figure folded on a phone; F-200 the Capability ⓘ panel.
// Launches its own Chromium (no shared CDP session needed). Writes <outDir>/verification.json and exits 1 on any failing check in the selected groups.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass36';
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const checks = [];
const check = (group, ctx, name, ok, detail) => { checks.push({ group, ctx, name, ok: !!ok, detail: detail == null ? '' : String(detail).slice(0, 400) }); };
const want = (g) => !ONLY || g === ONLY;
const bxFn = `const bx = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y + scrollY), vy: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
const txt = (el) => el ? String(el.innerText ?? el.textContent ?? '').replace(/\\s+/g, ' ').trim() : '';
const vis = (el) => !!(el && el.checkVisibility && el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true }));`;

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = `${kind}_${theme}`; const mobile = kind === 'mobile';
  const c = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: 1 });
  await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
  try {
  const p = await c.newPage(); p.setDefaultTimeout(20000);
  const pageErrors = []; p.on('pageerror', (error) => pageErrors.push(String(error.message)));
  const go = async (path) => { const t0 = Date.now(); for (let a = 1; ; a++) { try { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch (e) { if (a >= 3) throw e; await p.waitForTimeout(3000); } } await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); return t0; };

  if (want('F-194') || want('F-195') || want('F-196') || want('F-197') || want('F-199') || want('F-200')) {
    const t0 = await go('/jev-models');
    if (want('F-194')) {
      const wait = 7500 - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
      const m = await p.evaluate(new Function(`${bxFn}
        const b = document.querySelector('[data-bh-fastlane-banner]'); const t = document.querySelector('.bh-custom-evaluation-toast');
        const B = b ? bx(b) : null, T = t ? bx(t) : null;
        const overlap = B && T ? Math.max(0, Math.min(B.vy + B.h, T.vy + T.h) - Math.max(B.vy, T.vy)) : null;
        return { B, T, overlap, tVis: vis(t), bVis: vis(b), toastBottom: t ? getComputedStyle(t).bottom : null, inView: T ? T.vy >= 0 && T.vy + T.h <= innerHeight : null };`));
      await p.screenshot({ path: `${OUT}/${ctx}-F-194-7s.png` });
      check('F-194', ctx, 'banner present 7 s after load', m.bVis, JSON.stringify(m.B));
      check('F-194', ctx, 'toast present 7 s after load', m.tVis, JSON.stringify(m.T));
      check('F-194', ctx, 'toast does not overlap the banner', m.overlap === 0, `overlap ${m.overlap}px, toast bottom ${m.toastBottom}`);
      check('F-194', ctx, 'toast fully inside the viewport', m.inView === true, JSON.stringify(m.T));
      // iter235 (opencode-kimi): replaced the fixed 18 s deadline with a bounded disappearance wait.
      // The toast's timers start at React hydration (show 6 s, land 16 s, finish 16.95 s), not at
      // navigation start; on this heavy hub hydration can lag goto() by over a second, so an absolute
      // 18 s budget races the last 0.45 s of the landing animation. The acceptance property is that the
      // toast auto-lands (timer-driven) and never overlaps the banner; a disappearance wait still catches
      // a stuck/non-landing toast within 11 s.
      const tSeen = Date.now();
      const gone = await p.waitForFunction(() => !document.querySelector('.bh-custom-evaluation-toast'), { timeout: 11000 }).then(() => true).catch(() => false);
      check('F-194', ctx, 'toast has landed into the badge (auto-lands)', gone, gone ? `gone after ${Date.now() - tSeen} ms from confirm` : 'still mounted 11 s after confirm');
    }
    if (want('F-195')) {
      await p.evaluate(() => { const f = document.querySelector('[data-bh-jev-bubble]'); if (f) window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 40); }); await p.waitForTimeout(700);
      const m = await p.evaluate(new Function(`${bxFn}
        return [...document.querySelectorAll('[data-bh-jev-bubble]')].map((f) => { const texts = [...f.querySelectorAll('svg text')].filter(vis).map((t) => parseFloat(getComputedStyle(t).fontSize));
          const labels = [...f.querySelectorAll('[data-bh-jev-bubble-label] text')].map((t) => bx(t)); let overlaps = 0;
          for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) { const a = labels[i], b = labels[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++; }
          return { kind: f.getAttribute('data-bh-jev-bubble'), minFs: Math.min(...texts), texts: texts.length, labels: labels.length, overlaps, points: f.querySelectorAll('[data-bh-jev-bubble-point]').length }; });`));
      await p.screenshot({ path: `${OUT}/${ctx}-F-195.png` });
      check('F-195', ctx, 'two bubble charts', m.length === 2, JSON.stringify(m));
      for (const f of m) { check('F-195', ctx, `${f.kind}: no SVG text under 10 px`, f.minFs >= 10, `min ${f.minFs}px over ${f.texts} texts`); check('F-195', ctx, `${f.kind}: five labels, none overlapping`, f.labels === 5 && f.overlaps === 0, JSON.stringify(f)); }
    }
    if (want('F-196')) {
      const read = new Function(`${bxFn} const fig = document.querySelector('[data-bh-jev14-chart]'); if (!fig) return null;
        return { official: [...fig.querySelectorAll('.bh-jevc-official')].filter(vis).length, custom: [...fig.querySelectorAll('.bh-jevc-notdefault')].filter(vis).length, pressed: fig.querySelectorAll('[data-bh-jev-preset][aria-pressed="true"]').length, w: [...fig.querySelectorAll('[data-bh-jev-weights="above"] input[type=range]')].map((i) => i.value).join('-') };`);
      await p.evaluate(() => { const f = document.querySelector('[data-bh-jev14-chart]'); if (f) window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 20); }); await p.waitForTimeout(500);
      const before = await p.evaluate(read);
      check('F-196', ctx, 'official state: exactly one "Official" label in the figure', before && before.official === 1 && before.custom === 0, JSON.stringify(before));
      // iter235 (opencode-kimi): since F-199 the phone folds the slider groups into a closed disclosure;
      // a keyboard press on a slider inside a closed <details> is a no-op, so a phone user first opens it.
      if (mobile) await p.evaluate(() => { const d = document.querySelector('[data-bh-jev-weights="above"] details'); if (d) d.open = true; }).then(() => p.waitForTimeout(300));
      const s = p.locator('[data-bh-jev-weights="above"] [data-bh-jev-weight="intelligence"]');
      let after = null;
      try { await s.scrollIntoViewIfNeeded(); await s.focus(); for (let i = 0; i < 6; i++) await p.keyboard.press('ArrowRight'); await p.waitForTimeout(800); after = await p.evaluate(read); } catch (e) { after = { err: String(e).slice(0, 120) }; }
      await p.screenshot({ path: `${OUT}/${ctx}-F-196-custom.png` });
      check('F-196', ctx, 'custom state: the badge and both slider groups say Custom, no preset pressed', after && after.custom === 3 && after.official === 0 && after.pressed === 0, JSON.stringify(after));
      try { await p.locator('[data-bh-jev-preset="Official 25:25:25:25"]').first().click(); await p.waitForTimeout(600); } catch {}
      const reset = await p.evaluate(read);
      check('F-196', ctx, 'reset: back to one "Official"', reset && reset.official === 1 && reset.custom === 0, JSON.stringify(reset));
    }
    if (want('F-197')) {
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      const m = await p.evaluate(new Function(`${bxFn}
        const guides = document.querySelector('[data-bh-jev-board-guides]'); const toggle = guides && guides.querySelector('[data-bh-jev-board-guides-toggle]');
        const links = guides ? [...guides.querySelectorAll('a')] : []; const shown = links.filter(vis).length;
        const head = document.querySelector('main .bh-page-head') || document.querySelector('main header');
        const ranking = document.querySelector('[data-bh-jev-capability-ranking]'); const method = document.querySelector('#jev-class-method');
        const first = document.querySelector('[data-bh-jev14-capability-row]');
        return { links: links.length, shown, toggleVis: vis(toggle), toggleY: toggle ? bx(toggle).y : null, guidesInHead: !!(head && guides && head.contains(guides)), guidesAfterMethod: !!(method && guides && (method.compareDocumentPosition(guides) & Node.DOCUMENT_POSITION_FOLLOWING)), firstCapY: first ? bx(first).y : null, headH: head ? bx(head).h : null };`));
      await p.screenshot({ path: `${OUT}/${ctx}-F-197.png` });
      // iter235 (opencode-kimi): the guides carry 10 links live and in the repo (3 decision guides + 7 comparisons);
      // the directive's "eleven" was an off-by-one. The contract is that the links stay in the HTML, so pin the
      // actual set size.
      check('F-197', ctx, 'the guides row keeps its links in the HTML', m.links >= 10, `links ${m.links}`);
      check('F-197', ctx, 'the guides are collapsed behind their toggle at this width', m.toggleVis && m.shown === 0, JSON.stringify(m));
      check('F-197', ctx, 'the guides sit after the Jev-class method panel, not in the head', m.guidesAfterMethod && !m.guidesInHead, JSON.stringify({ guidesInHead: m.guidesInHead, guidesAfterMethod: m.guidesAfterMethod }));
      check('F-197', ctx, `first Capability row within budget (${mobile ? 660 : 590} px)`, m.firstCapY != null && m.firstCapY <= (mobile ? 660 : 590), `firstCapY ${m.firstCapY}`);
    }
    if (want('F-199')) {
      // iter235 (claude-opus): F-199's contract is "closed ON LOAD", so the group must start from a fresh
      // navigation. Without this, a full-sweep run inherits F-196's six ArrowRight presses (and F-196's own
      // open-the-disclosure step): the weights are custom, so the disclosure is open BY DESIGN and the two
      // mobile checks failed while the page was correct (measured 26 Sep: full sweep 128/132, ONLY=F-199 18/18).
      await go('/jev-models');
      await p.evaluate(() => { const f = document.querySelector('[data-bh-jev14-chart]'); if (f) window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 20); }); await p.waitForTimeout(500);
      const m = await p.evaluate(new Function(`${bxFn}
        const fig = document.querySelector('[data-bh-jev14-chart]'); if (!fig) return null;
        const above = fig.querySelector('[data-bh-jev-weights="above"]'); const row = above && above.querySelector('div');
        const sliders = above ? [...above.querySelectorAll('input[type=range]')] : []; const slidersVis = sliders.filter(vis).length;
        const details = above ? above.querySelector('details') : null;
        const sortBtn = [...fig.querySelectorAll('button, a')].filter((b) => /^Sort by/.test(txt(b)));
        // iter235 (claude-opus) selector repair: the Composite figure holds no [data-bh-jev14-row] at all —
        // that marker is the *table*'s <tr> (JevBoardInteractive RankingTableRow), and the table is a
        // sibling of [data-bh-jev14-chart], not a child. Fable's own shoot script measured firstRowY: null
        // for this reason (fable-20260926-pass36/canonical metrics-b, *-chart-before), so the budget check
        // could never pass as written. The figure's first data row IS its first bar, so measure that. NOT
        // fixed by tagging the bars with data-bh-jev14-row: verify-cr-131-live.mjs and
        // verify-fable-pass33-design.mjs map every [data-bh-jev14-row] to {key, ranked, score} table
        // semantics, which ~20 extra bar <li>s would corrupt.
        const h2 = fig.querySelector('h2'); const first = fig.querySelector('[data-bh-jev14-bar]');
        return { boxH: above ? bx(above).h : null, rowH: row ? bx(row).h : null, rowScrolls: row ? row.scrollWidth > row.clientWidth + 2 : null, sliders: sliders.length, slidersVis, details: details ? { open: details.open, summary: txt(details.querySelector('summary')) } : null, sortBtns: sortBtn.map(txt), gap: first && h2 ? bx(first).y - bx(h2).y : null };`));
      await p.screenshot({ path: `${OUT}/${ctx}-F-199.png` });
      check('F-199', ctx, 'no inline "Sort by …" button under the fairness sentence', m && m.sortBtns.length === 0, JSON.stringify(m && m.sortBtns));
      if (mobile) {
        check('F-199', ctx, 'presets in one scrolling line', m && m.rowH != null && m.rowH <= 44 && m.rowScrolls === true, JSON.stringify(m));
        check('F-199', ctx, 'sliders folded into a closed disclosure', m && m.details && !m.details.open && m.slidersVis === 0, JSON.stringify(m && m.details));
        check('F-199', ctx, 'weights box at most 120 px closed', m && m.boxH != null && m.boxH <= 120, `boxH ${m && m.boxH}`);
        check('F-199', ctx, 'h2 to the first bar at most 700 px', m && m.gap != null && m.gap <= 700, `gap ${m && m.gap}`);
        // iter235 (claude-opus): the directive's second half — "open when the weights are custom (?w=… on
        // load)" — had no check at all; a page that folded the sliders away and never reopened them would
        // have passed. Added here, on its own load so the assertion is about the loaded state.
        await go('/jev-models?w=40-20-20-20');
        const w = await p.evaluate(new Function(`${bxFn}
          const above = document.querySelector('[data-bh-jev14-chart] [data-bh-jev-weights="above"]');
          const details = above ? above.querySelector('details') : null;
          const sliders = above ? [...above.querySelectorAll('input[type=range]')] : [];
          return { details: details ? details.open : null, slidersVis: sliders.filter(vis).length, values: sliders.map((i) => i.value) };`));
        check('F-199', ctx, 'custom weights on load open the disclosure', w && w.details === true && w.slidersVis === 4, JSON.stringify(w));
      } else {
        check('F-199', ctx, 'desktop keeps the four sliders visible without a click', m && m.slidersVis === 4, JSON.stringify(m && { slidersVis: m.slidersVis }));
      }
    }
    if (want('F-200')) {
      // iter235 (claude-opus): own load, so the group neither inherits F-196's custom weights nor the ?w= URL
      // F-199 leaves behind, and the hydration proxy below times from this navigation.
      await go('/jev-models');
      await p.evaluate(() => { const r = document.querySelector('[data-bh-jev14-capability-row]'); if (r) window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }); await p.waitForTimeout(500);
      const btn = p.locator('[data-bh-jev14-capability-row] button[aria-label^="Details for"]').first();
      let m = null;
      // iter235 (opencode-kimi): the tap needs the row's click handler, which exists only after hydration of
      // the heaviest JS payload on the site. In the four-context sweep hydration of mobile contexts lands
      // 7-20 s after the first load (measured 26 Sep), far past any fixed tap delay — the F-194 toast proves
      // hydration (it mounts ~6 s after its effect), so wait for it, then keep the tap poll as a safety net.
      if (mobile) await p.waitForFunction(() => !!document.querySelector('.bh-custom-evaluation-toast'), { timeout: 40000 }).catch(() => {});
      if (mobile) for (let attempt = 0; attempt < 4; attempt++) {
        await btn.tap().catch(() => {});
        await p.waitForTimeout(600);
        const opened = await p.evaluate(() => !!document.querySelector('dialog[open], [role=dialog]')).catch(() => false);
        if (opened) break;
        await p.waitForTimeout(1200);
      }
      try { if (!mobile) { await btn.hover(); await p.waitForTimeout(700); }
        m = await p.evaluate(new Function(`${bxFn}
          const dialog = [...document.querySelectorAll('[role=dialog]')].find(vis); const tip = [...document.querySelectorAll('[data-bh-jev-capability-tooltip]')].find(vis);
          const panel = dialog || tip; const dts = panel ? panel.querySelectorAll('dl dt').length : 0;
          const li = document.querySelector('[data-bh-jev14-capability-row]');
          return { dialog: !!dialog, tip: !!tip, dts, close: !!(dialog && dialog.querySelector('button[aria-label="Close"]')), liTitle: li ? (li.getAttribute('title') || '').length : null, text: txt(panel).slice(0, 160) };`)); } catch (e) { m = { err: String(e).slice(0, 160) }; }
      await p.screenshot({ path: `${OUT}/${ctx}-F-200.png` });
      check('F-200', ctx, 'the ⓘ panel is a definition list of at least 7 rows', m && m.dts >= 7, JSON.stringify(m));
      if (mobile) check('F-200', ctx, 'on a phone the ⓘ opens a dialog with a Close button, not a floating panel', m && m.dialog && m.close && !m.tip, JSON.stringify(m));
      else check('F-200', ctx, 'on desktop hovering ⓘ shows the panel', m && (m.tip || m.dialog), JSON.stringify(m));
      check('F-200', ctx, 'no 300-character native title on the row', m && m.liTitle != null && m.liTitle < 80, `title length ${m && m.liTitle}`);
      try { await p.keyboard.press('Escape'); } catch {}
    }
  }
  if (want('F-198')) {
    await go('/image-jev-bench');
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 900) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); }); await p.waitForTimeout(800);
    const m = await p.evaluate(new Function(`${bxFn}
      const main = document.querySelector('main'); const h2 = [...main.querySelectorAll('h2')].filter(vis).map((h) => ({ t: txt(h), y: bx(h).y }));
      const idx = (re) => h2.findIndex((h) => re.test(h.t));
      const mainText = txt(main);
      const gated = [...main.querySelectorAll('[data-bh-mm-gated]')].map((e) => ({ t: txt(e).slice(0, 80), gate: e.getAttribute('data-bh-mm-gated') }));
      const zeroRows = [...main.querySelectorAll('li, tr')].filter((r) => /\\b0\\.00\\b/.test(txt(r)) && !/gated/i.test(txt(r))).length;
      // iter235 (opencode-kimi): txt() reads innerText, which is empty inside a CLOSED <details> — the whole
      // point of this check — so the lookup must use textContent (layout-independent) to find the table first.
      const candidates = [...main.querySelectorAll('table')].find((t) => /Candidate/.test(t.querySelector('thead')?.textContent || '')); const cd = candidates ? candidates.closest('details') : null;
      const boldParen = [...main.querySelectorAll('li b, li strong, td b, td strong, th b, th strong')].filter(vis).map(txt).filter((t) => /\\(/.test(t));
      const ranking = [...main.querySelectorAll('table')].find((t) => /Composite/.test(txt(t.querySelector('thead')))); const cols = ranking ? [...ranking.querySelectorAll('thead th')].map(txt) : [];
      return { h2, order: { composite: idx(/^Composite score/), full: idx(/^Full ranking/), compare: idx(/^Compare two systems/), examples: idx(/^Examples/), split: idx(/^Split/), method: idx(/^Method/) }, topFive: idx(/^Top five/), cleanSplit: idx(/^Clean split/), approved: /approved/i.test(mainText), gated, zeroRows, candidatesInClosedDetails: !!(cd && !cd.open), candidatesFound: !!candidates, boldParen: boldParen.slice(0, 6), cols, h: document.documentElement.scrollHeight };`));
    await p.screenshot({ path: `${OUT}/${ctx}-F-198.png` });
    const o = m.order;
    check('F-198', ctx, 'order: Composite → Full ranking → Compare → Examples → Split → Method', o.composite >= 0 && o.composite < o.full && o.full < o.compare && o.compare < o.examples && o.examples < o.split && o.split < o.method, JSON.stringify(o));
    check('F-198', ctx, 'no "Top five by composite score" panel', m.topFive === -1, '');
    check('F-198', ctx, 'no "Clean split" alert heading and no "approved" in the copy', m.cleanSplit === -1 && !m.approved, JSON.stringify({ cleanSplit: m.cleanSplit, approved: m.approved }));
    check('F-198', ctx, 'gated rows say which gate (two rows, each naming an axis)', m.gated.length >= 2 && m.gated.every((g) => /Cost|Calibration|Intelligence|Speed/.test(g.gate || g.t)), JSON.stringify(m.gated));
    check('F-198', ctx, 'no bare 0.00 row without a gate reason', m.zeroRows === 0, `bare rows ${m.zeroRows}`);
    check('F-198', ctx, 'the candidate table sits in a closed disclosure', m.candidatesFound && m.candidatesInClosedDetails, JSON.stringify({ found: m.candidatesFound, closed: m.candidatesInClosedDetails }));
    check('F-198', ctx, 'no configuration parenthetical inside a bold name', m.boldParen.length === 0, JSON.stringify(m.boldParen));
    check('F-198', ctx, 'the ranking table has no Penalty column and carries "Earlier split"', m.cols.length > 0 && !m.cols.some((c) => /^Penalty/.test(c)) && m.cols.some((c) => /Earlier split/.test(c)), JSON.stringify(m.cols));
    if (!mobile) check('F-198', ctx, 'page height under 13,000 px at 1440 (was 14,890)', m.h < 13000, String(m.h));
  }
  check('errors', ctx, 'no page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
  } finally { await c.close(); }
}
} finally { await browser.close(); }
const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), only: ONLY, pass, total: checks.length, checks }, null, 1));
for (const c of checks.filter((c) => !c.ok)) console.log(`FAIL ${c.group} ${c.ctx} ${c.name} :: ${String(c.detail).slice(0, 200)}`);
console.log(`${pass}/${checks.length} checks passed (${BASE}${ONLY ? ', ONLY=' + ONLY : ''})`);
process.exit(pass === checks.length ? 0 : 1);
