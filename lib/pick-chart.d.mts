export interface PickPoint { id: string; cost: number; x: number; free: boolean; y: number; pass: boolean }
export interface PickChart {
  points: PickPoint[]; frontier: string[]; unpriced: number;
  xDomain: [number, number]; yDomain: [number, number]; xTicks: number[]; yTicks: number[];
  scoreRange: [number, number]; costRange: [number, number];
}
export function logTicks(min: number, max: number): number[];
export function scoreTicks(min: number, max: number): { domain: [number, number]; ticks: number[] };
export function logPosition(x: number, domain: [number, number]): number;
export const SLIDER_MAX: number;
export function sliderToCost(pos: number, range: [number, number]): number | null;
export function costToSlider(cost: number | null, range: [number, number]): number;
export function pickChart(candidates: { id: string; scores: Record<string, number | null | undefined>; cost: number | null }[], score: string, limits?: { minScore?: number | null; maxCost?: number | null }): PickChart;
export function toggleColumn(ids: string[], id: string, max: number): string[] | null;
