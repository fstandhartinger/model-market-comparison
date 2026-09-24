import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readMultimodalPreview() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
  const a = JSON.parse(await readFile(file, 'utf8'));
  if (a.benchmark !== 'Image JevBench v0.1 candidate' || a.status !== 'preview') throw new Error('Invalid multimodal preview artifact');
  if (a.sealed_item_details_included !== false) throw new Error('Preview may contain aggregate sealed results only');
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
  if (!Array.isArray(a.ranking) || a.ranking.length !== 11 || a.n_systems !== 11) throw new Error('Invalid multimodal system rows');
  const keys = a.ranking.map((s) => s.key);
  if (new Set(keys).size !== 11 || a.ranking.some((s, i) => s.rank !== i + 1)) throw new Error('Duplicate or unsorted system rows');
  const jevOmni = a.ranking.find((system) => system.key === 'jev_omni');
  if (!jevOmni || jevOmni.api_flag !== false) throw new Error('Missing locally evaluated Jev-Omni row');
  const bonsai = a.ranking.find((system) => system.key === 'bonsai_2_27b_pq2_0');
  if (!bonsai || bonsai.api_flag !== false) throw new Error('Missing locally evaluated Bonsai row');
  if (a.ranking.filter((s) => s.api_flag).length !== 4) throw new Error('Hosted API exposure flags do not match the roster');
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
