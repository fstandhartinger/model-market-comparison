export const JEV_LATENCY_LABEL: string;
export const JEV_LATENCY_SHORT_LABEL: string;
export const JEV_LATENCY_NOTE_EN: string;
export const JEV_LATENCY_HOSTED_OPTION: string;
export const JEV_LATENCY_NOT_COMPARABLE: string;
export const JEV_LATENCY_MEASURED_TAG: { gpu: string; cpu: string; other: string };
export const JEV_LATENCY_MEASURED_TAG_DE: { gpu: string; cpu: string; other: string };
export function jevMeasuredTag(endpointKind?: string | null, locale?: 'en' | 'de'): string;
export type JevSpeedLike = { p50_s_raw?: number | null; p50_s_adjusted?: number | null; adjustment?: string | null; [k: string]: unknown } | null | undefined;
export interface JevLatencyView {
  adjusted: boolean; measured: number | null; estimate: number | null;
  label: string | null; tooltip: string | null; measuredTag: string | null; basis: 'measured-loopback' | 'api-end-to-end' | 'demo-endpoint-x2'; note: string | null;
}
export function isSelfHostedAdjustment(adjustment: unknown): boolean;
export function latencySeconds(value: number | null | undefined, digits?: number): string;
export function jevLatencyView(speed: JevSpeedLike, digits?: number, endpointKind?: string | null): JevLatencyView;
export function jevLatencyJsonFields(speed: JevSpeedLike, endpointKind?: string | null): { p50_s_measured?: number | null; latency_basis?: string; p50_s_measured_condition?: string | null; latency_note?: string };
export function jevLatencyText(speed: JevSpeedLike, plain: string, options?: { unit?: boolean; kind?: string | null }): string;
