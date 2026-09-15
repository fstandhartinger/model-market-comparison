import test from 'node:test';
import assert from 'node:assert/strict';
import {
  savePreset, renamePreset, deletePreset, mergePresets, sanitizeStore, uniqueName,
  ROW_PRESETS, rowFilter, modelsForPreset, MODEL_PRESETS, FILTER_PRESETS, pickFilters, resolveFilterPatch, matchingFilterPreset, encodeFilters, decodeFilters,
} from '../lib/presets.mjs';

test('CR-4.2 save: trims the name, ignores empty names, same name updates instead of duplicating', () => {
  let l = savePreset([], '  My   coding set ', ['a', 'b'], 1, 'x1');
  assert.deepEqual(l, [{ id: 'x1', name: 'My coding set', value: ['a', 'b'], updatedAt: 1 }]);
  assert.equal(savePreset(l, '   ', ['c']), l);
  l = savePreset(l, 'my CODING set', ['c'], 2, 'x2');
  assert.equal(l.length, 1);
  assert.deepEqual(l[0].value, ['c']);
  assert.equal(l[0].id, 'x1');
});

test('CR-4.2 rename avoids clashes; delete removes only that preset', () => {
  let l = savePreset(savePreset([], 'A', [1], 1, 'a'), 'B', [2], 1, 'b');
  l = renamePreset(l, 'b', 'a');
  assert.equal(l.find((p) => p.id === 'b').name, 'a (2)');
  assert.equal(renamePreset(l, 'b', '  ').find((p) => p.id === 'b').name, 'a (2)');
  assert.deepEqual(deletePreset(l, 'a').map((p) => p.id), ['b']);
  assert.equal(uniqueName([{ id: '1', name: 'X' }, { id: '2', name: 'X (2)' }], 'x'), 'x (3)');
});

test('CR-5.4 merge: nothing lost, identical presets collapse, same name with a different value is kept apart', () => {
  const account = [{ id: 'a1', name: 'Coding', value: ['m1', 'm2'], updatedAt: 1 }];
  const local = [
    { id: 'l1', name: 'coding', value: ['m1', 'm2'], updatedAt: 2 },
    { id: 'l2', name: 'Coding', value: ['m3'], updatedAt: 2 },
    { id: 'l3', name: 'Open', value: ['m4'], updatedAt: 2 },
  ];
  const merged = mergePresets(account, local);
  assert.deepEqual(merged.map((p) => p.name), ['Coding', 'Coding (this browser)', 'Open']);
  assert.deepEqual(mergePresets(merged, local), merged, 'merging twice changes nothing');
});

test('CR-4.2 sanitizeStore drops malformed presets and wrong value shapes', () => {
  const s = sanitizeStore({
    models: [{ id: 'a', name: 'ok', value: ['x'] }, { id: 'b', name: '', value: ['x'] }, { id: 'c', name: 'bad', value: 'x' }],
    rows: [{ id: 'r', name: 'rows', value: [1] }],
    filters: [{ id: 'f', name: 'f', value: { teeOnly: true } }, { id: 'g', name: 'g', value: [] }],
    junk: [{ id: 'j', name: 'j', value: 1 }],
  });
  assert.deepEqual(s.models.map((p) => p.id), ['a']);
  assert.deepEqual(s.rows, []);
  assert.deepEqual(s.filters.map((p) => p.id), ['f']);
  assert.deepEqual(sanitizeStore(null), { models: [], rows: [], filters: [] });
});

test('CR-3.1 row presets: the required built-ins exist and select what they say', () => {
  assert.deepEqual(ROW_PRESETS.map((p) => p.id), ['all', 'important', 'aa', 'coding', 'agentic', 'math-science', 'community', 'complete']);
  const rows = {
    index: { key: 'aa_intelligence_index', group: 'indices', tags: ['aa', 'headline'] },
    swe: { key: 'swe-bench', group: 'coding', tags: ['headline'] },
    niche: { key: 'toolx', group: 'agentic', tags: ['niche'] },
    math: { key: 'aime', group: 'math', tags: ['community'] },
  };
  const pick = (id, present = 2, total = 2) => Object.entries(rows).filter(([, r]) => rowFilter(id)(r, present, total)).map(([k]) => k);
  assert.deepEqual(pick('important'), ['index', 'swe']);
  assert.deepEqual(pick('aa'), ['index']);
  assert.deepEqual(pick('coding'), ['swe']);
  assert.deepEqual(pick('agentic'), ['niche']);
  assert.deepEqual(pick('math-science'), ['math']);
  assert.deepEqual(pick('community'), ['niche', 'math']);
  assert.deepEqual(pick('complete', 1, 2), []);
  assert.deepEqual(pick(['aime', 'swe-bench']), ['swe', 'math']);
  assert.deepEqual(pick('unknown-id'), ['index', 'swe', 'niche', 'math']);
});

test('CR-2.4 model presets: open, EU, coding, value and one flagship per lab, in score order', () => {
  const m = (id, org, score, extra = {}) => ({ id, org, open_weights: false, eu: false, cost: null, scores: { composite: score }, ...extra });
  const c = [
    m('a1', 'Anthropic', 95, { cost: 1, scores: { composite: 95, aa_coding_index: 80 } }),
    m('a2', 'Anthropic', 93, { cost: 0.1 }),
    m('o1', 'OpenAI', 94, { eu: true, cost: 2, scores: { composite: 94, aa_coding_index: 85 } }),
    m('d1', 'DeepSeek', 88, { open_weights: true, eu: true, cost: 0.05 }),
    m('x', 'NoScore', null),
  ];
  assert.deepEqual(MODEL_PRESETS.map((p) => p.id), ['top', 'open', 'value', 'coding', 'labs', 'eu']);
  assert.deepEqual(modelsForPreset('top', c, 'composite', 3), ['a1', 'o1', 'a2']);
  assert.deepEqual(modelsForPreset('open', c, 'composite', 5), ['d1']);
  assert.deepEqual(modelsForPreset('eu', c, 'composite', 5), ['o1', 'd1']);
  assert.deepEqual(modelsForPreset('coding', c, 'composite', 5), ['o1', 'a1']);
  assert.deepEqual(modelsForPreset('value', c, 'composite', 2), ['d1', 'a2']);
  assert.deepEqual(modelsForPreset('labs', c, 'composite', 5), ['a1', 'o1', 'd1']);
});

test('CR-4.1 filter presets: built-ins resolve over the defaults and are recognised when active', () => {
  const defaults = { score: 'composite', featured: true, featuredTouched: false, teeOnly: false, allowDataTraining: false, isCompany: false, hostedIn: ['China', 'EU', 'US', 'Other'], providerBasedIn: ['China', 'EU', 'US', 'Other'], labBasedIn: ['China', 'EU', 'US', 'Other'], labs: [], openOnly: false, advancedMinScore: 0, maxCost: null, minScore: 86 };
  const floor = (s) => (s === 'composite' ? 85 : 50);
  assert.deepEqual(FILTER_PRESETS.map((p) => p.id), ['company-eu', 'privacy', 'cheapest-capable', 'open', 'frontier']);
  const cheap = resolveFilterPatch(FILTER_PRESETS.find((p) => p.id === 'cheapest-capable').patch, defaults, floor);
  assert.equal(cheap.advancedMinScore, 85);
  assert.equal(cheap.featuredTouched, true);
  assert.equal('minScore' in pickFilters(defaults), false, "Simple's slider is not part of a filter preset");
  const state = { ...defaults, ...resolveFilterPatch({ isCompany: true, hostedIn: ['EU'] }, defaults, floor) };
  assert.equal(matchingFilterPreset(state, defaults, floor), 'company-eu');
  // CR-25.4: a custom preset saved with the former switch resolves to the same state.
  assert.equal(matchingFilterPreset({ ...defaults, ...resolveFilterPatch({ isCompany: true, euHostedOnly: true }, defaults, floor) }, defaults, floor), 'company-eu');
  assert.equal(matchingFilterPreset({ ...state, openOnly: true }, defaults, floor), null);
  const custom = [{ id: 'c1', name: 'Mine', value: pickFilters({ ...defaults, openOnly: true, isCompany: true }), updatedAt: 0 }];
  assert.equal(matchingFilterPreset({ ...defaults, openOnly: true, isCompany: true }, defaults, floor, custom), 'c1');
});

test('CR-2.5 filters in the URL: only changed keys, round trip, junk dropped', () => {
  const defaults = { score: 'composite', featured: true, featuredTouched: false, hostedIn: ['China', 'EU', 'US', 'Other'], providerBasedIn: ['China', 'EU', 'US', 'Other'], labBasedIn: ['China', 'EU', 'US', 'Other'], labs: [], maxCost: null, advancedMinScore: 0, providersExcluded: [], inputWeight: 20, minScore: 86 };
  assert.equal(encodeFilters(defaults, defaults), '');
  const state = { ...defaults, hostedIn: ['EU'], maxCost: 2.5, providersExcluded: ['OpenRouter::A|B', 'x;y'], score: 'aa_coding_index', minScore: 50 };
  const text = encodeFilters(state, defaults);
  assert.ok(!text.includes('minScore'), "Simple's slider is not a filter");
  assert.deepEqual(decodeFilters(text), { score: 'aa_coding_index', hostedIn: ['EU'], maxCost: 2.5, providersExcluded: ['OpenRouter::A|B', 'x;y'] });
  assert.deepEqual(decodeFilters(encodeFilters({ ...defaults, featured: false, maxCost: null }, { ...defaults, maxCost: 3 })), { featured: false, maxCost: null });
  assert.deepEqual(decodeFilters('euHostedOnly:yes;maxCost:abc;hack:1;teeOnly:1;openOnly:1;families:%E0%A4%A'), { openOnly: true }, 'CR-25.2: teeOnly is no longer a filter key');
  assert.deepEqual(decodeFilters(null), {});
  // CR-25.4: links shared before the regional chips keep opening the same view.
  assert.deepEqual(decodeFilters('euHostedOnly:1;excludeChinese:1;nonUsOnly:1;openOnly:1'), { openOnly: true, hostedIn: ['EU'], providerBasedIn: ['EU', 'Other'] });
});
