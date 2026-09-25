import type { JevV14System } from './jevbench-v14.mjs';

export declare const JEV_CLASS_REFERENCE_KEY: string;
export declare const JEV_CLASS_FACTOR: number;
export declare function medianLatency(row: JevV14System): number | null;
export type JevClassRow = {
  row: JevV14System; capability: number; inClass: boolean; isReference: boolean;
  cost: number | null; latency: number | null; latencyBasis: 'p50' | 'speed-axis' | 'none';
  costRatio: number | null; latencyRatio: number | null; reasons: string[];
};
export type JevClassResult = {
  reference: { key: string; display: string; cost: number; latency: number; speed: number };
  limits: { cost: number; latency: number; speedFloor: number; factor: number };
  rows: JevClassRow[];
};
export declare function jevClassRows(systems: JevV14System[], options?: { referenceKey?: string; factor?: number }): JevClassResult;
