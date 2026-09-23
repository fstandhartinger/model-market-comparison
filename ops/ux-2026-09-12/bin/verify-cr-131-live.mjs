// Independent live receipt for CR-131. It compares the public v1.4 route to the
// pinned repository bytes, then checks the rendered board and evergreen metadata
// on desktop/mobile and both themes. It intentionally rejects only exact
// item-level field names; aggregate names such as mean_tvd_gold_probs are valid.
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || `/opt/benchmarkheaven/state/ux-evidence/cr131-live-${new URL(BASE).hostname}`;
// Re-derived from the checkout, never pinned to a past commit: the check asks whether the
// host serves the revision that contains the code this receipt is about.
const EXPECTED_REVISION = process.argv[4]
  || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: new URL('../../../', import.meta.url).pathname }).toString().trim();
const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACT = `${ROOT}/data/raw/benchmarks/jevbench/v1.4/jevbench-v1.4-results.json`;
await mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` — ${JSON.stringify(detail).slice(0, 500)}`}`); };
const fetchBytes = async (url, init = {}) => {
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}review=${Date.now()}-${Math.random()}`, { cache: 'no-store', ...init });
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
};
const exactForbidden = /^(item_id|item_text|question_text|expected|gold|prediction|predicted|per_item|item_results)$/i;
const hasForbiddenKey = (value) => {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => exactForbidden.test(key) || hasForbiddenKey(child));
};
const pngSize = (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } : null;

const localBytes = await readFile(ARTIFACT);
const localSha = createHash('sha256').update(localBytes).digest('hex');
const local = JSON.parse(localBytes.toString('utf8'));
const ranked = local.systems.filter((row) => row.listing === 'ranked' && row.ranked === true).sort((a, b) => a.rank - b.rank);
const top5 = ranked.slice(0, 5);
check('local/artifact-sha', localSha === '006ebff534221d913abe3195f87efeea420698ce0ab207beeb89dc3fb50fb517', localSha);
check('local/shape', local.revision === 'v1.4.0' && local.systems.length === 76 && ranked.length === 71, { revision: local.revision, systems: local.systems.length, ranked: ranked.length });
check('local/no-exact-item-level-fields', !hasForbiddenKey(local));

const metaResponse = await fetch(`${BASE}/api/meta?review=${Date.now()}-${Math.random()}`, { cache: 'no-store' });
const meta = await metaResponse.json();
check('live/revision', meta.revision === EXPECTED_REVISION, meta.revision);
const api = await fetchBytes(`${BASE}/api/jevbench/v1.4`);
const apiJson = JSON.parse(api.bytes.toString('utf8'));
check('api/status', api.response.status === 200, api.response.status);
check('api/bytes-match-local', api.bytes.equals(localBytes), { localSha, liveSha: createHash('sha256').update(api.bytes).digest('hex') });
check('api/integrity-header', api.response.headers.get('x-content-sha256') === localSha, api.response.headers.get('x-content-sha256'));
check('api/shape', apiJson.systems?.length === 76 && apiJson.systems.filter((row) => row.listing === 'ranked' && row.ranked === true).length === 71, { systems: apiJson.systems?.length, ranked: apiJson.systems?.filter((row) => row.listing === 'ranked' && row.ranked === true).length });
check('api/no-exact-item-level-fields', !hasForbiddenKey(apiJson));
check('api/top-five', JSON.stringify(apiJson.systems.filter((row) => row.ranked).sort((a, b) => a.rank - b.rank).slice(0, 5).map((row) => [row.key, Number(row.jevbench_score).toFixed(2)])) === JSON.stringify(top5.map((row) => [row.key, Number(row.jevbench_score).toFixed(2)])), top5.map((row) => row.key));
check('api/sealed-disclosure', apiJson.sealed_weight === 0.2 && apiJson.sealed_chance === 0.293 && apiJson.tiers?.sealed === 308);

const browser = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
try {
  for (const [label, viewport, isMobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, colorScheme: theme, deviceScaleFactor: 1 });
      await context.addInitScript((value) => { localStorage.setItem('theme', value); localStorage.setItem('bh-theme', value); }, theme);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error.message)));
      await page.goto(`${BASE}/jev-models?review=${Date.now()}-${Math.random()}`, { waitUntil: 'networkidle', timeout: 120000 });
      await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
      await page.waitForTimeout(300);
      const view = await page.evaluate(() => {
        const board = document.querySelector('[data-bh-jevbench-v14]');
        const rows = [...document.querySelectorAll('[data-bh-jev14-row]')];
        const head = document.head.innerHTML;
        const meta = (name, property) => document.querySelector(`meta[name="${name}"], meta[property="${property}"]`)?.getAttribute('content') ?? null;
        return {
          rows: rows.map((row) => ({ key: row.getAttribute('data-bh-jev14-row'), ranked: row.getAttribute('data-bh-jev14-ranked'), score: row.querySelector('[data-bh-jev14-score]')?.textContent?.trim() ?? null })),
          board: !!board,
          changes: document.querySelector('[data-bh-jev14-changes] h3')?.textContent?.trim() ?? null,
          apiFlags: document.querySelectorAll('[data-bh-jev14-api-flag]').length,
          apiNote: document.querySelector('[data-bh-jev14-api-note]')?.textContent ?? '',
          title: document.title,
          description: meta('description'),
          ogDescription: meta('', 'og:description'),
          ogImage: meta('', 'og:image'),
          twitterImage: meta('twitter:image', ''),
          head,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });
      const tag = `${label}-${theme}`;
      await page.screenshot({ path: `${OUT}/${tag}-jev-models.png`, fullPage: false });
      check(`${tag}/board-present`, view.board);
      check(`${tag}/rows-and-ranked-count`, view.rows.length === 76 && view.rows.filter((row) => row.ranked === '1').length === 71, { rows: view.rows.length, ranked: view.rows.filter((row) => row.ranked === '1').length });
      check(`${tag}/top-five-rendered`, JSON.stringify(view.rows.filter((row) => row.ranked === '1').slice(0, 5).map((row) => [row.key, row.score])) === JSON.stringify(top5.map((row) => [row.key, Number(row.jevbench_score).toFixed(1)])), view.rows.slice(0, 5));
      check(`${tag}/what-changed`, view.changes === 'What changed in v1.4');
      check(`${tag}/api-flags`, view.apiFlags === local.systems.filter((row) => row.api_flag === true).length, { rendered: view.apiFlags, artifact: local.systems.filter((row) => row.api_flag === true).length });
      check(`${tag}/aggregate-only-disclosure`, /answers and item-level results are not published/i.test(view.apiNote));
      check(`${tag}/evergreen-metadata`, view.title.startsWith('JevBench by Benchmark Heaven — Jev-class model benchmark') && view.description === 'Compare Jev-class decision models across intelligence, calibration, speed, and cost with JevBench.' && view.ogDescription === view.description && /[?&]v=og4(?:&|$)/.test(view.ogImage ?? '') && view.twitterImage === view.ogImage && !/(?:^|[^\d])(76|71|534|308)(?:[^\d]|$)/.test(view.head), { title: view.title, description: view.description, ogImage: view.ogImage });
      check(`${tag}/document-no-horizontal-overflow`, view.scrollWidth <= view.clientWidth + 1, { scrollWidth: view.scrollWidth, clientWidth: view.clientWidth });
      check(`${tag}/no-page-errors`, errors.length === 0, errors);
      await context.close();
    }
  }
} finally { await browser.close(); }

const image = await fetchBytes(`${BASE}/jev-models/opengraph-image?v=og4`);
const dimensions = pngSize(image.bytes);
check('image/status-and-type', image.response.status === 200 && /image\/png/i.test(image.response.headers.get('content-type') ?? ''), { status: image.response.status, type: image.response.headers.get('content-type') });
check('image/dimensions', dimensions?.width === 1200 && dimensions?.height === 630, dimensions);

const failed = results.filter((result) => !result.ok);
await writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: meta.revision, expectedRevision: EXPECTED_REVISION, localSha, verifiedAt: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }, null, 2));
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
