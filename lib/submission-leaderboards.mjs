// CR-251: the "follow-up of a model already on the leaderboard?" options, read from the same live data the three
// benchmark pages render. Rank is the composite rank: JevBench board A headline rank, ImageJevBench ranking[].rank,
// AudioJevBench the rank computed for the page (full-coverage systems only).
import { readJevbenchV154Release } from './jevbench-v15-release.mjs';
import { readMultimodalPreview } from './jevbench-multimodal-preview.mjs';
import { audiojevView, readAudiojevPreview } from './audiojev-preview.mjs';

import { FOLLOWUP_BENCHMARKS } from './submission-shared.mjs';

const shortName = (s) => String(s ?? '').split(' (')[0].split(', formerly')[0].trim();
const usable = (key, name, rank) => typeof key === 'string' && key && typeof name === 'string' && name && Number.isInteger(rank) && rank >= 1;

export function followupOptionsFromData({ jevbench, imagejevbench, audiojevbench } = {}) {
  const rows = [];
  for (const s of jevbench?.systems ?? []) {
    if (s.ranked === true && usable(s.key, s.display, s.rank)) rows.push({ benchmark: 'jevbench', key: s.key, name: shortName(s.display), rank: s.rank });
  }
  for (const s of imagejevbench?.ranking ?? []) {
    if (usable(s.key, s.name, s.rank)) rows.push({ benchmark: 'imagejevbench', key: s.key, name: shortName(s.name), rank: s.rank });
  }
  for (const s of audiojevbench?.full ?? []) {
    if (usable(s.key, s.name, s.rank)) rows.push({ benchmark: 'audiojevbench', key: s.key, name: shortName(s.name), rank: s.rank });
  }
  const order = (b) => FOLLOWUP_BENCHMARKS.indexOf(b);
  return rows.sort((a, b) => order(a.benchmark) - order(b.benchmark) || a.rank - b.rank || a.name.localeCompare(b.name));
}

/** Current live leaderboards. A benchmark whose data cannot be read is left out rather than failing the page. */
export async function followupOptions(root = process.cwd()) {
  const [jev, image, audio] = await Promise.all([
    readJevbenchV154Release(root).then((r) => r.artifact).catch(() => null),
    readMultimodalPreview().catch(() => null),
    readAudiojevPreview(root).then((raw) => (raw ? audiojevView(raw) : null)).catch(() => null),
  ]);
  return followupOptionsFromData({ jevbench: jev, imagejevbench: image, audiojevbench: audio });
}
