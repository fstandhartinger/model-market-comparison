// CR-14 (Florian 2026-09-15): compare tab defaults and benchmark radar.
// Usage: node verify-cr-14.mjs <base> <outdir>   (1440×1000 and 390×844, light and dark; writes verification.json + PNGs)
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-14';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const browser = await chromium.launch();
async function settle(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); }

/** Every visible hit target: its announced position and its measured distance from the centre. */
async function geometry(page, svgSelector, cx, cy, R) {
  return page.locator(svgSelector).first().evaluate((svg, [cx, cy, R]) => [...svg.querySelectorAll('circle[role="button"]')].map((c) => {
    const label = c.getAttribute('aria-label') || '';
    const m = label.match(/· (\d+(?:\.\d+)?) (?:on its|\/ 100)/);
    return { label, announced: m ? Number(m[1]) : null, drawn: Math.hypot(Number(c.getAttribute('cx')) - cx, Number(c.getAttribute('cy')) - cy) / R * 100 };
  }), [cx, cy, R]);
}

for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await settle(page);

  // CR-14.1 default pair.
  const chips = await page.locator('[aria-label="Selected models"] [role="listitem"] a').allInnerTexts();
  check(`${tag} CR-14.1 default pair is Fable 5.1 and GPT-6 Astra (top two AA Intelligence families today)`, chips.length === 2 && chips.some((n) => /Fable 5\.1/.test(n)) && chips.some((n) => /GPT-6 Astra/.test(n)), chips);

  // CR-14.4 default axes.
  const section = page.locator('#benchmark-radar');
  await section.scrollIntoViewIfNeeded();
  const axisNames = mobile ? await section.locator('ol li').allInnerTexts() : await section.locator('svg[role="group"] text tspan:first-child').evaluateAll((els) => els.map((e) => e.textContent || ''));
  const joined = axisNames.join(' | ');
  check(`${tag} CR-14.4 eight default axes: AA indices, Epoch ECI ×2, DesignArena ×2, HLE, Terminal-Bench; no GPQA`, axisNames.length === 8
    && /AA Intelligence Index/.test(joined) && /AA Coding Index/.test(joined) && /Epoch ECI/.test(joined) && /Epoch Software ECI/.test(joined) && !/…/.test(joined)
    && /DesignArena Frontend/.test(joined) && /DesignArena Full-Stack/.test(joined) && /Humanity/.test(joined) && /Terminal-Bench/.test(joined) && !/GPQA/.test(joined), axisNames);

  // CR-14.2 scaling: every drawn point sits at its announced position; fixed-scale positions equal the value.
  const simpleSvg = mobile ? '#benchmark-radar svg[viewBox="0 0 360 360"]' : '#benchmark-radar svg[viewBox="0 0 720 500"]';
  const geo = mobile ? await geometry(page, simpleSvg, 180, 180, 120) : await geometry(page, simpleSvg, 360, 245, 150);
  const off = geo.filter((g) => g.announced == null || Math.abs(g.announced - g.drawn) > 1.5);
  check(`${tag} CR-14.2 every point is drawn at its announced position (±1.5)`, geo.length >= 8 && !off.length, { points: geo.length, off: off.slice(0, 3) });
  const coding = geo.filter((g) => /AA Coding Index: [\d.]+ · \d+ on its 0–100 scale/.test(g.label));
  check(`${tag} CR-14.2 AA Coding Index on its 0–100 scale: position = rounded value`, coding.length >= 1 && coding.every((g) => { const v = Number(g.label.match(/Index: ([\d.]+)/)[1]); return Math.abs(Math.round(v) - g.announced) <= 1; }), coding.map((g) => g.label));
  const peer = geo.filter((g) => /Elo|ECI/.test(g.label));
  check(`${tag} CR-14.2 open-ended Elo/ECI points say they use the measured range`, peer.length >= 1 && peer.every((g) => /no fixed scale/.test(g.label)), peer.slice(0, 2).map((g) => g.label));

  // CR-14.3 exact value on hover (desktop), tap (mobile), keyboard focus (both).
  // The topmost target: coinciding points (two models at ~51) overlap, and the tooltip lists every model anyway.
  const hit = page.locator(`${simpleSvg} circle[role="button"]`).last();
  const tip = section.locator('[role="status"]');
  if (mobile) {
    await hit.tap(); await page.waitForTimeout(250);
    const shown = await tip.first().innerText({ timeout: 3000 }).catch(() => '');
    check(`${tag} CR-14.3 tap shows the exact value`, /\d/.test(shown), shown);
    const box = await page.locator(simpleSvg).boundingBox();
    await page.touchscreen.tap(box.x + 6, box.y + 6); await page.waitForTimeout(250);
    check(`${tag} CR-14.3 a tap on the chart background hides it`, (await tip.count()) === 0, String(await tip.count()));
  } else {
    await hit.hover(); await page.waitForTimeout(250);
    const shown = await tip.first().innerText({ timeout: 3000 }).catch(() => '');
    check(`${tag} CR-14.3 hover shows the exact value of every compared model on that axis`, /\d/.test(shown) && /Fable 5\.1/.test(shown) && /GPT-6 Astra/.test(shown), shown);
    await page.mouse.move(5, 5); await page.waitForTimeout(150);
  }
  await hit.focus(); await page.waitForTimeout(200);
  const focused = await tip.first().innerText({ timeout: 3000 }).catch(() => '');
  check(`${tag} CR-14.3 keyboard focus shows the exact value`, /\d/.test(focused), focused);
  await section.screenshot({ path: `${OUT}/${tag}-radar-simple.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  check(`${tag} CR-14.3 Escape hides the tooltip`, (await tip.count()) === 0, String(await tip.count()));

  // CR-14.5 toggle to the detailed topic radar and back.
  await section.getByRole('button', { name: /^Detailed/ }).click(); await page.waitForTimeout(400);
  const detailed = section.locator('svg[aria-label^="Detailed radar"]');
  const spokes = await detailed.locator('line').count(), lines = await detailed.locator('polyline').count(), dHits = await detailed.locator('circle[role="button"]').count();
  check(`${tag} CR-14.5 detailed topic radar: many axes, per-topic lines, focusable points`, (await detailed.count()) === 1 && spokes > 8 && lines >= 2 && dHits > 16, { spokes, lines, dHits });
  const dHit = detailed.locator('circle[role="button"]').last();
  if (mobile) await dHit.tap(); else await dHit.hover();
  await page.waitForTimeout(250);
  const dShown = await section.locator('[role="status"]').first().innerText({ timeout: 3000 }).catch(() => '');
  if (!dShown) await page.screenshot({ path: `${OUT}/${tag}-debug-detailed-tap.png` });
  check(`${tag} CR-14.5 detailed radar shows exact values too`, /\d/.test(dShown), dShown);
  await section.screenshot({ path: `${OUT}/${tag}-radar-detailed.png` });
  await section.getByRole('button', { name: /^Simple/ }).click(); await page.waitForTimeout(300);
  check(`${tag} CR-14.5 back to the simple radar`, (await page.locator(simpleSvg).count()) === 1 && (await section.getByRole('button', { name: /^Simple/ }).getAttribute('aria-pressed')) === 'true', '');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${tag} no horizontal page overflow, no page errors`, overflow <= 1 && !errors.length, { overflow, errors });

  // Shared radar on the Benchmaxxing report still renders, now with focusable points.
  if (theme === 'dark') {
    await page.goto(`${BASE}/benchmaxxing`, { waitUntil: 'domcontentloaded' }); await settle(page);
    const bm = page.locator('svg[aria-label^="Many-axis radar"]');
    check(`${tag} Benchmaxxing report radar renders with focusable points`, (await bm.count()) === 1 && (await bm.locator('circle[role="button"]').count()) > 5, String(await bm.locator('circle[role="button"]').count()));
  }
  await context.close();
}
await browser.close();
const passed = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, runner: process.env.BH_RUNNER || 'unspecified', at: new Date().toISOString(), passed, total: checks.length, checks }, null, 2));
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name} — ${c.detail.slice(0, 220)}`);
console.log(`${passed}/${checks.length}`);
process.exit(passed === checks.length ? 0 : 1);
