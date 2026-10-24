export const JEV_METHOD_LABEL: string;
export const JEV_LIMIT_S: number;
export const JEV_REMEASURE_PENDING: string;
export const JEV_REMEASURE_PENDING_LABEL: string;
export const JEV_REMEASURE_PENDING_NOTE: string;
export const JEV_NOT_RESCORED: string;
export const JEV_CARRY_LABEL: string;
export const JEV_LIMIT_RULE_EN: string;
export const JEV_LIMIT_RAW_NOTE: string;
type RowLike = { listing?: string; method?: string | null; rescored_in?: string | null; new_in?: string | null; remeasured_in?: string | null; measured_in?: string | null; decision_limit?: any; speed?: any; previous?: any; [k: string]: any } | null | undefined;
export function isRemeasurePending(row: RowLike): boolean;
export function jevMethodView(row: RowLike, options?: { carry?: boolean; carryLabel?: string }): { kind: 'v1.7' | 'v1.6-pending' | 'v1.5-carry'; text: string; title: string } | null;
export interface JevDecisionLimitView {
  limit: number; n: number | null; nOver: number | null; nOverOk: number | null; p50Raw: number | null; p95Raw: number | null; p95Adjusted: number | null;
  adjustedOver: boolean; countText: string; p95Text: string; text: string; note: string;
}
export function jevDecisionLimitView(row: RowLike): JevDecisionLimitView | null;
export interface JevPreviousView {
  release: string; method: string; measuredIn: string | null; composite: number | null; capability: number | null; axes: any; rank: number | null;
  openBoardRank: number | null; apiBoardRank: number | null; capabilityRank: number | null; p50: number | null; p95: number | null; label: string; short: string;
}
export function jevPreviousView(row: RowLike): JevPreviousView | null;
export function jevPreviousTitle(row: RowLike): string | null;
export interface JevOldNewRow {
  key: string; name: string; status: 're-scored' | 'new' | 'remeasured' | 'remeasure-pending' | 'carry'; method: string | null; ranked: boolean;
  oldA: number | null; newA: number | null; oldCapability: number | null; newCapability: number | null; oldRank: number | null; newRank: number | null;
  oldSpeed: number | null; newSpeed: number | null; p50Raw: number | null; p95Raw: number | null; nOver: number | null; n: number | null;
  dA: number | null; dCapability: number | null;
}
export function jevOldNewRows(systems: any[], carryRows?: any[]): JevOldNewRow[];
export function jevFixed(v: number | null | undefined, d?: number): string;
export function jevSigned(v: number | null, d?: number): string;
export function jevDecisionLimitText(row: RowLike): string;
export function jevMethodJsonFields(row: RowLike): Record<string, any>;
export function jevFeedMethodFields(row: RowLike): Record<string, any>;
