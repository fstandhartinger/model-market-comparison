import type { JevV15System, JevV15Artifact } from './jevbench-v15-preview.mjs';
export type SeoSystem = Omit<JevV15System,'open'|'speed'|'licence'> & {
  open: string | boolean | null; licence: string | null;
  speed: JevV15System['speed'] & {hardware?: string | null; measured_where?: string | null};
  capability: number | null; capability_eligible: boolean; capability_reasons?: string[]; composite_rank: number | null;
  board: 'open' | 'api' | 'reference'; open_board_rank: number | null; combined_rank: number | null;
  source_url?: string | null; measurement_revision: string; last_measured_on: string | null;
  sealed_accuracy: number | null; public_accuracy: number | null;
  // v1.7.0 (10 s rule): present on rows of a v1.7 board only.
  method?: string | null; rescored_in?: string | null; new_in?: string | null; remeasured_in?: string | null; remeasure?: any; underlying?: string | null; decision_limit?: any; previous?: any;
};
export type SeoComparison = {key:string;slug:string;label:string;jev:SeoSystem;rival:SeoSystem;inCurrentRelease:boolean};
export type SeoData = {
 artifact: JevV15Artifact & {generated_utc:string;score_one_liner:string;base_revision:string}; sha256:string;
 feed: {capability_policy:{definition:string;cost_cap_usd_per_1000:number;median_latency_cap_s:number;factor:number}; method?: {label?:string;decision_limit_s?:number;treatment?:string} | null};
 releasePage:string;basePage:string;date:string;month:string;systems:SeoSystem[];reference:SeoSystem;ranked:SeoSystem[];openRanked:SeoSystem[];apiRows:SeoSystem[];openQualifying:number;topFive:SeoSystem[];
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
