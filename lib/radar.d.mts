import type { BenchmarkView, ViewAxis } from './benchmark-view.mjs';
export interface RadarScaled { value: number; scale: 'fixed' | 'peer'; range: [number, number] }
export const FIXED_RANGES: Readonly<Record<string, [number, number]>>;
export function axisRange(axis: ViewAxis): [number, number] | null;
export function radarScale(value: number | null | undefined, axis: ViewAxis): RadarScaled | null;
export function formatRadarValue(value: number | null | undefined, unit: string | null): string;
export function scaleNote(scaled: RadarScaled | null, unit: string | null): string;
export const DEFAULT_RADAR_FAMILIES: readonly string[];
export function defaultRadarAxes(axes: ViewAxis[], families?: readonly string[]): string[];
export function detailedRadarAxes(axes: ViewAxis[], picks: string[]): ViewAxis[];
export function defaultComparePicks(view: BenchmarkView, n?: number): string[];
export declare const RADAR_WINDOW_MARGIN: number;
export declare const RADAR_WINDOW_MAX_FLOOR: number;
export declare function radarWindow(positions: readonly (number | null | undefined)[] | null | undefined): { floor: number; rings: number[] };
export declare function windowRadius(position: number | null | undefined, win: { floor: number }): number | null;
