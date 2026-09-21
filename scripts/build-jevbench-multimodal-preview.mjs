import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'data/raw/benchmarks/jevbench/multimodal-preview/source');
const out = path.join(root, 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
const readJson = async (name) => JSON.parse(await readFile(path.join(src, name), 'utf8'));
const readText = async (name) => readFile(path.join(src, name), 'utf8');

const items = await readJson('items-extended-real.json');
if (items.length !== 128 || items.some((x) => x.public_label !== true)) throw new Error('Expected 128 public real items');
const byId = new Map(items.map((x) => [x.id, x]));
const skill = (item) => item.dataset === 'ScreenSpot' ? 'computer_use' : item.dataset === 'Multimodal-Mind2Web' ? 'browser_use' : 'image_reasoning';
const counts = Object.fromEntries(['image_reasoning', 'computer_use', 'browser_use'].map((s) => [s, items.filter((x) => skill(x) === s).length]));

function logRows(text) {
  return [...text.matchAll(/^((?:mm|syn)-\d+) (ok|miss(?:\/error)?)$/gm)].map((m) => ({ item_id: m[1], correct: m[2] === 'ok' }));
}
function summary(text) {
  const m = text.match(/^SUMMARY (\{.*\})$/m);
  if (!m) throw new Error('Missing log summary');
  return JSON.parse(m[1]);
}
const jsonRows = async (base, ext) => [...await readJson(base), ...await readJson(ext)];
const logs = {
  decider: await readText('results-decider-real.log'),
  openjev: await readText('results-openjev-real.log'),
  reflex: await readText('results-reflex-real.log'),
};
const djevComputer = [...logRows(await readText('results-djev-computer.log')), ...logRows(await readText('results-djev-extension.log'))];
const runReport = await readText('RUN-RESULT.md');
const djevImage = runReport.match(/djev-dev BF16 \| (\d+)\/80/);
if (!djevImage) throw new Error('Missing djev image aggregate');

const sources = [
  { key: 'luna', display: 'GPT-5.6 Luna', rows: await jsonRows('results-luna.json', 'results-luna-extension.json'), latency: 6.13, cost: null, costNote: 'Not available: this run used a ChatGPT subscription orchestration path, not a metered API.' },
  { key: 'gemini', display: 'Gemini 3.1 Flash-Lite', rows: await jsonRows('results-gemini.json', 'results-gemini-extension.json'), latency: 1.20, cost: null, costNote: 'Not frozen in the run artifact; no current tariff is retrofitted into this preview.' },
  { key: 'djev', display: 'djev-dev BF16', rows: djevComputer, imageAggregate: Number(djevImage[1]), latency: 0.171, local: true },
  { key: 'openjev', display: 'AlexWortega/openjev 4B v2 BF16', rows: logRows(logs.openjev), latency: summary(logs.openjev).p50_s, local: true },
  { key: 'decider', display: 'Mapika/decider-2b-vision BF16', rows: logRows(logs.decider), latency: summary(logs.decider).p50_s, local: true },
  { key: 'reflex', display: 'kshetrajna12/reflex 4B BF16', rows: logRows(logs.reflex), latency: summary(logs.reflex).p50_s, local: true },
];

const gpuHourly = 1.23 / (25 / 60);
function scored(s) {
  const result = { image_reasoning: { correct: 0, n: counts.image_reasoning }, computer_use: { correct: 0, n: counts.computer_use }, browser_use: { correct: 0, n: counts.browser_use } };
  for (const row of s.rows) {
    const item = byId.get(row.item_id);
    if (!item) throw new Error(`Unknown public item ${row.item_id}`);
    result[skill(item)].correct += row.correct === true ? 1 : 0;
  }
  if (s.imageAggregate != null) result.image_reasoning.correct = s.imageAggregate;
  for (const v of Object.values(result)) v.accuracy = v.correct / v.n;
  const correct = Object.values(result).reduce((n, v) => n + v.correct, 0);
  const cost = s.local ? s.latency * gpuHourly * 1000 / 3600 : s.cost;
  return { key: s.key, display: s.display, skills: result, overall: { correct, n: 128, accuracy: correct / 128 }, axes: { intelligence: correct / 128 * 100, calibration: null, speed: Math.min(100, 100 * 0.09 / s.latency), cost: cost == null ? null : Math.max(0, Math.min(100, 100 * Math.log10(10 / Math.max(cost, .001)) / 4)) }, latency_s: s.latency, cost_per_1000: cost, cost_note: s.costNote ?? `Estimated marginal occupied H200 time at the measured run rate (USD ${gpuHourly.toFixed(3)}/hour); excludes loading and idle time.` };
}
const systems = sources.map(scored).sort((a, b) => b.overall.accuracy - a.overall.accuracy);
systems.forEach((s, i) => { s.rank = i > 0 && s.overall.accuracy === systems[i - 1].overall.accuracy ? systems[i - 1].rank : i + 1; });
for (const name of Object.keys(counts)) {
  const ranked = [...systems].sort((a, b) => b.skills[name].accuracy - a.skills[name].accuracy);
  ranked.forEach((s, i) => { s.skills[name].rank = i > 0 && s.skills[name].accuracy === ranked[i - 1].skills[name].accuracy ? ranked[i - 1].skills[name].rank : i + 1; });
}

const synthetic = await readJson('items-synthetic.json');
const synScores = Object.fromEntries([
  ['luna', await readJson('results-luna-synthetic.json')], ['gemini', await readJson('results-gemini-synthetic.json')],
  ['djev', logRows(await readText('results-djev-synthetic.log'))], ['openjev', logRows(await readText('results-openjev-synthetic.log'))],
  ['decider', logRows(await readText('results-decider-synthetic.log'))], ['reflex', logRows(await readText('results-reflex-synthetic.log'))],
].map(([k, rows]) => [k, { correct: rows.filter((x) => x.correct === true).length, n: rows.length }]));
if (Object.values(synScores).some((x) => x.n !== synthetic.length)) throw new Error('Synthetic result coverage mismatch');

const artifact = {
  benchmark: 'JevBench multimodal preview', revision: 'preview-1', generated_at: '2026-09-21T21:55:57.399Z', status: 'preview',
  notice: 'Not part of the JevBench Score. Results may change.', public_real_items: 128, held_out_items_published: 0,
  counts, systems, synthetic: { n: synthetic.length, share_of_evaluated: synthetic.length / (items.length + synthetic.length), rank_worthy: false, scores: synScores },
  examples: [
    { id: 'mm-001', image: '/jevbench-multimodal-preview/clevr-1.webp' },
    { id: 'mm-021', image: '/jevbench-multimodal-preview/geometry-0.webp' },
    { id: 'mm-111', image: '/jevbench-multimodal-preview/screenspot-337.webp' },
    { id: 'mm-106', image: '/jevbench-multimodal-preview/mind2web-5.webp' },
  ].map((e) => { const x = byId.get(e.id); return { ...e, dataset: x.dataset, prompt: x.rubric.instructions, licence: x.license, source_url: x.source_url }; }),
};
await writeFile(out, JSON.stringify(artifact, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, out)}: ${systems.length} systems, ${items.length} public real items, ${synthetic.length} synthetic items`);
