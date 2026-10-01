import type { JevV14System } from './jevbench-v14.mjs';

export declare const JEV_CLASS_REFERENCE_KEY: string;
export declare const JEV_CLASS_FACTOR: number;
export declare function medianLatency(row: JevV14System): number | null;
export declare function speedFromLatency(seconds: number): number;
export declare function medianLatencySpeed(row: JevV14System): number | null;
export type JevClassRow = {
  row: JevV14System; capability: number; inClass: boolean; isReference: boolean;
  cost: number | null; latency: number | null; latencyBasis: 'p50' | 'speed-axis' | 'none';
  costRatio: number | null; latencyRatio: number | null; reasons: string[];
};
export type JevClassResult = {
  reference: { key: string; display: string; cost: number; latency: number; speed: number };
  limits: { cost: number; latency: number; speedFloor: number; factor: number };
  rows: JevClassRow[];
  costLatencySpearman: number | null; n: number;
};
export declare function jevClassRows(systems: JevV14System[], options?: JevClassOptions): JevClassResult;

export type JevClassOptions = { referenceKey?: string; factor?: number; referenceLabel?: string; limits?: { cost: number; latency: number } };
export declare function spearman(xs: (number | null)[], ys: (number | null)[]): number | null;
export declare function trafficLightZone(ratio: number | null, factor?: number): 'green' | 'amber' | 'red' | null;
export declare function ratioPosition(ratio: number): number;
