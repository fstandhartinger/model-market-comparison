import type { CompareCategories } from './jevbench-categories.mjs';
/** The loader's exact presentation artifact and independently checked byte digest. */
export type ImageJevV02ExpectedRelease = { artifact: any; sha256: string };
export type ImageJevV02CategoryAcceptanceReceipt = {
  verdict: 'PASS'; artifact_sha256: string; review_receipt_sha256: string; source_receipt_sha256: string;
  manifest_sha256: string; original_results_sha256: string; presentation_results_sha256: string; taxonomy_sha256: string;
  coverage: { n_items: 573; n_native_systems: 48; n_reference_systems: 3; native_keys: string[];
    unavailable: Record<string, string>; configuration_sha256: Record<string, string> };
};
/** Structural validity does not prove raw labels, correctness, or independent review. Returns input unchanged. */
export function validateImageJevV02CategoryArtifact(artifact: unknown, expectedRelease: ImageJevV02ExpectedRelease): any;
/** Throws unless exact acceptance bindings pass. Authenticate receipt and hash bytes before calling. */
export function imageJevV02CategoryView(artifact: unknown, expectedRelease: ImageJevV02ExpectedRelease, keys: string[],
  acceptanceReceipt: ImageJevV02CategoryAcceptanceReceipt | unknown, artifactSha256: string): CompareCategories;
