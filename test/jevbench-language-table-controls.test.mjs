import test from 'node:test';
import assert from 'node:assert/strict';
import { sortRows, filterRows, rowAverage, nextSort, ariaSort } from '../lib/jevbench-language-table-controls.mjs';

const rows = [
  { key: 'a', name: 'Alpha', group: 'open', index: 0, values: { mixed: 50, en: 70, de: null } },
  { key: 'b', name: 'beta', group: 'api', index: 1, values: { mixed: 60, en: null, de: 10 } },
  { key: 'c', name: 'Gamma 2', group: 'open', index: 2, values: { mixed: null, en: null, de: null } },
  { key: 'd', name: 'Delta', group: 'open', index: 3, values: { mixed: 60, en: 20, de: 30 } },
];
const keys = (r) => r.map((x) => x.key).join('');

test('board order restores index order', () => {
  assert.equal(keys(sortRows([...rows].reverse(), 'board', 'asc')), 'abcd');
});
test('numeric sort puts missing last in both directions, ties by board order', () => {
  assert.equal(keys(sortRows(rows, 'mixed', 'desc')), 'bdac');
  assert.equal(keys(sortRows(rows, 'mixed', 'asc')), 'abdc');
  assert.equal(keys(sortRows(rows, 'en', 'desc')), 'adbc');
  assert.equal(keys(sortRows(rows, 'en', 'asc')), 'dabc');
});
test('average ignores missing cells; all-missing is null and last', () => {
  assert.equal(rowAverage(rows[0]), 60);
  assert.equal(rowAverage(rows[2]), null);
  assert.equal(keys(sortRows(rows, 'avg', 'desc')), 'adbc');
  assert.equal(keys(sortRows(rows, 'avg', 'asc')), 'bdac');
});
test('name sort is case-insensitive', () => {
  assert.equal(keys(sortRows(rows, 'name', 'asc')), 'abdc');
  assert.equal(keys(sortRows(rows, 'name', 'desc')), 'cdba');
});
test('filter ANDs name query and group', () => {
  assert.equal(keys(filterRows(rows, '', 'api')), 'b');
  assert.equal(keys(filterRows(rows, 'ta', 'all')), 'bd');
  assert.equal(keys(filterRows(rows, 'ta', 'open')), 'd');
  assert.equal(keys(filterRows(rows, '  ALPHA ', 'all')), 'a');
});
test('header click toggles and aria-sort follows', () => {
  let s = { key: 'board', dir: 'desc' };
  s = nextSort(s, 'de'); assert.deepEqual(s, { key: 'de', dir: 'desc' });
  assert.equal(ariaSort(s, 'de'), 'descending');
  s = nextSort(s, 'de'); assert.equal(ariaSort(s, 'de'), 'ascending');
  assert.equal(ariaSort(s, 'en'), 'none');
  assert.deepEqual(nextSort(s, 'name'), { key: 'name', dir: 'asc' });
});
