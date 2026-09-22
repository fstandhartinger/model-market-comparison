// CR-120 live check — /jev-models SEO and link previews (iteration 175, claude-opus).
//
// CR-120 shipped in `dfd4c2d7` with its evidence inside the implementing job's folder and no
// committed verifier, so the five rows could not be re-checked by anyone else. This script is that
// missing verifier: it derives every expectation from the *live* published artifact
// (`/api/jevbench/v1.2`), never from this checkout, so a non-implementing engine can copy the file
// anywhere and run it against both production hosts.
//
// The preview image is checked by its content, not only its dimensions: the PNG is thresholded and
// read with tesseract, and the five rows OCRed out of it must be the artifact's own top five with
// their one-decimal scores. A stale cached card therefore fails instead of passing on "1200×630".
//
// Usage: node verify-cr-120.mjs <base-url> <out-dir>
import { createRequire } from 'node:module';
const require = createRequire('/home/flori/n8n-local/');
const { chromium } = require('playwright');
const fs = await import('node:fs/promises');
const { execFile } = await import('node:child_process');
const { promisify } = await import('node:util');
const run = promisify(execFile);

const BASE = (process.argv[2] || 'https://benchmarkheaven.com').replace(/\/$/, '');
const OUT = process.argv[3] || '/tmp/verify-cr-120';
await fs.mkdir(OUT, { recursive: true });
const REV = (await (await fetch(`${BASE}/api/meta`)).json()).revision;

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const settle = (p) => p.waitForLoadState('networkidle').catch(() => {}).then(() => p.waitForTimeout(800));
const text = async (path) => (await fetch(`${BASE}${path}`, { headers: { 'cache-control': 'no-cache' } })).text();
// OCR confuses capital I, lower-case l and the pipe on a dark card ("SemIf" comes back as "Semlif"),
// so letters are folded onto one another and doubled letters collapsed. Digits are left exact — a
// number that reads back wrong has to fail.
const fold = (s) => s.toLowerCase().replace(/[il|]/g, 'i').replace(/[^a-z0-9.]+/g, '').replace(/([a-z])\1+/g, '$1');

// ---------------------------------------------------------------- the published artifact is truth
const art = await (await fetch(`${BASE}/api/jevbench/v1.2`)).json();
const ranked = art.systems.filter((s) => s.ranked).sort((a, b) => b.jevbench_score - a.jevbench_score);
const short = (d) => d.split(' (')[0].split(', formerly')[0];
const top5 = ranked.slice(0, 5).map((s, i) => ({ rank: i + 1, name: short(s.display), score: s.jevbench_score.toFixed(1) }));
// `tiers` maps each tier to its decision count (easy/standard/judge/hard). A shape change here must
// break the run rather than quietly zero the count — a zero would make every decision-count check
// below pass on nothing.
const decisions = Object.values(art.tiers ?? {}).reduce((a, n) => a + (typeof n === 'number' ? n : NaN), 0);
if (!Number.isInteger(decisions) || decisions <= 0) throw new Error(`cannot read the decision count from the artifact's tiers: ${JSON.stringify(art.tiers)}`);
const openAlts = ranked.filter((s) => s.class === 'jev-rebuild' && s.open === 'yes').slice(0, 4).map((s) => short(s.display));
const day = new Date(art.generated_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
check('artifact: the live results JSON publishes a revision, a date and 52+ systems',
  !!art.revision && !!art.generated_utc && art.systems.length >= 5, { revision: art.revision, generated: art.generated_utc, systems: art.systems.length });
check('artifact: at least five systems are ranked, so a top five exists', top5.length === 5, top5);
check('artifact: open ranked rebuilds exist to answer the "open alternatives" question', openAlts.length > 0, openAlts);

// ------------------------------------------------------- CR-120.1 metadata and indexability (HTML)
const html = await text('/jev-models');
const meta = (sel, attr = 'content') => {
  const re = new RegExp(`<meta[^>]*${sel}[^>]*>`, 'i');
  const tag = html.match(re)?.[0] ?? '';
  return tag.match(new RegExp(`${attr}="([^"]*)"`, 'i'))?.[1] ?? null;
};
const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/&amp;/g, '&') ?? '';
const desc = meta('name="description"');
const canonical = html.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0]?.match(/href="([^"]*)"/)?.[1] ?? null;

check('CR-120.1: the page title names Jev alternatives and the current revision',
  /jev alternatives/i.test(title) && title.includes(art.revision), title);
check('CR-120.1: the title is short enough to survive a search result', title.length <= 75, title.length);
check('CR-120.1: the description names the revision, the leader and its score',
  !!desc && desc.includes(art.revision) && desc.includes(top5[0].name) && desc.includes(top5[0].score), desc);
check('CR-120.1: the description counts the artifact\'s own systems and decisions',
  !!desc && desc.includes(String(art.systems.length)) && desc.includes(String(decisions)), { desc, systems: art.systems.length, decisions });
check('CR-120.1: the description is a concise search snippet (<= 200 chars)', !!desc && desc.length <= 200, desc?.length);
// Both hosts must point search engines at the canonical host — that is the point of the tag.
check('CR-120.1: canonical points at the canonical host\'s /jev-models',
  canonical === 'https://benchmarkheaven.com/jev-models', canonical);
for (const [sel, want] of [
  ['property="og:title"', (v) => /jev alternatives/i.test(v) && v.includes(art.revision)],
  ['property="og:description"', (v) => v === desc],
  ['property="og:url"', (v) => v === 'https://benchmarkheaven.com/jev-models'],
  ['property="og:site_name"', (v) => v === 'Benchmark Heaven'],
  ['property="og:locale"', (v) => v === 'en_US'],
  ['property="og:type"', (v) => v === 'website'],
  ['property="og:image:width"', (v) => v === '1200'],
  ['property="og:image:height"', (v) => v === '630'],
  ['property="og:image:alt"', (v) => v.includes(art.revision)],
  ['name="twitter:card"', (v) => v === 'summary_large_image'],
  ['name="twitter:site"', (v) => v.startsWith('@')],
  ['name="twitter:creator"', (v) => v.startsWith('@')],
  ['name="twitter:title"', (v) => v.includes(art.revision)],
  ['name="twitter:description"', (v) => v === desc],
]) {
  const v = meta(sel);
  check(`CR-120.1: ${sel.replace(/(property|name)="|"/g, '')} is present and correct`, v !== null && want(v), v);
}

const preview = await text('/jev-models/multimodal-preview');
const robots = (preview.match(/<meta[^>]*name="robots"[^>]*>/i)?.[0] ?? '').match(/content="([^"]*)"/)?.[1] ?? null;
check('CR-120.1: the multimodal preview is still noindex, nofollow', /noindex/.test(robots ?? '') && /nofollow/.test(robots ?? ''), robots);
const sitemap = await text('/sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
check('CR-120.1: /jev-models and /jev-models/v1 are in the sitemap',
  locs.some((u) => u.endsWith('/jev-models')) && locs.some((u) => u.endsWith('/jev-models/v1')), locs.filter((u) => /jev-models/.test(u)));
check('CR-120.1: the multimodal preview is not in the sitemap',
  !locs.some((u) => /\/jev-models\/multimodal-preview/.test(u)), locs.filter((u) => /multimodal-preview/.test(u)));
check('CR-120.1: /jev-models does not link to the multimodal preview',
  !/href="[^"]*jev-models\/multimodal-preview/.test(html), html.match(/href="[^"]*multimodal[^"]*"/g));

// ------------------------------------------------------------- CR-120.2 the generated preview image
const ogUrl = meta('property="og:image"');
check('CR-120.2: the preview URL carries the current board revision, so a new board busts the cache',
  !!ogUrl && ogUrl.includes(encodeURIComponent(art.revision)), ogUrl);
const imgPath = ogUrl ? new URL(ogUrl).pathname + new URL(ogUrl).search : '/jev-models/opengraph-image';
const res = await fetch(`${BASE}${imgPath}`);
const bytes = Buffer.from(await res.arrayBuffer());
check('CR-120.2: the preview is served as a PNG with HTTP 200',
  res.status === 200 && /image\/png/.test(res.headers.get('content-type') ?? '') && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  { status: res.status, type: res.headers.get('content-type'), bytes: bytes.length });
const [w, h] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
check('CR-120.2: the preview is exactly 1200×630', w === 1200 && h === 630, { w, h });
await fs.writeFile(`${OUT}/opengraph-image.png`, bytes);

// Read the card. Its text is light-on-dark, which tesseract needs inverted and thresholded first.
await run('python3', ['-c', `
from PIL import Image, ImageOps
im = ImageOps.invert(Image.open('${OUT}/opengraph-image.png').convert('L')).point(lambda p: 255 if p > 150 else 0)
im.resize((im.width * 2, im.height * 2), Image.LANCZOS).save('${OUT}/opengraph-image-ocr.png')
`]);
const { stdout: ocrRaw } = await run('tesseract', [`${OUT}/opengraph-image-ocr.png`, 'stdout']);
await fs.writeFile(`${OUT}/opengraph-image-ocr.txt`, ocrRaw);
const ocr = fold(ocrRaw);
check('CR-120.2: the card is legible to OCR at all (the brand line reads back)', ocr.includes(fold('BENCHMARK HEAVEN')), ocrRaw.slice(0, 120));
check('CR-120.2: the card states the current revision and the artifact\'s scoring date',
  ocr.includes(fold(`JevBench ${art.revision}`)) && ocr.includes(fold(day)), { revision: art.revision, day });
check('CR-120.2: the card counts the artifact\'s systems and decisions',
  ocr.includes(fold(`${art.systems.length} systems`)) && ocr.includes(fold(`${decisions} decisions`)), { systems: art.systems.length, decisions });
// Each row is one line on the card, so rank, name and score must read back as one contiguous run —
// a card showing the right names in the wrong order or against the wrong scores then fails.
for (const row of top5) {
  check(`CR-120.2: the card shows #${row.rank} ${row.name} at ${row.score}`,
    ocr.includes(fold(`#${row.rank} ${row.name} ${row.score}`)), { ...row, want: fold(`#${row.rank} ${row.name} ${row.score}`) });
}

// ----------------------------------------------------------------- CR-120.3 structured data is true
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '';
let graph = [];
try { graph = JSON.parse(ld.replace(/\\u003c/g, '<'))['@graph'] ?? []; } catch { /* reported below */ }
check('CR-120.3: the page ships one parseable JSON-LD graph', graph.length > 0, graph.length);
const node = (type) => graph.find((n) => n['@type'] === type);
const page = node('WebPage'), dataset = node('Dataset'), faq = node('FAQPage');
check('CR-120.3: the graph declares WebPage, Dataset and FAQPage', !!page && !!dataset && !!faq, graph.map((n) => n['@type']));
check('CR-120.3: WebPage names the revision and counts the artifact\'s systems and decisions',
  !!page && page.name?.includes(art.revision) && page.description?.includes(String(art.systems.length)) && page.description?.includes(String(decisions)), page);
check('CR-120.3: WebPage\'s dateModified is the artifact\'s own timestamp', page?.dateModified === art.generated_utc, { got: page?.dateModified, want: art.generated_utc });
check('CR-120.3: Dataset names the revision and is its own dateModified', dataset?.name?.includes(art.revision) && dataset?.dateModified === art.generated_utc, { name: dataset?.name, dateModified: dataset?.dateModified });
check('CR-120.3: Dataset declares a licence and free access', !!dataset?.license && dataset?.isAccessibleForFree === true, { license: dataset?.license, free: dataset?.isAccessibleForFree });
const dist = dataset?.distribution?.[0];
check('CR-120.3: Dataset\'s JSON distribution is the endpoint that served this artifact',
  dist?.encodingFormat === 'application/json' && /\/api\/jevbench\/v1\.2$/.test(dist?.contentUrl ?? ''), dist);
if (dist?.contentUrl) {
  const served = await (await fetch(dist.contentUrl)).json().catch(() => ({}));
  check('CR-120.3: the declared distribution URL really serves this revision', served.revision === art.revision, { got: served.revision, want: art.revision });
}
check('CR-120.3: every FAQ entry has a question and an answer',
  Array.isArray(faq?.mainEntity) && faq.mainEntity.length >= 4 && faq.mainEntity.every((q) => q.name && q.acceptedAnswer?.text), faq?.mainEntity?.length);
check('CR-120.3: the scoring answer quotes the artifact\'s own decision count',
  faq?.mainEntity?.some((q) => /scored/i.test(q.name) && q.acceptedAnswer.text.includes(String(decisions))),
  faq?.mainEntity?.find((q) => /scored/i.test(q.name))?.acceptedAnswer?.text);
check('CR-120.3: the open-alternatives answer names the artifact\'s own open ranked rebuilds',
  openAlts.every((n) => (faq?.mainEntity?.find((q) => /open-source alternatives/i.test(q.name))?.acceptedAnswer?.text ?? '').includes(n)), openAlts);

// A structured answer we do not also show a reader is the thing Google penalises, so require both.
const faqQuestions = (faq?.mainEntity ?? []).map((q) => q.name);

// ------------------------------------------ CR-120.4 honest search-intent answers, visible on the page
// Never claim a third party is GDPR-compliant. The honest caveat sentence must be there instead.
const CLAIMS_COMPLIANCE = /\b(is|are|fully|100%)\s+gdpr[- ]compliant\b|\bgdpr[- ]compliant (service|provider|deployment|model|host)/i;

const browser = await chromium.launch();
for (const [vw, vh] of [[1440, 1000], [390, 844]]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: theme });
    const errors = [];
    ctx.on('weberror', (e) => errors.push(String(e.error()).slice(0, 200)));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    const tag = `${vw}-${theme}`;
    await p.goto(`${BASE}/jev-models`, { waitUntil: 'domcontentloaded' });
    await settle(p);
    const body = await p.locator('body').innerText();

    for (const q of faqQuestions) {
      // The visible heading drops the trailing question mark and rewords "workload" → "work"; match on
      // the distinctive opening instead of the whole sentence.
      const stem = q.replace(/\?$/, '').split(/ (?:or|in the EU) /)[0].slice(0, 34);
      check(`${tag}: the FAQ answer "${stem}…" is also visible to a reader`, body.includes(stem), stem);
    }
    check(`${tag}: the open-alternatives section names the artifact's open rebuilds`, openAlts.every((n) => body.includes(n)), openAlts);
    check(`${tag}: self-hosting, the EU and GDPR are answered`, /self-host/i.test(body) && /\bEU\b/.test(body) && /GDPR/.test(body), null);
    check(`${tag}: how to submit a model is answered`, /submit/i.test(body), null);
    check(`${tag}: nothing on the page calls a service GDPR-compliant`, !CLAIMS_COMPLIANCE.test(body), body.match(CLAIMS_COMPLIANCE)?.[0]);
    check(`${tag}: the honest GDPR caveat is stated instead`,
      /does not (?:by itself )?make (?:a|your) deployment GDPR-compliant|neither open source nor an EU server makes a deployment GDPR-compliant/i.test(body), null);
    check(`${tag}: jev-router is described as self-hosted open decision models`, /jev-router\.com\s*offers self-hosted open decision models|self-hosted open decision models/i.test(body), null);
    check(`${tag}: jev-router carries the authors' neutrality disclosure`,
      /neutrality disclosure/i.test(body) && /run by the authors of this benchmark/i.test(body) && /no scoring advantage/i.test(body), null);

    // CR-120.5 — the SEO work must not have broken the page it was added to.
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${tag}: /jev-models has no horizontal overflow`, over <= 1, over);
    check(`${tag}: /jev-models raised no page error`, errors.length === 0, errors.slice(0, 3));
    await p.screenshot({ path: `${OUT}/jev-models-${tag}.png`, fullPage: false });
    await ctx.close();
  }
}
await browser.close();

const pass = checks.filter((c) => c.ok).length;
await fs.writeFile(`${OUT}/verification.json`, JSON.stringify({ base: BASE, revision: REV, artifact: { revision: art.revision, generated: art.generated_utc, systems: art.systems.length, decisions }, top5, openAlts, pass, total: checks.length, checks }, null, 2));
console.log(`${BASE} ${pass}/${checks.length} @ ${REV}`);
for (const c of checks.filter((c) => !c.ok)) console.log('FAIL', c.name, JSON.stringify(c.detail));
process.exit(pass === checks.length ? 0 : 1);
