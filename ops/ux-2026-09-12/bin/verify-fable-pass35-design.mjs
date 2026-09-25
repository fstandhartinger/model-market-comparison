// Fable pass-35 live verifier (non-Fable engines run it before flipping a row to verified).
// Usage: node verify-fable-pass35-design.mjs <base> <outDir>   ONLY=F-191 (or F-183, F-189, F-190, F-192) restricts the groups.
// Run under ~/.locks/chrome-9333.lock. Groups: F-191 the leaf's one reference; F-183 the leaf head/foot copy;
// F-189 the live board's capability-first ranking and View-by control; F-190 the pinned page;
// F-192 the system-one-open class. Writes <outDir>/verification.json and exits 1 on any failing check in the selected groups.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass35';
await fs.mkdir(OUT, { recursive: true });
const ONLY = process.env.ONLY || null;
const checks = [];
const check = (group, ctx, name, ok, detail) => { checks.push({ group, ctx, name, ok: !!ok, detail }); };
const want = (g) => !ONLY || g === ONLY;
const LEAVES = ['jevk5-v02', 'jev-1.13.0', 'decider-4b-v2'];
const txt = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
try {
for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = `${kind}_${theme}`;
  const c = await browser.newContext({ viewport: vp, isMobile: kind === 'mobile', hasTouch: kind === 'mobile', colorScheme: theme, deviceScaleFactor: 1 });
  try {
  const p = await c.newPage(); p.setDefaultTimeout(20000);
  const pageErrors = []; p.on('pageerror', (error) => pageErrors.push(String(error.message)));
  const go = async (path) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(600); };

  if (want('F-191') || want('F-183')) for (const key of LEAVES) {
    await go(`/jev-models/${key}`);
    const m = await p.evaluate(() => {
      const main = document.querySelector('main');
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      const delta = main.querySelector('[data-bh-jev-system-delta]');
      const cap = main.querySelector('[data-bh-jev-system-strip] figcaption');
      const legendB = [...main.querySelectorAll('li')].map(t).find((s) => /^B: /.test(s)) || '';
      const legendA = [...main.querySelectorAll('li')].map(t).find((s) => /^A: /.test(s)) || '';
      const h2s = [...main.querySelectorAll('h2')].map((h) => ({ t: t(h), y: Math.round(h.getBoundingClientRect().y + scrollY) }));
      const sub = main.querySelector('[data-bh-jev-system-subline]');
      const mainText = t(main);
      const release = [...main.querySelectorAll('p')].find((el) => /Scores and ranks can change/.test(el.textContent));
      return { delta: t(delta), deltaRef: delta?.getAttribute('data-bh-jev-system-delta'), cap: t(cap), legendA, legendB, h2s, sub: t(sub), hasHash: /hash-checked|name-only/.test(mainText), releaseY: release ? Math.round(release.getBoundingClientRect().y + scrollY) : null, h1: t(main.querySelector('h1')) };
    });
    await p.screenshot({ path: `${OUT}/${ctx}-${key}.png` });
    const capM = m.cap.match(/The marked tick is (.+?) \((\d+\.\d)\)\./);
    const deltaM = m.delta.match(/^(\d+\.\d) points (ahead of|behind) (.+?)'s (\d+\.\d)\.$/);
    if (want('F-191')) {
      check('F-191', ctx, `${key}: points sentence present and well-formed`, !!deltaM, m.delta);
      check('F-191', ctx, `${key}: sentence names the strip's marked tick`, capM && deltaM && deltaM[3] === capM[1] && deltaM[4] === capM[2], `${m.delta} | ${m.cap}`);
      check('F-191', ctx, `${key}: the radar's B row is the same system`, deltaM && m.legendB.startsWith(`B: ${deltaM[3]} `), m.legendB);
      check('F-191', ctx, `${key}: heading "Against ⟨reference⟩"`, deltaM && m.h2s.some((h) => h.t === `Against ${deltaM[3]}`), JSON.stringify(m.h2s.map((h) => h.t)));
      check('F-191', ctx, `${key}: no h2 equals a radar's title`, !m.h2s.some((h) => /^Accuracy per tier/.test(h.t)), '');
    }
    if (want('F-183')) {
      check('F-183', ctx, `${key}: no "hash-checked" / "name-only" in main`, !m.hasHash, '');
      check('F-183', ctx, `${key}: sub-line present with "by ⟨author⟩"`, /· by |^by /.test(m.sub), m.sub);
      const cls = (m.legendA.match(/^A: .+? — (.+?) · /) || [])[1];
      check('F-183', ctx, `${key}: sub-line class words match the compare legend's A row (or the class is unlabelled)`, !cls || /^[a-z0-9-]+$/.test(cls) || m.sub.startsWith(cls), `${cls} | ${m.sub}`);
      const avail = m.h2s.find((h) => /Availability and evidence/.test(h.t));
      check('F-183', ctx, `${key}: the release sentence sits under "Availability and evidence"`, avail && m.releaseY && m.releaseY > avail.y, `${m.releaseY} vs ${avail?.y}`);
    }
  }

  if (want('F-189') || want('F-192')) {
    await go('/jev-models');
    const m = await p.evaluate(() => {
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      const chart = document.querySelector('[data-bh-jev14-chart]') || document.querySelector('[data-bh-jevbench-v14]');
      const firstBar = document.querySelector('[data-bh-jev14-bar]');
      const before = []; if (chart && firstBar) { const w = document.createTreeWalker(chart, NodeFilter.SHOW_ELEMENT); let n; while ((n = w.nextNode())) { if (n === firstBar || n.contains(firstBar)) { if (n === firstBar) break; else continue; } if (/^(TABLE|DETAILS)$/.test(n.tagName)) before.push(n.tagName); } }
      const rankBy = document.querySelector('[data-bh-jev14-rank-by]');
      const viewBy = document.querySelector('[data-bh-jev-viewby]');
      const headline = document.querySelector('[data-bh-jev-class-list] > li');
      const guides = document.querySelector('[data-bh-jev-board-guides]');
      const guideToggle = guides?.querySelector('[data-bh-jev-board-guides-toggle]');
      const summary = document.querySelector('[data-bh-jev-class-summary]');
      const method = document.querySelector('[data-bh-jev-class-rule]');
      const note = [...document.querySelectorAll('[data-bh-jev14-top-five-note]')];
      // Iteration 214: "unboxed" cannot be read from border-style — Tailwind's preflight sets `border-style: solid`
      // with `border-width: 0` on every element, so the original `borderStyle === 'none'` test fails on a bare <p>.
      // A frame is a drawn one: a border with width, a ring/shadow, or a background of its own.
      const boxOf = (e) => { const cs = getComputedStyle(e); const w = ['Top', 'Right', 'Bottom', 'Left'].map((k) => parseFloat(cs[`border${k}Width`]) || 0);
        return { w: Math.max(...w), shadow: cs.boxShadow === 'none' ? '' : cs.boxShadow, bg: /^rgba\(0, 0, 0, 0\)$|^transparent$/.test(cs.backgroundColor) ? '' : cs.backgroundColor }; };
      // The frame must be absent from the sentence and from every wrapper between it and the chart's own panel —
      // the panel is the chart's frame, not a box around the sentence, so the walk stops before it.
      const boxChain = []; for (let el = note[0]; el && !el.hasAttribute('data-bh-jev14-chart'); el = el.parentElement) boxChain.push(el);
      const noteBox = note[0] ? boxChain.map(boxOf) : null;
      const rows = [...document.querySelectorAll('[data-bh-jev14-bars] > li')];
      const firstName = rows[0] ? t(rows[0].querySelector('a')) : null;
      // Iteration 214: the expected Intelligence order is read off the board, not named in the checker. The
      // directive's own draft expected "Jev 1.13.0 (53.1)", but the v1.4.2 artifact's highest Intelligence is
      // GPT-6 Luna at 97.4 — the note's 53.1 is Jev's Intelligence in a two-system comparison, not the maximum.
      const allBars = [...document.querySelectorAll('li[data-bh-jev14-bar]')].map((li) => ({
        key: li.getAttribute('data-bh-jev14-bar'),
        intel: li.getAttribute('data-bh-jev14-bar-intel') === null ? null : Number(li.getAttribute('data-bh-jev14-bar-intel')),
        order: Number(li.getAttribute('data-bh-jev14-bar-order')),
      }));
      const byIntel = [...allBars].sort((a, b) => (b.intel ?? -1) - (a.intel ?? -1) || a.order - b.order).map((r) => r.key);
      const byOrder = [...allBars].sort((a, b) => a.order - b.order).map((r) => r.key);
      const legend = [...document.querySelectorAll('.bh-jevc-swatch')].map((s) => t(s.parentElement));
      const bar1 = rows[0] ? [...rows[0].querySelectorAll('*')].map((e) => getComputedStyle(e).backgroundColor).find((bg) => bg && bg !== 'rgba(0, 0, 0, 0)') : null;
      const llmSwatch = [...document.querySelectorAll('.bh-jevc-swatch')].find((s) => /Instruction model/.test(t(s.parentElement)));
      const llmColor = llmSwatch ? getComputedStyle(llmSwatch).backgroundColor : null;
      // Iteration 214: the directive asks for the unlabelled key "in code font"; innerText cannot see a font, so
      // the check is that wherever a class key is *rendered as a class* and has no label, it sits in a <code>.
      // A whole-body text scan cannot do this: a system in the v1.4.2 board is itself named "system-one-open".
      const classNodes = [...document.querySelectorAll('[data-bh-jev14-class]')];
      const bareKey = classNodes.filter((el) => el.getAttribute('data-bh-jev14-class-labelled') === '0')
        .filter((el) => ![...el.querySelectorAll('code')].some((c) => t(c) === el.getAttribute('data-bh-jev14-class')))
        .map((el) => `${el.tagName}[${el.getAttribute('data-bh-jev14-class')}]: ${t(el).slice(0, 60)}`);
      const unlabelledShown = classNodes.filter((el) => el.getAttribute('data-bh-jev14-class-labelled') === '0').length;
      return { bareKey, unlabelledShown, allBars, byIntel, byOrder, before, rankBy: rankBy ? [...rankBy.querySelectorAll('button')].map((b) => ({ t: t(b), pressed: b.getAttribute('aria-pressed') })) : null,
        viewBy: viewBy ? [...viewBy.querySelectorAll('button[data-bh-jev-view]')].map((b) => ({ t: t(b), view: b.getAttribute('data-bh-jev-view'), pressed: b.getAttribute('aria-pressed') })) : null,
        capabilityJump: !!viewBy?.querySelector('a[data-bh-jev-view="capability"]'),
        firstHeadlineY: headline ? Math.round(headline.getBoundingClientRect().y + scrollY) : null,
        firstHeadlineName: t(headline?.querySelector('[data-bh-jev-source]') ?? headline?.children[1]),
        guideLinks: guides?.querySelectorAll('a').length ?? 0,
        guideToggle: guideToggle ? { expanded: guideToggle.getAttribute('aria-expanded'), height: Math.round(guideToggle.getBoundingClientRect().height) } : null,
        guideVisible: guides ? [...guides.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().width > 0).length : 0,
        summaryBefore: !!summary && !!headline && summary.getBoundingClientRect().y < headline.getBoundingClientRect().y,
        methodAfter: !!method && !!headline && method.getBoundingClientRect().y > headline.getBoundingClientRect().y,
        methodComplete: !!method && /median latency/.test(t(method)) && /Speed axis/.test(t(method)) && !!method.querySelector('a[href="#jev-bubbles"]') && !!method.querySelector('a[href="#jev14-chart-title"]'),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        notes: note.length, noteBox, firstBarY: firstBar ? Math.round(firstBar.getBoundingClientRect().y + scrollY) : null, firstName, legend, bar1, llmColor };
    });
    await p.screenshot({ path: `${OUT}/${ctx}-hub.png` });
    if (want('F-189') && m.viewBy) {
      check('F-189', ctx, 'View by has five metric buttons, Overall pressed, and a Capability return link', m.viewBy.length === 5 && m.viewBy.filter((b) => b.pressed === 'true').length === 1 && m.viewBy.find((b) => b.view === 'overall')?.pressed === 'true' && m.capabilityJump, JSON.stringify(m.viewBy));
      check('F-189', ctx, 'approved fairness sentence appears once without a box', m.notes === 1 && m.noteBox && m.noteBox.every((b) => b.w === 0 && !b.shadow && !b.bg), JSON.stringify(m.noteBox));
      check('F-189', ctx, 'the capability ranking leads the live board', m.firstHeadlineY != null && m.firstHeadlineY < m.firstBarY, `${m.firstHeadlineY} vs ${m.firstBarY}`);
      check('F-189', ctx, 'decision guides appear only once', m.guideLinks === 10, String(m.guideLinks));
      check('F-189', ctx, 'short class summary precedes the bars and full method follows them', m.summaryBefore && m.methodAfter && m.methodComplete, JSON.stringify({summaryBefore:m.summaryBefore,methodAfter:m.methodAfter,methodComplete:m.methodComplete}));
      check('F-189', ctx, 'no horizontal page overflow', !m.overflow, String(m.overflow));
      if (kind === 'mobile') {
        check('F-189', ctx, 'first headline row at y ≤ 720 on a phone', m.firstHeadlineY <= 720, String(m.firstHeadlineY));
        check('F-189', ctx, 'guides start collapsed behind a 44 px tap target', m.guideToggle?.expanded === 'false' && m.guideToggle.height >= 44, JSON.stringify(m.guideToggle));
        await p.locator('[data-bh-jev-board-guides-toggle]').click();
        check('F-189', ctx, 'guides expand by tap with all ten links visible', await p.locator('[data-bh-jev-board-guides-toggle]').getAttribute('aria-expanded') === 'true' && await p.locator('[data-bh-jev-board-guides] a:visible').count() === 10, '');
        await p.locator('[data-bh-jev-board-guides-toggle]').click();
        await p.locator('[data-bh-jev-board-guides-toggle]').focus(); await p.keyboard.press('Enter');
        check('F-189', ctx, 'guides open by keyboard', await p.locator('[data-bh-jev-board-guides-toggle]').getAttribute('aria-expanded') === 'true', '');
        await p.keyboard.press('Space');
        check('F-189', ctx, 'guides close by keyboard', await p.locator('[data-bh-jev-board-guides-toggle]').getAttribute('aria-expanded') === 'false', '');
      } else check('F-189', ctx, 'all ten guides visible on desktop', m.guideVisible === 10, String(m.guideVisible));
      await p.locator('button[data-bh-jev-view="intelligence"]').click();
      const intel = await p.evaluate(() => ({ pressed: document.querySelector('button[data-bh-jev-view="intelligence"]')?.getAttribute('aria-pressed'),
        view: document.querySelector('[data-bh-jev14-chart]')?.getAttribute('data-bh-jev14-view'),
        rows: [...document.querySelectorAll('[data-bh-jev14-bars] > li')].map((li) => li.getAttribute('data-bh-jev14-bar')),
        axes: [...document.querySelectorAll('[data-bh-jev14-bars] > li')].map((li) => Number((li.querySelector('[data-bh-jev14-bar-axes]')?.textContent ?? '').match(/I\s*(\d+(?:\.\d+)?)/)?.[1] ?? NaN)),
        hideLlms: document.querySelector('[data-bh-jev-hide-llms]')?.checked }));
      check('F-189', ctx, 'Intelligence view selects and sorts its bars', intel.pressed === 'true' && intel.view === 'intelligence' && intel.rows.length >= 10 && intel.rows.every((v, i) => v && intel.rows.indexOf(v) === i) && intel.axes.every((v, i) => Number.isFinite(v) && (!i || intel.axes[i - 1] >= v)), JSON.stringify(intel).slice(0, 300));
      check('F-189', ctx, 'Intelligence view hides general-purpose LLM baselines by default', intel.hideLlms === true, String(intel.hideLlms));
      await p.locator('button[data-bh-jev-view="overall"]').click();
      const back = await p.evaluate(() => ({ pressed: document.querySelector('button[data-bh-jev-view="overall"]')?.getAttribute('aria-pressed'), rows: [...document.querySelectorAll('[data-bh-jev14-bars] > li')].map((li) => li.getAttribute('data-bh-jev14-bar')) }));
      check('F-189', ctx, 'Overall restores the official order', back.pressed === 'true' && JSON.stringify(back.rows) === JSON.stringify(m.allBars.slice(0, back.rows.length).map((r) => r.key)), JSON.stringify(back.rows.slice(0, 3)));
    }
    if (want('F-189') && !m.viewBy) {
      check('F-189', ctx, 'rank-by control with two buttons, one pressed', m.rankBy && m.rankBy.length === 2 && m.rankBy.filter((b) => b.pressed === 'true').length === 1, JSON.stringify(m.rankBy));
      check('F-189', ctx, 'no table or disclosure between the chart title and the first bar', m.before.length === 0, JSON.stringify(m.before));
      check('F-189', ctx, 'fairness sentence exactly once, unboxed', m.notes === 1 && m.noteBox && m.noteBox.every((b) => b.w === 0 && !b.shadow && !b.bg), JSON.stringify(m.noteBox));
      if (kind === 'mobile') check('F-189', ctx, 'first bar at y ≤ 720 on a phone', m.firstBarY != null && m.firstBarY <= 720, String(m.firstBarY));
      if (m.rankBy) {
        await p.locator('[data-bh-jev14-rank-by] button', { hasText: 'Intelligence' }).first().click(); await p.waitForTimeout(400);
        const after = await p.evaluate(() => ({
          top: [...document.querySelectorAll('[data-bh-jev14-bars] > li')].map((li) => li.getAttribute('data-bh-jev14-bar')),
          all: [...document.querySelectorAll('li[data-bh-jev14-bar]')].map((li) => li.getAttribute('data-bh-jev14-bar')),
          pressed: [...document.querySelectorAll('[data-bh-jev14-rank-by] button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent.trim()),
        }));
        check('F-189', ctx, 'after "Intelligence" the whole board is in Intelligence order', JSON.stringify(after.all) === JSON.stringify(m.byIntel), `${after.all.slice(0, 3)} vs ${m.byIntel.slice(0, 3)}`);
        check('F-189', ctx, 'after "Intelligence" the open list is the 20 highest-Intelligence systems', JSON.stringify(after.top) === JSON.stringify(m.byIntel.slice(0, 20)), `${after.top.slice(0, 3)} vs ${m.byIntel.slice(0, 3)}`);
        check('F-189', ctx, 'no row is drawn twice or lost by the reorder', after.all.length === m.allBars.length && new Set(after.all).size === m.allBars.length, `${after.all.length} of ${m.allBars.length}`);
        check('F-189', ctx, '"Intelligence" is the pressed button', JSON.stringify(after.pressed) === JSON.stringify(['Intelligence']), JSON.stringify(after.pressed));
        await p.locator('[data-bh-jev14-rank-by] button', { hasText: 'JevBench Score' }).first().click(); await p.waitForTimeout(400);
        const back = await p.evaluate(() => ({
          top: [...document.querySelectorAll('[data-bh-jev14-bars] > li')].map((li) => li.getAttribute('data-bh-jev14-bar')),
          first: (document.querySelector('[data-bh-jev14-bars] > li a')?.textContent || '').replace(/\s+/g, ' ').trim(),
        }));
        check('F-189', ctx, 'after "JevBench Score" the order is the board\'s rank order again', JSON.stringify(back.top) === JSON.stringify(m.byOrder.slice(0, 20)) && back.first === m.firstName, `${back.first} | ${back.top.slice(0, 3)}`);
      }
    }
    if (want('F-192')) {
      check('F-192', ctx, 'the #1 bar is not the llm-baseline colour', m.bar1 && m.llmColor && m.bar1 !== m.llmColor, `${m.bar1} vs ${m.llmColor}`);
      check('F-192', ctx, 'the legend lists the system-one-open class (code key or its label)', m.legend.some((l) => /system-one-open|System One/i.test(l)), JSON.stringify(m.legend));
      check('F-192', ctx, 'every unlabelled class is rendered as its key in <code>', m.bareKey.length === 0, JSON.stringify(m.bareKey).slice(0, 300));
      check('F-192', ctx, 'the unlabelled class is actually shown somewhere', m.unlabelledShown > 0, String(m.unlabelledShown));
    }
  }

  if (want('F-190')) {
    await go('/jev-models/v1.4.2');
    const m = await p.evaluate(() => {
      const t = (el) => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
      const main = document.querySelector('main');
      const h2 = [...main.querySelectorAll('h2')].map(t);
      const board = main.querySelector('[data-bh-jevbench-v14]');
      const blocksBefore = board ? [...main.children].indexOf(board.closest('main > *') || board) : null;
      const firstBar = main.querySelector('[data-bh-jev14-bar]');
      return { h2, blocksBefore, firstBarY: firstBar ? Math.round(firstBar.getBoundingClientRect().y + scrollY) : null, h: document.documentElement.scrollHeight };
    });
    await p.screenshot({ path: `${OUT}/${ctx}-v142.png` });
    check('F-190', ctx, 'no "Frozen top five" heading', !m.h2.some((h) => /Frozen top five/.test(h)), JSON.stringify(m.h2));
    check('F-190', ctx, 'no "Context length" section', !m.h2.some((h) => /^Context length/.test(h)), '');
    check('F-190', ctx, 'at most 5 blocks before the board', m.blocksBefore != null && m.blocksBefore <= 5, String(m.blocksBefore));
    if (kind === 'desktop') check('F-190', ctx, 'page height under 14,000 px at 1440', m.h < 14000, String(m.h));
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
