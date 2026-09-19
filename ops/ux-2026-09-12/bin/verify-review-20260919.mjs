// Codex review gate: live JevBench v1.2 verification through the shared Chrome CDP.
// Do not launch a second browser on Sandy; run this under ~/.locks/chrome-9333.lock.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const hosts = (process.argv.slice(2).length ? process.argv.slice(2) : ['https://benchmarkheaven.com']).map((x) => x.replace(/\/$/, ''));
const out = '/opt/benchmarkheaven/state/ux-evidence/review-20260919T141002Z';
await mkdir(out, { recursive: true });

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail: String(detail).slice(0, 1000) });
const safe = async (name, fn) => {
  try { return await fn(); } catch (error) { check(name, false, error?.stack || error); return undefined; }
};
const AX = ['intelligence', 'calibration', 'speed', 'cost'];
const PRESETS = {
  score: [[25, 25, 25, 25], 'JevBench Score (Intelligence, Calibration, Speed, Cost — 25 % each)'],
  balanced: [[1, 0, 1, 1], 'Balanced 33:33:33 (Intelligence, Speed, Cost; no calibration)'],
  accuracy: [[60, 0, 20, 20], 'Emphasis on Accuracy (60:20:20, no calibration)'],
  speed: [[20, 0, 60, 20], 'Emphasis on Speed (20:60:20, no calibration)'],
  cost: [[20, 0, 20, 60], 'Emphasis on Cost (20:20:60, no calibration)'],
};
const geometric = (system, weights) => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  return Math.exp(AX.reduce((sum, axis, index) => sum + (weights[index] > 0 ? (weights[index] / total) * Math.log(Math.max(system.axes[axis] ?? 0, 1)) : 0), 0));
};
const expectedOrder = (ranked, weights) => ranked.map((system) => ({ key: system.key, value: geometric(system, weights), rank: system.rank }))
  .sort((a, b) => b.value - a.value || a.rank - b.rank).map(({ key }) => key);
const slug = (value) => value.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const context = browser.contexts()[0];
if (!context) throw new Error('shared Chrome has no browser context');
const page = await context.newPage();
const errors = [];
const ignoredExtensionErrors = [];
page.on('pageerror', (error) => {
  const message = String(error);
  if (/Talisman extension has not been configured yet/i.test(message)) ignoredExtensionErrors.push(message);
  else errors.push(message);
});

try {
  for (const base of hosts) {
    const api = await (await fetch(`${base}/api/jevbench/v1.2`)).json();
    const ranked = api.systems.filter((system) => system.ranked);
    check(`${base}: API is final v1.2`, api.revision === 'v1.2' && api.status === 'final', `${api.revision}/${api.status}`);
    check(`${base}: API has exactly one open-alternative-jev row`, api.systems.filter((system) => system.key.startsWith('open-alternative-jev')).length === 1);
    const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
    check(`${base}: sitemap restores current and archived Jev URLs`, /\/jev-models<\/loc>/.test(sitemap) && /\/jev-models\/v1<\/loc>/.test(sitemap));
    for (const route of ['/jev-models', '/jev-models/v1']) {
      const html = await (await fetch(`${base}${route}`)).text();
      check(`${base}${route}: no noindex/WIP marker`, !/noindex|data-bh-jev-wip|WIP/i.test(html));
    }

    for (const theme of ['light', 'dark']) for (const [kind, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 390, height: 844 }]]) {
      const tag = `${slug(base)}-${kind}-${theme}`;
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${base}/jev-models`, { waitUntil: 'networkidle', timeout: 90000 });
      await page.evaluate((value) => localStorage.setItem('bh-theme', value), theme);
      await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
      const text = async (selector) => (await page.locator(selector).first().textContent() || '').trim();
      const bars = async () => page.locator('[data-bh-jevc-bars] [data-bh-jev12-bar]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-bh-jev12-bar')));
      const visibleSpeedNotes = await page.locator('[data-bh-jev12-speed-note]').evaluateAll((nodes) => nodes.filter((node) => node.offsetParent !== null || getComputedStyle(node).display !== 'none').map((node) => node.textContent));
      check(`${tag}: Jev page is in the menu`, await page.locator('header a[href="/jev-models"], nav a[href="/jev-models"]').count() > 0);
      check(`${tag}: default title`, await text('[data-bh-jevc-title]') === PRESETS.score[1], await text('[data-bh-jevc-title]'));
      check(`${tag}: default explanation and geometric mean`, (await text('[data-bh-jev12-oneliner]')).includes('25 % each, geometric mean: a weak axis pulls the score down hard'));
      check(`${tag}: official chart order`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(ranked.map((system) => system.key)), await bars());
      const shown = await page.locator('[data-bh-jevc-bars] [data-bh-jev12-bar]').evaluateAll((nodes) => nodes.map((node) => [node.getAttribute('data-bh-jev12-bar'), node.querySelector('[data-bh-jev12-main]')?.textContent?.trim()]));
      check(`${tag}: every chart value is artifact value`, shown.length === api.systems.length && shown.every(([key, value]) => api.systems.find((system) => system.key === key)?.jevbench_score.toFixed(1) === value), JSON.stringify(shown.slice(0, 3)));
      const partialRanks = await page.locator('[data-bh-jevc-bars] [data-bh-jev12-bar]').evaluateAll((nodes) => nodes.filter((node) => node.textContent.includes('partial run')).map((node) => node.querySelector('[data-bh-jevc-rank]')?.textContent?.trim()));
      check(`${tag}: partial runs are unranked`, partialRanks.every((value) => value === ''));
      check(`${tag}: speed honesty appears in chart/table/formula`, visibleSpeedNotes.length >= 3 && visibleSpeedNotes.every((value) => /adjusted ×2/.test(value) && /assumption/.test(value)), visibleSpeedNotes.length);
      check(`${tag}: open-alternative option-order footnote`, (await text('[data-bh-jev12-footnote="open-alternative-jev"]')).includes('21 % instead of 72 %'));
      check(`${tag}: all artifact systems have latency cells`, await page.locator('[data-bh-jev12-latency]').count() === api.systems.length);
      check(`${tag}: official badge only`, await page.locator('[data-bh-jevc-badge="official"]').count() === 1 && await page.locator('[data-bh-jevc-badge="not-default"]').count() === 0);
      const links = await page.locator('[data-bh-jevc-bars] a[data-bh-jev-link]').evaluateAll((nodes) => nodes.map((node) => node.href));
      check(`${tag}: every chart system has an HTTPS source link`, links.length === api.systems.length && links.every((href) => href.startsWith('https://')), links.length);
      for (const [id, [weights, title]] of Object.entries(PRESETS)) {
        await safe(`${tag}: preset ${id} interaction`, async () => {
          await page.locator(`[data-bh-jevc-preset="${id}"]`).click();
          await page.waitForTimeout(200);
          check(`${tag}: preset ${id} title`, await text('[data-bh-jevc-title]') === title, await text('[data-bh-jevc-title]'));
          check(`${tag}: preset ${id} geometric re-rank`, JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectedOrder(ranked, weights)), await bars());
          const off = id !== 'score';
          check(`${tag}: preset ${id} not-default state`, off === (await page.locator('[data-bh-jevc-badge="not-default"]').count() > 0) && off === (await page.locator('[data-bh-jevc-reset]').count() > 0));
        });
      }
      await page.locator('[data-bh-jevc-preset="accuracy"]').click();
      await page.waitForTimeout(150);
      check(`${tag}: weighting is in URL`, page.url().endsWith('?w=60-0-20-20'), page.url());
      await page.locator('[data-bh-jevc-reset]').click();
      await page.waitForTimeout(150);
      check(`${tag}: reset clears weighting`, await text('[data-bh-jevc-title]') === PRESETS.score[1] && !page.url().includes('?'), page.url());
      await page.goto(`${base}/jev-models?w=50-10-20-20`, { waitUntil: 'networkidle', timeout: 90000 });
      check(`${tag}: custom URL is labelled and re-ranked`, await text('[data-bh-jevc-title]') === 'Custom weights (50:10:20:20) — not the official JevBench Score' && JSON.stringify((await bars()).slice(0, ranked.length)) === JSON.stringify(expectedOrder(ranked, [50, 10, 20, 20])));
      check(`${tag}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
      await page.screenshot({ path: `${out}/${tag}.png`, fullPage: true });
      await page.goto(`${base}/jev-models/v1`, { waitUntil: 'networkidle', timeout: 90000 });
      check(`${tag}: archived v1 route is visibly labelled`, await page.locator('[data-bh-jev-archive]').count() === 1);
      check(`${tag}: archived route has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    }
  }
} finally {
  await page.close();
  // For this Playwright version close() disconnects the CDP client; the shared
  // Chrome process remains alive (the lock owner does not launch or own it).
  await browser.close();
}

check('all live pages: no uncaught page errors', errors.length === 0, errors);
const failed = checks.filter((entry) => !entry.ok);
await writeFile(`${out}/live-checks.json`, JSON.stringify({ at: new Date().toISOString(), hosts, ignoredExtensionErrors, checks }, null, 2));
for (const failure of failed) console.log(`FAIL ${failure.name}: ${failure.detail}`);
console.log(`${checks.length - failed.length}/${checks.length} live checks passed`);
process.exit(failed.length ? 1 : 0);
