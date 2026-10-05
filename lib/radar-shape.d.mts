export const MIN_RUN: number;
export function presentRuns(present: boolean[]): number[][];
export function radarShape(present: boolean[]): { kind: 'polygon' | 'runs' | 'points' | 'none'; runs: number[][] };
