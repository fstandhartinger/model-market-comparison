// AudioJevBench v0.1 — unlisted WORK IN PROGRESS preview (job audiojev-build-20260925, 26 Sep 2026).
// The page reads ONE committed scorer output (harness score.py, shape: {method, G_med, gap_allowance, blend,
// systems[]}) and, optionally, a file of PUBLIC example items. This module only selects, groups and labels;
// it never recomputes a score. Every field may be null — the preview must render with partial data.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const AUDIOJEV_PREVIEW_FILE = 'data/audiojev-preview.json';
export const AUDIOJEV_EXAMPLES_FILE = 'data/audiojev-examples.json';
// METHOD.md §4: Jev-class = adjusted median latency <= 1.0 s AND <= USD 0.25 per 1,000 decisions.
export const AUDIOJEV_JEV_CLASS = { p50AdjS: 1.0, usdPer1000: 0.25 };

const finite = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** 'full' | 'public-only' | 'partial' from the scorer's `table` string. Unknown strings count as partial. */
export function tableGroup(table) {
  const t = String(table ?? '').toLowerCase();
  if (t === 'full') return 'full';
  if (t.startsWith('partial')) return 'partial';
  if (t.startsWith('public-only')) return 'public-only';
  return 'partial';
}

/** Why a row is outside Jev-class (empty list = inside). Uses the scorer's own flag when present. */
export function jevClassReasons(s) {
  const p50 = finite(s?.p50_adj_s);
  const usd = finite(s?.cost?.usd_per_1000);
  const reasons = [];
  if (p50 == null) reasons.push('no latency measured');
  else if (p50 > AUDIOJEV_JEV_CLASS.p50AdjS) reasons.push(`median latency ${p50.toFixed(2)} s > ${AUDIOJEV_JEV_CLASS.p50AdjS.toFixed(1)} s`);
  if (usd == null) reasons.push('no price');
  else if (usd > AUDIOJEV_JEV_CLASS.usdPer1000) reasons.push(`$${usd.toPrecision(2)} > $${AUDIOJEV_JEV_CLASS.usdPer1000.toFixed(2)} per 1,000`);
  if (s?.jev_class === true) return [];
  if (s?.jev_class === false && reasons.length === 0) reasons.push('not Jev-class per scorer');
  return reasons;
}

/** One display row per system; missing fields become null. */
export function normalizeSystem(s) {
  const group = tableGroup(s?.table);
  const reasons = jevClassReasons(s);
  const ci = Array.isArray(s?.I_public_ci95) ? s.I_public_ci95.map(finite) : null;
  return {
    key: String(s?.key ?? 'unknown'),
    table: String(s?.table ?? ''),
    group,
    apiFlag: !!s?.api_flag,
    sealedRoute: !!s?.sealed_route,
    families: Array.isArray(s?.support_families) ? s.support_families.map(String) : null,
    support: s?.support && typeof s.support === 'object' ? s.support : {},
    nItems: finite(s?.n_items_scored),
    nRows: finite(s?.n_rows),
    nErrors: finite(s?.n_error_rows),
    iPublic: finite(s?.I_public),
    iPublicCi: ci && ci[0] != null && ci[1] != null ? [ci[0], ci[1]] : null,
    iSealed: finite(s?.I_sealed),
    gap: finite(s?.gap),
    penalty: finite(s?.penalty),
    intelligence: finite(s?.Intelligence),
    calibration: finite(s?.Calibration),
    speed: finite(s?.Speed),
    cost: finite(s?.Cost),
    p50: finite(s?.p50_s), p95: finite(s?.p95_s),
    p50Adj: finite(s?.p50_adj_s), p95Adj: finite(s?.p95_adj_s),
    nLatency: finite(s?.n_latency),
    usd: finite(s?.cost?.usd_per_1000),
    usdEstimate: !!s?.cost?.estimate,
    usdBasis: s?.cost?.basis ?? null,
    usdSource: s?.cost?.source ?? null,
    headline: finite(s?.headline),
    composite: s?.composite && typeof s.composite === 'object' ? s.composite : {},
    capability: finite(s?.Capability),
    // Public-only rows carry Capability from I_public (provisional); partial rows cover only some families.
    capabilityProvisional: group !== 'full',
    jevClass: reasons.length === 0,
    outsideBecause: reasons,
    typed: s?.typed && typeof s.typed === 'object' ? s.typed : {},
    typedN: s?.typed_n && typeof s.typed_n === 'object' ? s.typed_n : {},
    robustness: s?.robustness && typeof s.robustness === 'object' ? s.robustness : null,
  };
}

const byDesc = (f) => (a, b) => (f(b) ?? -Infinity) - (f(a) ?? -Infinity) || a.key.localeCompare(b.key);

/** Grouped, sorted view of a scorer output. */
export function audiojevView(scores) {
  const systems = (Array.isArray(scores?.systems) ? scores.systems : []).map(normalizeSystem);
  const full = systems.filter((r) => r.group === 'full').sort(byDesc((r) => r.headline));
  let rank = 0;
  for (const r of full) r.rank = r.headline == null ? null : ++rank;
  const publicOnly = systems.filter((r) => r.group === 'public-only').sort(byDesc((r) => r.iPublic));
  const partial = systems.filter((r) => r.group === 'partial').sort(byDesc((r) => r.iPublic));
  // Capability ranking: every system with a Capability; numbered only inside Jev-class AND on the full table.
  const capability = systems.filter((r) => r.capability != null).sort(byDesc((r) => r.capability));
  let n = 0;
  for (const r of capability) r.capabilityRank = r.jevClass && r.group === 'full' ? ++n : null;
  return {
    method: scores?.method ?? null,
    gMed: finite(scores?.G_med),
    gapAllowance: finite(scores?.gap_allowance),
    blend: Array.isArray(scores?.blend) && scores.blend.length === 2 ? scores.blend.map(finite) : null,
    difficultyMismatch: typeof scores?.difficulty_mismatch_flag === 'boolean' ? scores.difficulty_mismatch_flag : null,
    meta: scores?.preview_meta && typeof scores.preview_meta === 'object' ? scores.preview_meta : null,
    systems, full, publicOnly, partial, capability,
    withoutCapability: systems.filter((r) => r.capability == null),
  };
}

// Robustness slices written by score.py robustness(); the page shows only those that have data somewhere.
export const ROBUSTNESS_SLICES = [
  ['clean', 'Clean audio'], ['noisy_le5db', 'Noisy (≤ 5 dB SNR)'],
  ['snr_15db', '15 dB'], ['snr_10db', '10 dB'], ['snr_5db', '5 dB'], ['snr_0db', '0 dB'],
  ['english', 'English'], ['non_english', 'Non-English'],
  ['background_talker', 'Background talker'], ['overlap', 'Overlapping talkers'],
  ['speaker_verification', 'Speaker verification'], ['sound_event', 'Sound events'],
  ['sound_under_speech', 'Sound under speech'],
];
export const ROBUSTNESS_DELTAS = [
  ['noise_slope_clean_minus_le5db', 'Noise drop (clean − ≤5 dB)'],
  ['language_gap_en_minus_non_en', 'Language gap (EN − non-EN)'],
];

/** Which slices/deltas/lift keys carry at least one value across systems. */
export function robustnessColumns(systems) {
  const has = (k) => systems.some((r) => finite(r.robustness?.[k]?.acc) != null);
  const slices = ROBUSTNESS_SLICES.filter(([k]) => has(k));
  const deltas = ROBUSTNESS_DELTAS.filter(([k]) => systems.some((r) => finite(r.robustness?.[k]) != null));
  const lift = [...new Set(systems.flatMap((r) => Object.keys(r.robustness?.audio_lift_vs_text_blind ?? {})))].sort();
  return { slices, deltas, lift };
}

// ---------------------------------------------------------------- public examples
const SEALED_RE = /^(sealed|sl-|sealed-)/i;

/** True when the record is a public item. Anything else — sealed, unknown split — is refused. */
export function isPublicItem(item) {
  const split = String(item?.split ?? '').toLowerCase();
  const id = String(item?.id ?? '');
  return (split.startsWith('public') || split === 'open') && !SEALED_RE.test(id) && !/sealed/i.test(split);
}

/** Whitelist copy of a public example: context, question, labels, gold. Throws on any non-public record so a
 *  sealed item can never be rendered (the build fails instead). */
export function publicExamples(raw) {
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return items.map((it) => {
    if (!isPublicItem(it)) throw new Error(`audiojev-examples: refusing non-public item ${String(it?.id ?? '?')} (split ${String(it?.split ?? 'missing')})`);
    const q = it.question && typeof it.question === 'object' ? it.question : {};
    const type = String(it.request_type ?? it.type ?? '');
    let labels = Array.isArray(q.labels) ? q.labels.map(String) : null;
    if (!labels && type === 'noul') labels = ['yes', 'no'];
    if (!labels && type === 'score') labels = ['0', '1', '2', '3', '4'];
    const descriptions = {};
    if (q.label_descriptions && typeof q.label_descriptions === 'object' && !Array.isArray(q.label_descriptions)) Object.assign(descriptions, q.label_descriptions);
    if (q.criteria && typeof q.criteria === 'object' && !Array.isArray(q.criteria)) {
      for (const [k, v] of Object.entries(q.criteria)) descriptions[k === 'true' ? 'yes' : k === 'false' ? 'no' : k] = v;
    }
    const levels = Array.isArray(q.levels) ? q.levels : null;
    if (levels) levels.forEach((v, i) => { descriptions[String(i)] = v; });
    return {
      id: String(it.id), family: String(it.family ?? ''), type, tier: String(it.tier ?? ''),
      context: String(it.context ?? ''), question: String(q.instructions ?? ''),
      labels: labels ?? [], descriptions: Object.fromEntries(Object.entries(descriptions).map(([k, v]) => [String(k), String(v)])),
      gold: it.expected == null ? null : String(it.expected === true ? 'yes' : it.expected === false ? 'no' : it.expected),
      durationS: finite(it.duration_s ?? it.audio?.duration_s),
    };
  });
}

async function readJson(rel, root) {
  const text = await readFile(path.join(root, rel), 'utf8');
  return JSON.parse(text);
}

/** Scorer output, or null when the file is absent/unreadable (the page shows an empty state). */
export async function readAudiojevPreview(root = process.cwd()) {
  try { return await readJson(AUDIOJEV_PREVIEW_FILE, root); } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    throw e;
  }
}

/** Public examples, or [] when the optional file is absent. A sealed item throws. */
export async function readAudiojevExamples(root = process.cwd()) {
  let raw;
  try { raw = await readJson(AUDIOJEV_EXAMPLES_FILE, root); } catch (e) {
    if (e && e.code === 'ENOENT') return [];
    throw e;
  }
  return publicExamples(raw);
}
