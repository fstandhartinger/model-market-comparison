import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { jevbenchV14View } from './jevbench-v14.mjs';

export const JEVBENCH_V142_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.4.2/jevbench-v1.4.2-results.json';
export const JEVBENCH_V142_SHA256 = 'ac14e206dde51ae28e40dc1ea2ff1fecc4a449b941d098e9ecb5618bd533e5be';
export const JEVBENCH_V142_TOP5 = ['decider-4b-v2', 'jev-1.13.0', 'jevk5-v02', 'cygnet', 'hopper'];

const fail = (message) => { throw new Error(`Invalid JevBench v1.4.2 artifact: ${message}`); };
const near = (a, b, epsilon = 0.01) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon;

function rejectItemLevelData(value, path = 'artifact') {
  if (Array.isArray(value)) return value.forEach((item, index) => rejectItemLevelData(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(item_id|item_text|question_text|expected|gold|prediction|predicted|per_item|item_results)$/i.test(key)) fail(`item-level field at ${path}.${key}`);
    rejectItemLevelData(child, `${path}.${key}`);
  }
}

export function validateJevbenchV142(a) {
  if (!a || a.benchmark !== 'JevBench' || a.revision !== 'v1.4.2' || a.protocol !== 'jevbench::v1.4' || a.status !== 'final') fail('revision/protocol/status');
  if (!Array.isArray(a.systems) || a.systems.length !== 93) fail('expected 93 approved systems');
  const keys = a.systems.map((s) => s.key);
  if (new Set(keys).size !== 93 || keys.some((key) => typeof key !== 'string' || !key)) fail('system keys must be unique');
  const ranked = a.systems.filter((s) => s.listing === 'ranked' && s.ranked === true);
  if (ranked.length !== 89 || a.systems.some((s) => (s.ranked === true) !== (s.listing === 'ranked'))) fail('ranked system count/listing');

  const byRank = [...ranked].sort((x, y) => x.rank - y.rank);
  if (byRank.some((s, index) => s.rank !== index + 1)) fail('rank sequence must be 1..89');
  if (byRank.slice(0, 5).some((s, index) => s.key !== JEVBENCH_V142_TOP5[index])) fail('approved top five changed');

  for (const s of ranked) {
    const { intelligence, calibration, speed, cost } = s.axes ?? {};
    const axes = [intelligence, calibration, speed, cost];
    if (axes.some((axis) => !Number.isFinite(axis) || axis < 0 || axis > 100)) fail(`ranked row axes: ${s.key}`);
    let score = axes.some((axis) => axis === 0) ? 0 : 4 / axes.reduce((total, axis) => total + 1 / axis, 0);
    if (intelligence < 50) score *= (intelligence / 50) ** 2;
    if (speed < 50) score *= (speed / 50) ** 2;
    if (cost < 50) score *= (cost / 50) ** 2;
    if (!near(score, s.jevbench_score)) fail(`composite does not reproduce: ${s.key}`);
    if (!Number.isFinite(s.public_accuracy) || !Number.isFinite(s.sealed_accuracy) || !near((s.public_accuracy - s.sealed_accuracy) * 100, s.public_minus_sealed_gap_pp, 0.1)) fail(`public/sealed aggregate gap: ${s.key}`);
    if (s.api_flag === true && !/operator's endpoint received sealed item text, without answers/i.test(s.api_exposure_note ?? '')) fail(`API exposure note: ${s.key}`);
  }
  const scoreOrder = [...ranked].sort((x, y) => y.jevbench_score - x.jevbench_score || x.display.localeCompare(y.display));
  if (scoreOrder.some((s, index) => s.key !== byRank[index].key)) fail('rank order differs from score order');
  if (a.tiers?.sealed !== 308 || a.sealed_weight !== 0.2 || a.sealed_chance !== 0.293) fail('sealed aggregate metadata');
  if (a.tiers.easy + a.tiers.standard + a.tiers.judge + a.tiers.hard !== 534) fail('public aggregate metadata');
  rejectItemLevelData(a);
  return a;
}

export async function readJevbenchV142(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V142_ARTIFACT}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== JEVBENCH_V142_SHA256) fail('bytes do not match the pinned public release artifact');
  return { artifact: validateJevbenchV142(JSON.parse(bytes.toString('utf8'))), bytes, sha256 };
}

export function jevbenchV142View(input) {
  return jevbenchV14View(input);
}
