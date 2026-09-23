import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readMultimodalPreview() {
  const file = path.join(process.cwd(), 'data/raw/benchmarks/jevbench/multimodal-preview/preview.json');
  const a = JSON.parse(await readFile(file, 'utf8'));
  if (a.benchmark !== 'Image JevBench v0.1 candidate' || a.status !== 'preview') throw new Error('Invalid multimodal preview artifact');
  if (a.sealed_item_details_included !== false) throw new Error('Preview may contain aggregate sealed results only');
  const split = a.split;
  if (!split || split.items_total !== 444 || split.items_public !== 265 || split.items_sealed !== 179) throw new Error('Invalid frozen split counts');
  if (split.licensed_core_total !== 294 || split.licensed_core_public !== 176 || split.licensed_core_sealed !== 118) throw new Error('Invalid licensed-core counts');
  if (split.everyday_photo_total !== 150 || split.everyday_photo_public !== 89 || split.everyday_photo_sealed !== 61 || split.everyday_photo_synthetic !== true) throw new Error('Invalid everyday-photo counts');
  if (split.synthetic_total !== 150 || Math.abs(split.synthetic_share_percent - 150 / 444 * 100) > 0.001) throw new Error('Invalid disclosed synthetic share');
  if (Object.values(split.public_source_counts).reduce((sum, n) => sum + n, 0) !== split.licensed_core_public) throw new Error('Public source counts do not sum to the public core');
  if (!Array.isArray(a.ranking) || a.ranking.length !== 9 || a.n_systems !== 9) throw new Error('Invalid multimodal system rows');
  const keys = a.ranking.map((s) => s.key);
  if (new Set(keys).size !== 9 || a.ranking.some((s, i) => s.rank !== i + 1)) throw new Error('Duplicate or unsorted system rows');
  if (a.ranking.filter((s) => s.api_flag).length !== 4) throw new Error('Hosted API exposure flags do not match the roster');
  for (const s of a.ranking) {
    if (s.tracks.all.public.n !== 265 || s.tracks.all.sealed.n !== 179) throw new Error(`Invalid whole-set counts for ${s.key}`);
    if (s.tracks.core.public.n !== 176 || s.tracks.core.sealed.n !== 118) throw new Error(`Invalid core counts for ${s.key}`);
    if (s.tracks.everyday_photo.public.n !== 89 || s.tracks.everyday_photo.sealed.n !== 61) throw new Error(`Invalid photo-track counts for ${s.key}`);
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
