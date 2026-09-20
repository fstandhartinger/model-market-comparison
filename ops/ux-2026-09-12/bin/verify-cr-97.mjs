// CR-97 live verification (2026-09-20): classifier.dev leaves the ranking and becomes an honorable mention.
// Florian: "Lass uns classifier.dev vorerst aus der Liste nehmen und darunter auflisten und erklären, wieso wir es
// nicht im Ranking haben … Das darf schon gern als honorable mention gelistet sein …, aber bitte nicht als #1."
// Checks, on the live page: it carries no rank anywhere, Jev is #1, the honorable-mention section exists with the
// rule, the model it runs, its axes, the flat-rate caveat and the judge/hard finding, and the method states the rule.
// Usage: node verify-cr-97.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-97';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const a = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const row = (k) => a.systems.find((s) => s.key === k);
const CD = 'classifier-dev-fast';

// --- CR-97.1 the artifact: listed, not ranked; nothing else moved but the ranks below it ---
check('artifact: revision v1.2.4 or later', ['v1.2.4', 'v1.2.5'].includes(a.revision), a.revision);
const cd = row(CD);
check('artifact: classifier.dev is an honorable mention with no rank', cd && cd.listing === 'honorable_mention' && cd.ranked === false && cd.partial === false && cd.rank === null, cd && [cd.listing, cd.rank]);
check('artifact: it keeps every number it earned', cd && cd.jevbench_score.toFixed(1) === '84.8' && cd.axes.intelligence > 0 && cd.axes.calibration > 0 && cd.axes.speed > 0 && cd.axes.cost > 0 && cd.cost.usd_per_1000 > 0, cd && [cd.jevbench_score, cd.cost.usd_per_1000]);
check('artifact: it is not ranked under any weighting either', cd && cd.rank_under === undefined, cd && cd.rank_under);
const ranked = a.systems.filter((s) => s.ranked);
check('artifact: Jev 1.13.0 is #1 at 75.4', ranked[0] && ranked[0].key === 'jev-1.13.0' && ranked[0].rank === 1 && ranked[0].jevbench_score.toFixed(1) === '75.4', ranked[0] && [ranked[0].key, ranked[0].jevbench_score]);
check('artifact: ranked rows are a contiguous score-ordered sequence', ranked.length >= 17 && ranked.every((s, i) => s.rank === i + 1) && ranked.every((s, i) => i === 0 || s.jevbench_score <= ranked[i - 1].jevbench_score), ranked.length);
check('artifact: only ranked rows carry a rank', a.systems.every((s) => (s.rank === null) !== s.ranked), a.systems.filter((s) => !s.ranked && s.rank !== null).map((s) => s.key));
check('artifact: an honorable mention outscores #1 and is still not ranked', cd.jevbench_score > ranked[0].jevbench_score, [cd.jevbench_score, ranked[0].jevbench_score]);

// --- CR-97.2 the rule and the reason, published with the data ---
const hm = a.honorable_mentions;
check('artifact: the rule is published and says "not ranked against the models"', /not ranked against the models/.test(hm?.rule || '') && /another entrant/.test(hm?.rule || ''), (hm?.rule || '').slice(0, 140));
check('artifact: the ranked scoring text carries the rule too', /not ranked against the models/.test(a.scoring.ranked), a.scoring.ranked.slice(0, 160));
const d = hm?.systems?.[CD];
check('artifact: it names the ranked model it runs', d && d.runs_on_key === 'jev-1.13.0' && row(d.runs_on_key).ranked && /Jev/.test(d.runs_on), d && [d.runs_on_key, d.runs_on]);
check('artifact: the reason quotes their own page for the fast tier', d && /The fast tier is Jev/.test(d.why_not_ranked) && /classifier\.dev\/benchmark/.test(d.why_not_ranked), (d?.why_not_ranked || '').slice(0, 160));
check('artifact: the smart tier is described as escalation on low confidence, not best-of-N', d && /0\.7 confidence/.test(d.why_not_ranked) && /not best-of-N/.test(d.why_not_ranked) && /self-consistency/.test(d.why_not_ranked), (d?.why_not_ranked || '').slice(-200));
check('artifact: we do not claim to have measured the smart tier', d && /never run/.test(d.tier_measured), d?.tier_measured);
check('artifact: the flat-rate caveat is kept ($0.033 at a tenth of the allowance)', d && /\$0\.033 per 1,000/.test(d.price_note) && /200,000/.test(d.price_note), (d?.price_note || '').slice(0, 200));
check('artifact: we do not guess why it is cheap', d && /do not know their cost basis/.test(d.price_note) && !/waitlist/i.test(JSON.stringify(hm)) && !/vercel/i.test(JSON.stringify(hm)), '');
check('artifact: the honest finding is there (97.3 % vs 94.5 %, 70.5 % vs 74.1 %)', d && /97\.3 %/.test(d.not_pass_through) && /94\.5 %/.test(d.not_pass_through) && /70\.5 %/.test(d.not_pass_through) && /74\.1 %/.test(d.not_pass_through), (d?.not_pass_through || '').slice(0, 200));
check('artifact: the service is credited, not criticised', d && /legitimate/.test(d.credit) && d.sources.length >= 3, d?.credit);
check('artifact: the revision log explains the change', (a.revision_log || []).some((e) => e.revision === 'v1.2.4' && /honorable mention/i.test(e.note)), '');

// --- CR-97.3 the page ---
const b = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
    const m = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: m, hasTouch: m, colorScheme: theme, deviceScaleFactor: m ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    try {
      await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
      // The chart: Jev is bar 1, classifier.dev is below every ranked bar and shows no rank number.
      const bars = await p.$$eval('[data-bh-jevc-bars] [data-bh-jev12-bar]', (e) => e.map((x) => x.getAttribute('data-bh-jev12-bar')));
      check(`${tag}: Jev 1.13.0 is the first bar`, bars[0] === 'jev-1.13.0', bars.slice(0, 4));
      check(`${tag}: classifier.dev sits below every ranked bar`, bars.indexOf(CD) >= ranked.length, [bars.indexOf(CD), ranked.length]);
      const cdBar = await p.$(`[data-bh-jevc-bars] [data-bh-jev12-bar="${CD}"]`);
      check(`${tag}: its bar carries no rank number`, cdBar && (await cdBar.$eval('[data-bh-jevc-rank]', (x) => x.textContent.trim())) === '', '');
      const cdText = cdBar ? (await cdBar.textContent()) || '' : '';
      check(`${tag}: its bar says "honorable mention" and keeps its score`, /honorable mention/i.test(cdText) && cdText.includes('84.8'), cdText.slice(0, 160));
      check(`${tag}: no bar labels it #1`, !/^\s*1\s/.test(cdText), cdText.slice(0, 40));
      // The headline: the reason, in plain English, where the "why a service leads" line used to be.
      const lead = (await p.textContent('[data-bh-jev12-honorable-lead]')) || '';
      check(`${tag}: the headline says it is not ranked and why`, /not ranked/i.test(lead) && /Jev/.test(lead) && /same model/i.test(lead), lead.slice(0, 200));
      check(`${tag}: the old "a Jev service leads" line is gone`, (await p.$('[data-bh-jev12-service-lead]')) === null, '');
      // The table: its own labelled block, and the row is tagged, not ranked.
      const tableHead = (await p.textContent('[data-bh-jev12-honorable-head]')) || '';
      check(`${tag}: the table has an honorable-mention block with the rule`, /Honorable mentions/i.test(tableHead) && /not ranked against the models/.test(tableHead), tableHead.slice(0, 200));
      const tr = await p.$(`[data-bh-jev12-row="${CD}"]`);
      check(`${tag}: the table row is marked not ranked`, tr && (await tr.getAttribute('data-bh-jev12-ranked')) === '0' && /honorable mention · not ranked/i.test((await tr.textContent()) || ''), '');
      check(`${tag}: the table row has no rank cell`, tr && (await tr.$eval('td', (x) => x.textContent.trim())) === '', '');
      // The section itself: the rule, the model it runs on, the axes, the price caveat and the finding.
      const sec = await p.$('[data-bh-jev12-honorable]');
      check(`${tag}: the honorable-mention section exists`, !!sec, '');
      const details = await p.$$('[data-bh-jev12-honorable-details]');
      const closedByDefault = details.length > 0 && (await details[0].getAttribute('open')) === null;
      for (const detail of details) await detail.evaluate((x) => x.setAttribute('open', 'open'));
      const secText = sec ? (await sec.textContent()) || '' : '';
      check(`${tag}: it states the rule`, /not ranked against the models/.test(secText), secText.slice(0, 160));
      const visibleReason = (await p.textContent('[data-bh-jev12-honorable-reason]')) || '';
      const visibleSentenceCount = visibleReason.replace(/v\d+(?:\.\d+)+/g, 'version').split(/(?<=[.!?])\s+/).filter(Boolean).length;
      check(`${tag}: the visible reason is two sentences`, visibleSentenceCount === 2, visibleReason);
      check(`${tag}: the explanation is closed by default`, closedByDefault, '');
      check(`${tag}: it says what it runs on`, /Runs on Jev \(TypeSafe\)/.test(secText), '');
      check(`${tag}: it shows the score and the axes`, secText.includes('84.8') && /Intelligence/.test(secText) && /Calibration/.test(secText) && /Speed/.test(secText) && /Cost/.test(secText), '');
      check(`${tag}: it keeps the flat-rate caveat`, /\$0\.033 per 1,000/.test(secText) && /200,000/.test(secText), '');
      check(`${tag}: it reports the judge/hard finding honestly`, /97\.3 %/.test(secText) && /70\.5 %/.test(secText), '');
      check(`${tag}: it explains the smart tier without claiming to have measured it`, /0\.7 confidence/.test(secText) && /never run/.test(secText), '');
      check(`${tag}: it credits the service`, /legitimate/.test(secText) && /michael_chomsky/.test(secText), '');
      check(`${tag}: no guess about a waitlist or Vercel quota anywhere on the page`, !/waitlist/i.test(await p.textContent('body')) && !/vercel/i.test(await p.textContent('body')), '');
      // The method section states the general rule.
      const method = await p.$('#method');
      if (method) await method.evaluate((x) => x.setAttribute('open', 'open'));
      const methodText = (await p.textContent('[data-bh-jev12-method-honorable]')) || '';
      check(`${tag}: the method states the rule as a general rule`, /not ranked against the models/i.test(methodText), methodText.slice(0, 200));
      // The radar picker offers it, without a rank.
      const opts = await p.$$eval('[data-bh-jev12-radar-pick="a"] option', (e) => e.map((x) => ({ v: x.value, t: (x.textContent || '').trim() })));
      const opt = opts.find((x) => x.v === CD);
      check(`${tag}: the radar still offers it, labelled honorable mention`, opt && /honorable mention/i.test(opt.t) && !/^\d+\./.test(opt.t), opt);
      check(`${tag}: no page errors`, errs.length === 0, errs);
      await p.locator('[data-bh-jev12-honorable]').screenshot({ path: `${OUT}/${tag}-honorable.png` });
      await p.locator('[data-bh-jevc-chart]').screenshot({ path: `${OUT}/${tag}-chart.png` });
    } finally { await c.close(); }
  }
} finally { await b.close(); }
const bad = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - bad.length, total: checks.length, checks }, null, 1));
console.log(`${BASE}: ${checks.length - bad.length}/${checks.length}`); for (const x of bad) console.log('FAIL', x.name, x.detail);
process.exit(bad.length ? 1 : 0);
