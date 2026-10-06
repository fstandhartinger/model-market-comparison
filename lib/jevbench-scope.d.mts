export type JevScope = 'open' | 'api' | 'all';
export type JevRowScope = 'open' | 'api' | 'reference';
type ScopeRow = { key: string; v16?: { lane?: string } | null; api_flag?: boolean | null; endpoint_kind?: string | null };
export type JevApiClassifier = (row: ScopeRow) => boolean;
export const JEV_REFERENCE_KEY: string;
export const JEV_SCOPES: JevScope[];
export const JEV_SCOPE_LISTING: { reference: string; api: string };
export function isJevApiOffering(row: ScopeRow | null | undefined): boolean;
export function jevScopeClassifier(...sources: (readonly ScopeRow[] | null | undefined)[]): JevApiClassifier;
export function jevRowScope(row: ScopeRow, isApi?: JevApiClassifier): JevRowScope;
export function jevScopeRows<T extends ScopeRow>(rows: readonly T[] | null | undefined, scope: JevScope, isApi?: JevApiClassifier): T[];
export function jevbenchScopeArtifact<T extends { systems: ScopeRow[]; not_measured: ScopeRow[] }>(artifact: T, scope: JevScope, isApi?: JevApiClassifier): T & { scope?: JevScope };
export function jevbenchScopeCarry<T extends { rows: ScopeRow[] }>(carry: T, scope: JevScope, isApi?: JevApiClassifier): T;
export function jevApiOfferingKeys(rows: readonly ScopeRow[] | null | undefined, isApi?: JevApiClassifier): string[];
export type JevApiListedRow = { key: string; display: string; listing: string | null; reason: string | null; composite_v15: number | null;
  endpoint_kind: string | null; href: string | null; revision: string | null };
export function jevApiRoster<S extends ScopeRow & { ranked?: boolean; rank?: number | null }, C extends ScopeRow>(
  apiArtifact: { systems: S[]; not_measured?: (ScopeRow & { display: string; repo?: string | null; reason?: string | null })[] },
  carryRows: C[] | null | undefined,
  previousSystems?: readonly (ScopeRow & { display: string; listing?: string; not_ranked_because?: string | null; jevbench_score?: number | null })[],
  previousRevision?: string | null,
): { ranked: S[]; variants: S[]; carried: C[]; listed: JevApiListedRow[] };
export const JEV_INTERLEAVED_LISTINGS: ReadonlySet<string>;
export function jevScopeDisplayOrder<T extends { ranked?: boolean; rank?: number | null; jevbench_score?: number | null }>(rows: readonly T[]): T[];
export const JEV_PRELIMINARY_LISTING: string;
export const JEV_PENDING_LISTING: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jevApiPreliminaryRows(publicSet: unknown, meta: ReadonlyMap<string, any>): { prelim: any[]; pending: any[] };
export function jevWithApiA4Rows<T extends { systems: any[]; board?: any; n_ranked?: number }>(artifact: T, a4: unknown, meta?: ReadonlyMap<string, any>): T;
