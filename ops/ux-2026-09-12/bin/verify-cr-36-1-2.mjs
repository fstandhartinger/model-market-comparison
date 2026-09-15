// CR-36.1 / CR-36.2 (F-95): Compare "Add a model" listbox, one entry per model, best-of-variant values named.
// API checks against <base>/api/benchmark-view?collapse=1; UI checks at 1440/390, light/dark.
// Usage: node verify-cr-36-1-2.mjs <base> <outdir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-36-1-2';
await fs.mkdir(OUT, { recursive: true });
const checks = []; const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1200); };

// API: variants of one model collapse to one entry; per-benchmark best-of with the variant named.
const api = await (await fetch(`${BASE}/api/benchmark-view?model=claude-fable-5.1::high&model=claude-fable-5.1::max&model=gpt-6-astra::xhigh&collapse=1`)).json();
check('CR-36.2 API: two Fable variants + one Astra variant collapse to two picks', api.picks?.length === 2, api.picks);
const fams = api.families ?? [];
const fable = fams.filter((f) => /Fable 5\.1$/.test(f.name)), astra = fams.filter((f) => /^GPT-6 Astra$/.test(f.name));
check('CR-36.2 API: Fable 5.1 and GPT-6 Astra appear once each in the family list', fable.length === 1 && astra.length === 1, { fable: fable.map((f) => f.id), astra: astra.map((f) => f.id) });
const repId = fable[0]?.id, variants = new Set(fable[0]?.variants ?? []);
check('CR-36.2 API: no score row remains under a non-representative Fable variant id', api.axes.every((a) => a.scores.every((r) => r.modelId === repId || !variants.has(r.modelId))), repId);
const rows = api.axes.flatMap((a) => a.scores.filter((r) => r.modelId === repId).map((r) => ({ a, r })));
const best = rows.filter(({ r }) => r.bestOf > 1);
check('CR-36.2 API: representative rows name their variant and the number of variants', best.length > 0 && best.every(({ r }) => r.variantLabel && r.variantId), best.slice(0, 3).map(({ r }) => [r.value, r.variantLabel]));
// Independent re-computation on the exact (uncollapsed) view: chosen value = best measured latest among variants.
// The route answers at most 4 model ids per request, so fetch the exact variants in batches and merge their rows.
const raw = { axes: [] };
for (let i = 0, list = [...variants]; i < list.length; i += 4) {
  const part = await (await fetch(`${BASE}/api/benchmark-view?${list.slice(i, i + 4).map((v) => `model=${encodeURIComponent(v)}`).join('&')}`)).json();
  for (const axis of part.axes) { const known = raw.axes.find((a) => a.id === axis.id); if (known) known.scores.push(...axis.scores); else raw.axes.push({ ...axis, scores: [...axis.scores] }); }
}
let compared = 0, wrong = [];
for (const axis of raw.axes) {
  if (axis.higherBetter == null) continue;
  const measured = axis.scores.filter((r) => variants.has(r.modelId) && r.basis === 'measured' && !r.derived && !r.lowSample);
  if (new Set(measured.map((r) => r.modelId)).size < 2) continue;
  const latest = new Map();
  for (const r of measured) { const p = latest.get(r.modelId); if (!p || r.date > p.date || (r.date === p.date && r.id < p.id)) latest.set(r.modelId, r); }
  const want = [...latest.values()].map((r) => r.value).reduce((m, v) => axis.higherBetter ? Math.max(m, v) : Math.min(m, v));
  const got = api.axes.find((a) => a.id === axis.id)?.scores.filter((r) => r.modelId === repId && r.basis === 'measured' && !r.derived && !r.lowSample)
    .sort((x, y) => (y.date > x.date ? 1 : y.date < x.date ? -1 : x.id < y.id ? -1 : 1))[0]?.value;
  compared++; if (got !== want) wrong.push({ axis: axis.name, want, got });
}
check('CR-36.2 API: per-benchmark value = best measured latest result among the variants (independent recompute)', compared > 0 && !wrong.length, { compared, wrong: wrong.slice(0, 3) });

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
  const tag = `${kind}_${theme}`, mobile = kind === 'mobile';
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, colorScheme: theme });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(`${BASE}/compare`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => { try { localStorage.setItem('bh-theme', t); } catch {} }, theme);
  await page.reload(); await settle(page);

  const chips = await page.locator('[aria-label="Selected models"] [role="listitem"] a').allInnerTexts();
  check(`${tag} CR-14.1 default pair still Fable 5.1 and GPT-6 Astra, without variant detail in the name`, chips.length === 2 && chips.some((n) => /^Claude Fable 5\.1$/.test(n)) && chips.some((n) => /^GPT-6 Astra$/.test(n)), chips);
  const summary = await page.locator('[data-variant-summary]').first().getAttribute('data-variant-summary').catch(() => null);
  check(`${tag} CR-36.2 chip tooltip names the variants behind best-of values`, /^Best of \d+ reasoning variants, per benchmark\. Values from: \w/.test(summary || ''), summary);

  const input = page.locator('[data-compare-add]');
  if (mobile) await input.tap(); else await input.click();
  await page.waitForTimeout(400);
  const list = page.locator('[role="listbox"]').first();
  const opened = await list.isVisible().catch(() => false);
  check(`${tag} CR-36.1 focusing the input opens the listbox`, opened, '');
  const empty = await page.locator('[data-picker-option]').allInnerTexts();
  check(`${tag} F-95 empty query shows "Top by AA Intelligence Index" with up to 8 entries, none already selected`, empty.length > 0 && empty.length <= 8 && !empty.some((t) => /^Claude Fable 5\.1\b/.test(t) || /^GPT-6 Astra\b/.test(t)), empty.slice(0, 3));
  const typing = mobile ? page.locator('.bh-picker-sheet input[role="combobox"]') : input;
  await typing.fill('fable');
  await page.waitForTimeout(300);
  // Fable is already picked, so search a different family to prove single entries.
  await typing.fill('gpt-5');
  await page.waitForTimeout(300);
  const names = await page.locator('[data-picker-option] [data-option-name]').evaluateAll((els) => els.map((e) => e.getAttribute('data-option-name')));
  const heights = await page.locator('[data-picker-option]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  const opts = names;
  check(`${tag} CR-36.2 typing lists one option per model (no duplicate names)`, opts.length > 0 && new Set(names).size === names.length, names.slice(0, 6));
  check(`${tag} F-95 options are at most two lines (≤ 60 px) and never include a reasoning suffix`, heights.every((h) => h <= 60) && !names.some((n) => /\((high|xhigh|max|low|medium|.*Effort.*)\)$/.test(n)), { heights: heights.slice(0, 4), names: names.slice(0, 4) });
  const bold = await page.locator('[data-picker-option] b').first().innerText().catch(() => '');
  check(`${tag} F-95 matched characters are bold`, /gpt-5/i.test(bold), bold);
  const geo = await page.evaluate(() => {
    const box = (document.querySelector('.bh-picker-pop') || document.querySelector('.bh-picker-sheet'))?.getBoundingClientRect();
    const el = document.querySelector('.bh-picker-pop') || document.querySelector('.bh-picker-sheet');
    const bg = el ? getComputedStyle(el).backgroundColor : '';
    const ul = document.querySelector('[role="listbox"]');
    const r = box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null;
    const x = r ? Math.round((r.left + r.right) / 2) : 0, y = r ? Math.round(r.top + 40) : 0;
    const top = document.elementFromPoint(x, y);
    return { r, bg, iw: innerWidth, ih: innerHeight, scroll: ul ? getComputedStyle(ul).overflowY : '', onTop: !!(el && top && el.contains(top)), pageOverflow: document.documentElement.scrollWidth > innerWidth };
  });
  const opaque = /^rgb\(/.test(geo.bg) || /rgba\([^)]*,\s*1\)$/.test(geo.bg);
  check(`${tag} F-95 listbox is opaque, on top, inside the viewport, scrolls internally, no page overflow`, geo.r && opaque && geo.onTop && geo.r.left >= 0 && geo.r.right <= geo.iw + 0.5 && geo.scroll === 'auto' && !geo.pageOverflow, geo);
  if (!mobile) check(`${tag} F-95 desktop listbox is at least 360 px wide`, geo.r && geo.r.right - geo.r.left >= 359.5, geo.r);
  else check(`${tag} F-95 phone listbox is a full-width sheet`, geo.r && geo.r.left <= 0.5 && geo.r.right >= geo.iw - 0.5, geo.r);
  await page.screenshot({ path: `${OUT}/${tag}-picker.png` });

  // Keyboard-only selection: ↓ then Enter adds the second option.
  const beforeCount = chips.length;
  await typing.press('ArrowDown');
  const activeId = await typing.getAttribute('aria-activedescendant');
  check(`${tag} F-95 ↓ moves aria-activedescendant`, /opt-1$/.test(activeId || ''), activeId);
  const chosenName = names[1];
  await typing.press('Enter');
  await page.waitForTimeout(2500); await settle(page);
  const after = await page.locator('[aria-label="Selected models"] [role="listitem"] a').allInnerTexts();
  check(`${tag} F-95 Enter adds the active option as one chip`, after.length === beforeCount + 1 && after.includes(chosenName), { after, chosenName });
  const url = page.url();
  check(`${tag} CR-36.2 URL carries the representative ids`, (new URL(url).searchParams.getAll('model')).length === after.length, url);
  // Esc closes.
  const again = mobile ? input : input;
  if (mobile) await again.tap(); else await again.click();
  await page.waitForTimeout(300);
  await (mobile ? page.locator('.bh-picker-sheet input[role="combobox"]') : input).press('Escape');
  await page.waitForTimeout(300);
  check(`${tag} F-95 Esc closes the listbox`, (await page.locator('[role="listbox"]').count()) === 0, '');

  // Full comparison cells name the variant for best-of values.
  await page.locator('#full-comparison').scrollIntoViewIfNeeded();
  const cellLabels = await page.locator('#full-comparison [data-best-variant]').allInnerTexts();
  check(`${tag} CR-36.2 full comparison cells name the variant behind best-of values`, cellLabels.length > 0 && cellLabels.every((t) => /^best of variants: \S/.test(t)), cellLabels.slice(0, 3));
  check(`${tag} no page errors`, !errors.length, errors);
  await context.close();
}
await browser.close();
const failed = checks.filter((c) => !c.ok);
const result = { base: BASE, runner: process.env.BH_RUNNER || 'unknown', at: new Date().toISOString(), total: checks.length, passed: checks.length - failed.length, checks };
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify(result, null, 2));
console.log(`${result.passed}/${result.total} passed`); for (const f of failed) console.log('FAIL', f.name, f.detail.slice(0, 300));
process.exit(failed.length ? 1 : 0);
