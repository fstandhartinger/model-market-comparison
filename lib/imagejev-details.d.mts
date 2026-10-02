import type { ImageJevDetailVersion } from './imagejev-system-links.mjs';
import type { ImageJevBoardRow } from './imagejev-board.mjs';
export type ImageJevDetailRow = ImageJevBoardRow & {
  revision: ImageJevDetailVersion; track: string; status: 'ranked' | 'measured-unrankable' | 'historical-reference';
  reason: string | null; inference_setting: string | null; prior_exposure: string | null; measurement_source: string | null;
  reference: { revision: string; score: number; reason: string } | null;
  previous: { rank: number | null; score: number | null } | null;
  pricing_alternative: { label: string; basis: string; source?: string; rank_if_applied?: number; would_rank?: number; tracks: Record<string, any> } | null;
  source_url: string | null; source_note: string;
};
export type ImageJevDetailBundle = { artifact: any; revision: ImageJevDetailVersion; systems: ImageJevDetailRow[] };
export declare function imageJevDetailsFromArtifact(artifact: any): ImageJevDetailRow[];
export declare function readImageJevDetails(revision?: string): Promise<ImageJevDetailBundle | null>;
export declare function findImageJevDetail(key: string, revision?: string): Promise<(ImageJevDetailBundle & {row: ImageJevDetailRow}) | null>;
