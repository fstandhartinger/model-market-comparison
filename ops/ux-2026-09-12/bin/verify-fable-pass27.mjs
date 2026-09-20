// Fable pass-27 live verifier: the Jev disclosure/grid refinements and Step-5 vendor-claim labelling.
// Usage: node verify-fable-pass27.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-fable-pass27';
await fs.mkdir(OUT, { recursive: true });
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const b = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) for (const [kind, vp] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const mobile = kind === 'mobile'; const tag = `${kind}_${theme}`;
    const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, colorScheme: theme, deviceScaleFactor: mobile ? 2 : 1 });
    await c.addInitScript((t) => { try { localStorage.setItem('theme', t); localStorage.setItem('bh-theme', t); } catch {} }, theme);
    const p = await c.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(`${BASE}/jev-models`, { waitUntil: 'networkidle', timeout: 60000 });
    const panel = ((await p.textContent('[data-bh-jev12-cost-unit-panel]')) || '').replace(/\s+/g, ' ').trim();
    check(`${tag} cost panel has the two exact sentences`, /^Every price here is US dollars per 1,000 decisions — not per 1,000 tokens\. One decision is a whole question — state, rubric and options — about 950 input tokens for Jev 1\.13\.0, so at its \$0\.042 per million input tokens 1,000 decisions cost \$0\.0399\.$/.test(panel), panel);
    const note = (await p.textContent('[data-bh-jev12-cost-unit]')) || '';
    check(`${tag} cost note names decisions and its token contrast`, /\$ per 1,000 decisions, not per 1,000 tokens — one decision ≈ 950 input tokens\./.test(note), note);
    const head = (await p.textContent('[data-bh-jev12-table] thead')) || '';
    check(`${tag} cost header is compact and explicit`, /\$ \/ 1,000 decisions/.test(head) && /not tokens/.test(head), head.slice(0, 220));
    const hm = await p.$('[data-bh-jev12-honorable]');
    const detail = await p.$('[data-bh-jev12-honorable-details]');
    const initiallyClosed = !!detail && !(await detail.getAttribute('open'));
    const visibleReason = (await p.textContent('[data-bh-jev12-honorable-reason]')) || '';
    check(`${tag} honorable mention is compact and closed`, !!hm && initiallyClosed && (await hm.boundingBox())?.height <= (mobile ? 520 : 260) && (visibleReason.match(/[.!?](?:\s|$)/g) || []).length === 2, { initiallyClosed, visibleReason });
    if (detail) await detail.evaluate((x) => x.setAttribute('open', 'open'));
    const hmText = hm ? (await hm.textContent()) || '' : '';
    check(`${tag} honorable disclosure keeps the explanation, caveats, finding and links`, /0\.7 confidence/.test(hmText) && /\$0\.033 per 1,000/.test(hmText) && /97\.3 %/.test(hmText) && (await p.$$eval('[data-bh-jev12-honorable-details] a', (a) => a.length)) >= 4, hmText.slice(-300));
    const grid = await p.$('[data-bh-jev12-task-grid]');
    if (grid) await grid.locator('summary').click();
    await p.waitForTimeout(100);
    const gridInfo = await p.evaluate(() => {
      const wrap = document.querySelector('[data-bh-jev12-task-table]')?.parentElement;
      const table = document.querySelector('[data-bh-jev12-task-table]');
      const first = table?.querySelector('tbody tr[data-bh-jev12-task] th');
      const outcome = table?.querySelector('tbody tr[data-bh-jev12-task] td');
      const group = table?.querySelector('[data-bh-jev12-task-group] th');
      const legend = document.querySelector('[data-bh-jev12-task-legend]');
      return { wrap: wrap?.getBoundingClientRect().toJSON(), table: table?.getBoundingClientRect().toJSON(), first: first?.getBoundingClientRect().toJSON(), outcome: outcome?.getBoundingClientRect().toJSON(), firstText: first?.textContent || '', firstId: first?.parentElement?.getAttribute('data-bh-jev12-task') || '', title: first?.getAttribute('title') || '', aria: first?.getAttribute('aria-label') || '', group: group?.textContent || '', legend: legend?.textContent || '' };
    });
    const firstWidth = gridInfo.first?.width ?? 0; const outcomeOffset = (gridInfo.outcome?.left ?? 0) - (gridInfo.wrap?.left ?? 0);
    check(`${tag} task grid pins the Task column and keeps the outcome cells beside it`, firstWidth >= (mobile ? 116 : 204) && firstWidth <= (mobile ? 124 : 212) && outcomeOffset <= (mobile ? 130 : 260), { firstWidth, outcomeOffset, tableWidth: gridInfo.table?.width });
    check(`${tag} task labels are accessible and compact on phones`, !mobile || (!gridInfo.firstText.includes('hard-') && gridInfo.title.includes(gridInfo.firstId) && /choice|noul|score/.test(gridInfo.aria)), { firstText: gridInfo.firstText, firstId: gridInfo.firstId, title: gridInfo.title, aria: gridInfo.aria });
    check(`${tag} task legend explains the phone prefix`, !mobile || /shown without their tier prefix/.test(gridInfo.legend), gridInfo.legend.slice(-180));
    check(`${tag} Jev page has no page errors`, errors.length === 0, errors);
    await p.screenshot({ path: `${OUT}/${tag}-jev.png`, fullPage: false });

    await p.goto(`${BASE}/models/${encodeURIComponent('step-5-preview::default')}`, { waitUntil: 'networkidle', timeout: 60000 });
    const vendor = (await p.textContent('[data-bh-sheet-vendor-line]')) || '';
    const claimCount = await p.$$eval('span', (e) => e.filter((x) => (x.textContent || '').trim() === "developer's claim").length);
    check(`${tag} Step-5 sheet names the vendor claim population`, /values are .*own claims \(†\), not independent measurements/.test(vendor) && /matching independent result replaces a claim/.test(vendor), vendor);
    check(`${tag} Step-5 rows label developer claims beside values`, claimCount >= 40, String(claimCount));
    check(`${tag} Step-5 has no page errors`, errors.length === 0, errors);
    await p.screenshot({ path: `${OUT}/${tag}-step5.png`, fullPage: false });
    await c.close();
  }
} finally { await b.close(); }
const bad = checks.filter((x) => !x.ok);
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: checks.length - bad.length, total: checks.length, checks }, null, 2));
console.log(`${BASE}: ${checks.length - bad.length}/${checks.length}`);
for (const x of bad) console.log('FAIL', x.name, x.detail);
process.exit(bad.length ? 1 : 0);
