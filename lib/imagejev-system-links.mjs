import { baseModelFor } from './jev-base-model.mjs';

// CR-254: keep Image system keys and reviewed sources separate from text system keys.
export const imageJevSystemPath = (key) => `/image-jev-bench/${encodeURIComponent(key)}`;
// Author-requested product homepages for closed systems without a public repo (wity: Rakshith, X, 6 Oct 2026).
// Review 6 Oct 2026: hosted rows without a repo link to the vendor model page, like the text board (jev-system-links.json).
export const IMAGE_JEV_HOMEPAGES = Object.freeze({
  wity_1: 'https://wity.alphanimble.com/',
  gpt6_luna: 'https://developers.openai.com/api/docs/models/gpt-6-luna',
  gpt56_luna: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna',
  gemini31_flash_lite: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite',
  gemini38_flash: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash',
  kushal_gemma4_31b_it_autoloops: 'https://www.autoloops.ai',
  visual_jev_generic_baseline: 'https://huggingface.co/Qwen/Qwen3.5-4B',
});
export const imageJevSourceUrl = (key, repo) => repo ?? IMAGE_JEV_HOMEPAGES[key] ?? baseModelFor('imagejevbench', key).sources[0]?.url ?? null;

// Review 6 Oct 2026: a link to a base-model repo (Qwen/...) names the base model's owner, not the system's author.
const BASE_MODEL_OWNERS = new Set(['qwen', 'google', 'meta-llama', 'mistralai', 'microsoft', 'deepseek-ai', 'nvidia', 'huggingfacetb']);
export function imageJevAuthorLabel(row) {
  if (row.api_flag === true || row.kind === 'api') return row.author ?? 'Hosted API provider';
  const author = typeof row.author === 'string' ? row.author : null;
  if (!author) return 'Author not reported';
  const derived = /\(model repository owner\)\s*$/.test(author);
  const owner = author.replace(/\s*\(model repository owner\)\s*$/, '').trim().toLowerCase();
  return derived && BASE_MODEL_OWNERS.has(owner) ? 'Author not reported' : author;
}
