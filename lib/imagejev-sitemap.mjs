import { readMultimodalPreview, readImageJevV03 } from './jevbench-multimodal-preview.mjs';
import { imageJevBoardSystems } from './imagejev-board.mjs';
import { imageJevSystemPath } from './imagejev-system-links.mjs';

// Review 6 Oct 2026: one sitemap entry per page /image-jev-bench/[system] serves (v0.3.0 rows plus v0.1.5-only carries).
export async function readImageJevSitemapPaths() {
  const keys = new Set([...imageJevBoardSystems(await readImageJevV03()), ...imageJevBoardSystems(await readMultimodalPreview())].map((row) => row.key));
  return [...keys].map(imageJevSystemPath);
}
