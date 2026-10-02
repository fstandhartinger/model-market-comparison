import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  JEVBENCH_FILTER_PREFIX,
  JEV_FILTER_KEYS,
  JEV_NUMERIC_FIELDS,
  JEV_ROW_KINDS,
  defaultJevFilters,
  distinctJevValues,
  filterJevRows,
  formatJevRange,
  isJevFilterActive,
  jevFieldHasValues,
  jevHasNewRows,
  jevRowKinds,
  matchesJevFilters,
  normalizeJevFilters,
  parseJevFilters,
  parseJevRange,
  resetJevFilterParams,
  serializeJevFilters,
  visibleJevKeys,
} from '../lib/jevbench-global-filters.mjs';
import { jevClassRows } from '../lib/jevbench-jev-class.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const row = (overrides = {}) => ({
  key: 'x', display: 'X', provider: null, family: null, modelClass: null,
  open: 'unknown', api: false, newInVersion: false, parameters: null, licence: null,
  developerPrice: null, basePrice: null, officialCost: null, alternativePrice: null, p50: null, p95: null,
  jevClass: { status: 'unknown', reason: null },
  ...overrides,
});

test('CR-269: URL round trips preserve every field and unrelated parameters', () => {
  const state = {
    q: 'gemma',
    kinds: ['api', 'open-weights'],
    providers: ['OpenAI', 'Qwen'],
    families: ['Qwen3.5'],
    licences: ['MIT'],
    onlyNew: true,
    parameters: { min: 1e9, max: 2e12 },
    developerPrice: { min: null, max: 0.5 },
    basePrice: { min: 0.01, max: null },
    officialCost: { min: 0.02, max: 0.6 },
    alternativePrice: { min: null, max: 0.8 },
    p50: { min: 0.1, max: 2 },
    p95: { min: null, max: null },
    jevClass: ['eligible', 'outside'],
  };
  const url = new URL('https://benchmarkheaven.com/jev-models/v1.5.5?w=90:5:0:5&view=intelligence&costcap=3&latcap=none&extra=hello#jev14-chart-title');
  url.search = serializeJevFilters(url.searchParams, state).toString();
  // Multi-select fields parse back in canonical (kinds/statuses) or selection (pickers) order.
  assert.deepEqual(parseJevFilters(url.searchParams), { ...state, kinds: ['open-weights', 'api'] });
  assert.equal(url.searchParams.get('w'), '90:5:0:5');
  assert.equal(url.searchParams.get('view'), 'intelligence');
  assert.equal(url.searchParams.get('costcap'), '3');
  assert.equal(url.searchParams.get('latcap'), 'none');
  assert.equal(url.searchParams.get('extra'), 'hello');
  assert.equal(url.hash, '#jev14-chart-title');
  // Multi-select fields serialize as repeated keys: kinds in canonical order, pickers in selection order.
  const written = serializeJevFilters(new URLSearchParams(), state);
  assert.deepEqual(written.getAll('jf-kind'), ['open-weights', 'api']);
  assert.deepEqual(written.getAll('jf-provider'), ['OpenAI', 'Qwen']);
  assert.equal(written.get('jf-params'), '1000000000-2000000000000');
  assert.equal(written.get('jf-price'), '-0.5');
  assert.equal(written.get('jf-baseprice'), '0.01-');
  assert.equal(written.get('jf-cost'), '0.02-0.6');
  assert.equal(written.get('jf-altprice'), '-0.8');
  assert.equal(written.get('jf-p50'), '0.1-2');
  assert.equal(written.get('jf-p95'), null);
  // A default state writes nothing and leaves unrelated keys untouched.
  assert.deepEqual([...serializeJevFilters(new URLSearchParams('w=90:5:0:5&view=cost'), defaultJevFilters())], [['w', '90:5:0:5'], ['view', 'cost']]);
  // The prefix never collides with the existing page parameters.
  for (const existing of ['w', 'view', 'costcap', 'latcap']) assert.ok(!existing.startsWith(JEVBENCH_FILTER_PREFIX));
  for (const key of Object.values(JEV_FILTER_KEYS)) assert.ok(key.startsWith(JEVBENCH_FILTER_PREFIX), key);
});

test('CR-269: malformed URL values are dropped, never coerced or swapped', () => {
  const params = new URLSearchParams('jf-q=%20%20&jf-kind=api&jf-kind=banana&jf-kind=api&jf-new=0&jf-params=10-5&jf-price=abc&jf-baseprice=1e400&jf-cost=1e400&jf-altprice=Infinity&jf-p50=NaN&jf-p95=Infinity&jf-class=eligible&jf-class=maybe&jf-q=second');
  const state = parseJevFilters(params);
  assert.equal(state.q, '');
  assert.deepEqual(state.kinds, ['api']);
  assert.equal(state.onlyNew, false);
  assert.deepEqual(state.parameters, { min: null, max: null });
  assert.deepEqual(state.developerPrice, { min: null, max: null });
  assert.deepEqual(state.basePrice, { min: null, max: null });
  assert.deepEqual(state.officialCost, { min: null, max: null });
  assert.deepEqual(state.alternativePrice, { min: null, max: null });
  assert.deepEqual(state.p50, { min: null, max: null });
  assert.deepEqual(state.p95, { min: null, max: null });
  assert.deepEqual(state.jevClass, ['eligible']);
  assert.deepEqual(parseJevFilters(new URLSearchParams('jf-new=1')), { ...defaultJevFilters(), onlyNew: true });
  for (const value of ['0', '2', 'yes', 'true', 'on']) assert.equal(parseJevFilters(new URLSearchParams(`jf-new=${value}`)).onlyNew, false, value);
  assert.deepEqual(parseJevFilters(new URLSearchParams()), defaultJevFilters());
  assert.deepEqual(parseJevFilters(null), defaultJevFilters());
  // Range grammar: either side optional, signs and exponents allowed, whitespace tolerated.
  assert.deepEqual(parseJevRange('5-'), { min: 5, max: null });
  assert.deepEqual(parseJevRange('-5'), { min: null, max: 5 });
  assert.deepEqual(parseJevRange('5-10'), { min: 5, max: 10 });
  assert.deepEqual(parseJevRange('-2--1'), { min: -2, max: -1 });
  assert.deepEqual(parseJevRange(' 1e2 - 2e3 '), { min: 100, max: 2000 });
  assert.deepEqual(parseJevRange('0.5-'), { min: 0.5, max: null });
  for (const text of [null, '', ' ', '-', '10-5', 'abc', '1..2', '5 10', 'NaN', 'Infinity', '1e400', '0x10', '5-10-20']) {
    assert.deepEqual(parseJevRange(text), { min: null, max: null }, String(text));
  }
  assert.equal(formatJevRange({ min: 5, max: null }), '5-');
  assert.equal(formatJevRange({ min: null, max: 5 }), '-5');
  assert.equal(formatJevRange({ min: null, max: null }), '');
  assert.equal(formatJevRange(null), '');
});

test('CR-269: missing row values stay missing and never match active filters', () => {
  const bare = row();
  assert.equal(matchesJevFilters(bare, defaultJevFilters()), true);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), q: 'x' }), true);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), q: 'zzz' }), false);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), providers: ['OpenAI'] }), false);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), families: ['Qwen'] }), false);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), licences: ['MIT'] }), false);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), onlyNew: true }), false);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), jevClass: ['unknown'] }), true);
  assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), jevClass: ['eligible'] }), false);
  for (const field of JEV_NUMERIC_FIELDS) {
    assert.equal(matchesJevFilters(bare, { ...defaultJevFilters(), [field]: { min: 0, max: null } }), false, field);
  }
  // A reported zero is a real value and matches a zero lower bound — nothing is coerced.
  const zero = row({ p50: 0 });
  assert.equal(matchesJevFilters(zero, { ...defaultJevFilters(), p50: { min: 0, max: null } }), true);
  // Search is case-insensitive over name, key, provider, family, class/type and licence.
  const named = row({ key: 'gemma-4-12b', display: 'Gemma 4 12B', provider: 'BlockBrain', family: 'Gemma', modelClass: 'native-logit', licence: 'Apache-2.0' });
  assert.equal(matchesJevFilters(named, { ...defaultJevFilters(), q: 'GEMMA' }), true);
  assert.equal(matchesJevFilters(named, { ...defaultJevFilters(), q: '12b' }), true);
  for (const query of ['blockbrain', 'gemma', 'native-logit', 'apache-2.0']) {
    assert.equal(matchesJevFilters(named, { ...defaultJevFilters(), q: query }), true, query);
  }
});

test('CR-269: model kinds derive from open status and the API flag; OR within kinds', () => {
  assert.deepEqual(jevRowKinds({ open: 'weights', api: false }), ['open-weights']);
  assert.deepEqual(jevRowKinds({ open: 'yes', api: false }), ['open-code']);
  assert.deepEqual(jevRowKinds({ open: true, api: false }), ['open-code']);
  assert.deepEqual(jevRowKinds({ open: 'no', api: false }), ['closed']);
  assert.deepEqual(jevRowKinds({ open: 'unknown', api: false }), []);
  assert.deepEqual(jevRowKinds({ open: 'no', api: true }), ['closed', 'api']);
  assert.deepEqual(jevRowKinds({ open: 'weights', api: true }), ['open-weights', 'api']);
  assert.deepEqual(jevRowKinds({ open: 'unknown', api: true }), ['api']);
  assert.deepEqual(JEV_ROW_KINDS, ['open-weights', 'open-code', 'closed', 'api']);

  const rows = [
    row({ key: 'ow', open: 'weights' }),
    row({ key: 'oc', open: 'yes' }),
    row({ key: 'cl', open: 'no' }),
    row({ key: 'un', open: 'unknown' }),
    row({ key: 'api1', open: 'no', api: true }),
    row({ key: 'api2', open: 'weights', api: true }),
  ];
  const withKinds = (kinds) => [...visibleJevKeys(rows, { ...defaultJevFilters(), kinds })];
  assert.deepEqual(withKinds(['open-weights']), ['ow', 'api2']);
  assert.deepEqual(withKinds(['open-code']), ['oc']);
  assert.deepEqual(withKinds(['closed']), ['cl', 'api1']);
  assert.deepEqual(withKinds(['api']), ['api1', 'api2']);
  assert.deepEqual(withKinds(['open-weights', 'api']), ['ow', 'api1', 'api2']);
  assert.deepEqual(withKinds(['open-code', 'closed']), ['oc', 'cl', 'api1']);
  assert.deepEqual(withKinds([]), rows.map((r) => r.key));
});

test('CR-269: filters combine with AND across fields', () => {
  // b passes every active field; each gate row passes everything except the one named field.
  const base = { provider: 'Google', family: 'Gemma', licence: 'MIT', open: 'no', api: true, p50: 1.5, developerPrice: 0.4, officialCost: 0.5, jevClass: { status: 'outside', reason: 'cost 3× Jev' } };
  const rows = [
    row({ key: 'b', display: 'query-token', ...base, p50: 2.5 }),
    row({ key: 'gate-q', display: 'GPT D', ...base }),
    row({ key: 'gate-kinds', display: 'query-token', ...base, open: 'weights', api: false }),
    row({ key: 'gate-providers', display: 'query-token', ...base, provider: 'Qwen' }),
    row({ key: 'gate-families', display: 'query-token', ...base, family: 'Qwen3.5' }),
    row({ key: 'gate-licences', display: 'query-token', ...base, licence: 'Apache-2.0' }),
    row({ key: 'gate-p50', display: 'query-token', ...base, p50: 0.4 }),
    row({ key: 'gate-devprice', display: 'query-token', ...base, developerPrice: null }),
    row({ key: 'gate-class', display: 'query-token', ...base, jevClass: { status: 'eligible', reason: null } }),
  ];
  const state = {
    ...defaultJevFilters(),
    q: 'query-token',
    kinds: ['api'],
    providers: ['Google'],
    families: ['Gemma'],
    licences: ['MIT'],
    p50: { min: 1, max: null },
    developerPrice: { min: 0.2, max: null },
    jevClass: ['outside'],
  };
  assert.deepEqual([...visibleJevKeys(rows, state)], ['b']);
  // Relaxing exactly one field admits the matching gate row and nothing else.
  const relaxations = {
    q: '',
    kinds: [],
    providers: [],
    families: [],
    licences: [],
    p50: { min: null, max: null },
    developerPrice: { min: null, max: null },
    jevClass: [],
  };
  const gateFor = { q: 'gate-q', kinds: 'gate-kinds', providers: 'gate-providers', families: 'gate-families', licences: 'gate-licences', p50: 'gate-p50', developerPrice: 'gate-devprice', jevClass: 'gate-class' };
  for (const [field, relaxedValue] of Object.entries(relaxations)) {
    const relaxed = { ...state, [field]: relaxedValue };
    assert.deepEqual([...visibleJevKeys(rows, relaxed)].sort(), ['b', gateFor[field]].sort(), `relaxing ${field} admits exactly b and its gate row`);
  }
  assert.equal(visibleJevKeys(rows, { ...state, onlyNew: true }).size, 0);
  assert.deepEqual(filterJevRows(rows, state).map((r) => r.key), ['b']);
});

test('CR-269: numeric ranges are inclusive and exclude missing values', () => {
  const rows = [
    row({ key: 'low', p50: 0.1, p95: 0.3 }),
    row({ key: 'mid', p50: 1, p95: 2 }),
    row({ key: 'high', p50: 10, p95: 40 }),
    row({ key: 'none', p50: null, p95: null }),
  ];
  const withP50 = (range) => [...visibleJevKeys(rows, { ...defaultJevFilters(), p50: range })];
  assert.deepEqual(withP50({ min: 0.1, max: 10 }), ['low', 'mid', 'high']);
  assert.deepEqual(withP50({ min: 1, max: null }), ['mid', 'high']);
  assert.deepEqual(withP50({ min: null, max: 1 }), ['low', 'mid']);
  assert.deepEqual(withP50({ min: 0.5, max: 5 }), ['mid']);
  assert.deepEqual(withP50({ min: null, max: null }), ['low', 'mid', 'high', 'none']);
  // normalizeJevFilters clears ranges for fields the release has no values for.
  const noParams = [row({ key: 'a' }), row({ key: 'b' })];
  const normalized = normalizeJevFilters({ ...defaultJevFilters(), parameters: { min: 1, max: 2 }, p50: { min: 1, max: 2 } }, noParams);
  assert.deepEqual(normalized.parameters, { min: null, max: null });
  assert.deepEqual(normalized.p50, { min: null, max: null });
  assert.equal(jevFieldHasValues(noParams, 'parameters'), false);
  assert.equal(jevFieldHasValues(rows, 'p50'), true);
  assert.equal(jevFieldHasValues(rows, 'parameters'), false);
  // A stale range for an empty field cannot hide rows after normalization.
  assert.equal(visibleJevKeys(noParams, normalized).size, 2);
  assert.equal(jevHasNewRows(noParams), false);
  assert.equal(jevHasNewRows([row({ key: 'n', newInVersion: true })]), true);
  assert.deepEqual(distinctJevValues([row({ key: 'a', provider: 'B Co' }), row({ key: 'b', provider: 'A Co' }), row({ key: 'c', provider: null }), row({ key: 'd', provider: 'A Co' })], 'provider'), ['A Co', 'B Co']);
});

test('CR-269: reset clears only the JevBench filter keys and preserves unrelated parameters', () => {
  const params = new URLSearchParams('w=90:5:0:5&view=cost&costcap=3&latcap=none&jf-q=x&jf-kind=api&jf-new=1&jf-p50=1-2&jf-p95=3&other=keep');
  const reset = resetJevFilterParams(params);
  assert.deepEqual([...reset], [['w', '90:5:0:5'], ['view', 'cost'], ['costcap', '3'], ['latcap', 'none'], ['other', 'keep']]);
  assert.deepEqual(parseJevFilters(reset), defaultJevFilters());
  assert.equal(params.get('jf-q'), 'x');
  assert.equal(params.get('w'), '90:5:0:5');
  assert.equal(isJevFilterActive(defaultJevFilters()), false);
  assert.equal(isJevFilterActive({ ...defaultJevFilters(), q: '   ' }), false);
  assert.equal(isJevFilterActive({ ...defaultJevFilters(), q: 'x' }), true);
  assert.equal(isJevFilterActive({ ...defaultJevFilters(), p50: { min: null, max: null } }), false);
  assert.equal(isJevFilterActive({ ...defaultJevFilters(), p50: { min: 0, max: null } }), true);
  assert.equal(isJevFilterActive({ ...defaultJevFilters(), jevClass: ['unknown'] }), true);
});

test('CR-269: v1.5.5 release maps into the filter API with parameters disabled and base price on some rows', () => {
  const artifact = JSON.parse(read('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.5-results.json'));
  const classByKey = new Map(jevClassRows(artifact.systems).rows.map((r) => [r.row.key, r]));
  const openOf = (s) => s.open === true || s.open === 'yes' ? 'yes' : (s.open === 'weights' || s.open === 'open weights') ? 'weights' : s.open === 'no' ? 'no' : 'unknown';
  const rows = artifact.systems.map((s) => {
    const cls = classByKey.get(s.key);
    const missing = cls ? cls.reasons.some((reason) => /no (cost|latency) reported/.test(reason)) : true;
    return {
      key: s.key, display: s.display, provider: s.author, family: s.underlying, modelClass: s.class,
      open: openOf(s), api: s.api_flag === true, newInVersion: false, parameters: null,
      licence: s.licence, developerPrice: s.api_flag ? s.cost.usd_per_1000 : null,
      basePrice: /(?:price floor|base[- ]model reference price)/i.test(s.cost?.basis ?? '')
        && !/no (?:exact )?base[- ]model floor applies/i.test(s.cost?.basis ?? '') ? s.cost.usd_per_1000 : null,
      officialCost: s.cost.usd_per_1000, alternativePrice: s.alt?.usd_per_1000 ?? null,
      p50: s.speed.p50_s_adjusted, p95: s.speed.p95_s_adjusted,
      jevClass: { status: cls ? (cls.inClass ? 'eligible' : missing ? 'unknown' : 'outside') : 'unknown', reason: cls?.reasons[0] ?? null },
    };
  });
  assert.equal(rows.length, 112);
  assert.equal(jevFieldHasValues(rows, 'parameters'), false);
  assert.equal(jevFieldHasValues(rows, 'basePrice'), true);
  assert.equal(rows.filter((r) => r.basePrice != null).length, 13);
  assert.equal(jevFieldHasValues(rows, 'developerPrice'), true);
  assert.equal(jevFieldHasValues(rows, 'officialCost'), true);
  assert.equal(jevFieldHasValues(rows, 'alternativePrice'), true);
  assert.equal(jevFieldHasValues(rows, 'p50'), true);
  assert.equal(jevFieldHasValues(rows, 'p95'), true);
  const defaults = defaultJevFilters();
  assert.equal(visibleJevKeys(rows, defaults).size, 112);
  assert.equal(visibleJevKeys(rows, { ...defaults, kinds: ['api'] }).size, 17);
  assert.equal(visibleJevKeys(rows, { ...defaults, kinds: ['open-weights'] }).size, 5);
  assert.equal(visibleJevKeys(rows, { ...defaults, kinds: ['open-code'] }).size, 83);
  assert.equal(visibleJevKeys(rows, { ...defaults, kinds: ['closed'] }).size, 9);
  // AND composition on real data: API rows with adjusted p50 of at most 1 s.
  const apiRows = rows.filter((r) => r.api);
  const combo = [...visibleJevKeys(rows, { ...defaults, kinds: ['api'], p50: { min: null, max: 1 } })].sort();
  assert.deepEqual(combo, apiRows.filter((r) => r.p50 != null && r.p50 <= 1).map((r) => r.key).sort());
  // The parameter range is inactive for v1.5.5: normalization clears it and nothing is hidden.
  const normalized = normalizeJevFilters({ ...defaults, parameters: { min: 1, max: 2 } }, rows);
  assert.deepEqual(normalized.parameters, { min: null, max: null });
  assert.equal(visibleJevKeys(rows, normalized).size, 112);
  // The base-price range keeps exactly the rows that report one.
  const base = [...visibleJevKeys(rows, { ...defaults, basePrice: { min: 0, max: null } })].sort();
  assert.deepEqual(base, rows.filter((r) => r.basePrice != null).map((r) => r.key).sort());
  const scoredCosts = [...visibleJevKeys(rows, { ...defaults, officialCost: { min: 0.01, max: 0.5 } })].sort();
  assert.deepEqual(scoredCosts, rows.filter((r) => r.officialCost != null && r.officialCost >= 0.01 && r.officialCost <= 0.5).map((r) => r.key).sort());
  // Jev-class statuses come from the shared classifier: eligible + outside cover every classified row.
  const statuses = new Set(rows.map((r) => r.jevClass.status));
  assert.ok(statuses.has('eligible') && statuses.has('outside'));
  assert.deepEqual([...visibleJevKeys(rows, { ...defaults, jevClass: ['eligible'] })].sort(), rows.filter((r) => r.jevClass.status === 'eligible').map((r) => r.key).sort());
});

test('CR-269: client provider and panel expose the documented API with URL-driven state', () => {
  const source = read('../components/JevV15Filters.tsx');
  assert.match(source, /^'use client';/);
  assert.match(source, /export function JevV15FilterProvider/);
  assert.match(source, /export function useJevV15Filters/);
  assert.match(source, /export function JevV15FilterPanel/);
  assert.match(source, /export interface JevV15FilterContextValue/);
  // URL state: push for discrete changes, replace for search, popstate for back/forward.
  assert.match(source, /history\.pushState\(window\.history\.state, '', url\)/);
  assert.match(source, /history\.replaceState\(window\.history\.state, '', url\)/);
  assert.match(source, /window\.addEventListener\('popstate', read\)/);
  assert.match(source, /serializeJevFilters\(url\.searchParams, state\)/);
  assert.match(source, /resetJevFilterParams\(url\.searchParams\)/);
  // The panel: live count, clear control, disabled numeric ranges with an explanation.
  assert.match(source, /data-bh-jev15-filter-count/);
  assert.match(source, /data-bh-jev15-filter-clear/);
  assert.match(source, /Clear filters/);
  assert.match(source, /data-bh-jev15-filter-disabled/);
  assert.match(source, /No system in this release reports an exact parameter count\./);
  // Context surface the lead consumes to filter charts and tables.
  assert.match(source, /visibleKeys/);
  assert.match(source, /visibleRows/);
  assert.match(source, /normalizeJevFilters\(filters, effectiveRows\)/);
  // Types come from the shared declaration file.
  assert.match(source, /from '\.\.\/lib\/jevbench-global-filters\.mjs'/);
  const types = read('../lib/jevbench-global-filters.d.mts');
  for (const name of ['JevV15RowMeta', 'JevV15FilterState', 'JevV15Range', 'JevV15RowKind', 'JevV15ClassStatus', 'JevV15NumericField', 'parseJevFilters', 'serializeJevFilters', 'resetJevFilterParams', 'filterJevRows', 'visibleJevKeys', 'normalizeJevFilters', 'jevRowKinds', 'matchesJevFilters']) {
    assert.match(types, new RegExp(`\\b${name}\\b`), name);
  }
});
