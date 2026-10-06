import type { JevV15System, JevV15Artifact } from './jevbench-v15-preview.mjs';
export type SeoSystem = Omit<JevV15System,'open'|'speed'|'licence'> & {
  open: string | boolean | null; licence: string | null;
  speed: JevV15System['speed'] & {hardware?: string | null; measured_where?: string | null};
  capability: number | null; capability_eligible: boolean; capability_reasons?: string[]; composite_rank: number | null;
  board: 'open' | 'api' | 'reference'; open_board_rank: number | null;
  source_url?: string | null; measurement_revision: string; last_measured_on: string | null;
  sealed_accuracy: number | null; public_accuracy: number | null;
};
export type SeoComparison = {key:string;slug:string;label:string;jev:SeoSystem;rival:SeoSystem;inCurrentRelease:boolean};
export type SeoData = {
 artifact: JevV15Artifact & {generated_utc:string;score_one_liner:string}; sha256:string;
 feed: {capability_policy:{definition:string;cost_cap_usd_per_1000:number;median_latency_cap_s:number;factor:number}};
 releasePage:string;date:string;month:string;systems:SeoSystem[];reference:SeoSystem;ranked:SeoSystem[];openRanked:SeoSystem[];openQualifying:number;topFive:SeoSystem[];
 comparisons:SeoComparison[];historical:SeoSystem[];modelKeys:string[];
 winners:{mostAccurate:SeoSystem|null;fastest:SeoSystem|null;cheapest:SeoSystem|null};selfHostable:SeoSystem[];openWeightAlternatives:SeoSystem[];
};
export const JEV_SEO_PATHS: {alternatives:string;chooser:string;openSource:string};
export const JEV_TOP_FIVE_COMPARISONS: Array<{key:string;slug:string;label:string}>;
export const JEV_MORE_COMPARISONS: typeof JEV_TOP_FIVE_COMPARISONS;
export const JEV_LEGACY_COMPARISONS: typeof JEV_TOP_FIVE_COMPARISONS;
export function isOpenWeightJevRow(row: unknown): boolean;
export function releaseDate(artifact: unknown): string;
export function currentComparisonPairs(ranked: Array<{key:string;display:string}>): typeof JEV_TOP_FIVE_COMPARISONS;
export function readJevbenchSeoData(root?:string):Promise<SeoData>;
export function readJevbenchComparisonLinks():Promise<SeoComparison[]>;
export function readJevbenchSeoUrls():Promise<{date:string;urls:string[]}>;
