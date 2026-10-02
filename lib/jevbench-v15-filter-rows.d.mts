export type JevV15FilterEligibility = 'eligible' | 'outside' | 'unknown' | { status: 'eligible' | 'outside' | 'unknown'; reason?: string | null } | boolean;
export type JevV15FilterRow = {
  key: string;
  display: string;
  provider: string | null;
  family: string | null;
  modelType: string | null;
  openStatus: string | null;
  api: boolean | null;
  newInVersion: boolean;
  parametersB: number | null;
  licence: string | null;
  apiPricePer1000: number | null;
  basePricePer1000: number | null;
  costPer1000: number | null;
  alternativePricePer1000: number | null;
  p50: number | null;
  p95: number | null;
  eligibility: 'eligible' | 'outside' | 'unknown';
  eligibilityReason: string | null;
  listing: string;
  versionAdded: string | null;
  revisionNotesHref: string;
};
export function jevV15FilterRows(artifact: any, options?: {
  previousKeys?: string[];
  eligibilityByKey?: Map<string, JevV15FilterEligibility> | Record<string, JevV15FilterEligibility>;
  revisionHref?: string;
}): JevV15FilterRow[];
