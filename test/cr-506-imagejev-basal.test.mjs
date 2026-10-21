import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const release = JSON.parse(await read('../data/imagejev-v03.json'));
const KEY = 'basal_omni_1_0_ultra';
const row = release.ranking.find((r) => r.key === KEY);

test('CR-506 basal-omni-1.0-ultra: self-hosted official pass 1, engine, zero-shot images, alpha, Polish template, cost basis and TypeSafe-20 gap disclosed', () => {
  assert.ok(row, `${KEY} present`);
  assert.equal(row.api_flag, false);
  assert.equal(row.kind, 'gpu');
  assert.equal(row.author, 'Remek Kinas');
  assert.equal(row.name, 'basal-omni-1.0-ultra (Remek Kinas)');
  assert.equal(row.licence, 'Apache-2.0');
  assert.equal(row.open, true);
  assert.equal(row.params, '31B');
  assert.equal(row.repo, 'https://huggingface.co/Remek/basal-omni-1.0-ultra');
  assert.equal(row.preview_feature, undefined);
  assert.match(row.inference_setting, /basal engine v2\.1\.0/);
  assert.match(row.inference_setting, /--mode eager --media on/);
  assert.match(row.inference_setting, /one H200 141 GB/);
  assert.match(row.measurement_source, /17 Oct 2026 \(image run 09:31-09:38 UTC/);
  assert.match(row.measurement_source, /Remek\/basal-omni-1\.0-ultra at revision b8e214cb \(Apache-2\.0; base google\/gemma-4-31B-it\)/);
  assert.match(row.measurement_source, /experimental release trained on text decisions only/);
  assert.match(row.measurement_source, /zero-shot/);
  assert.match(row.measurement_source, /unmodified/);
  assert.match(row.measurement_source, /USD 3\.99 per hour/);
  assert.match(row.measurement_source, /network cut proven twice/);
  assert.match(row.measurement_source, /1,500 of 1,500 items answered \(0 errors\), no retries/);
  assert.match(row.measurement_source, /116 of the 1,275 distinct images have transparency \(RGBA\)/);
  assert.match(row.measurement_source, /dropping the alpha channel \(PIL convert\('RGB'\)\) instead of compositing them on white/);
  assert.match(row.measurement_source, /image treatment differs between rows/);
  assert.match(row.measurement_source, /Polish letters \(35 items: 6 public, 29 sealed\)/);
  assert.match(row.measurement_source, /wall clock of each loopback request, one request at a time/);
  assert.match(row.measurement_source, /The TypeSafe-20 use-case bank was not run for this row/);
  assert.match(row.prior_exposure, /^First ImageJevBench measurement of this model\./);
  assert.match(row.pricing_note, /USD 1\.19 per GPU-hour/);
  assert.match(row.pricing_note, /USD 3\.99 per hour/);
  assert.match(row.pricing_note, /about USD 0\.284 per 1,000/);
  assert.equal(row.tracks.core.cost.source, 'measured GPU seconds x $1.19/GPU-hour');
  assert.equal(row.measurement_date_basis, 'Run timestamps: 17 Oct 2026, image run 09:31-09:38 UTC; pod 08:33-09:39 UTC.');
  assert.equal(row.ranked, true);
  assert.equal(row.rank, 9); // #8 when added (CR-506); CR-530 (drex-max) enters at #6
  assert.equal(row.release_ready, true);
  assert.deepEqual(row.holds, []);
});

test('CR-506 basal-omni-1.0-ultra scores are the reviewed ones and the knock-on stays small', () => {
  const near = (v, e, tol = 0.005) => assert.ok(Math.abs(v - e) <= tol, `${v} vs ${e}`);
  const core = row.tracks.core, cu = row.tracks['computer-use'];
  near(core.capability, 60.55); near(core.axes.intelligence, 51.47); near(core.axes.calibration, 69.64); near(core.axes.speed, 82.94);
  near(row.score, 40.91); near(core.cost.usd_per_1000, 0.0846, 0.00005);
  near(cu.capability_raw, 85.06); near(cu.composite.score, 50.29); // CR-530 (drex): +0.15 pp / +0.04 from the equating knock-on (84.91 / 50.25 at CR-506)
  assert.equal(release.ranking.filter((r) => r.ranked).length, 62); // CR-530 (drex)
  const byRank = release.ranking.filter((r) => r.ranked).sort((a, b) => a.rank - b.rank);
  assert.deepEqual(byRank.slice(7, 10).map((r) => r.key), ['kushal_gemma4_31b_it_autoloops', KEY, 'celeris_1_decision']); // CR-530 (drex): Drex Max enters at #6
  // the two rows that swap places because of the equating knock-on
  const rank = (k) => release.ranking.find((r) => r.key === k).rank;
  assert.equal(rank('cua_s1_4b'), 34); // 32 at CR-506; CR-530 (drex): falls two places below Bonsai-2-27B
  assert.equal(rank('bonsai_2_27b_pq2_0'), 33); // 33 at CR-506 and CR-530 (drex)
});

test('CR-506 neither top five changes; basal-omni-1.0-ultra is inside both caps (cost 0.0846 vs cap 0.318) and #11 of 52 in the Capability headline', () => {
  const e = release.capability_eligibility;
  const R = release.ranking.filter((r) => r.ranked);
  assert.deepEqual([...R].sort((a, b) => b.score - a.score).slice(0, 5).map((r) => r.key),
    ['kettei_fat', 'wity_1', 'imajev_4b', 'kettei_chub', 'sage_1_4_images']);
  const inCap = (r) => r.tracks.core.cost.usd_per_1000 <= e.cost_usd_per_1000_cap && r.tracks.core.speed.adjusted_p50_s <= e.latency_p50_s_cap;
  const capped = R.filter(inCap).sort((a, b) => b.tracks.core.capability - a.tracks.core.capability);
  assert.deepEqual(capped.slice(0, 5).map((r) => r.key), ['kettei_fat', 'sage_1_4_images', 'drex_max', 'jev_1_13_images', 'kushal_gemma4_31b_it_autoloops']); // CR-530 (drex): Drex Max enters at #3 (the Capability top five changes there), Imajev-4B leaves
  assert.equal(capped.length, 53); // 52 at CR-506; CR-530 (drex)
  assert.equal(capped.findIndex((r) => r.key === KEY) + 1, 12); // #11 at CR-506; CR-530 (drex) enters above
  const cu = R.filter((r) => r.tracks['computer-use']?.axes);
  assert.deepEqual([...cu].sort((a, b) => b.tracks['computer-use'].composite.score - a.tracks['computer-use'].composite.score).slice(0, 5).map((r) => r.key),
    ['kettei_fat', 'kettei_chub', 'wity_1', 'wity_1_off', 'imajev_4b']);
  assert.deepEqual([...cu].sort((a, b) => b.tracks['computer-use'].capability_raw - a.tracks['computer-use'].capability_raw).slice(0, 5).map((r) => r.key),
    ['gpt6_luna', 'jev_1_14_images', 'kettei_fat', 'jev_1_13_images', 'gemini31_flash_lite']);
});

test('CR-506 basal-omni-1.0-ultra has aggregate-only category and answered-coverage cells; the TypeSafe-20 gap is a recorded temporary exception', async () => {
  const cells = release.categories.systems[KEY];
  assert.equal(Object.keys(cells.capabilities).length, 14);
  assert.equal(Object.keys(cells.usecases).length, 5);
  assert.equal(Object.values(cells.usecases).reduce((n, c) => n + c[1], 0), 1500);
  assert.equal(Object.values(cells.capabilities).reduce((n, c) => n + c[1], 0), 1500);
  const coverage = JSON.parse(await read('../data/raw/benchmarks/jevbench/multimodal-preview/answered-coverage-v0.3.json'));
  assert.equal(coverage.systems[KEY].source.public_score_sha256, row.source_sha256);
  assert.equal(coverage.systems[KEY].source.output_sha256, '098080af890ea3ca43a88c61ada6b3ef2a392fb62ac25af226eae00455038e90');
  const ts20 = JSON.parse(await read('../data/imagejev-ts20-categories.json'));
  assert.equal(ts20.systems[KEY], undefined);
  const exceptions = JSON.parse(await read('../data/jevbench-breakdown-exceptions.json'));
  const ex = exceptions.entries.find((x) => x.key === KEY && x.board === 'imagejevbench');
  assert.deepEqual(ex.dims, ['typesafe']);
  assert.match(ex.reason, /^TEMPORARY:/);
});

test('CR-506 revision history records the basal addendum with no top-five change', async () => {
  const page = await read('../components/ImageJevV03Page.tsx');
  assert.match(page, /17 Oct 2026 addendum, new row:<\/b> adds basal-omni-1\.0-ultra \(Remek Kinas/);
  assert.match(page, /116 transparent \(RGBA\) images were flattened by the engine/);
  assert.match(page, /TypeSafe-20 cells for this row have not been measured yet/);
  assert.match(page, /Neither top five changes: basal-omni-1\.0-ultra ranks #8 by composite \(40\.9\) and #11 in the Capability headline \(52 of 63 rows\)/);
});
