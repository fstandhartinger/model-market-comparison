// Independent live receipt for CR-131.6 and CR-131.7 — the public Hugging Face Space.
//
// CR-131.6 asks that the Space is published only after the v1.4 API is live, that it
// *reads the live API*, and that it shows revision v1.4.0 and the same approved top five.
// CR-131.7 asks that the local-only sealed-ID/text scan is repeated against the Space
// source and output, recording zero matches without printing sealed strings.
//
// Every expected value is re-derived from the pinned repository artifact; nothing about
// the board is a hand-typed literal. The sealed scan reads the sealed set locally and
// never writes, logs or returns a matched string — only counts.
//
// usage: node verify-cr-131-space.mjs [outDir] [spaceAppUrl] [siteBase]
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');

const OUT = process.argv[2] || '/opt/benchmarkheaven/state/ux-evidence/cr131-space';
const APP = (process.argv[3] || 'https://benchmarkheaven-jevbench.static.hf.space').replace(/\/$/, '');
const SITE = (process.argv[4] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const SPACE_ID = 'benchmarkheaven/JevBench';
const RAW = `https://huggingface.co/spaces/${SPACE_ID}/raw/main`;
const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');
const ARTIFACT = `${ROOT}/data/raw/benchmarks/jevbench/v1.4/jevbench-v1.4-results.json`;
const SEALED = '/home/flori/jevbench-sealed/v1.4/frozen/sealed-v1.4.jsonl';

await mkdir(OUT, { recursive: true });
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` — ${JSON.stringify(detail).slice(0, 400)}`}`);
};
const bust = (url) => `${url}${url.includes('?') ? '&' : '?'}review=${Date.now()}-${Math.random()}`;

// ---------------------------------------------------------------- expected board
const localBytes = await readFile(ARTIFACT);
const local = JSON.parse(localBytes.toString('utf8'));
const localSha = createHash('sha256').update(localBytes).digest('hex');
// The Space's own filter, so the receipt measures what the Space is asked to show.
const expectedRows = local.systems.filter((row) => row.ranked && !row.partial)
  .sort((a, b) => (b.jevbench_score || 0) - (a.jevbench_score || 0));
const expectedTop5 = expectedRows.slice(0, 5).map((row) => ({ display: row.display, score: (+row.jevbench_score).toFixed(1) }));
check('expected/derived-from-artifact', local.revision === 'v1.4.0' && local.systems.length === 76 && expectedRows.length === 71,
  { revision: local.revision, systems: local.systems.length, rendered: expectedRows.length, sha: localSha });

// ---------------------------------------------------------------- Space metadata
const spaceMeta = await (await fetch(bust(`https://huggingface.co/api/spaces/${SPACE_ID}`), { cache: 'no-store' })).json();
check('space/public-and-running', spaceMeta.private === false && spaceMeta.runtime?.stage === 'RUNNING',
  { private: spaceMeta.private, stage: spaceMeta.runtime?.stage });
check('space/static-sdk', spaceMeta.sdk === 'static' && spaceMeta.cardData?.app_file === 'index.html', { sdk: spaceMeta.sdk });
check('space/branded-card', /JevBench/.test(spaceMeta.cardData?.title || '') && /Benchmark Heaven/i.test(spaceMeta.cardData?.title || '')
  && !!spaceMeta.cardData?.short_description && (spaceMeta.cardData?.tags || []).length >= 3,
  { title: spaceMeta.cardData?.title, tags: spaceMeta.cardData?.tags });

const files = {};
for (const name of ['index.html', 'snapshot.json', 'style.css', 'README.md']) {
  const response = await fetch(bust(`${RAW}/${name}`), { cache: 'no-store' });
  const text = await response.text();
  files[name] = text;
  check(`space/raw-${name}`, response.status === 200 && text.length > 0,
    { status: response.status, bytes: text.length, sha256: createHash('sha256').update(text).digest('hex') });
}

// CR-131.6: it must read the live API, not only a committed snapshot.
check('space/reads-live-api', files['index.html'].includes(`${SITE}/api/jevbench/v1.4`), null);
check('space/snapshot-is-fallback-only',
  /fetch\(LIVE_URL[\s\S]{0,400}catch\([\s\S]{0,120}fetch\(SNAPSHOT_URL/.test(files['index.html']), null);
check('space/links-to-live-board', files['index.html'].includes(`${SITE}/jev-models`), null);

// The fallback must not be able to show a different board than the live API does.
const snapshot = JSON.parse(files['snapshot.json']);
const snapTop5 = (snapshot.systems || []).slice(0, 5).map((row) => ({ display: row.display, score: (+row.jevbench_score).toFixed(1) }));
check('space/snapshot-revision', snapshot.revision === 'v1.4.0', snapshot.revision);
check('space/snapshot-row-count', (snapshot.systems || []).length === expectedRows.length,
  { snapshot: (snapshot.systems || []).length, expected: expectedRows.length });
check('space/snapshot-top5', JSON.stringify(snapTop5) === JSON.stringify(expectedTop5), { snapTop5, expectedTop5 });

// ---------------------------------------------------------------- live API is live first
const apiResponse = await fetch(bust(`${SITE}/api/jevbench/v1.4`), { cache: 'no-store' });
const apiBytes = Buffer.from(await apiResponse.arrayBuffer());
const apiJson = JSON.parse(apiBytes.toString('utf8'));
check('site/api-live', apiResponse.status === 200 && apiJson.revision === 'v1.4.0', { status: apiResponse.status, revision: apiJson.revision });
check('site/api-matches-artifact', createHash('sha256').update(apiBytes).digest('hex') === localSha, null);

// ---------------------------------------------------------------- rendered Space
const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const readBoard = async (page) => page.evaluate(() => ({
  revision: document.getElementById('revision')?.textContent?.trim() || null,
  count: document.getElementById('systemsCount')?.textContent?.trim() || null,
  note: document.getElementById('sourceNote')?.textContent?.trim() || '',
  rows: Array.from(document.querySelectorAll('#board tr')).map((tr) => ({
    display: tr.querySelector('.sys-name')?.textContent?.trim() || '',
    score: tr.querySelector('.score')?.textContent?.trim() || '',
  })),
  text: document.body.innerText,
}));

const renderedText = [];
for (const [widthName, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(bust(APP), { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => (document.querySelectorAll('#board tr').length > 1), null, { timeout: 30000 });
    const board = await readBoard(page);
    renderedText.push(board.text);
    const tag = `${widthName}-${theme}`;
    check(`render/${tag}/revision`, board.revision === 'v1.4.0', board.revision);
    check(`render/${tag}/row-count`, board.rows.length === expectedRows.length && board.count === String(expectedRows.length),
      { rows: board.rows.length, counter: board.count, expected: expectedRows.length });
    check(`render/${tag}/top5`, JSON.stringify(board.rows.slice(0, 5)) === JSON.stringify(expectedTop5),
      { got: board.rows.slice(0, 5), expectedTop5 });
    // CR-131.6's "reads the live API": the live branch writes this note, the fallback writes a warning.
    check(`render/${tag}/served-by-live-api`, board.note.startsWith('Live from benchmarkheaven.com') && board.note.includes('v1.4.0'), board.note.slice(0, 160));
    check(`render/${tag}/no-page-errors`, errors.length === 0, errors);
    await page.screenshot({ path: `${OUT}/space-${tag}.png`, fullPage: true });
    await context.close();
  }
}

// Fallback path: if the browser blocks the cross-origin fetch, the committed snapshot
// must still render the same board rather than a stale or empty one.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await context.newPage();
  await page.route(`${SITE}/api/jevbench/v1.4*`, (route) => route.abort());
  await page.goto(bust(APP), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => (document.querySelectorAll('#board tr').length > 1), null, { timeout: 30000 });
  const board = await readBoard(page);
  renderedText.push(board.text);
  check('fallback/labels-itself-a-snapshot', /dated snapshot committed in this Space/.test(board.note), board.note.slice(0, 160));
  check('fallback/same-board', board.revision === 'v1.4.0' && board.rows.length === expectedRows.length
    && JSON.stringify(board.rows.slice(0, 5)) === JSON.stringify(expectedTop5),
    { revision: board.revision, rows: board.rows.length });
  await page.screenshot({ path: `${OUT}/space-fallback.png`, fullPage: true });
  await context.close();
}
await browser.close();

// ---------------------------------------------------------------- CR-131.7 sealed scan
// Counts only. A matched string is never printed, written or kept.
const sealedLines = (await readFile(SEALED, 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line));
const sealedIds = sealedLines.map((item) => item.id).filter(Boolean);
// 48 of the 308 items carry a structured `state`; flatten both shapes the same way so
// every item contributes a phrase, and take the question text where the item has one.
const flatten = (value) => (typeof value === 'string' ? value : JSON.stringify(value ?? '')).replace(/\s+/g, ' ').trim();
const phrases = sealedLines
  .flatMap((item) => [flatten(item.state), flatten(item.question)])
  .filter((text) => text.length >= 96)
  .map((text) => text.slice(0, 96));
check('scan/sealed-set-loaded',
  sealedLines.length === 308 && sealedIds.length === 308
    && sealedLines.every((item) => flatten(item.state).length >= 96),
  { items: sealedLines.length, ids: sealedIds.length, phrases: phrases.length });

const exactForbidden = /^(item_id|item_text|question_text|expected|gold|prediction|predicted|per_item|item_results)$/i;
const hasForbiddenKey = (value) => {
  if (Array.isArray(value)) return value.some(hasForbiddenKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => exactForbidden.test(key) || hasForbiddenKey(child));
};

// Positive control: a scanner that can never match would report zero matches on a leak too.
// The control text is built in memory from one sealed item and is never written or printed.
const controlHit = (() => {
  const control = `lorem ${sealedIds[0]} ipsum ${phrases[0]} dolor`;
  const flat = control.replace(/\s+/g, ' ');
  return sealedIds.filter((id) => control.includes(id)).length === 1 && phrases.filter((phrase) => flat.includes(phrase)).length === 1;
})();
check('scan/positive-control-detects-a-leak', controlHit, null);

const pageHtml = await (await fetch(bust(`${SITE}/jev-models`), { cache: 'no-store' })).text();
const surfaces = {
  'space/index.html': files['index.html'],
  'space/snapshot.json': files['snapshot.json'],
  'space/style.css': files['style.css'],
  'space/README.md': files['README.md'],
  'space/rendered-output': renderedText.join('\n'),
  'site/api-jevbench-v1.4': apiBytes.toString('utf8'),
  'site/jev-models-html': pageHtml,
};
const scan = {};
for (const [name, text] of Object.entries(surfaces)) {
  const flat = text.replace(/\s+/g, ' ');
  scan[name] = {
    bytes: text.length,
    idMatches: sealedIds.filter((id) => text.includes(id)).length,
    phraseMatches: phrases.filter((phrase) => flat.includes(phrase)).length,
  };
}
const idTotal = Object.values(scan).reduce((sum, row) => sum + row.idMatches, 0);
const phraseTotal = Object.values(scan).reduce((sum, row) => sum + row.phraseMatches, 0);
check('scan/zero-sealed-id-matches', idTotal === 0, { idTotal, perSurface: Object.fromEntries(Object.entries(scan).map(([k, v]) => [k, v.idMatches])) });
check('scan/zero-sealed-phrase-matches', phraseTotal === 0, { phraseTotal });
check('scan/no-item-level-fields', !hasForbiddenKey(apiJson) && !hasForbiddenKey(snapshot), null);

const failed = results.filter((row) => !row.ok);
await writeFile(`${OUT}/verification.json`, JSON.stringify({
  app: APP, site: SITE, spaceSha: spaceMeta.sha, spaceLastModified: spaceMeta.lastModified,
  artifactSha: localSha, expectedTop5, scan,
  verifiedAt: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results,
}, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed — ${OUT}/verification.json`);
process.exit(failed.length ? 1 : 0);
