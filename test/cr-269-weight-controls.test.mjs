import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { JEV_AXES, OFFICIAL_WEIGHTS, isOfficialWeights } from '../lib/jevbench-axis-weights.mjs';
import { jevV15BoardRow, jevV15BoardScore, jevV15SliderPresets } from '../lib/jevbench-v15-board.mjs';

const require = createRequire(import.meta.url);
const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const hooksUrl = dataUrl(`export const useState=(...a)=>globalThis.__cr269Hooks.useState(...a);
export const useMemo=(fn)=>fn(); export const useId=()=>globalThis.__cr269Hooks.useId();
export const useEffect=(...a)=>globalThis.__cr269Hooks.useEffect(...a);
export const createContext=(value)=>({ value }); export const useContext=(context)=>context.value;`);
const linkUrl = dataUrl(`import {jsx} from ${JSON.stringify(`file://${require.resolve('react/jsx-runtime')}`)};
export default function Link(p){return jsx('a',p)}`);
const compiled = new Map();
async function compile(url) {
  if (compiled.has(url.href)) return compiled.get(url.href);
  let code = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const imports = [...code.matchAll(/\bfrom\s*(["'])([^"']+)\1/g)];
  for (const [statement, quote, specifier] of imports) {
    let target;
    if (specifier === 'react') target = hooksUrl;
    else if (specifier === 'next/link') target = linkUrl;
    else if (!specifier.startsWith('.')) target = `file://${require.resolve(specifier)}`;
    else {
      let dependency = new URL(specifier, url);
      if (!existsSync(dependency)) dependency = ['.tsx', '.ts'].map((ext) => new URL(specifier + ext, url)).find(existsSync);
      assert.ok(dependency, `Cannot resolve ${specifier}`);
      if (/\.tsx?$/.test(dependency.pathname)) target = await compile(dependency);
      else if (dependency.pathname.endsWith('.json')) target = dataUrl(`export default ${readFileSync(dependency, 'utf8')}`);
      else target = dependency.href;
    }
    code = code.replace(statement, `from ${quote}${target}${quote}`);
  }
  const result = dataUrl(code);
  compiled.set(url.href, result);
  return result;
}
const { JevScoreChart } = await import(await compile(new URL('../components/JevBoardInteractive.tsx', import.meta.url)));
const artifact = JSON.parse(readFileSync(new URL('../data/raw/benchmarks/jevbench/v1.5/jevbench-v1.5.5-results.json', import.meta.url)));
const rows = artifact.systems.map((row) => jevV15BoardRow(row)).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
const presets = jevV15SliderPresets(artifact);
const text = (node) => node == null || typeof node === 'boolean' ? '' : Array.isArray(node) ? node.map(text).join('')
  : typeof node === 'object' ? text(node.props.children) : String(node);

// Exercise the real component's JSX and event handlers with deterministic hooks. This is a component regression
// harness, not a DOM/browser emulator: only window URL/history/events and matchMedia are supplied.
function mount(search = '', inputRows = rows) {
  const contexts = new Map(), listeners = new Map(), events = [], replacements = [];
  let current, dirty, tree, effects;
  const env = {
    location: new URL(`https://benchmarkheaven.com/jev-models${search}`),
    matchMedia: () => ({ matches: false }),
    history: { state: { preserved: true }, replaceState(state, _, href) { env.location = new URL(href); replacements.push({ state, href }); } },
    dispatchEvent(event) { events.push(event); for (const fn of listeners.get(event.type) ?? []) fn(event); },
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
  };
  globalThis.window = env;
  globalThis.__cr269Hooks = {
    useState(initial) {
      const context = current, i = context.index++;
      if (!(i in context.slots)) {
        const slot = { value: typeof initial === 'function' ? initial() : initial };
        slot.set = (next) => { const value = typeof next === 'function' ? next(slot.value) : next;
          if (!Object.is(value, slot.value)) { slot.value = value; dirty = true; } };
        context.slots[i] = slot;
      }
      const slot = context.slots[i]; return [slot.value, slot.set];
    },
    useId() { return this.useState('cr269-id')[0]; },
    useEffect(fn, deps) {
      const context = current, i = context.index++, previous = context.slots[i];
      if (!previous || !deps || deps.some((dep, j) => !Object.is(dep, previous.deps[j]))) {
        context.slots[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); context.slots[i].cleanup = fn(); });
      }
    },
  };
  const props = { revision: 'v1.5.5', rows: inputRows, rankedCount: inputRows.filter((r) => r.ranked).length,
    newLabel: null, fairness: null, capabilityHref: null, presets, scoreKind: 'v15' };
  function resolve(node, path) {
    if (Array.isArray(node)) return node.map((item, i) => resolve(item, `${path}.${i}`));
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') {
      if (!contexts.has(path)) contexts.set(path, { slots: [], index: 0 });
      current = contexts.get(path); current.index = 0;
      return resolve(node.type(node.props), `${path}.child`);
    }
    return { ...node, props: { ...node.props, children: resolve(node.props.children, `${path}.children`) } };
  }
  function render() {
    let passes = 0;
    do {
      dirty = false; effects = [];
      tree = resolve({ type: JevScoreChart, props }, 'root');
      for (const effect of effects) effect();
      assert.ok(++passes < 10, 'component settled');
    } while (dirty);
  }
  const all = (attribute, value) => {
    const found = [];
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== 'object') return;
      if (attribute in node.props && (value === undefined || node.props[attribute] === value)) found.push(node);
      visit(node.props.children);
    }
    visit(tree); return found;
  };
  const click = (attribute, value, index = 0) => { const node = all(attribute, value)[index]; assert.ok(node, `${attribute} ${value}`); node.props.onClick(); render(); };
  const slider = (axis, value, index = 0) => { all('data-bh-jev-weight', axis)[index].props.onChange({ target: { value: String(value) } }); render(); };
  const mix = (group = 0) => Object.fromEntries(JEV_AXES.map((axis) => [axis, all('data-bh-jev-weight', axis)[group].props.value]));
  const shares = (group = 0) => JEV_AXES.map((axis) => parseInt(all('data-bh-jev-weight', axis)[group].props['aria-valuetext']));
  const bars = () => all('data-bh-jev14-bar');
  render();
  return { all, click, slider, mix, shares, bars, events, replacements, env,
    pop(search) { env.location = new URL(`https://benchmarkheaven.com/jev-models${search}`); env.dispatchEvent(new Event('popstate')); render(); } };
}

function expectScores(ui, weights, inputRows = rows) {
  for (const bar of ui.bars()) {
    const row = inputRows.find((r) => r.key === bar.props['data-bh-jev14-bar']);
    const expected = isOfficialWeights(weights) ? row.jevbench_score : jevV15BoardScore(row.axes, weights);
    assert.equal(bar.props['data-bh-jev14-bar-score'], expected == null ? '' : expected.toFixed(3), row.key);
  }
}

test('CR-269: equal weights preserve official scores/order and have no reset control', () => {
  for (const query of ['', '?w=10-10-10-10']) {
    const ui = mount(query);
    assert.ok(isOfficialWeights(ui.mix()));
    assert.deepEqual(ui.shares(), [25, 25, 25, 25]);
    assert.deepEqual(ui.bars().map((bar) => bar.props['data-bh-jev14-bar']), rows.map((r) => r.key));
    assert.equal(ui.all('data-bh-jev-weight-reset').length, 0);
    assert.equal(ui.all('data-bh-jev-view-rank').length, 0);
    expectScores(ui, OFFICIAL_WEIGHTS);
  }
});

test('CR-269: every preset updates both slider groups, scores and normalized percentages', () => {
  const ui = mount();
  for (const preset of presets) {
    ui.click('data-bh-jev-preset', preset.name, 1);
    assert.deepEqual(ui.mix(), preset.weights);
    assert.deepEqual(ui.mix(1), ui.mix());
    assert.deepEqual(ui.shares(1), ui.shares());
    assert.equal(ui.shares().reduce((a, b) => a + b), 100);
    assert.equal(ui.all('data-bh-jev-preset', preset.name).every((n) => n.props['aria-pressed']), true);
    expectScores(ui, preset.weights);
  }
});

test('CR-269: restored 95/0/5/0 retains the Luna 57.3 and Canvas 75.3 weight-zero gates', () => {
  const ui = mount('?w=95-0-5-0');
  assert.deepEqual(ui.shares(), [95, 0, 5, 0]);
  expectScores(ui, ui.mix());
  for (const [pattern, score] of [[/^GPT-6 Luna \(low/, '57.3'], [/^Open Jev JSON Canvas/, '75.3']]) {
    const row = rows.find((r) => pattern.test(r.display));
    const bar = ui.bars().find((b) => b.props['data-bh-jev14-bar'] === row.key);
    assert.equal(Number(bar.props['data-bh-jev14-bar-score']).toFixed(1), score);
    assert.match(bar.props['aria-label'], /applies although its weight is 0/);
  }
  assert.match(text(ui.all('data-bh-jev14-formula')), /gates also apply at weight 0/);
});

test('CR-269: non-100 totals normalize displayed shares to 100 without changing scoring ratios', () => {
  const ui = mount('?w=10-10-10-0');
  assert.deepEqual(ui.mix(), { intelligence: 10, calibration: 10, speed: 10, cost: 0 });
  assert.deepEqual(ui.shares(), [34, 33, 33, 0]);
  expectScores(ui, ui.mix());
  ui.slider('speed', 25, 1);
  assert.deepEqual(ui.mix(1), ui.mix());
  assert.equal(ui.shares().reduce((a, b) => a + b), 100);
  assert.deepEqual(ui.shares(1), ui.shares());
  expectScores(ui, ui.mix());
});

test('CR-269: rejecting all-zero keeps scores, URL and synchronized sliders with an accessible announcement', () => {
  const ui = mount('?w=5-0-0-0&keep=1#chart');
  const before = ui.bars().map((b) => b.props['data-bh-jev14-bar-score']);
  const href = ui.env.location.href, eventCount = ui.events.length;
  for (const group of [0, 1, 0]) {
    ui.slider('intelligence', 0, group);
    assert.deepEqual(ui.mix(), { intelligence: 5, calibration: 0, speed: 0, cost: 0 });
    assert.deepEqual(ui.mix(1), ui.mix());
    assert.deepEqual(ui.bars().map((b) => b.props['data-bh-jev14-bar-score']), before);
    assert.equal(ui.env.location.href, href);
    assert.equal(ui.events.length, eventCount);
    const status = ui.all('data-bh-jev-weight-status')[0];
    assert.equal(status.props.role, 'status');
    assert.equal(status.props['aria-live'], 'polite');
    assert.match(text(status), /At least one axis must remain above zero/);
  }
  ui.slider('cost', 5, 1);
  assert.equal(text(ui.all('data-bh-jev-weight-status')), '');
  expectScores(ui, ui.mix());
});

test('CR-269: custom and axis rows show consecutive visible positions and separately label unchanged official ranks', () => {
  const source = structuredClone(rows);
  const ui = mount('?w=95-0-5-0');
  assert.notDeepEqual(ui.bars().map((b) => b.props['data-bh-jev14-bar']), rows.map((r) => r.key));
  const scores = ui.bars().map((b) => b.props['data-bh-jev14-bar-score']).filter((n) => n !== '').map(Number);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'custom order follows the unchanged scorer');
  function check() {
    ui.bars().forEach((bar, i) => {
      assert.equal(text(ui.all('data-bh-jev-row-number')[i]), String(i + 1));
      assert.match(bar.props['aria-label'], new RegExp(`view position ${i + 1},`));
      const official = rows.find((r) => r.key === bar.props['data-bh-jev14-bar']).rank;
      const label = ui.all('data-bh-jev-view-rank', i + 1)[0];
      assert.equal(label.props['data-bh-jev-official-rank'], official ?? undefined);
      assert.equal(text(label), `view #${i + 1} · ${official == null ? 'not officially ranked' : `official #${official}`}`);
    });
    assert.deepEqual(rows, source);
  }
  check();
  ui.click('data-bh-jev-weight-reset');
  ui.click('data-bh-jev-view', 'speed');
  check();
  const speeds = ui.bars().map((b) => rows.find((r) => r.key === b.props['data-bh-jev14-bar']).axes.speed).filter((n) => n != null);
  assert.deepEqual(speeds, [...speeds].sort((a, b) => b - a));
  ui.click('data-bh-jev-view', 'intelligence');
  assert.ok(ui.bars().length < rows.length, 'hidden LLMs are omitted from view positions');
  check();
  assert.ok(ui.bars().length > 20, 'positions continue through the expanded remainder');
  ui.all('data-bh-jev-filter', 'q')[0].props.onChange({ target: { value: 'Jev' } });
  // Trigger a render through another control while preserving the changed filter.
  ui.click('data-bh-jev-view', 'cost');
  assert.ok(ui.bars().length < rows.length, 'filtered rows have consecutive visible positions');
  check();
});

test('CR-269: reset buttons restore 25/25/25/25 and remove only w, preserving view, other query, hash and history state', () => {
  for (const group of [0, 1]) {
    const ui = mount('?w=95-0-5-0&view=speed&keep=1#chart');
    const resets = ui.all('data-bh-jev-weight-reset');
    assert.equal(resets.length, 2);
    assert.equal(resets[group].type, 'button');
    assert.equal(resets[group].props.type, 'button');
    assert.equal(text(resets[group]), 'Reset to official weights');
    ui.click('data-bh-jev-weight-reset', undefined, group);
    assert.deepEqual(ui.mix(), OFFICIAL_WEIGHTS);
    assert.deepEqual(ui.mix(1), OFFICIAL_WEIGHTS);
    assert.equal(ui.env.location.search, '?view=speed&keep=1');
    assert.equal(ui.env.location.hash, '#chart');
    assert.deepEqual(ui.replacements.at(-1).state, { preserved: true });
    assert.deepEqual(ui.events.at(-1).detail.weights, OFFICIAL_WEIGHTS);
    assert.equal(ui.all('data-bh-jev14-chart')[0].props['data-bh-jev14-view'], 'speed');
    assert.equal(ui.all('data-bh-jev-weight-reset').length, 0);
    expectScores(ui, OFFICIAL_WEIGHTS);
    ui.click('data-bh-jev-view', 'overall');
    assert.deepEqual(ui.bars().map((b) => b.props['data-bh-jev14-bar']), rows.map((r) => r.key));
  }
});

test('CR-269: URL restoration handles navigation between custom/axis and official states, rejecting invalid zero URLs', () => {
  const ui = mount('?w=95-0-5-0');
  ui.pop('?w=10-10-10-0&view=cost');
  assert.deepEqual(ui.shares(), [34, 33, 33, 0]);
  assert.equal(ui.all('data-bh-jev14-chart')[0].props['data-bh-jev14-view'], 'cost');
  ui.pop('');
  assert.deepEqual(ui.mix(), OFFICIAL_WEIGHTS);
  assert.equal(ui.all('data-bh-jev-view-rank').length, 0);
  ui.pop('?w=0-0-0-0');
  assert.deepEqual(ui.mix(), OFFICIAL_WEIGHTS);
  expectScores(ui, OFFICIAL_WEIGHTS);
});
