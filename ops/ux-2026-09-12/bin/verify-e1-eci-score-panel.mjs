#!/usr/bin/env node
// E1 (addendum §E1, 2026-09-11 10:32 UTC): "show in the Score (i) explanation that ECI is part of it."
//
//   node ops/ux-2026-09-12/bin/verify-e1-eci-score-panel.mjs <base> <outDir>
//
// Written 2026-09-27 (iteration 249) to replace an uncommitted check. The 20260927T072004Z review
// gate reported six failures of "Score explanation identifies ECI as a Composite input" — and the
// failing check's own detail was the *filter panel's* text, so the panel it meant had never been
// opened; the same run with a real pointer emulated passed. That verifier was never committed, so
// it could not be repaired. This one is, and it does three things differently:
//
//   * It opens the panel through the Capability Score column's own (i) trigger and reads
//     `[data-bh-infotip-panel]`, which is the element that carries the explanation — never the page.
//     An empty or missing panel is a failure, not a fall-back to some broader text.
//   * The mobile contexts get `hasTouch`/`isMobile`, because the coarse-pointer path renders a
//     `<dialog>` and the fine-pointer path a tooltip span; the copy has to be right in both.
//   * The count the copy states is compared with `COMPOSITE_DEFINITION.slotCount`, not with a number
//     typed here. If the Composite gains or loses an input, this check goes red and the sentence has
//     to be rewritten — which is the coupling that was missing.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { COMPOSITE_DEFINITION } from '../../../lib/composite.mjs';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) { console.error('usage: verify-e1-eci-score-panel.mjs <base> <outDir>'); process.exit(2); }

const NUMERALS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const SLOTS = COMPOSITE_DEFINITION.slotCount;
const COUNT_WORD = NUMERALS[SLOTS] ?? String(SLOTS);
// The two boards E1 named. Both are Composite slots, so both must be in the definition and offered
// as scores of their own — that is what "integrated into our Composite score" means here.
const ECI_SLOTS = ['epoch_eci', 'epoch_eci_software'];

const checks = [];
const check = (ctx, name, ok, detail) => checks.push({ ctx, name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 300) });

check('definition', 'both ECI boards are Composite inputs',
  ECI_SLOTS.every((s) => COMPOSITE_DEFINITION.slots.includes(s)), COMPOSITE_DEFINITION.slots.join(','));
check('definition', 'the Composite has a stated slot count', Number.isInteger(SLOTS) && SLOTS > 0, `${SLOTS}`);

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const [kind, viewport, touch] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
    const ctx = `${kind}_${theme}`;
    const context = await browser.newContext({ viewport, colorScheme: theme, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // The hub times out under load; retry the navigation rather than reporting a false red.
    for (let attempt = 0; ; attempt += 1) {
      try { await page.goto(base, { waitUntil: 'networkidle', timeout: 60_000 }); break; }
      catch (error) { if (attempt === 2) throw error; }
    }
    check(ctx, 'the context really reports the pointer it emulates',
      await page.evaluate(() => matchMedia('(pointer: coarse)').matches) === touch, `coarse=${touch}`);

    const trigger = page.locator('[data-bh-infotip-trigger][aria-label*="Capability Score column" i]').first();
    check(ctx, 'the Capability Score column has an (i) trigger', await trigger.count() > 0,
      await trigger.getAttribute('aria-label').catch(() => ''));
    await trigger.click({ timeout: 8_000 });
    const panel = page.locator('[data-bh-infotip-panel]:visible').first();
    await panel.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
    const text = await panel.innerText().catch(() => '');
    check(ctx, 'the trigger opens a panel with text in it', text.trim().length > 40, `${text.length} chars`);
    // The E1 clause itself, read off the panel and nothing else.
    check(ctx, 'the panel names ECI', /\bECI\b/.test(text), (text.match(/.{0,40}ECI.{0,40}/) ?? [''])[0]);
    check(ctx, 'the panel attributes ECI to Epoch AI', /Epoch AI/.test(text), (text.match(/.{0,30}Epoch AI.{0,30}/) ?? [''])[0]);
    check(ctx, 'the panel says ECI is one of what the score averages',
      new RegExp(`[Aa]verages ${COUNT_WORD}\\b[^.]*ECI`).test(text.replace(/\s+/g, ' ')),
      `expected "averages ${COUNT_WORD} … ECI"`);
    check(ctx, `the stated count matches COMPOSITE_DEFINITION.slotCount (${SLOTS})`,
      new RegExp(`\\b${COUNT_WORD}\\b`, 'i').test(text), COUNT_WORD);
    check(ctx, 'the panel points at the full method', /How we calculate/.test(text), '');
    const href = await panel.locator('a[href*="#score"]').first().getAttribute('href').catch(() => null);
    check(ctx, 'that link is the score section of /about', href === '/about#score', `${href}`);

    // A panel a reader cannot dismiss is not an explanation. Both forms are covered: the coarse
    // path renders a <dialog> with a Close button, the fine path a tooltip that closes on Escape.
    const close = panel.locator('button[aria-label="Close"]');
    if (await close.count()) await close.first().click({ timeout: 5_000 });
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    check(ctx, 'the panel closes again', await page.locator('[data-bh-infotip-panel]:visible').count() === 0,
      `${await page.locator('[data-bh-infotip-panel]:visible').count()} left open`);

    // Both named boards are offered as scores of their own, so a reader can see the inputs.
    const options = await page.locator('select option, [role="option"]').allInnerTexts().catch(() => []);
    const listed = options.join(' | ');
    check(ctx, 'Epoch ECI is offered as a score', /Epoch\s+ECI/.test(listed), '');
    check(ctx, 'Epoch Software ECI is offered as a score', /Epoch Software ECI/.test(listed), '');
    check(ctx, 'no page errors', errors.length === 0, errors.join(' / '));

    await mkdir(outDir, { recursive: true });
    await page.screenshot({ path: join(outDir, `${ctx}-score-panel.png`) });
    await context.close();
  }
}
await browser.close();

const pass = checks.filter((c) => c.ok).length;
await writeFile(join(outDir, 'verification.json'),
  `${JSON.stringify({ base, at: new Date().toISOString(), slot_count: SLOTS, pass, total: checks.length, checks }, null, 2)}\n`);
console.log(`${base}: ${pass}/${checks.length}`);
for (const c of checks) if (!c.ok) console.log(`  FAIL ${c.ctx} | ${c.name} — ${c.detail}`);
process.exit(pass === checks.length ? 0 : 1);
