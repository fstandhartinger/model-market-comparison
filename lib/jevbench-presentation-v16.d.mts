import type { V16RegistryProjection, V16ProjectedRow } from './jevbench-registry-v16.mjs';
export type V16Caps = { costFactor: number; latencyFactor: number };
export type V16CapItem = { row: V16ProjectedRow; cost: number | null; median: number | null; costRatio: number | null; latencyRatio: number | null; eligible: boolean; reasons: string[] };
export type V16CapView = { official: boolean; caps: V16Caps; reference: V16RegistryProjection['reference']; limits: { cost: number; latency: number }; eligible: V16CapItem[]; outside: V16CapItem[]; rows: V16CapItem[] };
export function v16CapView(projection: V16RegistryProjection, caps?: V16Caps, options?: { allowFixture?: boolean }): V16CapView;
export function v16TrafficZone(ratio: number | null, cap: number): 'unknown' | 'green' | 'amber' | 'red';
export function v16MeasuredLabel(row: V16ProjectedRow): string;
