import type { JevWeights, JevGatePenalty } from './jevbench-axis-weights.mjs';
export type ImageV02ExplorerSystem = { key: string; name: string; score: number | null; rank: number | null; tracks: Record<string, any> };
export declare function imageJevV02WhatIfRows<T extends ImageV02ExplorerSystem>(systems: T[], weights: JevWeights): Array<{ system: T; score: number; penalties: JevGatePenalty }>;
export declare function imageJevV02WeightsFromUrl(href: string): JevWeights;
export declare function imageJevV02WeightsToUrl(href: string, weights: JevWeights): string;
export declare function imageJevV02ScatterScale<T extends { cost: number | null; speed: number | null }>(kind: 'cost' | 'speed', points: T[], caps: { cost: number; latency: number } | null): {
  plotted: T[]; minCost: number; maxCost: number; capX: number | null; xAt: (point: T) => number;
};
