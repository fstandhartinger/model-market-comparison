export type ImageJevCategoryBundleRecipe = Readonly<{
  artifactPath: string; acceptancePath: string;
  artifactSha256: string | null; acceptanceSha256: string | null;
}>;
export const IMAGEJEV_CATEGORY_BUNDLES: Readonly<{ 'v0.2.0': ImageJevCategoryBundleRecipe }>;
