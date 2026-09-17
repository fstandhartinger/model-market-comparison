export declare const SIMPLE_LIMIT: number;
export declare const LABEL_LIMIT: number;
export declare const COST_AXIS: Readonly<{ reversed: true; cheaper: "right"; capability: "up" }>;
export declare function costAxisCaption(unit?: string): string;
export declare function attractiveQuadrant(offset: { left: number; top: number; width: number; height: number } | undefined | null): { x: number; y: number; width: number; height: number } | null;
export declare const QUADRANT_NOTE: string;
export declare function annotationBox(offset: { left: number; top: number; width: number; height: number } | undefined | null, fontSize?: number): { l: number; t: number; r: number; b: number; x: number; y: number } | null;
export declare function labelCandidates<T extends { id: string; y: number }>(points: T[], frontier: Set<string>, max?: number): T[];
export declare function placeLabels(args: { labels: { id: string; name: string; cx: number; cy: number }[]; dots: { cx: number; cy: number }[]; offset: { left: number; top: number; width: number; height: number }; frontier: Set<string>; headroom?: number; max?: number }): { key: string; x: number; y: number; text: string }[];
export declare function topCandidates<T>(items: T[], modelOf: (item: T) => { id: string; family_key: string; scores?: { aa_intelligence_index?: number | null; epoch_eci?: number | null } }, n?: number): T[];
export declare function expandedCandidateFamilies(models: { family_key: string; deprecated?: boolean; scores?: { aa_intelligence_index?: number | null; epoch_eci?: number | null } }[], n?: number): string[];
/** CR-77.3: the green line's grace band on the capability axis (0.5 points on the 0–100 scores; 0.5 % of the
 *  plotted range on Elo boards, which have no fixed scale). */
export declare const FRONTIER_GRACE_NOTE: string;
export declare const FRONTIER_GRACE_RATIO: number;
export declare const FRONTIER_GRACE_SCALE: number;
export declare function frontierGrace(values: readonly number[] | null | undefined, opts?: { elo?: boolean }): number;
export declare const DERIVED_MIN_SCORE_FLOOR: number;
export declare function derivedMinScore(points: readonly { x: number; y: number }[] | null | undefined, opts?: { score?: string; step?: number; floor?: number }): number | null;
export declare function minScoreLabel(score: string, shortLabel: string): { title: string; sub: string };
export declare function valueMapYDomain(values: readonly number[] | null | undefined, opts?: { elo?: boolean; full?: boolean }): { domain: [number, number]; ticks: number[] };
export declare const SIMPLE_SCORE_CHOICES: readonly string[];
export type CostMeasure = { id: 'adjusted' | 'blended' | 'input' | 'output'; label: string; unit: string; patch: { priceMode: 'adjusted' | 'raw'; inputWeight?: number } };
export declare function costMeasureChoices(blends: readonly { value: number }[], currentWeight: number): CostMeasure[];
export declare function activeCostMeasure(choices: CostMeasure[], priceMode: string, inputWeight: number): CostMeasure['id'];
