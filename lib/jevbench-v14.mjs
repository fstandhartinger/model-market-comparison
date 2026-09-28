import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const JEVBENCH_V14_ARTIFACT = 'data/raw/benchmarks/jevbench/v1.4/jevbench-v1.4-results.json';
export const JEVBENCH_V14_SHA256 = '006ebff534221d913abe3195f87efeea420698ce0ab207beeb89dc3fb50fb517';
export const JEVBENCH_V14_TOP5 = ['jev-1.13.0', 'jevk5-v02', 'hopper', 'winnow-12b', 'reflex-4b'];

const fail = (message) => { throw new Error(`Invalid JevBench v1.4 artifact: ${message}`); };
const near = (a, b, epsilon = 0.01) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= epsilon;

function rejectItemLevelData(value, path = 'artifact') {
  if (Array.isArray(value)) return value.forEach((item, index) => rejectItemLevelData(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(item_id|item_text|question_text|expected|gold|prediction|predicted|per_item|item_results)$/i.test(key)) fail(`item-level field at ${path}.${key}`);
    rejectItemLevelData(child, `${path}.${key}`);
  }
}

export function validateJevbenchV14(a) {
  if (!a || a.benchmark !== 'JevBench' || a.revision !== 'v1.4.0' || a.protocol !== 'jevbench::v1.4' || a.status !== 'final') fail('revision/protocol/status');
  if (!Array.isArray(a.systems) || a.systems.length !== 76) fail('expected 76 approved systems');
  const keys = a.systems.map((s) => s.key);
  if (new Set(keys).size !== 76 || keys.some((key) => typeof key !== 'string' || !key)) fail('system keys must be unique');
  const ranked = a.systems.filter((s) => s.listing === 'ranked' && s.ranked === true);
  if (ranked.length !== 71 || a.systems.some((s) => (s.ranked === true) !== (s.listing === 'ranked'))) fail('ranked system count/listing');

  const byRank = [...ranked].sort((x, y) => x.rank - y.rank);
  if (byRank.some((s, index) => s.rank !== index + 1)) fail('rank sequence must be 1..71');
  if (byRank.slice(0, 5).some((s, index) => s.key !== JEVBENCH_V14_TOP5[index])) fail('approved top five changed');

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
  rejectItemLevelData(a);
  return a;
}

export async function readJevbenchV14(root = process.cwd()) {
  const bytes = await readFile(`${root}/${JEVBENCH_V14_ARTIFACT}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== JEVBENCH_V14_SHA256) fail('bytes do not match the pinned public release artifact');
  return { artifact: validateJevbenchV14(JSON.parse(bytes.toString('utf8'))), bytes, sha256 };
}

export function jevbenchV14View({ artifact, sha256 }) {
  const ranked = artifact.systems.filter((s) => s.listing === 'ranked').sort((x, y) => x.rank - y.rank);
  const unranked = artifact.systems.filter((s) => s.listing !== 'ranked').sort((x, y) => y.jevbench_score - x.jevbench_score);
  const publicDecisions = Object.entries(artifact.tiers).filter(([tier]) => tier !== 'sealed').reduce((n, [, count]) => n + count, 0);
  const sealedDecisions = artifact.tiers.sealed;
  return {
    artifact, sha256, revision: artifact.revision, generated: artifact.generated_utc,
    ranked, unranked, systems: [...ranked, ...unranked], rankedCount: ranked.length,
    publicDecisions, sealedDecisions, totalDecisions: publicDecisions + sealedDecisions,
  };
}

// Page fix (Florian 23 Sep): every v1.4 row carries a footnote string, but most of it is provenance shared by
// dozens of rows ("already on the live v1.3.0 board", "re-run on a throwaway RunPod pod …") or repeats what the row
// already shows (the API flag, the not-ranked label). Only the remainder is a row-specific note worth a † marker.
const GENERIC_NOTE_SEGMENTS = [
  /^already on the live v1\.3\.0 board$/i,
  /^re-run on a throwaway RunPod pod with the original recipe; deviations in its manifest$/i,
  /^unranked \/ honorable mention$/i,
  // The board's headline already states how many decisions a complete run is, so a row repeating it says
  // nothing about that row. Written without the counts so a later release's totals do not slip past it.
  /^all [0-9,]+ decisions \([^)]*\) through JevBench's adapter\.?$/i,
];
const GENERIC_NOTE_PREFIXES = [
  /^re-run on a throwaway RunPod pod with the original recipe; deviations in its manifest;\s*/i,
  /^Round [0-9]+ (unpublished|new)\.\s*/i,
  // D246: this used to be a whole-segment "generic" rule ending in `.*$`, which swallowed everything the
  // publisher appended after the shared sentence — `qwen3.8-27b`'s only published reason for being partial
  // and unranked ("Chutes rate limit stopped the run after 81/308 items"; its `not_ranked_because` is null),
  // and two rows' sealed-answer counts. Stripping it as a prefix keeps the row-specific remainder, and a
  // segment that is nothing but the shared sentence still filters out because no remainder is left.
  /^(API measurement: )?sealed item text \(no golds\) was sent to[^;]*;?\s*/i,
];

/** The row-specific part of a v1.4 footnote, or null when the footnote only repeats shared provenance. */
/**
 * F-213 (Fable pass 40): a row's sealed family shares as numbers, whatever shape the artifact wrote them in.
 * v1.4.2.2 carries Imajev-4B's `sealed_aggregate.by_family` as `{ correct, n, accuracy }` objects while every
 * other row carries the bare share; a reader that multiplies an object prints "NaN%" and draws NaN polygons.
 * Nothing is invented: an entry without a finite share is null and stays a gap.
 */
export function sealedFamilyShares(row) {
  const families = row?.sealed_aggregate?.by_family;
  if (!families || typeof families !== 'object') return null;
  return Object.fromEntries(Object.entries(families).map(([family, value]) => {
    const share = typeof value === 'number' ? value : value && typeof value === 'object' ? value.accuracy : null;
    return [family, Number.isFinite(share) ? share : null];
  }));
}

/**
 * D238: the sealed-answer shortfall a row publishes, in the sentence eight of its nine siblings already use.
 *
 * Nine ranked v1.4.2.x rows answered fewer than all 308 sealed decisions validly. Eight of them say so in a
 * clause somebody typed into their footnote at publication time; `jevact` (237/308, the second largest
 * shortfall on the board) does not, so a page reader comparing rows could not see it while an API reader
 * could. Deriving the clause from `sealed_aggregate` instead of trusting the prose fixes that row and makes
 * the omission unrepeatable in a later release. Nothing is invented or rounded: both numbers are published
 * integers, and a row that does not publish them gets no clause.
 */
export function jevV14SealedShortfallNote(row) {
  const sealed = row?.sealed_aggregate;
  const answered = sealed?.answered_valid;
  const n = sealed?.n;
  if (!Number.isInteger(answered) || !Number.isInteger(n) || n <= 0 || answered >= n) return null;
  return `${answered}/${n} sealed items answered validly (failures count as wrong)`;
}

export function jevV14RowNote(footnote, row) {
  const parts = typeof footnote === 'string'
    ? footnote.split(' | ').map((part) => {
      let text = part.trim();
      for (const prefix of GENERIC_NOTE_PREFIXES) text = text.replace(prefix, '');
      return text.trim();
    }).filter((text) => text && !GENERIC_NOTE_SEGMENTS.some((re) => re.test(text)))
    : [];
  // The derived clause is appended only when the row's own prose does not already carry that exact ratio,
  // so the eight rows that publish it keep the wording they published and never print the number twice.
  const shortfall = jevV14SealedShortfallNote(row);
  if (shortfall) {
    const ratio = new RegExp(`\\b${row.sealed_aggregate.answered_valid}\\s*/\\s*${row.sealed_aggregate.n}\\b`);
    if (!parts.some((text) => ratio.test(text))) parts.push(shortfall);
  }
  if (!parts.length) return null;
  const joined = parts.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}
