#!/usr/bin/env node
// CR-167.2 / D207 — the fast-lane banner must not cover content on a phone.
//
// Florian, CR-167 (25 Sep 2026): the bar is "fixed at the bottom, readable in light and dark, and
// not covering content on mobile (reserve space or make it compact)". Reserving space with
// `body { padding-bottom }` only keeps the *end* of the document reachable; it says nothing about
// the first viewport, where the bar is an opaque fixed overlay. Review gate
// REVIEW-20260925T192004Z.md measured a 145 px bar whose top edge (y 699) sat exactly on the first
// Jev-class result row (y 699, bottom 778) and filed D207.
//
// So this verifier pairs every height budget with a visibility companion, per that gate's note:
// "a budget expressed as a document offset stops being true the moment something is position:
// fixed". It measures the row's bottom against the banner's top, not a document offset.
//
// Usage:  node verify-cr-167-2.mjs <baseUrl> <outDir>
// Example: node ops/ux-2026-09-12/bin/verify-cr-167-2.mjs https://benchmarkheaven.com /tmp/out
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3];
if (!OUT) { console.error('usage: verify-cr-167-2.mjs <baseUrl> <outDir>'); process.exit(2); }
await fs.mkdir(OUT, { recursive: true });

// First headline result row per banner route. The bar is bottom-fixed, so it always overlays the
// bottom of the viewport; the acceptance is that the *leading* result stays readable on load.
const ROUTES = [
  { route: '/jev-models', firstRow: '[data-bh-jev-class-list] > li' },
  { route: '/image-jev-bench', firstRow: '[data-bh-mm-bars] > li' },
];
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 1000 };
// The collapsed bar is 3 px border + 4 + 44 + 4 = 55 px, all in px. 60 leaves room for sub-pixel
// rounding and nothing else: if this trips, someone added vertical padding (see app/globals.css).
const COLLAPSED_MAX = 60;

const checks = [];
const metrics = {};
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); };

function measure() {
  const r4 = (n) => (n == null ? null : Math.round(n * 10) / 10);
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r4(r.top), bottom: r4(r.bottom), left: r4(r.left), right: r4(r.right), height: r4(r.height), width: r4(r.width) }; };
  const banner = document.querySelector('[data-bh-fastlane-banner]');
  const teaser = document.querySelector('[data-bh-fastlane-teaser]');
  const body = document.querySelector('[data-bh-fastlane-body]');
  const close = banner?.querySelector('.bh-fastlane-close') ?? null;
  const vis = (el) => !!el && typeof el.checkVisibility === 'function' ? el.checkVisibility() : !!el;
  const label = document.querySelector('.bh-fastlane-teaser-label');
  let labelLines = null;
  if (label && vis(label)) {
    // getClientRects() yields one rect per inline fragment, not per line (the label holds a <strong>
    // and a text node), so count the distinct rect tops instead.
    const range = document.createRange();
    range.selectNodeContents(label);
    labelLines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  }
  return {
    viewport: { w: document.documentElement.clientWidth, h: innerHeight },
    banner: box(banner),
    bannerExpanded: banner?.getAttribute('data-bh-fastlane-expanded') ?? null,
    bannerPosition: banner ? getComputedStyle(banner).position : null,
    teaser: { present: !!teaser, visible: vis(teaser), box: box(teaser), ariaExpanded: teaser?.getAttribute('aria-expanded') ?? null, controls: teaser?.getAttribute('aria-controls') ?? null },
    bodyVisible: vis(document.querySelector('.bh-fastlane-copy')),
    bodyId: body?.id ?? null,
    bodyDisplay: body ? getComputedStyle(body).display : null,
    close: { visible: vis(close), box: box(close), name: close?.getAttribute('aria-label') ?? null },
    actions: [...(banner?.querySelectorAll('.bh-fastlane-actions :is(button, a)') ?? [])].map((el) => ({ text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), visible: vis(el), box: box(el) })),
    labelLines,
    bodyPadBottom: getComputedStyle(document.body).paddingBottom,
    docScrollWidth: document.documentElement.scrollWidth,
  };
}

function rowMeasure(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const r4 = (n) => Math.round(n * 10) / 10;
  return { top: r4(r.top), bottom: r4(r.bottom), height: r4(r.height), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) };
}

async function fresh(browser, { viewport, colorScheme, textScale }) {
  const c = await browser.newContext({ viewport, colorScheme, isMobile: viewport.width < 700, hasTouch: viewport.width < 700, deviceScaleFactor: 2 });
  const p = await c.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  if (textScale) await p.addInitScript((s) => { addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${16 * s}px`; }); }, textScale);
  return { c, p, errors };
}

async function settle(p) {
  await p.waitForLoadState('networkidle').catch(() => {});
  await p.waitForTimeout(900);
}

for (const { route, firstRow } of ROUTES) {
  for (const theme of ['light', 'dark']) {
    // ---- phone, collapsed (the D207 context) -------------------------------------------------
    {
      const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
      const { p, errors } = await fresh(browser, { viewport: PHONE, colorScheme: theme });
      await p.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(p);
      const key = `phone_${theme}${route.replace(/\//g, '-')}`;
      const m = await p.evaluate(measure);
      const row = await p.evaluate(rowMeasure, firstRow);
      await p.screenshot({ path: `${OUT}/${key}.png` });
      metrics[key] = { ...m, row, errors };

      check(`${key}: banner present and bottom-fixed`, m.banner && m.bannerPosition === 'fixed' && Math.abs(m.banner.bottom - m.viewport.h) < 1.5, m.banner);
      check(`${key}: banner starts collapsed`, m.bannerExpanded === 'no' && m.teaser.visible && !m.bodyVisible, { expanded: m.bannerExpanded, teaser: m.teaser.visible, body: m.bodyVisible });
      check(`${key}: collapsed banner <= ${COLLAPSED_MAX} px`, m.banner && m.banner.height <= COLLAPSED_MAX, m.banner?.height);
      check(`${key}: first result row is present`, !!row, row);
      check(`${key}: first result row clears the banner`, row && m.banner && row.bottom <= m.banner.top, { rowBottom: row?.bottom, bannerTop: m.banner?.top });
      check(`${key}: teaser tap target >= 44 px`, m.teaser.box && m.teaser.box.height >= 43.5, m.teaser.box);
      check(`${key}: close tap target >= 44 px and named`, m.close.visible && m.close.box.height >= 43.5 && m.close.box.width >= 43.5 && !!m.close.name, m.close);
      check(`${key}: teaser label stays on one line`, m.labelLines === 1, m.labelLines);
      check(`${key}: teaser is a disclosure for the offer`, m.teaser.ariaExpanded === 'false' && m.teaser.controls && m.teaser.controls === m.bodyId, { aria: m.teaser.ariaExpanded, controls: m.teaser.controls, bodyId: m.bodyId });
      check(`${key}: reserved padding matches the collapsed bar`, m.banner && Math.abs(parseFloat(m.bodyPadBottom) - m.banner.height) < 1.5, { pad: m.bodyPadBottom, h: m.banner?.height });
      check(`${key}: no horizontal overflow`, m.docScrollWidth <= m.viewport.w + 1, m.docScrollWidth);
      check(`${key}: no page errors`, errors.length === 0, errors);

      // ---- phone, expanded by tapping the teaser ---------------------------------------------
      await p.click('[data-bh-fastlane-teaser]');
      await p.waitForTimeout(500);
      const e = await p.evaluate(measure);
      await p.screenshot({ path: `${OUT}/${key}-expanded.png` });
      metrics[`${key}-expanded`] = e;
      check(`${key}: tapping the teaser reveals the full offer`, e.bannerExpanded === 'yes' && e.bodyVisible && !e.teaser.visible, { expanded: e.bannerExpanded, body: e.bodyVisible, teaser: e.teaser.visible });
      check(`${key}: expanded shows both buttons at >= 44 px`, e.actions.length === 2 && e.actions.every((a) => a.visible && a.box.height >= 43.5), e.actions);
      check(`${key}: expanded reserved padding follows the taller bar`, e.banner && Math.abs(parseFloat(e.bodyPadBottom) - e.banner.height) < 1.5, { pad: e.bodyPadBottom, h: e.banner?.height });
      await browser.close();
    }
  }
}

// ---- phone at 1.3x browser text scale: the collapsed height must not grow -------------------
for (const theme of ['light', 'dark']) {
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const { p, errors } = await fresh(browser, { viewport: PHONE, colorScheme: theme, textScale: 1.3 });
  await p.goto(`${BASE}/jev-models`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(p);
  const key = `phone_${theme}-textscale13`;
  const m = await p.evaluate(measure);
  await p.screenshot({ path: `${OUT}/${key}.png` });
  metrics[key] = { ...m, errors, htmlFontSize: await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) };
  check(`${key}: collapsed banner still <= ${COLLAPSED_MAX} px at 1.3x text`, m.banner && m.banner.height <= COLLAPSED_MAX, { h: m.banner?.height, font: metrics[key].htmlFontSize });
  check(`${key}: teaser label still on one line at 1.3x text`, m.labelLines === 1, m.labelLines);
  check(`${key}: no horizontal overflow at 1.3x text`, m.docScrollWidth <= m.viewport.w + 1, m.docScrollWidth);
  await browser.close();
}

// ---- desktop is unchanged: full offer, no teaser --------------------------------------------
for (const theme of ['light', 'dark']) {
  const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  const { p, errors } = await fresh(browser, { viewport: DESKTOP, colorScheme: theme });
  await p.goto(`${BASE}/jev-models`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(p);
  const key = `desktop_${theme}-jev-models`;
  const m = await p.evaluate(measure);
  const row = await p.evaluate(rowMeasure, '[data-bh-jev-class-list] > li');
  await p.screenshot({ path: `${OUT}/${key}.png` });
  metrics[key] = { ...m, row, errors };
  check(`${key}: full offer shown without a teaser`, m.bodyVisible && !m.teaser.visible, { body: m.bodyVisible, teaser: m.teaser.visible });
  check(`${key}: both buttons at >= 44 px`, m.actions.length === 2 && m.actions.every((a) => a.visible && a.box.height >= 43.5), m.actions);
  check(`${key}: banner spans the layout viewport`, m.banner && Math.abs(m.banner.width - m.viewport.w) < 1.5, { w: m.banner?.width, vw: m.viewport.w });
  check(`${key}: first result row clears the banner`, row && m.banner && row.bottom <= m.banner.top, { rowBottom: row?.bottom, bannerTop: m.banner?.top });
  check(`${key}: no page errors`, errors.length === 0, errors);
  await browser.close();
}

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, generated_at: new Date().toISOString(), pass, fail: checks.length - pass, checks }, null, 1));
await fs.writeFile(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
for (const c of checks) if (!c.ok) console.log(`FAIL ${c.name} :: ${JSON.stringify(c.detail)}`);
console.log(`${pass}/${checks.length} pass on ${BASE}`);
process.exit(pass === checks.length ? 0 : 1);
