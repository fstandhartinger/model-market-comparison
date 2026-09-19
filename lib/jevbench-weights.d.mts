export type JevWeights = { capability: number; speed: number; cost: number };
export type JevPreset = { id: 'balanced' | 'accuracy' | 'speed' | 'cost'; label: string; name: string; ratio: string; title: string; w: JevWeights };
export const SCORE_NAME: string;
export const PRESETS: JevPreset[];
export const DEFAULT_PRESET: JevPreset;
export const DEFAULT_WEIGHTS: JevWeights;
export function normalise(parts: Partial<Record<keyof JevWeights, number>>): JevWeights | null;
export function sameWeights(a: JevWeights, b: JevWeights): boolean;
export function presetFor(w: JevWeights): JevPreset | null;
export function isDefault(w: JevWeights): boolean;
export function percents(w: JevWeights): JevWeights;
export function ratioText(w: JevWeights): string;
export function describe(w: JevWeights): { preset: JevPreset['id'] | null; official: boolean; title: string; short: string; ratio: string };
export function toParam(w: JevWeights): string | null;
export function parseParams(search: string | URLSearchParams | null | undefined): JevWeights;
export function scoreUnder(row: { capability: number | null; speed: number | null; cost: number | null }, w: JevWeights): number | null;
export function rerank<R extends { key: string; main: number | null; capability: number | null; speed: number | null; cost: number | null }>(
  ranked: R[], partial: R[], w: JevWeights,
): { ranked: (R & { score: number | null; official: number | null; rank: number; delta: number })[]; partial: (R & { score: number | null; official: number | null; rank: null; delta: number })[] };
