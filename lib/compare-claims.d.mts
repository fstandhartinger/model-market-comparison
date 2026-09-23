import type { ViewAxis } from './benchmark-view.mjs';

/** What the values one selected model shows in the Compare table are based on (F-163 / F-164). */
export interface ClaimProfile {
  id: string;
  name: string;
  org: string;
  /** Rows the table fills for this model across the visible axes. */
  total: number;
  selfReported: number;
  preliminary: number;
  measured: number;
  measuredLowSample: number;
}

export interface ClaimModel { id: string; name?: string | null; org?: string | null }

export function rowFor(axis: ViewAxis, modelId: string): ViewAxis['scores'][number] | undefined;
export function claimProfile(axes: readonly ViewAxis[], model: ClaimModel): ClaimProfile;
export function claimProfiles(axes: readonly ViewAxis[], modelIds: readonly string[], models: readonly ClaimModel[]): ClaimProfile[];
export function nameList(names: readonly string[]): string;
export function claimClause(profile: ClaimProfile, repeatsKind?: boolean): string;
export function claimKind(profile: ClaimProfile): 'both' | 'self' | 'preliminary' | null;
/** F-164: one clause per model whose values are claims (†) or announced figures (‡); '' otherwise. */
export function compareClaimsSentence(profiles: readonly ClaimProfile[]): string;
export function noticeKind(profile: ClaimProfile): 'both' | 'self' | 'preliminary' | 'unplaced' | 'none';
/** F-163: the line that replaces the snapshot-card rows of models with nothing measured anywhere. */
export function unmeasuredNoticeLine(profiles: readonly ClaimProfile[]): string;
/** F-164: the clause the status line appends to its row count; '' when nothing is a claim. */
export function claimsSummaryClause(profiles: readonly ClaimProfile[]): string;
