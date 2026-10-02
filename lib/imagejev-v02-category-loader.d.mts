import type { CompareCategories } from './jevbench-categories.mjs';
import type { ImageJevV02ExpectedRelease } from './imagejev-v02-categories.mjs';
import type { ImageJevCategoryBundleRecipe } from './imagejev-category-bundles.mjs';
export type ImageJevCategoryExpectedHashes = { artifactSha256: string | null; acceptanceSha256: string | null };
export function parseImageJevV02CategoryBundleBytes(artifactBytes: Uint8Array, acceptanceBytes: Uint8Array,
  expectedHashes: ImageJevCategoryExpectedHashes, expectedRelease: ImageJevV02ExpectedRelease, keys: string[]): CompareCategories;
export function loadImageJevV02CategoryBundle(keys: string[], options: {
  recipe: ImageJevCategoryBundleRecipe; expectedRelease: ImageJevV02ExpectedRelease;
  readBytes: (file: string) => Promise<Uint8Array>;
}): Promise<CompareCategories>;
export function readImageJevV02CategoryView(keys: string[]): Promise<CompareCategories>;
