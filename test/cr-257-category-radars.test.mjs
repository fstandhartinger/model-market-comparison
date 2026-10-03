import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { readCurrentJevbench } from '../lib/jevbench-current.mjs';
import { readMultimodalPreview } from '../lib/jevbench-multimodal-preview.mjs';
import {
  JEVBENCH_CATEGORY_REVISIONS, IMAGEJEV_CATEGORY_REVISIONS, jevbenchCategoryView, imageJevCategoryView, validateCategoryArtifact,
} from '../lib/jevbench-categories.mjs';

// CR-257 (Florian 1 Oct 2026): "Compare two systems" on JevBench and ImageJevBench always carries the capability radar
// (subject topics / image types) and the TypeSafe use-case radar, with per-category data for EVERY ranked system, so any
// A/B pair can be compared — "for every single version of the future releases". A release fails here when a versioned
// page is not covered by a category artifact, when the compare view stops receiving the categories, or when a ranked
// system has no category values. A new release must ship its own per-category artifact (computed from its stored
// per-item results, never estimated) and register its revision in lib/jevbench-categories.mjs.

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

/** Ranked systems whose per-item results do not exist. Each entry must say why; adding one needs review. */
const EXEMPT = {
  imagejevbench: {
    winnow_12b_q8: 'ImageJev v0.1.5 run was aggregate-only: per-item outputs were never retrieved from its GPU pod (job imagejev-winnow12b-20260927). Needs a re-run.',
  },
  jevbench: {},
};

test('CR-257: every JevBench release page from v1.5.0 on is covered by a category artifact', async () => {
  const versions = (await readdir(new URL('../app/jev-models/', import.meta.url))).filter((d) => /^v\d+(\.\d+)+$/.test(d));
  const atLeast15 = (v) => { const [maj, min] = v.slice(1).split('.').map(Number); return maj > 1 || (maj === 1 && min >= 5); };
  for (const v of versions.filter(atLeast15)) {
    assert.ok(JEVBENCH_CATEGORY_REVISIONS.includes(v), `/jev-models/${v} has no per-category artifact: add one and register it in lib/jevbench-categories.mjs`);
  }
});

test('CR-257: the live JevBench release has category values for every ranked system', async () => {
  const live = await read('../app/jev-models/page.tsx');
  assert.match(live, /readCurrentJevbench\(\)/, 'live page uses the explicit current release pointer');
  const { artifact } = await readCurrentJevbench();
  assert.ok(JEVBENCH_CATEGORY_REVISIONS.includes(artifact.revision), `live revision ${artifact.revision} has a category artifact`);
  const ranked = artifact.systems.filter((s) => s.listing === 'ranked' || s.ranked).map((s) => s.key);
  const view = jevbenchCategoryView(artifact.revision, ranked);
  assert.deepEqual(view.dims.map((d) => d.key), ['topics', 'usecases']);
  for (const key of ranked) {
    if (EXEMPT.jevbench[key]) continue;
    assert.ok(view.systems[key], `${key}: ranked but has no per-category values`);
    for (const dim of view.dims) {
      const plotted = dim.cats.filter((c) => c.plotted);
      assert.ok(plotted.length >= 5, `${dim.key}: at least five plotted categories`);
      for (const c of plotted) assert.ok(view.systems[key][dim.key][c.key], `${key}: no value for ${dim.key}.${c.key}`);
    }
  }
});

test('CR-257: the live ImageJevBench release has category values for every ranked system', async () => {
  const a = await readMultimodalPreview();
  assert.ok(IMAGEJEV_CATEGORY_REVISIONS.includes(a.revision), `ImageJevBench ${a.revision} has no category artifact`);
  const keys = a.ranking.map((r) => r.key);
  const view = imageJevCategoryView(a.revision, keys);
  assert.deepEqual(view.dims.map((d) => d.key), ['capabilities', 'usecases']);
  for (const key of keys) {
    if (EXEMPT.imagejevbench[key]) { assert.ok(view.missing[key], `${key}: exempt rows must show their reason`); continue; }
    assert.ok(view.systems[key], `${key}: ranked but has no per-category values`);
    for (const dim of view.dims) for (const c of dim.cats.filter((x) => x.plotted)) assert.ok(view.systems[key][dim.key][c.key], `${key}: no value for ${dim.key}.${c.key}`);
  }
  for (const key of Object.keys(EXEMPT.imagejevbench)) assert.ok(keys.includes(key), `stale exemption ${key}`);
});

test('CR-257: both compare views receive the categories and draw the two category radars', async () => {
  const [board, image, compare, radar] = await Promise.all([
    read('../components/JevBenchV15Preview.tsx'), read('../app/jev-models/multimodal-preview/page.tsx'),
    read('../components/JevCompareV15.tsx'), read('../components/JevRadars.tsx'),
  ]);
  assert.match(board, /<JevCompareV15 [^>]*categories=\{jevbenchCategoryView\(/, 'JevBench compare view gets the categories');
  assert.match(image, /<JevCompareV15 [^>]*categories=\{imageJevCategoryView\(/, 'ImageJevBench compare view gets the categories');
  assert.match(compare, /categoryFigures/);
  assert.match(compare, /figures\.splice\(1, 0, \.\.\.categoryFigures\)/, 'category radars sit right after the score axes');
  assert.match(compare, /<CategoryKey /, 'each category radar explains its categories and item counts');
  assert.match(radar, /\{s\.tip && <title>\{s\.tip\}<\/title>\}/, 'spoke labels carry the category tooltip');
});

test('CR-257: category artifacts are aggregate-only and internally consistent', async () => {
  for (const [path, dims] of [['../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.4-categories.json', ['topics', 'usecases']],
    ['../data/raw/benchmarks/jevbench/multimodal-preview/categories-v0.1.5.json', ['capabilities', 'usecases']]]) {
    const a = JSON.parse(await read(path));
    validateCategoryArtifact(a, dims);
    const text = JSON.stringify(a);
    for (const banned of ['"expected"', '"gold"', '"question"', '"state"', '"prediction"', '"probs"']) assert.ok(!text.includes(banned), `${path}: no item-level field ${banned}`);
    for (const c of a.usecases) if (c.n < a.min_n) assert.equal(c.low_n, true, `${c.key} marked low n`);
  }
});
