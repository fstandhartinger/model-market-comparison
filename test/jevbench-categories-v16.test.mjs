import test from 'node:test';
import assert from 'node:assert/strict';
import { currentCategoryView, validateCurrentCategoryArtifact } from '../lib/jevbench-categories-v16.mjs';
import { categoryFixture } from './jevbench-category-fixture-v16.mjs';
const pair = ['synthetic-a', 'synthetic-b'];
test('current cohort shape retains own lane/date/counts and raw negatives', () => {
  const a = categoryFixture(); const view = currentCategoryView(a, pair);
  assert.equal(view.systems[0].measurement.cohort, 'S1200+P300'); assert.equal(view.systems[1].measurement.cohort, 'A300+P300');
  assert.equal(view.systems[0].measurement.topics['synthetic-0'].competence, -12.5);
  assert.equal(view.systems[1].measurement.measured_on, '2000-01-02');
});
test('valid empty API categories remain unavailable and incomplete coverage is honest', () => {
  const a = validateCurrentCategoryArtifact(categoryFixture({ apiFirst: 0 }));
  assert.equal(a.plotted_coverage_complete, false); assert.equal(a.systems['synthetic-b'].topics['synthetic-0'].competence, null);
});
test('valid low-count API category stays raw, not inferred from larger local cohort', () => {
  const a = validateCurrentCategoryArtifact(categoryFixture({ apiFirst: 20 }));
  assert.equal(a.systems['synthetic-b'].topics['synthetic-0'].n, 20); assert.equal(a.systems['synthetic-b'].topics['synthetic-0'].low_n, true);
});
test('a missing current row has no invented measurement or historic fallback', () => {
  const view = currentCategoryView(categoryFixture(), ['synthetic-a', 'historic-only']); assert.equal(view.systems[1].measurement, null);
});
const adverse = {
  'historic revision': a => a.revision = 'v1.5.5',
  'carry artifact': a => a.kind = 'category-carry',
  'item-level data': a => a.systems['synthetic-a'].topics['synthetic-0'].gold = 'never accepted',
  'extra provenance': a => a.provenance.admitted = true,
  'missing provenance': a => delete a.provenance.cohort_sha256,
  'invalid provenance': a => a.provenance.labels_sha256 = 'not-a-pin',
  'equated API claim': a => a.systems['synthetic-b'].equated = true,
  'wrong API cohort': a => a.systems['synthetic-b'].cohort = 'S1200+P300',
  'missing date': a => a.systems['synthetic-b'].measured_on = null,
  'impossible calendar date': a => a.systems['synthetic-b'].measured_on = '2000-02-30',
  'public denominator drift': a => a.systems['synthetic-b'].topics['synthetic-0'].public--,
  'missing failed decisions': a => delete a.systems['synthetic-b'].topics['synthetic-0'].failed,
  'too many failures': a => a.systems['synthetic-b'].topics['synthetic-0'].failed = 101,
  'nonfinite raw value': a => a.systems['synthetic-b'].topics['synthetic-0'].competence = Infinity,
  'boolean raw value': a => a.systems['synthetic-b'].topics['synthetic-0'].competence = false,
  'clipped raw negative': a => a.systems['synthetic-b'].topics['synthetic-0'].score = -12.5,
  'mismatched threshold': a => a.systems['synthetic-b'].topics['synthetic-0'].low_n = true,
  'missing category': a => delete a.systems['synthetic-b'].topics['synthetic-0'],
  'unknown category': a => a.systems['synthetic-b'].topics.other = a.systems['synthetic-b'].topics['synthetic-0'],
  'duplicate descriptor': a => a.topics[1] = a.topics[0],
  'empty descriptor set': a => a.topics = [],
  'zero type count': a => a.systems['synthetic-b'].topics['synthetic-0'].n_by_type = { choice: 0, score: 100 },
  'extra type': a => a.systems['synthetic-b'].topics['synthetic-0'].n_by_type = { unrelated: 100 },
  'wrong type denominator': a => a.systems['synthetic-b'].topics['synthetic-0'].n_by_type.choice--,
  'API denominator drift': a => { const c = a.systems['synthetic-b'].topics['synthetic-0']; c.n--; c.sealed--; c.n_by_type.choice--; },
  'local sealed count drift': a => { const c = a.systems['synthetic-a'].topics['synthetic-0']; c.n--; c.sealed--; c.n_by_type.choice--; },
};
for (const [label, mutate] of Object.entries(adverse)) test(`rejects ${label}`, () => {
  const a = categoryFixture(); mutate(a); assert.throws(() => validateCurrentCategoryArtifact(a), /aggregate unavailable/);
});
test('empty and boolean count counterexamples fail without rendering fake zeros', () => {
  for (const mutate of [a => a.systems['synthetic-b'].topics['synthetic-0'].competence = 0,
    a => a.systems['synthetic-b'].topics['synthetic-0'].n = false,
    a => a.plotted_coverage_complete = true]) {
    const a = categoryFixture({ apiFirst: 0 }); mutate(a); assert.throws(() => validateCurrentCategoryArtifact(a));
  }
});
test('unknown / repeated / unsafe selected keys refuse', () => {
  for (const p of [pair.slice(0, 1), [pair[0], pair[0]], ['__proto__', pair[0]], ['unsafe/key', pair[0]]]) assert.throws(() => currentCategoryView(categoryFixture(), p));
});
