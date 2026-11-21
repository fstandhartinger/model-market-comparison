import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const MIN_SCORED_ITEMS = 30;
const release = JSON.parse(readFileSync(new URL('../data/imagejev-v03.json', import.meta.url), 'utf8'));

test('ImageJevBench v0.3 lists image-type and use-case breakdowns only with at least 30 scored items', () => {
  const { categories, ranking } = release;
  assert.ok(ranking.length > 0, 'expected a current release roster');
  const dimensions = ['capabilities', 'usecases'].map(key => {
    const dimension = categories.dims.find(entry => entry.key === key);
    assert.ok(dimension?.cats.length, `missing category catalog for ${key}`);
    return dimension;
  });

  const failures = [];
  for (const { key } of ranking) {
    for (const dimension of dimensions) {
      for (const category of dimension.cats) {
        const cell = categories.systems[key]?.[dimension.key]?.[category.key];
        if (!cell) {
          failures.push(`${key}/${dimension.key}/${category.key}: missing`);
          continue;
        }
        const [, scored, completed = scored] = cell;
        if (!Number.isInteger(scored) || scored < MIN_SCORED_ITEMS ||
            !Number.isInteger(completed) || completed < MIN_SCORED_ITEMS) {
          failures.push(`${key}/${dimension.key}/${category.key}: scored=${scored}, completed=${completed}`);
        }
      }
    }
  }
  assert.equal(failures.length, 0, `Breakdown cells below the release floor:\n${failures.join('\n')}`);
});
