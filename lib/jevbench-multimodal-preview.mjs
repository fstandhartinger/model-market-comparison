import { readFile } from 'node:fs/promises';
import path from 'node:path';

export function validatePreviewTracks(tracks) {
  const expected = {
    computer_use: { items_total: 400, public: 147, sealed: 253 },
    browser_use: { items_total: 400, public: 240, sealed: 160 },
  };
  if (!tracks || typeof tracks !== 'object' || Array.isArray(tracks)) throw new Error('Missing preview tracks');
  for (const [name, counts] of Object.entries(expected)) {
    const track = tracks[name];
    if (!track || typeof track !== 'object'
      || track.items_total !== counts.items_total
      || track.public !== counts.public
      || track.sealed !== counts.sealed
      || track.public + track.sealed !== track.items_total) {
      throw new Error(`Invalid ${name} preview track counts`);
    }
    for (const part of ['public', 'sealed']) {
      const types = track[`${part}_decision_types`];
      if (!Array.isArray(types) || types.length === 0 || types.some((type) => typeof type !== 'string' || !type.trim())) {
        throw new Error(`Invalid ${name} ${part} decision types`);
      }
    }
    if (typeof track.sealed_origin !== 'string' || !track.sealed_origin.trim()) throw new Error(`Missing ${name} sealed origin`);
  }
  if (tracks.browser_use.mind2web_public_only !== 133) throw new Error('Invalid Kev/Mind2Web public-only flag');
  if (typeof tracks.cross_track_rule !== 'string' || !tracks.cross_track_rule.trim()) throw new Error('Missing cross-track sealing rule');
  if (typeof tracks.kev_flag !== 'string' || !tracks.kev_flag.trim()) throw new Error('Missing Kev/Mind2Web flag');
  return tracks;
}

export function formatMatchedGapPp(value) {
  const rounded = Number(value.toFixed(1));
  const normalized = rounded === 0 ? 0 : rounded;
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(1)} pp`;
}

export async function readMultimodalPreview() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
  const a = JSON.parse(await readFile(file, 'utf8'));
  if (a.benchmark !== 'Image JevBench v0.1 candidate' || a.status !== 'preview') throw new Error('Invalid multimodal preview artifact');
  if (a.sealed_item_details_included !== false) throw new Error('Preview may contain aggregate sealed results only');
  validatePreviewTracks(a.preview_tracks);
  const split = a.split;
  if (!split || split.items_total !== 444 || split.items_public !== 228 || split.items_sealed !== 216) throw new Error('Invalid frozen split counts');
  if (split.licensed_core_total !== 294 || split.licensed_core_public !== 139 || split.licensed_core_sealed !== 155) throw new Error('Invalid licensed-core counts');
  if (split.everyday_photo_total !== 150 || split.everyday_photo_public !== 89 || split.everyday_photo_sealed !== 61 || split.everyday_photo_synthetic !== true) throw new Error('Invalid everyday-photo counts');
  if (split.synthetic_total !== 150 || Math.abs(split.synthetic_share_percent - 150 / 444 * 100) > 0.001) throw new Error('Invalid disclosed synthetic share');
  if (!split.family_counts || typeof split.family_counts !== 'object' || Array.isArray(split.family_counts)) throw new Error('Missing family counts');
  const familyRows = Object.entries(split.family_counts);
  if (familyRows.some(([, counts]) => !Number.isSafeInteger(counts.public) || counts.public < 0 || !Number.isSafeInteger(counts.sealed) || counts.sealed < 0)) throw new Error('Invalid family counts');
  const publicFamilyTotal = familyRows.reduce((sum, [, counts]) => sum + counts.public, 0);
  const sealedFamilyTotal = familyRows.reduce((sum, [, counts]) => sum + counts.sealed, 0);
  const coreFamilyRows = familyRows.filter(([family]) => family !== 'Everyday photo');
  if (publicFamilyTotal !== split.items_public || sealedFamilyTotal !== split.items_sealed) throw new Error('Family counts do not sum to the whole split');
  if (coreFamilyRows.reduce((sum, [, counts]) => sum + counts.public, 0) !== split.licensed_core_public
    || coreFamilyRows.reduce((sum, [, counts]) => sum + counts.sealed, 0) !== split.licensed_core_sealed) throw new Error('Family counts do not sum to the licensed core');
  if (split.family_counts['Everyday photo']?.public !== split.everyday_photo_public || split.family_counts['Everyday photo']?.sealed !== split.everyday_photo_sealed) throw new Error('Family counts do not sum to the photo track');
  if (a.weights?.public !== 0.35 || a.weights?.sealed !== 0.65 || a.gap_allowance_pp !== 15) throw new Error('Invalid frozen scoring weights or matched-gap allowance');
  if (!Array.isArray(a.ranking) || a.ranking.length !== 12 || a.n_systems !== 12) throw new Error('Invalid multimodal system rows');
  const keys = a.ranking.map((s) => s.key);
  if (new Set(keys).size !== 12 || a.ranking.some((s, i) => s.rank !== i + 1)) throw new Error('Duplicate or unsorted system rows');
  const jevOmni = a.ranking.find((system) => system.key === 'jev_omni');
  if (!jevOmni || jevOmni.api_flag !== false) throw new Error('Missing locally evaluated Jev-Omni row');
  const bonsai = a.ranking.find((system) => system.key === 'bonsai_2_27b_pq2_0');
  if (!bonsai || bonsai.api_flag !== false) throw new Error('Missing locally evaluated Bonsai row');
  if (a.ranking.filter((s) => s.api_flag).length !== 5) throw new Error('Hosted API exposure flags do not match the roster');
  const gemma = a.ranking.find((s) => s.key === 'kushal_gemma4_31b_it_autoloops');
  if (!gemma || gemma.rank !== 4 || gemma.api_flag !== true || Math.abs(gemma.score - 45.90758103755653) > 1e-9) throw new Error('Missing reused Gemma 4 31B row');
  const gpt6 = a.ranking.find((s) => s.key === 'gpt6_luna');
  if (!gpt6 || gpt6.api_flag !== true || gpt6.name !== 'GPT-6 Luna (low reasoning effort)' || gpt6.inference_setting !== 'OpenRouter reasoning.effort=low') throw new Error('Missing distinct GPT-6 Luna low setting');
  const coverage = a.candidate_coverage?.candidates;
  if (!Array.isArray(coverage) || coverage.length < 25 || new Set(coverage.map((x) => x.candidate)).size !== coverage.length) throw new Error('Missing or duplicate candidate coverage rows');
  const requested = coverage.filter((x) => x.status === 'requested, not yet evaluated');
  if (!requested.length || requested.some((x) => !x.reason?.trim() || !x.access?.trim())) throw new Error('Requested candidates need exact access and reason fields');
  for (const name of ['CUA-S1-4B-0.2 multimodal adapter', 'Visual Jev 4B Answer-SFT', 'NeoHorse-Jev-4B', 'Jevify Qwen3-VL-2B Tier 2', 'Standard One 3B', 'Standard One 8B', 'Sage1 / Levanto Sage']) {
    if (!requested.some((x) => x.candidate === name)) throw new Error(`Missing requested candidate: ${name}`);
  }
  if (typeof a.preview_tracks.scoring_status !== 'string' || !a.preview_tracks.scoring_status.trim()) throw new Error('Missing preview-track no-score status');
  for (const s of a.ranking) {
    if (s.tracks.all.public.n !== 228 || s.tracks.all.sealed.n !== 216) throw new Error(`Invalid whole-set counts for ${s.key}`);
    if (s.tracks.core.public.n !== 139 || s.tracks.core.sealed.n !== 155) throw new Error(`Invalid core counts for ${s.key}`);
    if (s.tracks.everyday_photo.public.n !== 89 || s.tracks.everyday_photo.sealed.n !== 61) throw new Error(`Invalid photo-track counts for ${s.key}`);
    for (const track of ['all', 'core', 'everyday_photo']) {
      if (!Number.isFinite(s.tracks[track].matched_gap_pp) || !Number.isFinite(s.tracks[track].penalty_multiplier)) throw new Error(`Missing matched-gap penalty data for ${s.key}/${track}`);
    }
  }
  const forbidden = new Set(['token', 'question', 'prompt', 'gold', 'answer_index', 'prediction', 'image_url']);
  const visit = (value) => {
    if (Array.isArray(value)) return value.some(visit);
    if (value && typeof value === 'object') return Object.entries(value).some(([key, child]) => forbidden.has(key) || visit(child));
    return false;
  };
  if (visit(a)) throw new Error('Preview contains a forbidden item-level field');
  return a;
}
