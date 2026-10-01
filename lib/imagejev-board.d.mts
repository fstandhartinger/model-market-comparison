import type { JevV14System } from './jevbench-v14.mjs';
import type { JevBoardViewRow } from '../components/JevBoardShared';
import type { JevPreset } from '../components/JevBoardInteractive';
import type { JevCompareV15Row } from '../components/JevCompareV15';

export type ImageJevPricingAlternative = {
  axes: { cost: number | null };
  usd_per_1000: number | null;
  label: 'Base-model price';
  note: string;
};
export type ImageJevBoardRow = JevBoardViewRow & { alt?: ImageJevPricingAlternative };
export type ImageJevCompareRow = JevCompareV15Row & { alt?: ImageJevPricingAlternative };
export type ImageJevCapabilityLimits = {
  cost: number;
  latency: number;
  factor: number;
  referenceLabel: 'Jev 1.13.0 (JevBench)';
};

/** Convert ImageJev v0.1.x (`all`) or v0.2 (`headline_track`) rows to Jev V1.4 capability/bubble rows. */
export declare function imageJevBoardSystems(artifact: unknown): JevV14System[];
/** Convert to the shared composite chart rows, including Wity-1's optional base-model price `alt`. */
export declare function imageJevBoardRows(artifact: unknown): ImageJevBoardRow[];
/** Convert to the shared two-system comparison rows, including Wity-1's optional base-model price `alt`. */
export declare function imageJevCompareRows(artifact: unknown): ImageJevCompareRow[];
/** Use artifact-frozen eligibility, or derive v0.2 fallback limits from JevBench v1.5.4. */
export declare function imageJevCapabilityLimits(artifact: unknown): ImageJevCapabilityLimits;
/** ImageJev composite presets, with equal axis weights as the official state. */
export declare function imageJevSliderPresets(artifact: unknown): JevPreset[];
