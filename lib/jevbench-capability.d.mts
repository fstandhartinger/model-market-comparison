import type { JevV14System } from './jevbench-v14.mjs';

export type JevCapabilityRow = { row: JevV14System; capability: number };
export declare function jevbenchCapabilityRows(systems: JevV14System[]): JevCapabilityRow[];
