export const VALUE_MIN_ROWS: number;
export const VALUE_RATIO: number;
export const VALUE_SPREADS: number;
export interface ValueSignal { kind: 'cheap' | 'pricey'; ratio: number; expected: number; n: number }
export function valueSignals(rows: { id: string; score: number | null | undefined; cost: number | null | undefined }[]): Map<string, ValueSignal>;
